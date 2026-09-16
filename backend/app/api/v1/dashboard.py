from datetime import datetime, date, timedelta, UTC
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, select

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import (
    User,
    Sale,
    SaleItem,
    Product,
    Batch,
    Recipe,
    RecipeIngredient,
    InventoryTransaction,
    PurchaseOrder,
    WastageLog,
)
from app.services.executive_dashboard_service import (
    executive_dashboard,
)
from app.services.dashboard_service import (
    dashboard_overview,
    get_top_selling_products,
    get_top_selling_recipes,
    get_low_stock_items,
    get_expiring_items,
    get_inventory_value_trend,
    get_inventory_turnover,
)
from app.services.business_health_service import BusinessHealthService
from app.services.report_service import sales_trend, abc_inventory_analysis, supplier_performance, inventory_ledger
from app.services.customer_report_service import customer_dashboard
from app.services.sales_report_service import sales_dashboard
from app.services.ai_insights_service import generate_ai_insights

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=dict)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    org_id = current_user.organization_id
    today_start = datetime.combine(date.today(), datetime.min.time())
    month_start = datetime.combine(date.today().replace(day=1), datetime.min.time())

    # 1. Revenue Today
    revenue_today = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
        Sale.organization_id == org_id,
        Sale.sale_date >= today_start
    ).scalar()

    # 2. Revenue This Month
    revenue_month = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
        Sale.organization_id == org_id,
        Sale.sale_date >= month_start
    ).scalar()

    # 3. Inventory Value (Total cost value of stock: current_stock * cost_price)
    # We can do this in Python or database. Let's do it in database for efficiency.
    inventory_value = db.query(
        func.coalesce(func.sum(Product.current_stock * Product.cost_price), 0.0)
    ).filter(
        Product.organization_id == org_id
    ).scalar()

    # 4. Low Stock Products Count
    low_stock_count = db.query(func.count(Product.id)).filter(
        Product.organization_id == org_id,
        Product.current_stock <= Product.reorder_level
    ).scalar()

    # 5. Expiring Products (Expiring in <= 30 days, or already expired)
        # 5. Expiring Products (Expiring in <= 30 days, or already expired)
    today = date.today()
    in_30_days = today + timedelta(days=30)

    expiring_count = (
        db.query(func.count(Batch.id))
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date.is_not(None),
            Batch.expiry_date <= in_30_days,
        )
        .scalar()
    )

    # 6. Top Selling Recipes
    # Group SaleItem by recipe_id and sum quantity
    top_selling = db.query(
        Recipe.name,
        func.sum(SaleItem.quantity).label("sold_qty")
    ).select_from(SaleItem).join(Recipe, SaleItem.recipe_id == Recipe.id).filter(
        Recipe.organization_id == org_id
    ).group_by(Recipe.id, Recipe.name).order_by(func.sum(SaleItem.quantity).desc()).limit(5).all()

    top_recipes = [{"recipe_name": item[0], "quantity_sold": int(item[1])} for item in top_selling]

    # 7. Sales/Revenue Trend (Last 7 days)
    # Daily total sales
    sales_trend_data = []
    for i in range(6, -1, -1):
        day_date = date.today() - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())
        
        day_total = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end
        ).scalar()
        
        sales_trend_data.append({
            "date": day_date.strftime("%b %d"),
            "amount": float(day_total)
        })

    # 8. Inventory Consumption (Last 30 days stock out transactions)
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

    consumption_query = (
        db.query(
            Product.name,
            func.abs(func.sum(InventoryTransaction.quantity)).label("total_consumed")
        )
        .select_from(InventoryTransaction)
        .join(Product, InventoryTransaction.product_id == Product.id)
        .filter(
            Product.organization_id == org_id,
            InventoryTransaction.created_at >= thirty_days_ago,
            InventoryTransaction.transaction_type == "STOCK_OUT"
        )
        .group_by(Product.name)
        .order_by(func.sum(InventoryTransaction.quantity).asc())
        .limit(5)
        .all()
    )

    consumption_data = [
        {
            "product_name": item[0],
            "quantity_consumed": float(item[1])
        }
        for item in consumption_query
    ]

    total_products = db.query(func.count(Product.id)).filter(
        Product.organization_id == org_id
    ).scalar()

    healthy_products = db.query(func.count(Product.id)).filter(
        Product.organization_id == org_id,
        Product.current_stock > Product.reorder_level
    ).scalar()

    inventory_health = 100.0

    if total_products:
        inventory_health = round(
            healthy_products * 100 / total_products,
            1
        )

    low_stock_products = (
        db.query(Product)
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level
       )
       .order_by(
           (Product.reorder_level - Product.current_stock).desc()
       )
       .limit(5)
       .all()
    )

    low_stock_items = [
        {
            "id": p.id,
            "name": p.name,
            "stock": float(p.current_stock),
            "reorder_level": float(p.reorder_level),
            "unit": p.unit
        }
        for p in low_stock_products
   ]
    expiring_items = (
        db.query(
            Batch.id,
            Product.name,
            Batch.remaining_quantity,
            Product.unit,
            Batch.expiry_date,
        )
        .join(Product, Batch.product_id == Product.id)
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date >= today,
            Batch.expiry_date <= in_30_days,
        )
        .order_by(Batch.expiry_date.asc())
        .limit(5)
        .all()
    )

    expiring_items = [
        {
             "id": item.id,
             "name": item.name,
             "quantity": item.remaining_quantity,
             "unit": item.unit,
             "expiry_date": item.expiry_date.isoformat(),
             "days_left": (item.expiry_date - today).days,
        }
         for item in expiring_items
    ]
    recent_activity = []

     # Recent Sales
    sales = (
         db.query(Sale)
         .filter(Sale.organization_id == org_id)
         .order_by(Sale.sale_date.desc())
         .limit(5)
         .all()
     )

    for sale in sales:
         recent_activity.append({
             "type": "sale",
             "time": sale.sale_date.isoformat(),
             "title": "Sale Recorded",
             "subtitle": f"Invoice #{sale.id}",
             "amount": float(sale.total_amount)
         })

    # Recent Purchase Orders
    purchase_orders = (
         db.query(PurchaseOrder)
         .filter(PurchaseOrder.organization_id == org_id)
         .order_by(PurchaseOrder.created_at.desc())
         .limit(5)
         .all()
     )

    for po in purchase_orders:
         recent_activity.append({
             "type": "purchase",
             "time": po.created_at.isoformat(),
             "title": "Purchase Order",
             "subtitle": po.po_number,
             "amount": float(po.total_amount)
         })

    # Inventory Transactions
    transactions = (
        db.query(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .filter(
            InventoryTransaction.organization_id == org_id,
            Product.organization_id == org_id,
        )
        .order_by(InventoryTransaction.created_at.desc())
        .limit(5)
        .all()
    )

    for tx in transactions:
        transaction_title = (
            "Stock Received"
            if tx.transaction_type == "STOCK_IN"
            else "Stock Used"
            if tx.transaction_type == "STOCK_OUT"
            else tx.transaction_type.replace("_", " ").title()
        )

        recent_activity.append({
            "type": "inventory",
            "time": tx.created_at.isoformat(),
            "title": transaction_title,
            "subtitle": tx.product.name,
            "quantity": float(tx.quantity or 0),
        })
    
        recent_activity.sort(key=lambda x: x["time"], reverse=True)

        recent_activity = recent_activity[:10]

    
    return {
        "cards": {
            "revenue_today": float(revenue_today),
            "revenue_month": float(revenue_month),
            "inventory_value": float(inventory_value),
            "inventory_health": inventory_health,
            "low_stock_products": int(low_stock_count),
            "expiring_products": int(expiring_count)
        },
        "top_selling_recipes": top_recipes,
        "sales_trend": sales_trend_data,
        "inventory_consumption": consumption_data,
        "low_stock_items": low_stock_items,
        "expiring_items": expiring_items,
        "recent_activity": recent_activity,
    }

@router.get("/executive-dashboard")
def executive_dashboard_api(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return executive_dashboard(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )
    
@router.get("/inventory-summary", response_model=dict)
def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    total_products = (
        db.query(func.count(Product.id))
        .filter(Product.organization_id == org_id)
        .scalar()
    )

    total_stock_value = (
        db.query(
            func.coalesce(
                func.sum(Product.current_stock * Product.cost_price),
                0,
            )
        )
        .filter(Product.organization_id == org_id)
        .scalar()
    )

    low_stock_products = (
        db.query(func.count(Product.id))
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level,
        )
        .scalar()
    )

    out_of_stock_products = (
        db.query(func.count(Product.id))
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= 0,
        )
        .scalar()
    )

    active_batches = (
        db.query(func.count(Batch.id))
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
        )
        .scalar()
    )

    expiring_7_days = (
        db.query(func.count(Batch.id))
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date >= today,
            Batch.expiry_date <= in_7_days,
        )
        .scalar()
    )

    expiring_30_days = (
        db.query(func.count(Batch.id))
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date > in_7_days,
            Batch.expiry_date <= in_30_days,
        )
        .scalar()
    )

    inventory_value_at_risk = (
        db.query(
            func.coalesce(
                func.sum(
                    Batch.remaining_quantity * Batch.purchase_price
                ),
                0,
            )
        )
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date <= in_30_days,
        )
        .scalar()
    )
    
    business_health = BusinessHealthService.business_health(
        db=db,
        organization_id=org_id,
    )
    
    return {
        "total_products": int(total_products),
        "total_stock_value": float(total_stock_value),
        "low_stock_products": int(low_stock_products),
        "out_of_stock_products": int(out_of_stock_products),
        "active_batches": int(active_batches),
        "expiring_7_days": int(expiring_7_days),
        "expiring_30_days": int(expiring_30_days),
        "inventory_value_at_risk": float(inventory_value_at_risk),
        "ai_score": business_health["score"],
        "business_grade": business_health["grade"],
    }

@router.get("/reorder-insights", response_model=dict)
def get_reorder_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    products = (
        db.query(Product)
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level,
        )
        .all()
    )

    recommendations = []
    for product in products:

        lead_time = product.lead_time_days or 3

        safety_stock = (
            product.minimum_order_quantity
            or product.reorder_level
        )

        daily_stock_remaining = (
            product.current_stock / safety_stock
            if safety_stock > 0
            else 999
        )
        reasons = []
        score = 0

        if daily_stock_remaining <= 2:
            score += 50
            reasons.append("Critical stock coverage (≤2 days)")
        elif daily_stock_remaining <= 5:
            score += 35
            reasons.append("Low stock coverage (≤5 days)")
        elif daily_stock_remaining <= 10:
            score += 20
            reasons.append("Stock coverage below 10 days")
        if product.current_stock <= product.reorder_level:
            score += 25
            reasons.append("Below reorder level")
        if lead_time >= 7:
            score += 10
            reasons.append(f"Supplier lead time is {lead_time} days")

        score = min(score, 100)

        if score >= 80:
            priority = "High"
        elif score >= 50:
            priority = "Medium"
        else:
            priority = "Low"

        recommended_qty = max(
            safety_stock + lead_time - product.current_stock,
            0,
        )

        recommendations.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": product.current_stock,
                "recommended_order": round(recommended_qty, 2),
                "ai_score": score,
                "priority": priority,
                "reasons": reasons,
            }
        )
    recommendations.sort(
        key=lambda x: x["ai_score"],
        reverse=True,
    )

    return {
        "count": len(recommendations),
        "recommendations": recommendations,
    }

@router.get("/demand-forecast", response_model=dict)
def demand_forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    products = (
        db.query(Product)
        .filter(Product.organization_id == org_id)
        .all()
    )

    forecast = []
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)

    for product in products:

        consumption = (
            db.query(
                func.coalesce(
                    func.sum(
                        SaleItem.quantity *
                        RecipeIngredient.quantity_required
                    ),
                    0,
                )
            )
        
            .join(
                Sale,
                Sale.id == SaleItem.sale_id,
            )
            .join(
                RecipeIngredient,
                RecipeIngredient.recipe_id == SaleItem.recipe_id,
            )
            .filter(
                RecipeIngredient.product_id == product.id,
                Sale.sale_date >= thirty_days_ago,
            )
            .scalar()
        )

        avg_daily_usage = (
            consumption / 30
            if consumption
            else 0
        )
        forecast_7 = round(avg_daily_usage * 7, 2)
        forecast_15 = round(avg_daily_usage * 15, 2)
        forecast_30 = round(avg_daily_usage * 30, 2)

        if avg_daily_usage > 0:
            days_remaining = round(
                product.current_stock / avg_daily_usage,
                1,
            )
        else:
            days_remaining = None
        forecast.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": float(product.current_stock),
                "avg_daily_usage": round(avg_daily_usage, 2),
                "forecast_7_days": forecast_7,
                "forecast_15_days": forecast_15,
                "forecast_30_days": forecast_30,
                "days_remaining": days_remaining,
            }
        )
    forecast.sort(
        key=lambda x: (
            x["days_remaining"]
            if x["days_remaining"] is not None
            else 999999
        )
    )

    return {
        "forecast_days": 30,
        "count": len(forecast),
        "products": forecast,
    }

@router.get("/profit-summary", response_model=dict)
def get_profit_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    month_start = datetime.combine(
        today.replace(day=1),
        datetime.min.time(),
    )

    # Today's Revenue
    revenue_today = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= today_start,
        )
        .scalar()
    )

    # Today's COGS
    cogs_today = (
        db.query(
            func.coalesce(func.sum(Sale.cost_of_goods_sold), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= today_start,
        )
        .scalar()
    )

    # Today's Profit
    profit_today = (
        db.query(
            func.coalesce(func.sum(Sale.gross_profit), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= today_start,
        )
        .scalar()
    )

    # Monthly Revenue
    revenue_month = (
        db.query(
            func.coalesce(func.sum(Sale.total_amount), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    # Monthly COGS
    cogs_month = (
        db.query(
            func.coalesce(func.sum(Sale.cost_of_goods_sold), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    # Monthly Profit
    profit_month = (
        db.query(
            func.coalesce(func.sum(Sale.gross_profit), 0.0)
        )
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    today_margin = (
        (profit_today / revenue_today) * 100
        if revenue_today
        else 0
    )

    month_margin = (
        (profit_month / revenue_month) * 100
        if revenue_month
        else 0
    )

    return {
        "today": {
            "revenue": round(revenue_today, 2),
            "cogs": round(cogs_today, 2),
            "profit": round(profit_today, 2),
            "margin": round(today_margin, 2),
        },
        "month": {
            "revenue": round(revenue_month, 2),
            "cogs": round(cogs_month, 2),
            "profit": round(profit_month, 2),
            "margin": round(month_margin, 2),
        },
    }

@router.get("/top-profitable-items", response_model=dict)
def top_profitable_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_top_profitable_items(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/executive-summary", response_model=dict)
def executive_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    # Revenue
    revenue = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0.0))
        .filter(Sale.organization_id == org_id)
        .scalar()
    )

    # Total Orders
    total_orders = (
        db.query(func.count(Sale.id))
        .filter(Sale.organization_id == org_id)
        .scalar()
    )

    average_order_value = (
        round(revenue / total_orders, 2)
        if total_orders > 0
        else 0
    )

    # Profit
    profit = (
        db.query(func.coalesce(func.sum(Sale.gross_profit), 0.0))
        .filter(Sale.organization_id == org_id)
        .scalar()
    )
    gross_margin_percentage = (
        round((profit / revenue) * 100, 2)
        if revenue > 0
        else 0
    )
    # Total Cost of Goods Sold
    food_cost = (
        db.query(func.coalesce(func.sum(Sale.cost_of_goods_sold), 0.0))
        .filter(Sale.organization_id == org_id)
        .scalar()
    )
    food_cost_percentage = (
        round((food_cost / revenue) * 100, 2)
        if revenue > 0
        else 0
    )

    # Inventory Value
    inventory_value = (
        db.query(
            func.coalesce(
                func.sum(
                    Product.current_stock * Product.cost_price
                ),
                0.0,
            )
        )
        .filter(
            Product.organization_id == org_id,
        )
        .scalar()
    )
    
    # Today's Waste Cost
    today = datetime.utcnow().date()

    waste_today = (
        db.query(
            func.coalesce(func.sum(WastageLog.cost_loss), 0.0)
        )
        .filter(
            WastageLog.organization_id == org_id,
            func.date(WastageLog.created_at) == today,
        )
        .scalar()
    )
    waste_percentage = (
        round((waste_today / inventory_value) * 100, 2)
        if inventory_value > 0
        else 0
    )

    # Products
    total_products = (
        db.query(func.count(Product.id))
        .filter(Product.organization_id == org_id)
        .scalar()
    )

    # Active Batches
    active_batches = (
        db.query(func.count(Batch.id))
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
        )
        .scalar()
    )

    # Low Stock
    low_stock = (
        db.query(func.count(Product.id))
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level,
        )
        .scalar()
    )

    # Purchase Orders
    pending_po = (
        db.query(func.count(PurchaseOrder.id))
        .filter(
            PurchaseOrder.organization_id == org_id,
            PurchaseOrder.status.in_([
                "DRAFT",
                "PENDING_APPROVAL",
                "SENT",
            ]),
        )
        .scalar()
    )
    
    business_health = BusinessHealthService.business_health(
        db=db,
        organization_id=org_id,
    )
    inventory_turnover_data = get_inventory_turnover(
        db=db,
        organization_id=org_id,
    )

    return {
        "revenue": round(revenue, 2),
        "profit": round(profit, 2),
        "gross_margin_percentage": gross_margin_percentage,
        "inventory_value": round(inventory_value, 2),
        "food_cost_percentage": food_cost_percentage,
        "waste_today": round(waste_today, 2),
        "waste_percentage": waste_percentage,
        "total_products": total_products,
        "active_batches": active_batches,
        "low_stock_products": low_stock,
        "total_orders": total_orders,
        "average_order_value": average_order_value,
        "inventory_turnover": inventory_turnover_data["inventory_turnover"],
        "pending_purchase_orders": pending_po,
        "ai_score": business_health["score"],
        "business_grade": business_health["grade"],
        "business_status": business_health["status"],
    }

@router.get("/inventory-value")
def get_inventory_value(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return calculate_inventory_value(
        db=db,
        organization_id=current_user.organization_id,
    )
@router.get("/inventory-value-trend", response_model=list)
def inventory_value_trend(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_inventory_value_trend(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return dashboard_overview(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/top-products")
def top_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_top_selling_products(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/sales-trend")
def get_sales_trend(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return sales_trend(
        db=db,
        organization_id=current_user.organization_id,
        days=days,
    )

@router.get("/low-stock")
def low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_low_stock_items(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/expiring-items")
def expiring_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_expiring_items(
        db=db,
        organization_id=current_user.organization_id,
    )
    
@router.get("/top-selling-recipes")
def top_selling_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_top_selling_recipes(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/abc-analysis")
def inventory_abc_analysis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return abc_inventory_analysis(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/supplier-performance")
def supplier_performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return supplier_performance(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/products/{product_id}/ledger")
def product_ledger(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return inventory_ledger(
        db=db,
        organization_id=current_user.organization_id,
        product_id=product_id,
    )

@router.get("/customer-dashboard")
def customer_dashboard(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return sales_dashboard(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

@router.get("/ai-insights")
def ai_insights(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return generate_ai_insights(
        db=db,
        organization_id=current_user.organization_id,
    )
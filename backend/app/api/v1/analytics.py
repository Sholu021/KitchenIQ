from datetime import datetime, date, timedelta, UTC
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from app.core.deps import get_db, get_current_user, require_staff, require_manager
from app.models.models import User, Sale, WastageLog, Product, Category, InventoryTransaction, Batch
from app.services.analytics_service import calculate_inventory_value, get_dead_stock, get_inventory_aging, get_low_stock_products, get_expiring_batches, demand_forecast, inventory_health, calculate_inventory_health_score
from app.services.forecast_service import calculate_product_forecast, calculate_all_forecasts, calculate_reorder_recommendations
from app.services.supplier_analytics_service import get_supplier_summary, get_supplier_details

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics & Reporting"]
)

@router.get("/executive-summary")
def executive_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    today = date.today()
    month_start = today.replace(day=1)

    # Inventory Value
    inventory = calculate_inventory_value(db, org_id)

    # Sales This Month
    sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    # Gross Profit
    gross_profit = (
        db.query(func.coalesce(func.sum(Sale.gross_profit), 0))
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    # Wastage
    wastage = (
        db.query(func.coalesce(func.sum(WastageLog.cost_loss), 0))
        .filter(
            WastageLog.organization_id == org_id,
            WastageLog.created_at >= month_start,
        )
        .scalar()
    )

    # Low Stock
    low_stock = (
        db.query(Product)
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level,
        )
        .count()
    )

    return {
        "inventory_value": round(inventory, 2),
        "monthly_sales": round(sales, 2),
        "gross_profit": round(gross_profit, 2),
        "wastage_cost": round(wastage, 2),
        "low_stock_products": low_stock,
    }

@router.get("", response_model=dict)
def get_analytics_dashboard(
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    org_id = current_user.organization_id

    # 1. Sales Trend
    sales_trend = []
    # 2. Wastage Trend
    wastage_trend = []

    for i in range(days - 1, -1, -1):
        day_date = date.today() - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time())
        day_end = datetime.combine(day_date, datetime.max.time())

        # Sales sum for day
        sales_sum = db.query(func.coalesce(func.sum(Sale.total_amount), 0.0)).filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= day_start,
            Sale.sale_date <= day_end
        ).scalar()

        # Wastage sum for day
        wastage_sum = db.query(func.coalesce(func.sum(WastageLog.cost_loss), 0.0)).filter(
            WastageLog.organization_id == org_id,
            WastageLog.created_at >= day_start,
            WastageLog.created_at <= day_end
        ).scalar()

        date_str = day_date.strftime("%b %d")
        sales_trend.append({"date": date_str, "amount": float(sales_sum)})
        wastage_trend.append({"date": date_str, "amount": float(wastage_sum)})

    # 3. Category Breakdown (Inventory value by Category)
    category_data = db.query(
        Category.name,
        func.coalesce(func.sum(Product.current_stock * Product.cost_price), 0.0).label("value")
    ).select_from(Product).join(Category, Product.category_id == Category.id).filter(
        Product.organization_id == org_id
    ).group_by(Category.name).all()

    category_breakdown = [
        {"name": item[0], "value": float(item[1])} for item in category_data
    ]

    # Handle uncategorized products
    uncategorized_value = db.query(
        func.coalesce(func.sum(Product.current_stock * Product.cost_price), 0.0)
    ).filter(
        Product.organization_id == org_id,
        Product.category_id == None
    ).scalar()

    if uncategorized_value and float(uncategorized_value) > 0:
        category_breakdown.append({"name": "Uncategorized", "value": float(uncategorized_value)})

    # 4. Inventory Velocity (Last 30 Days Stock In vs Stock Out by Product)
    thirty_days_ago = datetime.now(UTC) - timedelta(days=30)
    
    velocity_data = db.query(
        Product.name,
        func.coalesce(func.sum(case((InventoryTransaction.transaction_type == 'STOCK_IN', InventoryTransaction.quantity), else_=0.0)), 0.0).label("stock_in"),
        func.coalesce(func.sum(case((InventoryTransaction.transaction_type == 'STOCK_OUT', func.abs(InventoryTransaction.quantity)), else_=0.0)), 0.0).label("stock_out")
    ).select_from(InventoryTransaction).join(Product, InventoryTransaction.product_id == Product.id).filter(
        Product.organization_id == org_id,
        InventoryTransaction.created_at >= thirty_days_ago
    ).group_by(Product.name).limit(10).all()

    inventory_velocity = []
    for item in velocity_data:
        inventory_velocity.append({
            "product_name": item[0],
            "stock_in": float(item[1]),
            "stock_out": float(item[2])
        })

    return {
        "sales_trend": sales_trend,
        "wastage_trend": wastage_trend,
        "category_breakdown": category_breakdown,
        "inventory_velocity": inventory_velocity
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

@router.get("/inventory-health-score")
def inventory_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return calculate_inventory_health_score(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/dead-stock")
def dead_stock(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_dead_stock(
        db=db,
        organization_id=current_user.organization_id,
        days=days,
    )

@router.get("/inventory-aging")
def inventory_aging(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_inventory_aging(
        db=db,
        organization_id=current_user.organization_id,
    )
@router.get("/batch-trace/{batch_id}")
def batch_trace(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    batch = (
        db.query(Batch)
        .filter(
            Batch.id == batch_id,
            Batch.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found",
        )

    transactions = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.batch_id == batch.id,
        )
        .order_by(InventoryTransaction.created_at.asc())
        .all()
    )

    history = []

    for txn in transactions:
        history.append(
            {
                "date": txn.created_at,
                "type": txn.transaction_type,
                "quantity": txn.quantity,
                "notes": txn.notes,
            }
        )

    return {
        "batch_id": batch.id,
        "batch_number": batch.batch_number,
        "product": batch.product.name,
        "received": batch.received_at,
        "expiry_date": batch.expiry_date,
        "purchase_price": batch.purchase_price,
        "original_quantity": batch.quantity,
        "remaining_quantity": batch.remaining_quantity,
        "history": history,
    }

@router.get("/sales")
def sales_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    today = date.today()
    week_start = today - timedelta(days=7)
    month_start = today.replace(day=1)

    today_sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.organization_id == org_id,
            func.date(Sale.sale_date) == today,
        )
        .scalar()
    )

    week_sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= week_start,
        )
        .scalar()
    )

    month_sales = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.organization_id == org_id,
            Sale.sale_date >= month_start,
        )
        .scalar()
    )

    total_orders = (
        db.query(Sale)
        .filter(Sale.organization_id == org_id)
        .count()
    )

    average_order = (
        round(month_sales / total_orders, 2)
        if total_orders
        else 0
    )

    return {
        "today_sales": round(today_sales, 2),
        "week_sales": round(week_sales, 2),
        "month_sales": round(month_sales, 2),
        "total_orders": total_orders,
        "average_order_value": average_order,
    }

@router.get("/inventory")
def inventory_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    inventory = calculate_inventory_value(db, org_id)

    total_products = (
        db.query(Product)
        .filter(Product.organization_id == org_id)
        .count()
    )

    active_batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
        )
        .count()
    )

    total_units = (
        db.query(func.coalesce(func.sum(Product.current_stock), 0))
        .filter(Product.organization_id == org_id)
        .scalar()
    )

    low_stock = (
        db.query(Product)
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= Product.reorder_level,
        )
        .count()
    )

    out_of_stock = (
        db.query(Product)
        .filter(
            Product.organization_id == org_id,
            Product.current_stock <= 0,
        )
        .count()
    )

    return {
        "inventory_value": inventory["inventory_value"],
        "total_products": total_products,
        "active_batches": inventory["active_batches"],
        "total_units": inventory["total_units"],
        "low_stock_products": low_stock,
        "out_of_stock_products": out_of_stock,
    }

@router.get("/wastage")
def wastage_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    today = date.today()
    month_start = today.replace(day=1)

    total_loss = (
        db.query(func.coalesce(func.sum(WastageLog.cost_loss), 0))
        .filter(
            WastageLog.organization_id == org_id,
            WastageLog.created_at >= month_start,
        )
        .scalar()
    )

    total_events = (
        db.query(WastageLog)
        .filter(
            WastageLog.organization_id == org_id,
            WastageLog.created_at >= month_start,
        )
        .count()
    )

    top_products = (
        db.query(
            Product.name,
            func.sum(WastageLog.quantity).label("quantity"),
            func.sum(WastageLog.cost_loss).label("loss"),
        )
        .join(Product, Product.id == WastageLog.product_id)
        .filter(
            WastageLog.organization_id == org_id,
            WastageLog.created_at >= month_start,
        )
        .group_by(Product.name)
        .order_by(func.sum(WastageLog.cost_loss).desc())
        .limit(5)
        .all()
    )

    return {
        "monthly_wastage_cost": round(total_loss, 2),
        "wastage_events": total_events,
        "top_wastage_products": [
            {
                "product": p.name,
                "quantity": float(p.quantity),
                "cost_loss": round(float(p.loss), 2),
            }
            for p in top_products
        ],
    }

@router.get("/forecast/{product_id}")
def get_product_forecast(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return calculate_product_forecast(
        db=db,
        organization_id=current_user.organization_id,
        product_id=product_id,
    )

@router.get("/reorder-recommendations")
def get_reorder_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return calculate_reorder_recommendations(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/suppliers")
def supplier_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return get_supplier_summary(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/suppliers/{supplier_id}")
def supplier_details(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return get_supplier_details(
        db=db,
        organization_id=current_user.organization_id,
        supplier_id=supplier_id,
    )

@router.get("/low-stock")
def low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_low_stock_products(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/expiring")
def expiring_inventory(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return get_expiring_batches(
        db=db,
        organization_id=current_user.organization_id,
        days=days,
    )

@router.get("/forecast")
def forecast(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    print("USING analytics_service.demand_forecast")

    return demand_forecast(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/inventory-health")
def get_inventory_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return inventory_health(
        db=db,
        organization_id=current_user.organization_id,
    )
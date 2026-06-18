from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, select

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import User, Sale, SaleItem, Product, Batch, Recipe, InventoryTransaction

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
    today = date.today()
    in_30_days = today + timedelta(days=30)
    expiring_count = db.query(func.count(Batch.id)).filter(
        Batch.organization_id == org_id,
        Batch.quantity > 0,
        Batch.expiry_date <= in_30_days
    ).scalar()

    # 6. Top Selling Recipes
    # Group SaleItem by recipe_id and sum quantity
    top_selling = db.query(
        Recipe.name,
        func.sum(SaleItem.quantity).label("sold_qty")
    ).select_from(SaleItem).join(Recipe, SaleItem.recipe_id == Recipe.id).filter(
        Recipe.organization_id == org_id
    ).group_by(Recipe.name).order_by(func.sum(SaleItem.quantity).desc()).limit(5).all()

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
    # Group by product name, sum transaction quantity where transaction_type is STOCK_OUT (or negative quantities)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    consumption_query = db.query(
        Product.name,
        func.abs(func.sum(InventoryTransaction.quantity)).label("total_consumed")
    ).select_from(InventoryTransaction).join(Product, InventoryTransaction.product_id == Product.id).filter(
        Product.organization_id == org_id,
        InventoryTransaction.created_at >= thirty_days_ago,
        InventoryTransaction.transaction_type == "STOCK_OUT"
    ).group_by(Product.name).order_by(func.sum(InventoryTransaction.quantity).asc()).limit(5).all()


    consumption_data = [
        {"product_name": item[0], "quantity_consumed": float(item[1])} for item in consumption_query
    ]

    return {
        "cards": {
            "revenue_today": float(revenue_today),
            "revenue_month": float(revenue_month),
            "inventory_value": float(inventory_value),
            "low_stock_products": int(low_stock_count),
            "expiring_products": int(expiring_count)
        },
        "top_selling_recipes": top_recipes,
        "sales_trend": sales_trend_data,
        "inventory_consumption": consumption_data
    }

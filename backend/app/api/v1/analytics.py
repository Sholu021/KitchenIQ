from datetime import datetime, date, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from app.core.deps import get_db, require_staff
from app.models.models import User, Sale, WastageLog, Product, Category, InventoryTransaction

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

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
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
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

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.models.models import (
    Sale,
    SaleItem,
    Recipe,
    Product,
    PurchaseOrder,
)

from app.services.analytics_service import (
    calculate_inventory_value,
    calculate_inventory_health_score,
    get_low_stock_products,
    get_expiring_batches,
    get_dead_stock,
)

from app.services.notification_service import (
    unread_count,
)

def dashboard_overview(
    db: Session,
    organization_id: int,
):
    inventory = calculate_inventory_value(
        db=db,
        organization_id=organization_id,
    )

    health = calculate_inventory_health_score(
        db=db,
        organization_id=organization_id,
    )

    low_stock = get_low_stock_products(
        db=db,
        organization_id=organization_id,
    )

    notifications = unread_count(
        db=db,
        organization_id=organization_id,
    )

    draft_pos = (
        db.query(func.count(PurchaseOrder.id))
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == "DRAFT",
        )
        .scalar()
    )

    pending_pos = (
        db.query(func.count(PurchaseOrder.id))
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == "PENDING_APPROVAL",
        )
        .scalar()
    )

    sent_pos = (
        db.query(func.count(PurchaseOrder.id))
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == "SENT",
        )
        .scalar()
    )

    gross_profit = (
        db.query(func.coalesce(func.sum(Sale.gross_profit), 0))
        .filter(
            Sale.organization_id == organization_id,
        )
        .scalar()
    )

    return {
        "inventory": {
            "value": inventory["inventory_value"],
            "health_score": health["score"],
            "grade": health["grade"],
            "active_batches": inventory["active_batches"],
            "total_units": inventory["total_units"],
        },
        "sales": {
            "today": round(sales_today, 2),
            "this_week": round(sales_week, 2),
            "this_month": round(sales_month, 2),
            "orders_today": orders_today,
            "gross_profit": round(gross_profit, 2),
        },
        "stock": {
            "low_stock": len(low_stock),
        },
        "purchase_orders": {
            "draft": draft_pos,
            "pending_approval": pending_pos,
            "sent": sent_pos,
        },
        "notifications": {
            "unread": notifications,
        },
    }

def get_top_selling_products(
    db: Session,
    organization_id: int,
):
    
    top_products = (
        db.query(
            SaleItem.recipe_id,
            Recipe.name.label("recipe_name"),
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.revenue).label("revenue"),
        )
        .join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .join(
            Recipe,
            Recipe.id == SaleItem.recipe_id,
        )

        .filter(
            Sale.organization_id == organization_id,
        )
        .group_by(
            SaleItem.recipe_id,
            Recipe.name,
        )
        .order_by(
            func.sum(SaleItem.quantity).desc(),
        )
        .limit(10)
        .all()
    )

    return [
        {
            "recipe_id": row.recipe_id,
            "recipe_name": row.recipe_name,
            "quantity_sold": int(row.quantity_sold),
            "revenue": round(float(row.revenue), 2),
        }
        for row in top_products
    ]

def get_top_profitable_items(
    db: Session,
    organization_id: int,
):
    rows = (
        db.query(
            SaleItem.recipe_id,
            Recipe.name.label("recipe_name"),
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.revenue).label("revenue"),
            func.sum(SaleItem.cost_of_goods_sold).label("cogs"),
            func.sum(SaleItem.gross_profit).label("profit"),
        )
        .join(Sale, Sale.id == SaleItem.sale_id)
        .join(Recipe, Recipe.id == SaleItem.recipe_id)
        .filter(
            Sale.organization_id == organization_id,
        )
        .group_by(
            SaleItem.recipe_id,
            Recipe.name,
        )
        .order_by(
            func.sum(SaleItem.gross_profit).desc(),
        )
        .limit(10)
        .all()
    )

    return {
        "count": len(rows),
        "items": [
            {
                "recipe_id": row.recipe_id,
                "recipe_name": row.recipe_name,
                "quantity_sold": int(row.quantity_sold),
                "revenue": round(float(row.revenue), 2),
                "cogs": round(float(row.cogs), 2),
                "profit": round(float(row.profit), 2),
                "margin": round(
                    (float(row.profit) / float(row.revenue) * 100)
                    if row.revenue else 0,
                    2,
                ),
            }
            for row in rows
        ],
    }
 
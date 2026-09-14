from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.models.models import (
    Sale,
    SaleItem,
    Recipe,
    Product,
    PurchaseOrder,
    Batch,
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

def get_top_selling_recipes(
    db: Session,
    organization_id: int,
):
    results = (
        db.query(
            Recipe.name.label("recipe_name"),
            func.sum(SaleItem.quantity).label("quantity_sold"),
            func.sum(SaleItem.revenue).label("revenue"),
        )
        .join(SaleItem, SaleItem.recipe_id == Recipe.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.organization_id == organization_id)
        .group_by(Recipe.id, Recipe.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )

    return [
        {
            "recipe_name": r.recipe_name,
            "quantity_sold": float(r.quantity_sold or 0),
            "revenue": float(r.revenue or 0),
        }
        for r in results
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
 
def get_top_selling_products(
    db: Session,
    organization_id: int,
    limit: int = 5,
):
    rows = (
        db.query(
            Recipe.id.label("product_id"),
            Recipe.name.label("product_name"),
            func.sum(SaleItem.quantity).label("quantity_sold"),
        )
        .join(SaleItem, SaleItem.recipe_id == Recipe.id)
        .filter(Recipe.organization_id == organization_id)
        .group_by(Recipe.id, Recipe.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "quantity_sold": int(row.quantity_sold or 0),
        }
        for row in rows
    ]

def get_low_stock_items(
    db: Session,
    organization_id: int,
):
    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            Product.current_stock <= Product.reorder_level,
        )
        .order_by(Product.current_stock.asc())
        .all()
    )

    return [
        {
            "id": p.id,
            "name": p.name,
            "stock": float(p.current_stock),
            "unit": p.unit,
            "reorder_level": float(p.reorder_level),
        }
        for p in products
    ]

def get_expiring_items(
    db: Session,
    organization_id: int,
):
    from datetime import date

    batches = (
        db.query(Batch)
        .join(Product, Product.id == Batch.product_id)
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date.isnot(None),
)
        .order_by(Batch.expiry_date.asc())
        .limit(10)
        .all()
    )

    today = date.today()

    result = []

    for batch in batches:
        days_left = (batch.expiry_date - today).days

        result.append(
            {
                "id": batch.id,
                "name": batch.product.name,
                "quantity": float(batch.remaining_quantity),
                "unit": batch.product.unit,
                "expiry_date": batch.expiry_date,
                "days_left": days_left,
            }
        )

    return result

def get_inventory_value_trend(
    db: Session,
    organization_id: int,
    days: int = 30,
):
    start_date = datetime.utcnow() - timedelta(days=days)

    rows = (
        db.query(
            func.date(Batch.created_at).label("date"),
            func.sum(
                Batch.remaining_quantity * Batch.purchase_price
            ).label("inventory_value"),
        )
        .filter(
            Batch.organization_id == organization_id,
            Batch.created_at >= start_date,
            Batch.remaining_quantity > 0,
        )
        .group_by(func.date(Batch.created_at))
        .order_by(func.date(Batch.created_at))
        .all()
    )

    return [
        {
            "date": str(row.date),
            "inventory_value": round(
                float(row.inventory_value or 0),
                2,
            ),
        }
        for row in rows
    ]

def get_inventory_turnover(
    db: Session,
    organization_id: int,
):
    # Total COGS
    total_cogs = (
        db.query(
            func.coalesce(
                func.sum(Sale.cost_of_goods_sold),
                0.0,
            )
        )
        .filter(
            Sale.organization_id == organization_id,
        )
        .scalar()
    )

    # Current inventory value
    inventory_value = (
        db.query(
            func.coalesce(
                func.sum(
                    Batch.remaining_quantity
                    * Batch.purchase_price
                ),
                0.0,
            )
        )
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
        )
        .scalar()
    )

    turnover = (
        round(float(total_cogs) / float(inventory_value), 2)
        if inventory_value > 0
        else 0
    )

    return {
        "inventory_turnover": turnover,
        "total_cogs": round(float(total_cogs), 2),
        "inventory_value": round(float(inventory_value), 2),
    }
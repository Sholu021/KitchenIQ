from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Sale, PurchaseOrder
from app.services.analytics_service import calculate_inventory_value

def profit_and_loss(
    db: Session,
    organization_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
):
    if to_date is None:
        to_date = date.today()

    if from_date is None:
        from_date = to_date - timedelta(days=30)

    from_datetime = datetime.combine(
        from_date,
        datetime.min.time(),
    )

    to_datetime = datetime.combine(
        to_date,
        datetime.max.time(),
    )

    # ...rest of your code...
    revenue = (
        db.query(func.coalesce(func.sum(Sale.total_amount), 0))
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .scalar()
    )
    cogs = (
        db.query(func.coalesce(func.sum(Sale.cost_of_goods_sold), 0))
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_date,
            Sale.sale_date <= to_date,
        )
        .scalar()
    )

    gross_profit = revenue - cogs
    operating_expenses = 0.0

    net_profit = gross_profit - operating_expenses

    sales_count = (
        db.query(func.count(Sale.id))
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .scalar()
    )

    average_order_value = (
        revenue / sales_count
        if sales_count
        else 0
    )

    purchases = (
        db.query(func.coalesce(func.sum(PurchaseOrder.total_amount), 0))
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status == "RECEIVED",
            PurchaseOrder.received_date >= from_datetime,
            PurchaseOrder.received_date < to_datetime,
        )
        .scalar()
    )
    inventory = calculate_inventory_value(
        db=db,
        organization_id=organization_id,
    )

    return {
        "period": {
            "from": from_date,
            "to": to_date,
        },
        "revenue": round(revenue, 2),
        "sales_count": sales_count,
        "average_order_value": round(
            average_order_value,
            2,
        ),
        "cost_of_goods_sold": round(cogs, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_margin": round(
            (gross_profit / revenue * 100)
            if revenue else 0,
            2,
        ),
        "operating_expenses": round(
            operating_expenses,
            2,
        ),
        "net_profit": round(net_profit, 2),
        "purchases": round(purchases, 2),
        "inventory_value": round(
            inventory["inventory_value"],
            2,
        ),
    }
from datetime import date, datetime, timedelta

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.models import Sale, SaleItem
from app.services.dashboard_service import get_top_selling_products

def customer_dashboard(
    db: Session,
    organization_id: int,
    from_date: date,
    to_date: date,
):
    from_datetime = datetime.combine(
        from_date,
        datetime.min.time(),
    )

    to_datetime = datetime.combine(
        to_date + timedelta(days=1),
        datetime.min.time(),
    )

    revenue = (
        db.query(
            func.coalesce(
                func.sum(Sale.total_amount),
                0,
            )
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .scalar()
    )

    orders = (
        db.query(
            func.count(Sale.id)
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .scalar()
    ) 

    average_order_value = (
        revenue / orders
        if orders
        else 0
    )

    weekday_sales = (
        db.query(
            extract("dow", Sale.sale_date).label("weekday"),
            func.count(Sale.id).label("orders"),
            func.sum(Sale.total_amount).label("revenue"),
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .group_by(
            extract("dow", Sale.sale_date)
        )
        .order_by(
            func.count(Sale.id).desc()
        )
        .all()
    )

    weekday_names = {
        0: "Sunday",
        1: "Monday",
        2: "Tuesday",
        3: "Wednesday",
        4: "Thursday",
        5: "Friday",
        6: "Saturday",
    }

    weekday_analysis = [
        {
            "weekday": weekday_names[int(row.weekday)],
            "orders": row.orders,
            "revenue": round(float(row.revenue), 2),
        }
        for row in weekday_sales
    ]

    hourly_sales = (
        db.query(
            extract("hour", Sale.sale_date).label("hour"),
            func.count(Sale.id).label("orders"),
            func.sum(Sale.total_amount).label("revenue"),
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .group_by(
            extract("hour", Sale.sale_date)
        )
        .order_by(
            func.count(Sale.id).desc()
        )
        .all()
    )

    hourly_analysis = [
        {
            "hour": int(row.hour),
            "orders": row.orders,
            "revenue": round(float(row.revenue), 2),
        }
        for row in hourly_sales
    ]

    basket_items = (
        db.query(
            SaleItem.sale_id,
            func.count(SaleItem.id).label("items"),
        )
        .join(
            Sale,
            Sale.id == SaleItem.sale_id,
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= from_datetime,
            Sale.sale_date < to_datetime,
        )
        .group_by(SaleItem.sale_id)
        .subquery()
    ) 

    average_items = (
        db.query(
            func.avg(basket_items.c.items)
        ).scalar()
    )

    top_products = get_top_selling_products(
        db=db,
        organization_id=organization_id,
    )

    return {
        "summary": {
            "total_orders": orders,
            "total_revenue": round(revenue, 2),
            "average_order_value": round(
                average_order_value,
                2,
            ),
        },
        "weekday_analysis": weekday_analysis,
        "hourly_analysis": hourly_analysis,
        "basket_analysis": {
            "average_items_per_order": round(
                float(average_items or 0),
                2,
            ),
        },
        "top_products": top_products,
    }
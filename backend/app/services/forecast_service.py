from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Sale, SaleItem, RecipeIngredient, Product, Supplier, Batch
import math

def calculate_product_forecast(
    db: Session,
    organization_id: int,
    product_id: int,
    days: int = 30,
):
    """
    Average daily consumption based on last N days.
    """

    start_date = date.today() - timedelta(days=days)

    total_sold = (
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
            Sale.organization_id == organization_id,
            RecipeIngredient.product_id == product_id,
            Sale.sale_date >= start_date,
        )
        .scalar()
    )

    avg_daily_usage = (
        total_sold / days
        if days > 0
        else 0
    )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.organization_id == organization_id,
        )
        .first()
    )

    current_stock = product.current_stock if product else 0

    days_remaining = (
        current_stock / avg_daily_usage
        if avg_daily_usage > 0
        else None
    )

    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_stock": current_stock,
        "avg_daily_usage": round(avg_daily_usage, 2),
        "forecast_7_days": round(avg_daily_usage * 7, 2),
        "forecast_15_days": round(avg_daily_usage * 15, 2),
        "forecast_30_days": round(avg_daily_usage * 30, 2),
        "days_remaining": (
            round(days_remaining, 1)
            if days_remaining is not None
            else None
        ),
    }

def calculate_all_forecasts(
    db: Session,
    organization_id: int,
):
    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            Product.is_finished_product == False,
        )
        .order_by(Product.name)
        .all()
    )

    forecasts = []

    for product in products:
        forecasts.append(
            calculate_product_forecast(
                db=db,
                organization_id=organization_id,
                product_id=product.id,
            )
        )

    return forecasts

def calculate_reorder_recommendations(
    db: Session,
    organization_id: int,
):
    forecasts = calculate_all_forecasts(
        db=db,
        organization_id=organization_id,
    )

    recommendations = []

    for item in forecasts:

        days_remaining = item["days_remaining"]

        product = (
            db.query(Product)
            .filter(
                Product.id == item["product_id"],
                Product.organization_id == organization_id,
            )
            .first()
        )

        if not product or not product.supplier_id:
            continue

        supplier = (
            db.query(Supplier)
            .filter(Supplier.id == product.supplier_id)
            .first()
        )

        if not supplier:
            continue
        # Skip products without enough sales history
        if days_remaining is None:
            continue

        # Recommend only if stock will run out within 7 days
        lead_time = supplier.lead_time_days or 2
        safety_days = 3

        reorder_trigger = lead_time + safety_days
        warning_trigger = reorder_trigger * 2

        if days_remaining <= reorder_trigger:
            status = "REORDER NOW"
        elif days_remaining <= warning_trigger:
            status = "LOW STOCK"
        else:
            status = "OK"

        target_stock = (
            item["avg_daily_usage"]
            * warning_trigger
        )

        recommended_qty = max(
            target_stock - item["current_stock"],
            0,
        )

        if recommended_qty <= 0:
            continue

        # Respect supplier MOQ
        recommended_qty = max(
            recommended_qty,
            supplier.minimum_order_quantity,
        )

        # Respect supplier order multiple
        multiple = supplier.order_multiple or 1

        if multiple > 1:
            recommended_qty = (
                math.ceil(recommended_qty / multiple)
                * multiple
            )

        recommendations.append(
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "current_stock": item["current_stock"],
                "days_remaining": item["days_remaining"],
                "status": status,
                "recommended_order_quantity": round(
                    recommended_qty,
                    2,
                ),
                "priority": (
                    "HIGH"
                    if status == "REORDER NOW"
                    else "MEDIUM"
                    if status == "LOW STOCK"
                    else "LOW"
                ),
            }
        )

    priority_order = {
        "HIGH": 1,
        "MEDIUM": 2,
        "LOW": 3,
    }

    recommendations.sort(
        key=lambda x: (
            priority_order[x["priority"]],
            x["days_remaining"],
        )
    )

    return {
        "count": len(recommendations),
        "recommendations": recommendations,
    }
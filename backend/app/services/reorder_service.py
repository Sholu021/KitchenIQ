from datetime import datetime, timedelta, UTC

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    Product,
    RecipeIngredient,
    Sale,
    SaleItem,
)


def smart_reorder(
    db: Session,
    organization_id: int,
):
    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            Product.cost_price > 0,
        )
        .all()
    )

    recommendations = []

    last_30 = datetime.now(UTC) - timedelta(days=30)

    for product in products:

        total_used = (
            db.query(
                func.coalesce(
                    func.sum(
                        RecipeIngredient.quantity_required *
                        SaleItem.quantity
                    ),
                    0,
                )
            )
            .join(
                SaleItem,
                SaleItem.recipe_id == RecipeIngredient.recipe_id,
            )
            .join(
                Sale,
                Sale.id == SaleItem.sale_id,
            )
            .filter(
                Sale.organization_id == organization_id,
                RecipeIngredient.product_id == product.id,
                Sale.sale_date >= last_30,
            )
            .scalar()
        )

        avg_daily_usage = float(total_used) / 30

        if avg_daily_usage > 0:
            days_remaining = (
                product.current_stock /
                avg_daily_usage
            )
        else:
            days_remaining = None

        target_stock = avg_daily_usage * 30

        recommended = max(
            target_stock - product.current_stock,
            0,
        )

        if days_remaining is None:
            priority = "None"
        elif days_remaining < 7:
            priority = "Critical"
        elif days_remaining < 15:
            priority = "High"
        elif days_remaining < 30:
            priority = "Medium"
        else:
            priority = "Low"

        recommendations.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": round(product.current_stock, 2),
                "average_daily_usage": round(avg_daily_usage, 2),
                "days_remaining": (
                    round(days_remaining, 1)
                    if days_remaining is not None
                    else None
                ),
                "recommended_order": round(recommended, 2),
                "priority": priority,
            }
        )

    recommendations.sort(
        key=lambda x: (
            ["Critical", "High", "Medium", "Low", "None"].index(
                x["priority"]
            ),
            x["days_remaining"]
            if x["days_remaining"] is not None
            else 9999,
        )
    )

    return {
        "count": len(recommendations),
        "recommendations": recommendations,
    }
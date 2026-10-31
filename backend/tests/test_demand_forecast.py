from datetime import datetime, UTC

import pytest

from app.models.models import (
    Organization,
    Product,
    Recipe,
    RecipeIngredient,
    Sale,
    SaleItem,
)
from app.services.analytics_service import demand_forecast


def test_demand_forecast_normalizes_ingredient_usage_by_recipe_yield(db):
    organization = Organization(name="Forecast Yield Test Organization")
    db.add(organization)
    db.flush()

    ingredient = Product(
        organization_id=organization.id,
        name="Forecast Ingredient",
        unit="g",
        current_stock=100.0,
        cost_price=1.0,
        selling_price=2.0,
        is_finished_product=False,
    )
    finished_product = Product(
        organization_id=organization.id,
        name="Forecast Menu Item",
        unit="portion",
        current_stock=0.0,
        is_finished_product=True,
    )
    db.add_all([ingredient, finished_product])
    db.flush()

    recipe = Recipe(
        organization_id=organization.id,
        name="Four Portion Recipe",
        yield_quantity=4,
        yield_unit="portion",
        selling_price=20.0,
        finished_product_id=finished_product.id,
    )
    db.add(recipe)
    db.flush()

    db.add(
        RecipeIngredient(
            recipe_id=recipe.id,
            product_id=ingredient.id,
            quantity_required=8.0,
        )
    )
    sale = Sale(
        organization_id=organization.id,
        sale_date=datetime.now(UTC),
        total_amount=40.0,
    )
    db.add(sale)
    db.flush()
    db.add(
        SaleItem(
            sale_id=sale.id,
            recipe_id=recipe.id,
            quantity=2,
            unit_price=20.0,
            revenue=40.0,
        )
    )
    db.commit()

    forecast = demand_forecast(db, organization.id)
    item = next(row for row in forecast if row["product_id"] == ingredient.id)

    # Two portions of a four-portion recipe consume 4g, not 16g.
    # The API intentionally rounds the displayed daily usage to 2 decimals.
    assert item["avg_daily_usage"] == pytest.approx(round(4.0 / 30.0, 2))
    assert item["forecast_30_days"] == pytest.approx(4.0)

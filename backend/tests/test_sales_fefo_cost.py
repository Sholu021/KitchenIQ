from datetime import date, timedelta

import pytest

from app.models.models import (
    Batch,
    Organization,
    Product,
    Recipe,
    RecipeIngredient,
    SaleItem,
)
from app.services.sales_service import create_sale


def test_sale_costs_share_fefo_batches_across_all_recipe_items(db):
    organization = Organization(name="Aggregate FEFO Cost Test")
    db.add(organization)
    db.flush()

    ingredient = Product(
        organization_id=organization.id,
        name="Shared Ingredient",
        unit="g",
        current_stock=20.0,
        cost_price=2.0,
        selling_price=5.0,
    )
    finished_products = [
        Product(
            organization_id=organization.id,
            name=f"Menu Item {index}",
            unit="portion",
            current_stock=0.0,
            selling_price=50.0,
            is_finished_product=True,
        )
        for index in (1, 2)
    ]
    db.add_all([ingredient, *finished_products])
    db.flush()

    recipes = []
    for index, finished_product in enumerate(finished_products, start=1):
        recipe = Recipe(
            organization_id=organization.id,
            name=f"Recipe {index}",
            yield_quantity=1,
            yield_unit="portion",
            selling_price=50.0,
            finished_product_id=finished_product.id,
        )
        db.add(recipe)
        db.flush()
        db.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                product_id=ingredient.id,
                quantity_required=10.0,
            )
        )
        recipes.append(recipe)

    db.add_all(
        [
            Batch(
                organization_id=organization.id,
                product_id=ingredient.id,
                batch_number="FEFO-FIRST",
                expiry_date=date.today() + timedelta(days=1),
                quantity=5.0,
                remaining_quantity=5.0,
                purchase_price=1.0,
            ),
            Batch(
                organization_id=organization.id,
                product_id=ingredient.id,
                batch_number="FEFO-SECOND",
                expiry_date=date.today() + timedelta(days=2),
                quantity=15.0,
                remaining_quantity=15.0,
                purchase_price=2.0,
            ),
        ]
    )
    db.commit()

    sale = create_sale(
        db=db,
        organization_id=organization.id,
        items_data=[
            {"recipe_id": recipe.id, "quantity": 1}
            for recipe in recipes
        ],
    )

    sale_items = (
        db.query(SaleItem)
        .filter(SaleItem.sale_id == sale.id)
        .order_by(SaleItem.id)
        .all()
    )

    # Aggregate usage is 20g: 5g at ₹1 and 15g at ₹2 = ₹35 total.
    assert sale.cost_of_goods_sold == pytest.approx(35.0)
    assert sum(item.cost_of_goods_sold for item in sale_items) == pytest.approx(35.0)
    assert [item.cost_of_goods_sold for item in sale_items] == pytest.approx([17.5, 17.5])

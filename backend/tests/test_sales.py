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


@pytest.mark.parametrize(
    ("yield_quantity", "ingredient_quantity", "sale_quantity", "expected_usage"),
    [
        (4, 8.0, 2, 4.0),  # A four-portion batch uses 8 units; two portions use 4.
        (1, 3.0, 1, 3.0),  # A single-portion recipe keeps its full ingredient quantity.
    ],
)
def test_sale_consumes_per_serving_recipe_quantities(
    db,
    yield_quantity,
    ingredient_quantity,
    sale_quantity,
    expected_usage,
):
    organization = Organization(name="Sales Test Organization")
    db.add(organization)
    db.flush()

    ingredient_product = Product(
        organization_id=organization.id,
        name="Test Ingredient",
        unit="g",
        current_stock=20.0,
        cost_price=3.0,
        selling_price=4.0,
        is_finished_product=False,
    )
    finished_product = Product(
        organization_id=organization.id,
        name="Test Menu Item",
        unit="portion",
        current_stock=0.0,
        cost_price=0.0,
        selling_price=20.0,
        is_finished_product=True,
    )
    db.add_all([ingredient_product, finished_product])
    db.flush()

    recipe = Recipe(
        organization_id=organization.id,
        name="Test Recipe",
        yield_quantity=yield_quantity,
        yield_unit="portion",
        selling_price=20.0,
        finished_product_id=finished_product.id,
    )
    db.add(recipe)
    db.flush()

    db.add(
        RecipeIngredient(
            recipe_id=recipe.id,
            product_id=ingredient_product.id,
            quantity_required=ingredient_quantity,
        )
    )
    db.add(
        Batch(
            organization_id=organization.id,
            product_id=ingredient_product.id,
            batch_number="TEST-BATCH",
            quantity=20.0,
            remaining_quantity=20.0,
            purchase_price=3.0,
        )
    )
    db.commit()

    sale = create_sale(
        db=db,
        organization_id=organization.id,
        items_data=[{"recipe_id": recipe.id, "quantity": sale_quantity}],
    )

    db.refresh(ingredient_product)
    db.refresh(sale)
    sale_item = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).one()

    assert ingredient_product.current_stock == pytest.approx(20.0 - expected_usage)
    assert sale_item.cost_of_goods_sold == pytest.approx(expected_usage * 3.0)
    assert sale.cost_of_goods_sold == pytest.approx(expected_usage * 3.0)


def test_sale_rejects_non_positive_recipe_yield_even_without_ingredients(db):
    from fastapi import HTTPException

    organization = Organization(name="Invalid Yield Test Organization")
    db.add(organization)
    db.flush()

    finished_product = Product(
        organization_id=organization.id,
        name="Invalid Yield Menu Item",
        unit="portion",
        current_stock=0.0,
        cost_price=0.0,
        selling_price=20.0,
        is_finished_product=True,
    )
    db.add(finished_product)
    db.flush()

    recipe = Recipe(
        organization_id=organization.id,
        name="Zero Yield Recipe",
        yield_quantity=0,
        yield_unit="portion",
        selling_price=20.0,
        finished_product_id=finished_product.id,
    )
    db.add(recipe)
    db.commit()

    with pytest.raises(HTTPException) as exc_info:
        create_sale(
            db=db,
            organization_id=organization.id,
            items_data=[{"recipe_id": recipe.id, "quantity": 1}],
        )

    assert exc_info.value.status_code == 400
    assert "positive yield quantity" in exc_info.value.detail


def test_multi_item_sale_allocates_shared_ingredient_batches_once(db):
    organization = Organization(name="Shared Ingredient COGS Test")
    db.add(organization)
    db.flush()

    ingredient = Product(
        organization_id=organization.id,
        name="Shared Coffee",
        unit="g",
        current_stock=20.0,
        cost_price=9.0,
        selling_price=12.0,
        is_finished_product=False,
    )
    menu_a = Product(
        organization_id=organization.id,
        name="Coffee A",
        unit="portion",
        current_stock=0.0,
        cost_price=0.0,
        selling_price=30.0,
        is_finished_product=True,
    )
    menu_b = Product(
        organization_id=organization.id,
        name="Coffee B",
        unit="portion",
        current_stock=0.0,
        cost_price=0.0,
        selling_price=35.0,
        is_finished_product=True,
    )
    db.add_all([ingredient, menu_a, menu_b])
    db.flush()

    recipe_a = Recipe(
        organization_id=organization.id,
        name="Recipe A",
        yield_quantity=1,
        yield_unit="portion",
        selling_price=30.0,
        finished_product_id=menu_a.id,
    )
    recipe_b = Recipe(
        organization_id=organization.id,
        name="Recipe B",
        yield_quantity=1,
        yield_unit="portion",
        selling_price=35.0,
        finished_product_id=menu_b.id,
    )
    db.add_all([recipe_a, recipe_b])
    db.flush()
    db.add_all([
        RecipeIngredient(recipe_id=recipe_a.id, product_id=ingredient.id, quantity_required=6.0),
        RecipeIngredient(recipe_id=recipe_b.id, product_id=ingredient.id, quantity_required=6.0),
        Batch(
            organization_id=organization.id,
            product_id=ingredient.id,
            batch_number="LOW-COST",
            quantity=10.0,
            remaining_quantity=10.0,
            purchase_price=2.0,
        ),
        Batch(
            organization_id=organization.id,
            product_id=ingredient.id,
            batch_number="HIGH-COST",
            quantity=10.0,
            remaining_quantity=10.0,
            purchase_price=5.0,
        ),
    ])
    db.commit()

    sale = create_sale(
        db=db,
        organization_id=organization.id,
        items_data=[
            {"recipe_id": recipe_a.id, "quantity": 1},
            {"recipe_id": recipe_b.id, "quantity": 1},
        ],
    )

    sale_items = (
        db.query(SaleItem)
        .filter(SaleItem.sale_id == sale.id)
        .order_by(SaleItem.id.asc())
        .all()
    )
    assert [item.cost_of_goods_sold for item in sale_items] == pytest.approx([12.0, 22.0])
    assert sale.cost_of_goods_sold == pytest.approx(34.0)
    db.refresh(ingredient)
    assert ingredient.current_stock == pytest.approx(8.0)

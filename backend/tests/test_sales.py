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

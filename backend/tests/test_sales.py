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
    assert [item.cost_of_goods_sold for item in sale_items] == pytest.approx([12.0, 18.0])
    assert sale.cost_of_goods_sold == pytest.approx(30.0)
    db.refresh(ingredient)
    assert ingredient.current_stock == pytest.approx(8.0)



def _build_sale_fixture(db, organization_name="Sales Edge Case Organization", stock=5.0, batch_expiry=None):
    from app.models.models import Organization, Product, Recipe, RecipeIngredient, Batch

    organization = Organization(name=organization_name)
    db.add(organization)
    db.flush()
    ingredient = Product(
        organization_id=organization.id,
        name="Edge Case Ingredient",
        unit="g",
        current_stock=stock,
        cost_price=2.0,
        selling_price=3.0,
        is_finished_product=False,
    )
    finished = Product(
        organization_id=organization.id,
        name="Edge Case Menu Item",
        unit="portion",
        current_stock=0.0,
        cost_price=0.0,
        selling_price=10.0,
        is_finished_product=True,
    )
    db.add_all([ingredient, finished])
    db.flush()
    recipe = Recipe(
        organization_id=organization.id,
        name="Edge Case Recipe",
        yield_quantity=1,
        yield_unit="portion",
        selling_price=10.0,
        finished_product_id=finished.id,
    )
    db.add(recipe)
    db.flush()
    db.add(RecipeIngredient(
        recipe_id=recipe.id,
        product_id=ingredient.id,
        quantity_required=3.0,
    ))
    if stock > 0:
        db.add(Batch(
            organization_id=organization.id,
            product_id=ingredient.id,
            batch_number="EDGE-CASE-BATCH",
            quantity=stock,
            remaining_quantity=stock,
            purchase_price=2.0,
            expiry_date=batch_expiry,
        ))
    db.commit()
    return organization, ingredient, recipe


def test_sale_insufficient_stock_has_no_persisted_side_effects(db):
    from fastapi import HTTPException
    from app.models.models import Sale, InventoryTransaction

    organization, ingredient, recipe = _build_sale_fixture(db, stock=2.0)
    with pytest.raises(HTTPException) as exc_info:
        create_sale(
            db=db,
            organization_id=organization.id,
            items_data=[{"recipe_id": recipe.id, "quantity": 1}],
        )
    assert exc_info.value.status_code == 400
    assert "Insufficient inventory" in exc_info.value.detail
    db.rollback()
    db.refresh(ingredient)
    assert ingredient.current_stock == pytest.approx(2.0)
    assert db.query(Sale).count() == 0
    assert db.query(InventoryTransaction).count() == 0


def test_sale_rejects_recipe_from_another_tenant_without_side_effects(db):
    from fastapi import HTTPException
    from app.models.models import Sale, InventoryTransaction

    organization_a, ingredient, _ = _build_sale_fixture(db, stock=5.0)
    organization_b = Organization(name="Different Tenant")
    db.add(organization_b)
    db.commit()
    foreign_recipe = db.query(Recipe).filter(
        Recipe.organization_id == organization_a.id
    ).one()

    with pytest.raises(HTTPException) as exc_info:
        create_sale(
            db=db,
            organization_id=organization_b.id,
            items_data=[{"recipe_id": foreign_recipe.id, "quantity": 1}],
        )
    assert exc_info.value.status_code == 404
    db.rollback()
    db.refresh(ingredient)
    assert ingredient.current_stock == pytest.approx(5.0)
    assert db.query(Sale).count() == 0
    assert db.query(InventoryTransaction).count() == 0


def test_expired_batches_cannot_be_used_for_sale_or_as_legacy_stock(db):
    from datetime import date, timedelta
    from fastapi import HTTPException
    from app.models.models import Sale, InventoryTransaction

    organization, ingredient, recipe = _build_sale_fixture(
        db,
        stock=5.0,
        batch_expiry=date.today() - timedelta(days=1),
    )
    with pytest.raises(HTTPException) as exc_info:
        create_sale(
            db=db,
            organization_id=organization.id,
            items_data=[{"recipe_id": recipe.id, "quantity": 1}],
        )
    assert exc_info.value.status_code == 400
    db.rollback()
    db.refresh(ingredient)
    assert ingredient.current_stock == pytest.approx(5.0)
    assert db.query(Sale).count() == 0
    assert db.query(InventoryTransaction).count() == 0

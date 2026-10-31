import pytest

from app.models.models import Batch, Organization, Product
from app.services.analytics_service import calculate_inventory_value


def test_inventory_value_uses_batch_cost_and_legacy_product_cost(db):
    organization = Organization(name="Valuation Test Org")
    other_organization = Organization(name="Other Org")
    db.add_all([organization, other_organization])
    db.flush()

    raw_product = Product(
        organization_id=organization.id,
        name="Coffee Beans",
        unit="g",
        current_stock=20,
        cost_price=9,
        is_finished_product=False,
    )
    finished_product = Product(
        organization_id=organization.id,
        name="Bottled Cold Brew",
        unit="pcs",
        current_stock=3,
        cost_price=10,
        is_finished_product=True,
    )
    other_product = Product(
        organization_id=other_organization.id,
        name="Other Org Stock",
        unit="g",
        current_stock=100,
        cost_price=100,
        is_finished_product=False,
    )
    db.add_all([raw_product, finished_product, other_product])
    db.flush()

    db.add_all([
        Batch(
            organization_id=organization.id,
            product_id=raw_product.id,
            batch_number="COFFEE-1",
            quantity=5,
            remaining_quantity=5,
            purchase_price=2,
        ),
        Batch(
            organization_id=organization.id,
            product_id=raw_product.id,
            batch_number="COFFEE-2",
            quantity=5,
            remaining_quantity=5,
            purchase_price=4,
        ),
        Batch(
            organization_id=other_organization.id,
            product_id=other_product.id,
            batch_number="OTHER-1",
            quantity=100,
            remaining_quantity=100,
            purchase_price=1,
        ),
    ])
    db.commit()

    result = calculate_inventory_value(db, organization.id)

    # Raw materials: (5 * 2) + (5 * 4) + (10 unbatched * 9) = 120.
    # Finished goods have no batches: 3 * 10 = 30.
    assert result["inventory_value"] == pytest.approx(150)
    assert result["raw_material_value"] == pytest.approx(120)
    assert result["finished_goods_value"] == pytest.approx(30)
    assert result["total_units"] == pytest.approx(23)
    assert result["active_batches"] == 2

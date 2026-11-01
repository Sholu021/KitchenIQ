from datetime import date, timedelta

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


def test_inventory_value_caps_batches_at_product_ledger_stock(db):
    organization = Organization(name="Batch Overstatement Test")
    db.add(organization)
    db.flush()

    product = Product(
        organization_id=organization.id,
        name="Milk",
        unit="ml",
        current_stock=5,
        cost_price=10,
        is_finished_product=False,
    )
    db.add(product)
    db.flush()

    # FEFO batch is valued first; later-expiring excess is excluded.
    db.add_all([
        Batch(
            organization_id=organization.id,
            product_id=product.id,
            batch_number="LATER",
            expiry_date=date.today() + timedelta(days=10),
            quantity=5,
            remaining_quantity=5,
            purchase_price=8,
        ),
        Batch(
            organization_id=organization.id,
            product_id=product.id,
            batch_number="SOONER",
            expiry_date=date.today() + timedelta(days=2),
            quantity=5,
            remaining_quantity=5,
            purchase_price=4,
        ),
    ])
    db.commit()

    result = calculate_inventory_value(db, organization.id)

    assert result["inventory_value"] == pytest.approx(20)
    assert result["raw_material_value"] == pytest.approx(20)
    assert result["total_units"] == pytest.approx(5)
    assert result["active_batches"] == 1



def test_fefo_cost_does_not_treat_expired_batches_as_legacy_stock(db):
    from fastapi import HTTPException

    from app.services.inventory_service import calculate_fefo_cost

    organization = Organization(name="Expired FEFO Cost Test")
    db.add(organization)
    db.flush()
    product = Product(
        organization_id=organization.id,
        name="Fresh Milk",
        unit="ml",
        current_stock=7,
        cost_price=10,
        is_finished_product=False,
    )
    db.add(product)
    db.flush()
    db.add_all([
        Batch(
            organization_id=organization.id,
            product_id=product.id,
            batch_number="EXPIRED",
            expiry_date=date.today() - timedelta(days=1),
            quantity=5,
            remaining_quantity=5,
            purchase_price=1,
        ),
        Batch(
            organization_id=organization.id,
            product_id=product.id,
            batch_number="FRESH",
            expiry_date=date.today() + timedelta(days=5),
            quantity=2,
            remaining_quantity=2,
            purchase_price=4,
        ),
    ])
    db.commit()

    with pytest.raises(HTTPException) as exc:
        calculate_fefo_cost(db, organization.id, product.id, 3)

    assert exc.value.status_code == 400


def test_stock_out_does_not_consume_expired_stock_as_legacy(db):
    from fastapi import HTTPException

    from app.models.models import InventoryTransaction
    from app.services.inventory_service import adjust_stock

    organization = Organization(name="Expired FEFO Deduction Test")
    db.add(organization)
    db.flush()
    product = Product(
        organization_id=organization.id,
        name="Fresh Milk",
        unit="ml",
        current_stock=7,
        cost_price=10,
        is_finished_product=False,
    )
    db.add(product)
    db.flush()
    expired = Batch(
        organization_id=organization.id,
        product_id=product.id,
        batch_number="EXPIRED",
        expiry_date=date.today() - timedelta(days=1),
        quantity=5,
        remaining_quantity=5,
        purchase_price=1,
    )
    fresh = Batch(
        organization_id=organization.id,
        product_id=product.id,
        batch_number="FRESH",
        expiry_date=date.today() + timedelta(days=5),
        quantity=2,
        remaining_quantity=2,
        purchase_price=4,
    )
    db.add_all([expired, fresh])
    db.commit()

    with pytest.raises(HTTPException) as exc:
        adjust_stock(
            db=db,
            organization_id=organization.id,
            product_id=product.id,
            quantity=3,
            transaction_type="STOCK_OUT",
        )

    assert exc.value.status_code == 400
    db.rollback()
    db.refresh(product)
    db.refresh(expired)
    db.refresh(fresh)
    assert product.current_stock == pytest.approx(7)
    assert expired.remaining_quantity == pytest.approx(5)
    assert fresh.remaining_quantity == pytest.approx(2)
    assert db.query(InventoryTransaction).filter(
        InventoryTransaction.product_id == product.id
    ).count() == 0

from datetime import date, timedelta

from app.models.models import Batch, Notification, Organization, Product
from app.services.analytics_service import get_expiring_batches, get_low_stock_products


def test_inventory_analytics_reads_do_not_create_notifications(db):
    organization = Organization(name="Read Only Analytics Test")
    db.add(organization)
    db.flush()

    product = Product(
        organization_id=organization.id,
        name="Low Stock Milk",
        unit="ml",
        current_stock=10,
        reorder_level=100,
        cost_price=0.01,
        selling_price=0.02,
    )
    db.add(product)
    db.flush()

    batch = Batch(
        organization_id=organization.id,
        product_id=product.id,
        batch_number="EXPIRING-TEST-01",
        expiry_date=date.today() + timedelta(days=2),
        quantity=10,
        remaining_quantity=10,
    )
    db.add(batch)
    db.commit()

    assert get_low_stock_products(db, organization.id)
    assert get_expiring_batches(db, organization.id)

    notification_count = (
        db.query(Notification)
        .filter(Notification.organization_id == organization.id)
        .count()
    )
    assert notification_count == 0

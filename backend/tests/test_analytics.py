from app.models.models import Organization, Product
from app.services.analytics_service import inventory_health


def test_zero_stock_is_reorder_now_without_recent_consumption(db):
    organization = Organization(name="Inventory Health Test")
    db.add(organization)
    db.flush()

    product = Product(
        organization_id=organization.id,
        name="Out of Stock Ingredient",
        unit="kg",
        current_stock=0,
        reorder_level=5,
        cost_price=10,
        selling_price=15,
        is_finished_product=False,
    )
    db.add(product)
    db.commit()

    result = inventory_health(db, organization.id)

    assert result["products"][0]["status"] == "REORDER NOW"
    assert result["health_score"] == 0


def test_healthy_stock_without_consumption_is_not_penalized(db):
    organization = Organization(name="No Consumption Test")
    db.add(organization)
    db.flush()

    product = Product(
        organization_id=organization.id,
        name="Well Stocked Ingredient",
        unit="kg",
        current_stock=20,
        reorder_level=5,
        cost_price=10,
        selling_price=15,
        is_finished_product=False,
    )
    db.add(product)
    db.commit()

    result = inventory_health(db, organization.id)

    assert result["products"][0]["status"] == "NO CONSUMPTION"
    assert result["health_score"] == 100

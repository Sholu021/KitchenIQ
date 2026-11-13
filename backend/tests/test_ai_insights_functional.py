from datetime import date, timedelta

from app.models.models import Product
from app.services import ai_service


def add_product(db, organization_id, **overrides):
    values = {
        "organization_id": organization_id,
        "name": "Rice",
        "unit": "kg",
        "current_stock": 4.0,
        "reorder_level": 10.0,
        "cost_price": 50.0,
        "selling_price": 80.0,
        "is_finished_product": False,
        "is_active": True,
    }
    values.update(overrides)
    product = Product(**values)
    db.add(product)
    db.flush()
    return product


def test_reorder_insights_exclude_finished_products(db, seed_test_data, monkeypatch):
    monkeypatch.setattr(ai_service, "get_openai_client", lambda: None)
    org_id = seed_test_data["org_a_id"]

    ingredient = add_product(db, org_id, name="Rice", current_stock=4.0)
    add_product(
        db,
        org_id,
        name="Finished Meal",
        current_stock=0.0,
        reorder_level=5.0,
        is_finished_product=True,
    )

    result = ai_service.get_ai_insights(db, org_id)
    suggestions = result["reorder_suggestions"]

    assert [item["product_id"] for item in suggestions] == [ingredient.id]
    assert suggestions[0]["suggested_quantity"] == 16.0
    assert suggestions[0]["estimated_cost"] == 800.0


def test_copilot_reorder_excludes_finished_products(db, seed_test_data, monkeypatch):
    monkeypatch.setattr(ai_service, "get_openai_client", lambda: None)
    org_id = seed_test_data["org_a_id"]
    add_product(db, org_id, name="Rice", current_stock=4.0)
    add_product(
        db,
        org_id,
        name="Finished Meal",
        current_stock=0.0,
        reorder_level=5.0,
        is_finished_product=True,
    )

    answer = ai_service.ask_ai_copilot(db, org_id, "What should I reorder?")

    assert "Rice" in answer
    assert "Finished Meal" not in answer


def test_waste_analysis_uses_frontend_seven_day_contract(db, seed_test_data, monkeypatch):
    monkeypatch.setattr(ai_service, "get_openai_client", lambda: None)
    org_id = seed_test_data["org_a_id"]
    product = add_product(db, org_id, name="Milk", cost_price=12.5)

    from app.models.models import Batch

    db.add(
        Batch(
            organization_id=org_id,
            product_id=product.id,
            batch_number="EXP-7D",
            expiry_date=date.today() + timedelta(days=3),
            quantity=2.0,
            remaining_quantity=2.0,
            purchase_price=12.5,
        )
    )
    db.flush()

    result = ai_service.get_ai_insights(db, org_id)

    assert result["waste_analysis"]["expiring_7_days_value"] == 25.0
    assert "expiring_30_days_value" not in result["waste_analysis"]

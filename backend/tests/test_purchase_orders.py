def test_create_purchase_order_unauthorized(client):
    response = client.post(
        "/api/v1/purchase-orders",
        json={
            "supplier_id": 1,
            "items": [],
        },
    )

    assert response.status_code == 401

from app.models.models import Supplier, Product


def test_create_purchase_order_success(client, db, seed_test_data):
    # Create supplier
    supplier = Supplier(
        organization_id=seed_test_data["org_a_id"],
        name="Test Supplier",
        email="supplier@test.com",
        phone="1234567890",
    )
    db.add(supplier)

    # Create product
    product = Product(
        organization_id=seed_test_data["org_a_id"],
        name="Coffee Beans",
        sku="CB-001",
        unit="kg",
        current_stock=0,
        reorder_level=10,
        cost_price=500,
        selling_price=700,
    )
    db.add(product)

    db.commit()
    db.refresh(supplier)
    db.refresh(product)

    # Login
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.cookies["kitcheniq_access"]

    # Create PO
    response = client.post(
        "/api/v1/purchase-orders",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "supplier_id": supplier.id,
            "items": [
                {
                    "product_id": product.id,
                    "quantity": 10,
                    "unit_price": 500,
                }
            ],
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["supplier_id"] == supplier.id
    assert len(data["items"]) == 1
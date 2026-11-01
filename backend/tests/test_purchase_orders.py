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


def test_status_patch_cannot_receive_purchase_order_without_stock(client, db, seed_test_data):
    supplier = Supplier(
        organization_id=seed_test_data["org_a_id"],
        name="Receipt Test Supplier",
        email="receipt@test.com",
        phone="1234567890",
    )
    product = Product(
        organization_id=seed_test_data["org_a_id"],
        name="Receipt Test Product",
        sku="RECEIPT-001",
        unit="pcs",
        current_stock=0,
        reorder_level=1,
        cost_price=10,
        selling_price=15,
    )
    db.add_all([supplier, product])
    db.commit()
    db.refresh(supplier)
    db.refresh(product)

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager_a@test.com", "password": "testpass"},
    )
    headers = {"Authorization": f"Bearer {login.cookies['kitcheniq_access']}"}
    created = client.post(
        "/api/v1/purchase-orders",
        headers=headers,
        json={
            "supplier_id": supplier.id,
            "items": [{"product_id": product.id, "quantity": 2, "unit_price": 10}],
        },
    )
    assert created.status_code == 201
    po_id = created.json()["id"]

    sent = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        headers=headers,
        json={"status": "SENT"},
    )
    assert sent.status_code == 200

    rejected = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        headers=headers,
        json={"status": "RECEIVED"},
    )
    assert rejected.status_code == 400
    assert "receive endpoint" in rejected.json()["detail"].lower()
    db.refresh(product)
    assert product.current_stock == 0

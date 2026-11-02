def test_create_purchase_order_unauthorized(client):
    response = client.post(
        "/api/v1/purchase-orders",
        json={
            "supplier_id": 1,
            "items": [],
        },
    )

    assert response.status_code == 401

from app.models.models import Supplier, Product, Batch, InventoryTransaction


def _manager_headers(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager_a@test.com", "password": "testpass"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.cookies['kitcheniq_access']}"}


def _create_po_fixture_data(db, org_id):
    supplier = Supplier(
        organization_id=org_id,
        name="Test Supplier",
        email="supplier@test.com",
        phone="1234567890",
    )
    product = Product(
        organization_id=org_id,
        name="Coffee Beans",
        sku="CB-001",
        unit="kg",
        current_stock=0,
        reorder_level=10,
        cost_price=500,
        selling_price=700,
    )
    db.add_all([supplier, product])
    db.commit()
    db.refresh(supplier)
    db.refresh(product)
    return supplier, product


def test_create_purchase_order_success(client, db, seed_test_data):
    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)

    response = client.post(
        "/api/v1/purchase-orders",
        headers=headers,
        json={
            "supplier_id": supplier.id,
            "items": [{"product_id": product.id, "quantity": 10, "unit_price": 10}],
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["supplier_id"] == supplier.id
    assert len(data["items"]) == 1


def test_status_patch_cannot_receive_purchase_order_without_stock(client, db, seed_test_data):
    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)
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


def test_receive_purchase_order_creates_stock_batch_and_transaction(client, db, seed_test_data):
    from datetime import date

    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)
    created = client.post(
        "/api/v1/purchase-orders",
        headers=headers,
        json={
            "supplier_id": supplier.id,
            "items": [{"product_id": product.id, "quantity": 5, "unit_price": 10}],
        },
    )
    assert created.status_code == 201
    po_id = created.json()["id"]
    item_id = created.json()["items"][0]["id"]

    sent = client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        headers=headers,
        json={"status": "SENT"},
    )
    assert sent.status_code == 200

    received = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive",
        headers=headers,
        json={
            "items": [{
                "purchase_order_item_id": item_id,
                "quantity": 5,
                "batch_number": "COFFEE-LOT-01",
                "expiry_date": "2027-12-31",
            }]
        },
    )
    assert received.status_code == 200
    assert received.json()["status"] == "RECEIVED"

    db.refresh(product)
    assert product.current_stock == 5
    batch = db.query(Batch).filter(
        Batch.organization_id == seed_test_data["org_a_id"],
        Batch.product_id == product.id,
        Batch.batch_number == "COFFEE-LOT-01",
    ).one()
    assert batch.quantity == 5
    assert batch.remaining_quantity == 5
    assert batch.expiry_date == date(2027, 12, 31)

    transaction = db.query(InventoryTransaction).filter(
        InventoryTransaction.organization_id == seed_test_data["org_a_id"],
        InventoryTransaction.product_id == product.id,
        InventoryTransaction.purchase_order_id == po_id,
        InventoryTransaction.transaction_type == "STOCK_IN",
    ).one()
    assert transaction.quantity == 5


def test_receive_purchase_order_supports_partial_receipts(client, db, seed_test_data):
    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)
    created = client.post(
        "/api/v1/purchase-orders",
        headers=headers,
        json={
            "supplier_id": supplier.id,
            "items": [{"product_id": product.id, "quantity": 5, "unit_price": 10}],
        },
    )
    assert created.status_code == 201
    po_id = created.json()["id"]
    item_id = created.json()["items"][0]["id"]
    assert client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        headers=headers,
        json={"status": "SENT"},
    ).status_code == 200

    first = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive",
        headers=headers,
        json={"items": [{
            "purchase_order_item_id": item_id,
            "quantity": 2,
            "batch_number": "COFFEE-PART-1",
            "expiry_date": "2027-12-31",
        }]},
    )
    assert first.status_code == 200
    assert first.json()["status"] == "PARTIALLY_RECEIVED"
    db.refresh(product)
    assert product.current_stock == 2

    second = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive",
        headers=headers,
        json={"items": [{
            "purchase_order_item_id": item_id,
            "quantity": 3,
            "batch_number": "COFFEE-PART-2",
            "expiry_date": "2028-01-31",
        }]},
    )
    assert second.status_code == 200
    assert second.json()["status"] == "RECEIVED"
    db.refresh(product)
    assert product.current_stock == 5
    assert db.query(InventoryTransaction).filter(
        InventoryTransaction.purchase_order_id == po_id,
        InventoryTransaction.transaction_type == "STOCK_IN",
    ).count() == 2


def test_receive_purchase_order_rejects_over_receipt_without_changing_stock(client, db, seed_test_data):
    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)
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
    item_id = created.json()["items"][0]["id"]
    assert client.patch(
        f"/api/v1/purchase-orders/{po_id}/status",
        headers=headers,
        json={"status": "SENT"},
    ).status_code == 200

    rejected = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive",
        headers=headers,
        json={"items": [{
            "purchase_order_item_id": item_id,
            "quantity": 3,
            "batch_number": "COFFEE-OVER",
            "expiry_date": "2027-12-31",
        }]},
    )
    assert rejected.status_code == 400
    db.refresh(product)
    assert product.current_stock == 0
    assert db.query(Batch).filter(Batch.product_id == product.id).count() == 0
    assert db.query(InventoryTransaction).filter(
        InventoryTransaction.product_id == product.id,
        InventoryTransaction.transaction_type == "STOCK_IN",
    ).count() == 0


def test_receive_purchase_order_is_tenant_scoped(client, db, seed_test_data):
    supplier, product = _create_po_fixture_data(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)
    created = client.post(
        "/api/v1/purchase-orders",
        headers=headers,
        json={
            "supplier_id": supplier.id,
            "items": [{"product_id": product.id, "quantity": 1, "unit_price": 10}],
        },
    )
    assert created.status_code == 201
    po_id = created.json()["id"]

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "owner_b@test.com", "password": "testpass"},
    )
    headers_b = {"Authorization": f"Bearer {login_b.cookies['kitcheniq_access']}"}
    response = client.post(
        f"/api/v1/purchase-orders/{po_id}/receive",
        headers=headers_b,
        json={"items": [{
            "purchase_order_item_id": created.json()["items"][0]["id"],
            "quantity": 1,
            "batch_number": "CROSS-TENANT",
            "expiry_date": "2027-12-31",
        }]},
    )
    assert response.status_code == 404
    db.refresh(product)
    assert product.current_stock == 0

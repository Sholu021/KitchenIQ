def test_create_product_unauthorized(client):
    response = client.post(
        "/api/v1/products",
        json={
            "name": "Espresso Beans",
            "unit": "kg",
            "cost_price": 10,
            "selling_price": 15,
            "reorder_level": 5,
        },
    )

    assert response.status_code == 401

def test_create_product_success(client, seed_test_data):
    # Login
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    response = client.post(
        "/api/v1/products",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "Arabica Coffee Beans",
            "sku": "ARB-001",
            "unit": "kg",
            "reorder_level": 10,
            "cost_price": 450,
            "selling_price": 650,
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Arabica Coffee Beans"
    assert data["sku"] == "ARB-001"
    assert data["unit"] == "kg"
    assert data["current_stock"] == 0

def test_create_product_duplicate_sku(client, seed_test_data):
    # Login
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}",
    }

    product = {
        "name": "Coffee Beans",
        "sku": "COF-001",
        "unit": "kg",
        "reorder_level": 10,
        "cost_price": 400,
        "selling_price": 600,
    }

    # First product
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json=product,
    )

    assert response.status_code == 201

    # Duplicate SKU
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Premium Coffee",
            "sku": "COF-001",
            "unit": "kg",
            "reorder_level": 5,
            "cost_price": 500,
            "selling_price": 700,
        },
    )

    assert response.status_code == 400
    assert "already in use" in response.json()["detail"]

def test_update_product_success(client, seed_test_data):
    # Login
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}",
    }

    # Create product
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Coffee Beans",
            "sku": "UPD-001",
            "unit": "kg",
            "reorder_level": 10,
            "cost_price": 500,
            "selling_price": 700,
        },
    )

    assert response.status_code == 201

    product_id = response.json()["id"]

    # Update product
    response = client.patch(
        f"/api/v1/products/{product_id}",
        headers=headers,
        json={
            "name": "Premium Coffee Beans",
            "selling_price": 800,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Premium Coffee Beans"
    assert data["selling_price"] == 800

def test_delete_product_success(client, seed_test_data):
    # Login
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    headers = {
        "Authorization": f"Bearer {token}",
    }

    # Create product
    response = client.post(
        "/api/v1/products",
        headers=headers,
        json={
            "name": "Delete Me",
            "sku": "DEL-001",
            "unit": "kg",
            "reorder_level": 5,
            "cost_price": 100,
            "selling_price": 150,
        },
    )

    assert response.status_code == 201

    product_id = response.json()["id"]

    # Delete product
    response = client.delete(
        f"/api/v1/products/{product_id}",
        headers=headers,
    )

    assert response.status_code == 204

    # Verify it no longer exists
    response = client.patch(
        f"/api/v1/products/{product_id}",
        headers=headers,
        json={
            "name": "Should Fail"
        },
    )

    assert response.status_code == 404

def test_update_product_not_found(client, seed_test_data):
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    response = client.patch(
        "/api/v1/products/999999",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "Updated Name"
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"

def test_update_product_other_organization(client, db, seed_test_data):
    # Create a product in Organization B
    from app.models.models import Product

    product = Product(
        organization_id=seed_test_data["org_b_id"],
        name="Secret Product",
        sku="ORG-B-001",
        unit="kg",
        current_stock=0,
        reorder_level=5,
        cost_price=100,
        selling_price=150,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    # Login as Organization A manager
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    token = login.json()["access_token"]

    response = client.patch(
        f"/api/v1/products/{product.id}",
        headers={
            "Authorization": f"Bearer {token}",
        },
        json={
            "name": "Hacked Product",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"
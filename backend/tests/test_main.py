import pytest
from fastapi import status
from app.models.models import Product, Category

def test_login_success(client, seed_test_data):
    # Test logging in with correct credentials
    login_data = {
        "email": "owner_a@test.com",
        "password": "testpass"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "Owner"
    assert data["organization_id"] == seed_test_data["org_a_id"]

def test_login_invalid_password(client, seed_test_data):
    # Test login with incorrect password
    login_data = {
        "email": "owner_a@test.com",
        "password": "wrongpassword"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def get_auth_headers(client, email, password):
    login_data = {"email": email, "password": password}
    response = client.post("/api/v1/auth/login", json=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_products_crud_and_isolation(client, seed_test_data):
    headers_a = get_auth_headers(client, "manager_a@test.com", "testpass")
    headers_b = get_auth_headers(client, "owner_b@test.com", "testpass")

    # 1. Create a category in Org A
    cat_response = client.post(
        "/api/v1/products/categories",
        json={"name": "Ingredients"},
        headers=headers_a
    )
    assert cat_response.status_code == status.HTTP_201_CREATED
    cat_id = cat_response.json()["id"]

    # 2. Create a product in Org A
    product_data = {
        "name": "Tomato Sauce",
        "sku": "TOM-SAUCE-1L",
        "unit": "ml",
        "reorder_level": 500.0,
        "cost_price": 2.5,
        "selling_price": 5.0,
        "category_id": cat_id
    }
    prod_response = client.post(
        "/api/v1/products",
        json=product_data,
        headers=headers_a
    )
    assert prod_response.status_code == status.HTTP_201_CREATED
    prod_id = prod_response.json()["id"]

    # 3. Read the product as Org A user (should succeed)
    get_response = client.get("/api/v1/products", headers=headers_a)
    assert get_response.status_code == status.HTTP_200_OK
    items = get_response.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Tomato Sauce"

    # 4. Attempt to read the product as Org B user (should NOT see Org A's products)
    get_response_b = client.get("/api/v1/products", headers=headers_b)
    assert get_response_b.status_code == status.HTTP_200_OK
    assert len(get_response_b.json()["items"]) == 0

    # 5. Update the product as Org A user
    update_data = {"name": "Premium Tomato Sauce"}
    patch_response = client.patch(
        f"/api/v1/products/{prod_id}",
        json=update_data,
        headers=headers_a
    )
    assert patch_response.status_code == status.HTTP_200_OK
    assert patch_response.json()["name"] == "Premium Tomato Sauce"

    # 6. Attempt to update the product as Org B user (should fail)
    patch_response_b = client.patch(
        f"/api/v1/products/{prod_id}",
        json=update_data,
        headers=headers_b
    )
    assert patch_response_b.status_code == status.HTTP_404_NOT_FOUND

    # 7. Delete the product as Org A user
    del_response = client.delete(f"/api/v1/products/{prod_id}", headers=headers_a)
    assert del_response.status_code == status.HTTP_204_NO_CONTENT

def test_dashboard_summary(client, seed_test_data):
    headers_a = get_auth_headers(client, "staff_a@test.com", "testpass")
    response = client.get("/api/v1/dashboard", headers=headers_a)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "cards" in data
    assert "low_stock_products" in data["cards"]

def test_wastage_crud(client, seed_test_data):
    headers_a = get_auth_headers(client, "manager_a@test.com", "testpass")
    headers_b = get_auth_headers(client, "owner_b@test.com", "testpass")

    # Create category & product in Org A
    cat_res = client.post("/api/v1/products/categories", json={"name": "Dry Goods"}, headers=headers_a)
    cat_id = cat_res.json()["id"]

    prod_res = client.post(
        "/api/v1/products",
        json={"name": "Rice", "sku": "RICE-1KG", "unit": "kg", "reorder_level": 5.0, "cost_price": 1.5, "category_id": cat_id},
        headers=headers_a
    )
    prod_id = prod_res.json()["id"]

    # Adjust stock (receive 10 kg)
    adjust_res = client.post(
        "/api/v1/batches/adjust",
        json={"product_id": prod_id, "quantity": 10.0, "transaction_type": "STOCK_IN", "batch_number": "BATCH-01", "expiry_date": "2026-12-31", "notes": "Initial receive"},
        headers=headers_a
    )
    assert adjust_res.status_code == status.HTTP_200_OK

    # Log wastage (waste 2 kg due to spillage)
    waste_res = client.post(
        "/api/v1/wastage",
        json={"product_id": prod_id, "quantity": 2.0, "reason": "Spillage"},
        headers=headers_a
    )
    assert waste_res.status_code == status.HTTP_201_CREATED
    waste_data = waste_res.json()
    assert waste_data["cost_loss"] == 3.0
    waste_id = waste_data["id"]

    # Verify stock decremented to 8 kg
    prod_get = client.get("/api/v1/products", headers=headers_a)
    assert prod_get.json()["items"][0]["current_stock"] == 8.0

    # List wastage in Org A (should see record)
    list_waste_a = client.get("/api/v1/wastage", headers=headers_a)
    assert len(list_waste_a.json()) == 1

    # List wastage in Org B (should not see Org A's record)
    list_waste_b = client.get("/api/v1/wastage", headers=headers_b)
    assert len(list_waste_b.json()) == 0

    # Delete wastage log (reverts stock back to 10 kg)
    del_waste = client.delete(f"/api/v1/wastage/{waste_id}", headers=headers_a)
    assert del_waste.status_code == status.HTTP_204_NO_CONTENT

    # Verify stock reverted back to 10 kg
    prod_get_revert = client.get("/api/v1/products", headers=headers_a)
    assert prod_get_revert.json()["items"][0]["current_stock"] == 10.0

def test_analytics_dashboard(client, seed_test_data):
    headers_a = get_auth_headers(client, "staff_a@test.com", "testpass")
    response = client.get("/api/v1/analytics?days=7", headers=headers_a)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "sales_trend" in data
    assert "wastage_trend" in data
    assert "category_breakdown" in data
    assert "inventory_velocity" in data

def test_team_management(client, seed_test_data):
    headers_owner = get_auth_headers(client, "owner_a@test.com", "testpass")
    headers_manager = get_auth_headers(client, "manager_a@test.com", "testpass")

    # 1. Manager A tries to create a Manager (should fail)
    m_fail = client.post(
        "/api/v1/users",
        json={"email": "manager_fail@test.com", "full_name": "Failed Manager", "role": "Manager", "password": "password123"},
        headers=headers_manager
    )
    assert m_fail.status_code == status.HTTP_403_FORBIDDEN

    # 2. Owner A creates a Manager user
    m_success = client.post(
        "/api/v1/users",
        json={"email": "manager_new@test.com", "full_name": "New Manager", "role": "Manager", "password": "password123"},
        headers=headers_owner
    )
    assert m_success.status_code == status.HTTP_201_CREATED
    new_user_id = m_success.json()["id"]

    # 3. List users in Org A (should see new manager)
    list_users = client.get("/api/v1/users", headers=headers_owner)
    assert len(list_users.json()) > 3  # Seed data has 3 users + 1 new

    # 4. Modify role to Staff
    update_res = client.patch(
        f"/api/v1/users/{new_user_id}",
        json={"role": "Staff"},
        headers=headers_owner
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert update_res.json()["role"] == "Staff"

    # 5. Delete the user
    delete_res = client.delete(f"/api/v1/users/{new_user_id}", headers=headers_owner)
    assert delete_res.status_code == status.HTTP_204_NO_CONTENT

    # 6. Fetch audit logs (should see actions)
    audit_res = client.get("/api/v1/users/audit-logs", headers=headers_owner)
    assert audit_res.status_code == status.HTTP_200_OK
    assert len(audit_res.json()) > 0
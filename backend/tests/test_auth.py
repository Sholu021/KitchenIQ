def test_login_success(client, seed_test_data):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "owner_a@test.com",
            "password": "testpass",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert "refresh_token" in data
    assert data["role"] == "Owner"
    assert data["organization_id"] == seed_test_data["org_a_id"]
    assert data["user_name"] == "Owner A"

def test_login_invalid_password(client, seed_test_data):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "owner_a@test.com",
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401

    data = response.json()

    assert data["detail"] == "Incorrect email or password"

def test_business_health_authenticated(client, seed_test_data):
    # Login first
    login_response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "manager_a@test.com",
            "password": "testpass",
        },
    )

    assert login_response.status_code == 200

    token = login_response.json()["access_token"]

    # Access protected endpoint
    response = client.get(
        "/api/v1/analytics/business-health",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200
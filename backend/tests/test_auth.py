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

    assert "access_token" not in data
    assert "refresh_token" not in data
    assert "kitcheniq_access" in response.cookies
    assert "kitcheniq_refresh" in response.cookies
    assert "kitcheniq_csrf" in response.cookies
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

    # Access protected endpoint using the HttpOnly cookie session.
    response = client.get("/api/v1/analytics/business-health")
    assert response.status_code == 200

def test_cookie_auth_requires_csrf_for_mutations(client, seed_test_data):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner_a@test.com", "password": "testpass"},
    )
    assert login_response.status_code == 200

    response = client.post(
        "/api/v1/auth/organization/subscription",
        json={"tier": "Free"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "CSRF validation failed"

    csrf = login_response.cookies["kitcheniq_csrf"]
    response = client.post(
        "/api/v1/auth/organization/subscription",
        json={"tier": "Free"},
        headers={"X-CSRF-Token": csrf},
    )
    assert response.status_code == 200

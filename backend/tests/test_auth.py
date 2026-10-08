from datetime import datetime, timedelta, timezone

from app.models.models import Organization

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


def test_demo_login_creates_demo_account(client, db):
    response = client.post("/api/v1/auth/demo")

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "Owner"
    assert data["user_name"] == "KitchenIQ Demo"
    assert "kitcheniq_access" in response.cookies
    assert "kitcheniq_refresh" in response.cookies
    assert "kitcheniq_csrf" in response.cookies

    second_response = client.post("/api/v1/auth/demo")
    assert second_response.status_code == 200
    assert second_response.json()["organization_id"] == data["organization_id"]
    assert db.query(Organization).count() == 1

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


def test_expired_trial_is_downgraded_on_authenticated_request(client, db, seed_test_data):
    org = db.query(Organization).filter(
        Organization.id == seed_test_data["org_a_id"]
    ).first()
    org.subscription_tier = "Pro"
    org.subscription_status = "trialing"
    org.trial_ends_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner_a@test.com", "password": "testpass"},
    )
    assert login_response.status_code == 200

    response = client.get("/api/v1/auth/organization")
    assert response.status_code == 200
    data = response.json()
    assert data["subscription_tier"] == "Free"
    assert data["subscription_status"] == "active"

    db.refresh(org)
    assert org.trial_ends_at is None


def test_register_creates_trial_organization(client, db):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "organization_name": "Trial Kitchen",
            "owner_name": "Trial Owner",
            "owner_email": "new-trial-owner@test.com",
            "owner_password": "KitchenIQ2026",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "Owner"
    assert data["user_name"] == "Trial Owner"

    org = db.query(Organization).filter(
        Organization.id == data["organization_id"]
    ).first()
    assert org is not None
    assert org.subscription_tier == "Pro"
    assert org.subscription_status == "trialing"
    assert org.trial_ends_at is not None
    trial_ends_at = org.trial_ends_at
    if trial_ends_at.tzinfo is None:
        trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
    assert trial_ends_at > datetime.now(timezone.utc)

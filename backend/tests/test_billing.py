import hashlib
import hmac
import json

from app.models.billing import BillingSubscription
from app.models.models import Organization


def _signed_payload(payload: dict, secret: str) -> tuple[str, str]:
    body = json.dumps(payload, separators=(",", ":")).encode()
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return body.decode(), signature


def test_webhook_rejects_invalid_signature(client, monkeypatch):
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "test-secret")

    response = client.post(
        "/api/v1/billing/webhook",
        content="{}",
        headers={"X-Razorpay-Signature": "invalid"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid webhook signature"


def test_webhook_activates_subscription_and_is_idempotent(
    client, db, seed_test_data, monkeypatch
):
    secret = "test-secret"
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", secret)

    org = db.query(Organization).filter(
        Organization.id == seed_test_data["org_a_id"]
    ).first()
    subscription_id = "sub_test_123"

    db.add(
        BillingSubscription(
            organization_id=org.id,
            user_id=seed_test_data["owner_a"].id,
            tier="Pro",
            billing_cycle="monthly",
            razorpay_subscription_id=subscription_id,
            status="created",
        )
    )
    db.commit()

    payload = {
        "id": "evt_test_123",
        "event": "subscription.activated",
        "payload": {
            "subscription": {
                "entity": {
                    "id": subscription_id,
                    "status": "active",
                    "current_end": 1790000000,
                }
            }
        },
    }
    body, signature = _signed_payload(payload, secret)

    response = client.post(
        "/api/v1/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": signature},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    db.refresh(org)
    assert org.subscription_tier == "Pro"
    assert org.subscription_status == "active"
    assert org.subscription_expires_at is not None

    duplicate = client.post(
        "/api/v1/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": signature},
    )

    assert duplicate.status_code == 200
    assert duplicate.json() == {"status": "ok", "duplicate": True}


def test_webhook_halted_returns_organization_to_free(
    client, db, seed_test_data, monkeypatch
):
    secret = "test-secret"
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", secret)

    org = db.query(Organization).filter(
        Organization.id == seed_test_data["org_a_id"]
    ).first()
    org.subscription_tier = "Pro"
    org.subscription_status = "active"
    db.add(
        BillingSubscription(
            organization_id=org.id,
            user_id=seed_test_data["owner_a"].id,
            tier="Pro",
            billing_cycle="monthly",
            razorpay_subscription_id="sub_test_halted",
            status="active",
        )
    )
    db.commit()

    payload = {
        "id": "evt_test_halted",
        "event": "subscription.halted",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_test_halted",
                    "status": "halted",
                }
            }
        },
    }
    body, signature = _signed_payload(payload, secret)

    response = client.post(
        "/api/v1/billing/webhook",
        content=body,
        headers={"X-Razorpay-Signature": signature},
    )

    assert response.status_code == 200

    db.refresh(org)
    assert org.subscription_tier == "Free"
    assert org.subscription_status == "active"
    assert org.subscription_expires_at is None

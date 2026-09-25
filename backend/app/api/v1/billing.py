import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_owner
from app.models.billing import BillingSubscription
from app.models.models import AuditLog, Organization, User

router = APIRouter(prefix="/billing", tags=["Billing"])

RAZORPAY_API = "https://api.razorpay.com/v1"


class CreateSubscriptionRequest(BaseModel):
    billing_cycle: Literal["monthly", "annual"]


class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


def _settings():
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    monthly_plan = os.getenv("RAZORPAY_PLAN_ID_MONTHLY")
    annual_plan = os.getenv("RAZORPAY_PLAN_ID_ANNUAL")
    if not all([key_id, key_secret, webhook_secret, monthly_plan, annual_plan]):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Live billing is not configured. Configure Razorpay credentials and plan IDs.",
        )
    return key_id, key_secret, webhook_secret, monthly_plan, annual_plan


def _razorpay_request(method: str, path: str, key_id: str, key_secret: str, **kwargs):
    try:
        response = httpx.request(
            method,
            f"{RAZORPAY_API}{path}",
            auth=(key_id, key_secret),
            timeout=20.0,
            **kwargs,
        )
        if response.is_error:
            detail = response.json().get("error", {}).get("description", "Razorpay request failed")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=detail)
        return response.json()
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Razorpay. Please try again.",
        )


@router.post("/subscriptions")
def create_subscription(
    req: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    key_id, key_secret, _, monthly_plan, annual_plan = _settings()
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.subscription_tier != "Free":
        raise HTTPException(status_code=400, detail="Organization already has a paid subscription")

    existing = (
        db.query(BillingSubscription)
        .filter(
            BillingSubscription.organization_id == org.id,
            BillingSubscription.status.in_(["created", "authenticated", "active", "pending"]),
        )
        .first()
    )
    if existing:
        return {
            "key_id": key_id,
            "subscription_id": existing.razorpay_subscription_id,
            "billing_cycle": existing.billing_cycle,
            "tier": existing.tier,
        }

    plan_id = annual_plan if req.billing_cycle == "annual" else monthly_plan
    total_count = 10 if req.billing_cycle == "annual" else 120

    payload = {
        "plan_id": plan_id,
        "total_count": total_count,
        "quantity": 1,
        "customer_notify": 1,
        "notes": {
            "organization_id": str(org.id),
            "user_id": str(current_user.id),
            "tier": "Pro",
            "billing_cycle": req.billing_cycle,
        },
    }
    subscription = _razorpay_request(
        "POST",
        "/subscriptions",
        key_id,
        key_secret,
        json=payload,
    )

    record = BillingSubscription(
        organization_id=org.id,
        user_id=current_user.id,
        tier="Pro",
        billing_cycle=req.billing_cycle,
        razorpay_subscription_id=subscription["id"],
        status=subscription.get("status", "created"),
    )
    db.add(record)
    db.commit()

    return {
        "key_id": key_id,
        "subscription_id": subscription["id"],
        "billing_cycle": req.billing_cycle,
        "tier": "Pro",
    }


@router.post("/subscriptions/verify")
def verify_subscription_payment(
    req: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    _, key_secret, _, _, _ = _settings()
    record = (
        db.query(BillingSubscription)
        .filter(
            BillingSubscription.organization_id == current_user.organization_id,
            BillingSubscription.razorpay_subscription_id == req.razorpay_subscription_id,
        )
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Billing subscription not found")

    payload = f"{req.razorpay_payment_id}|{record.razorpay_subscription_id}".encode()
    expected = hmac.new(key_secret.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    record.payment_id = req.razorpay_payment_id
    record.status = "active"
    record.updated_at = datetime.now(timezone.utc)

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    org.subscription_tier = "Pro"
    org.subscription_status = "active"
    if record.billing_cycle == "annual":
        org.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    else:
        org.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    db.add(
        AuditLog(
            organization_id=org.id,
            user_id=current_user.id,
            action="CHANGE_SUBSCRIPTION_PRO",
            entity_type="organization",
            entity_id=org.id,
        )
    )
    db.commit()

    return {"status": "active", "tier": "Pro"}


@router.post("/subscriptions/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_owner),
):
    key_id, key_secret, _, _, _ = _settings()
    record = (
        db.query(BillingSubscription)
        .filter(
            BillingSubscription.organization_id == current_user.organization_id,
            BillingSubscription.status.in_(["authenticated", "active", "pending"]),
        )
        .order_by(BillingSubscription.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="No active Razorpay subscription found")

    _razorpay_request(
        "POST",
        f"/subscriptions/{record.razorpay_subscription_id}/cancel",
        key_id,
        key_secret,
        json={"cancel_at_cycle_end": 1},
    )
    record.status = "cancelled_pending"
    record.updated_at = datetime.now(timezone.utc)

    db.add(
        AuditLog(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            action="CANCEL_SUBSCRIPTION",
            entity_type="organization",
            entity_id=current_user.organization_id,
        )
    )
    db.commit()

    return {"status": "cancelled_pending"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Billing webhook is not configured")

    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    expected = hmac.new(webhook_secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = await request.json()
    event_name = event.get("event", "")
    subscription = event.get("payload", {}).get("subscription", {}).get("entity", {})
    subscription_id = subscription.get("id")

    if not subscription_id:
        return {"status": "ignored"}

    record = (
        db.query(BillingSubscription)
        .filter(BillingSubscription.razorpay_subscription_id == subscription_id)
        .first()
    )
    if not record:
        return {"status": "ignored"}

    razorpay_status = subscription.get("status", "")
    record.status = razorpay_status
    record.updated_at = datetime.now(timezone.utc)

    org = db.query(Organization).filter(Organization.id == record.organization_id).first()

    if event_name == "subscription.activated" or razorpay_status == "active":
        org.subscription_tier = "Pro"
        org.subscription_status = "active"
        if record.billing_cycle == "annual":
            org.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=365)
        else:
            org.subscription_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    elif event_name in {"subscription.halted", "subscription.cancelled", "subscription.expired", "subscription.completed"}:
        org.subscription_tier = "Free"
        org.subscription_status = "active"
        org.subscription_expires_at = None

    db.commit()
    return {"status": "ok"}

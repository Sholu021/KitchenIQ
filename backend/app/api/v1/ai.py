import os

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_db, require_staff
from app.models.models import User, Product, Organization
from app.schemas.schemas import AICopilotRequest, AICopilotResponse, AIInsightsResponse
from app.services.ai_service import get_ai_insights, ask_ai_copilot
from sqlalchemy.orm import Session


router = APIRouter(prefix="/ai", tags=["AI Copilot & Recommendations"])


def is_demo_account(user: User, organization: Organization | None) -> bool:
    """Recognize only the explicitly configured public demo tenant.

    This keeps demo-only Pro access independent of subscription mutations:
    existing legacy demo organizations can use the demo experience without
    changing their persisted billing tier or trial dates.
    """
    if organization is None:
        return False

    demo_email = os.getenv("DEMO_EMAIL", "owner@kitcheniq.com").strip().lower()
    demo_org_name = os.getenv("DEMO_ORGANIZATION_NAME", "KitchenIQ Demo")
    allowed_org_names = {
        demo_org_name,
        "KitchenIQ Demo",
        "KitchenIQ Demo Café",
    }
    return (
        bool(demo_email)
        and user.email.strip().lower() == demo_email
        and organization.name in allowed_org_names
    )


@router.get("/insights", response_model=AIInsightsResponse)
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    organization = (
        db.query(Organization)
        .filter(Organization.id == current_user.organization_id)
        .first()
    )

    # The public demo workspace gets the Pro demonstration experience without
    # changing the organization's stored subscription or billing state.
    if (
        organization
        and organization.subscription_tier == "Free"
        and not is_demo_account(current_user, organization)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI Insights Copilot is a premium Pro feature. Please upgrade to Pro in Settings.",
        )

    return get_ai_insights(db, current_user.organization_id)


@router.post("/copilot", response_model=AICopilotResponse)
def chat_copilot(
    request: AICopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    question = request.question.strip()
    question_lower = question.lower()
    organization_id = current_user.organization_id

    if (
        "out of stock" in question_lower
        or "out-of-stock" in question_lower
        or "zero stock" in question_lower
    ):
        products = (
            db.query(Product)
            .filter(
                Product.organization_id == organization_id,
                Product.current_stock <= 0,
            )
            .order_by(Product.name.asc())
            .all()
        )

        if not products:
            return {
                "question": question,
                "answer": "There are currently no products out of stock.",
                "data": [],
            }

        data = [
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": float(product.current_stock or 0),
                "unit": product.unit,
                "reorder_level": float(product.reorder_level or 0),
                "is_finished_product": bool(product.is_finished_product),
            }
            for product in products
        ]
        names = ", ".join(
            f"{item['product_name']} ({item['current_stock']} {item['unit']})"
            for item in data
        )
        return {
            "question": question,
            "answer": f"{len(data)} product(s) are currently out of stock: {names}.",
            "data": data,
        }

    return {
        "question": question,
        "answer": ask_ai_copilot(
            db=db,
            organization_id=organization_id,
            question=question,
        ),
        "data": [],
    }

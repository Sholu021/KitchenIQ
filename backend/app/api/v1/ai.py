from fastapi import APIRouter, Depends

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import User
from app.schemas.schemas import AICopilotRequest, AICopilotResponse, AIInsightsResponse
from app.services.ai_service import get_ai_insights, ask_ai_copilot
from sqlalchemy.orm import Session

router = APIRouter(prefix="/ai", tags=["AI Copilot & Recommendations"])

@router.get("/insights", response_model=AIInsightsResponse)
def get_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    # Check subscription limits (AI Copilot is Pro-only)
    from app.models.models import Organization
    from fastapi import HTTPException, status
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if org and org.subscription_tier == "Free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI Insights Copilot is a premium Pro feature. Please upgrade to Pro in Settings."
        )

    insights_data = get_ai_insights(db, current_user.organization_id)
    return insights_data

@router.post("/copilot", response_model=AICopilotResponse)
def chat_copilot(
    request: AICopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    products = get_low_stock_products(...)

    if not products:
        return {
            "question": question,
            "answer": "No products are below their reorder level."
        }

    return {
        "question": question,
        "answer": (
            f"You currently have "
            f"{len(products)} products below their reorder level."
        ),
        "data": products
    }

    batches = get_expiring_batches(...)

    if not batches:
        return {
            "question": question,
            "answer": "No inventory is expiring soon."
        }

    return {
        "question": question,
        "answer": (
            f"{len(batches)} batches will expire soon."
        ),
        "data": batches
    }

    supplier = suppliers["suppliers"][0]

    return {
        "question": question,
        "answer": (
            f"{supplier['supplier_name']} "
            f"is your top supplier with "
            f"₹{supplier['total_spend']} in purchases."
        ),
        "data": suppliers
    }

    return ask_ai_copilot(
        db=db,
        organization_id=current_user.organization_id,
        question=request.question,
    )
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import User
from app.schemas.schemas import AICopilotRequest, AICopilotResponse, AIInsightsResponse
from app.services.ai_service import get_ai_insights, ask_ai_copilot

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
    req: AICopilotRequest,
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

    answer = ask_ai_copilot(db, current_user.organization_id, req.question)
    return AICopilotResponse(answer=answer)

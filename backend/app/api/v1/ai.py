from fastapi import APIRouter, Depends

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import User, Product
from app.schemas.schemas import AICopilotRequest, AICopilotResponse, AIInsightsResponse
from app.services.ai_service import get_ai_insights, ask_ai_copilot
from sqlalchemy.orm import Session
from app.services.analytics_service import get_low_stock_products

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
@router.post("/copilot")
def chat_copilot(
    request: AICopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    question = request.question.strip()
    question_lower = question.lower()

    organization_id = current_user.organization_id

    # ---------------------------------------------------------
    # 1. Out-of-stock questions
    # ---------------------------------------------------------
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
                "is_finished_product": bool(
                    product.is_finished_product
                ),
            }
            for product in products
        ]

        names = ", ".join(
            f"{item['product_name']} ({item['current_stock']} {item['unit']})"
            for item in data
        )

        return {
            "question": question,
            "answer": (
                f"{len(data)} product(s) are currently out of stock: "
                f"{names}."
            ),
            "data": data,
        }

    # ---------------------------------------------------------
    # 2. Other Copilot questions
    # ---------------------------------------------------------
    copilot_answer = ask_ai_copilot(
        db=db,
        organization_id=organization_id,
        question=question,
    )

    return {
        "question": question,
        "answer": copilot_answer,
        "data": [],
    }
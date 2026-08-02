from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_manager
from app.core.rate_limit import limiter

from app.services.cashflow_service import CashFlowService
from app.services.profit_service import ProfitService
from app.services.business_health_service import BusinessHealthService

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/cash-flow",
    summary="Cash Flow Analytics",
)
@limiter.limit("30/minute")
def get_cash_flow(
    request: Request,
    year: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    organization_id = current_user.organization_id

    return {
        "summary": CashFlowService.cash_flow_summary(
            db=db,
            organization_id=organization_id,
        ),
        "monthly": CashFlowService.monthly_cash_flow(
            db=db,
            organization_id=organization_id,
            year=year,
        ),
        "trend": CashFlowService.cash_flow_trend(
            db=db,
            organization_id=organization_id,
        ),
    }


@router.get("/business-health")
@limiter.limit("30/minute")
def get_business_health(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    return BusinessHealthService.business_health(
        db=db,
        organization_id=current_user.organization_id,
    )


@router.get("/profit-trend")
@limiter.limit("30/minute")
def get_profit_trend(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return ProfitService.monthly_profit_trend(
        db=db,
        organization_id=current_user.organization_id,
    )


@router.get("/gross-margin-trend")
@limiter.limit("30/minute")
def get_gross_margin_trend(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return ProfitService.gross_margin_trend(
        db=db,
        organization_id=current_user.organization_id,
    )


@router.get("/expense-breakdown")
@limiter.limit("30/minute")
def get_expense_breakdown(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return ProfitService.expense_breakdown(
        db=db,
        organization_id=current_user.organization_id,
    )
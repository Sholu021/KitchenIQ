from datetime import date

from sqlalchemy.orm import Session

from app.services.financial_service import profit_and_loss
from app.services.executive_dashboard_service import executive_dashboard
from app.services.report_service import (
    sales_trend,
    supplier_performance,
    abc_inventory_analysis,
)

def financial_report(
    db: Session,
    organization_id: int,
    from_date: date,
    to_date: date,
):

    return {
        "profit_and_loss": profit_and_loss(
            db=db,
            organization_id=organization_id,
            from_date=from_date,
            to_date=to_date,
        ),
        "sales_trend": sales_trend(
            db=db,
            organization_id=organization_id,
        ),
    }

def inventory_report(
    db: Session,
    organization_id: int,
):

    return {
        "abc_analysis": abc_inventory_analysis(
            db=db,
            organization_id=organization_id,
        ),
    }

def supplier_report(
    db: Session,
    organization_id: int,
):

    return supplier_performance(
        db=db,
        organization_id=organization_id,
    )

def executive_report(
    db: Session,
    organization_id: int,
    from_date: date,
    to_date: date,
):

    return executive_dashboard(
        db=db,
        organization_id=organization_id,
        from_date=from_date,
        to_date=to_date,
    )
from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.deps import (
    get_db,
    require_staff,
)
from app.models.models import User
from app.schemas.schemas import (
    ScheduledReportCreate,
    ScheduledReportUpdate,
    ScheduledReportResponse,
)

from app.services.scheduled_report_service import (
    create_scheduled_report,
    list_scheduled_reports,
    update_scheduled_report,
    delete_scheduled_report,
)

router = APIRouter(
    prefix="/scheduled-reports",
    tags=["Scheduled Reports"],
)

@router.post(
    "/",
    response_model=ScheduledReportResponse,
)
def create_report(
    data: ScheduledReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return create_scheduled_report(
        db=db,
        organization_id=current_user.organization_id,
        data=data,
    )

@router.get(
    "/",
    response_model=list[ScheduledReportResponse],
)
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return list_scheduled_reports(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.put(
    "/{report_id}",
    response_model=ScheduledReportResponse,
)
def update_report(
    report_id: int,
    data: ScheduledReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = update_scheduled_report(
        db=db,
        report_id=report_id,
        organization_id=current_user.organization_id,
        data=data,
    )

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Scheduled report not found",
        )

    return report

@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    deleted = delete_scheduled_report(
        db=db,
        report_id=report_id,
        organization_id=current_user.organization_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Scheduled report not found",
        )

    return {
        "message": "Scheduled report deleted successfully"
    }
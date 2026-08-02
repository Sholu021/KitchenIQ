from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_manager
from app.models.models import AuditLog

router = APIRouter(
    prefix="/audit",
    tags=["Audit"],
)


@router.get("")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.organization_id == current_user.organization_id,
        )
        .order_by(
            AuditLog.created_at.desc(),
        )
        .limit(200)
        .all()
    )

    return logs
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_manager
from app.services.audit_service import AuditService

router = APIRouter(
    prefix="/audit",
    tags=["Audit"],
)


@router.get("")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    return AuditService.get_logs(
        db=db,
        organization_id=current_user.organization_id,
    )


@router.get("/user/{user_id}")
def get_user_audit_logs(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    return AuditService.get_user_logs(
        db=db,
        organization_id=current_user.organization_id,
        user_id=user_id,
    )


@router.get("/entity/{entity_type}/{entity_id}")
def get_entity_audit_logs(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_manager),
):
    return AuditService.get_entity_logs(
        db=db,
        organization_id=current_user.organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
    )
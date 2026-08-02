from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_manager, require_staff
from app.models.models import User, WastageLog, Product, AuditLog
from app.schemas.schemas import WastageCreate, WastageOut
from app.services.inventory_service import adjust_stock, calculate_fefo_cost
from app.services.wastage_service import (
    record_wastage,
    delete_wastage,
)

router = APIRouter(prefix="/wastage", tags=["Wastage Tracking"])

@router.post(
    "",
    response_model=WastageOut,
    status_code=status.HTTP_201_CREATED,
)
def create_wastage(
    req: WastageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return record_wastage(
        db=db,
        organization_id=current_user.organization_id,
        product_id=req.product_id,
        quantity=req.quantity,
        reason=req.reason,
        notes=req.notes,
        user_id=current_user.id,
    )


@router.get(
    "",
    response_model=List[WastageOut],
)
def list_wastage(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return (
        db.query(WastageLog)
        .filter(
            WastageLog.organization_id == current_user.organization_id
        )
        .order_by(WastageLog.created_at.desc())
        .all()
    )


@router.get(
    "/{wastage_id}",
    response_model=WastageOut,
)
def get_wastage(
    wastage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    wastage = (
        db.query(WastageLog)
        .filter(
            WastageLog.id == wastage_id,
            WastageLog.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not wastage:
        raise HTTPException(
            status_code=404,
            detail="Wastage record not found",
        )

    return wastage

@router.delete(
    "/{wastage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_wastage_endpoint(
    wastage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    delete_wastage(
        db=db,
        organization_id=current_user.organization_id,
        wastage_id=wastage_id,
        user_id=current_user.id,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
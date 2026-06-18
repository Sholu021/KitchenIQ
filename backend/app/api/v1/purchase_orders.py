from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import PurchaseOrder, User
from app.schemas.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseOrderStatusUpdate
)
from app.services.purchase_service import create_purchase_order, update_po_status

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_po(
    req: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    items_data = [item.model_dump() for item in req.items]
    return create_purchase_order(
        db=db,
        organization_id=current_user.organization_id,
        supplier_id=req.supplier_id,
        items_data=items_data,
        user_id=current_user.id
    )


@router.get("", response_model=List[PurchaseOrderOut])
def list_pos(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (PENDING, SENT, RECEIVED, CANCELLED)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.organization_id == current_user.organization_id
    )

    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.upper())

    pos = query.order_by(PurchaseOrder.created_at.desc()).all()
    return pos


@router.get("/{po_id}", response_model=PurchaseOrderOut)
def get_po(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.organization_id == current_user.organization_id
    ).first()

    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )
    return po


@router.patch("/{po_id}/status", response_model=PurchaseOrderOut)
def update_po_state(
    po_id: int,
    req: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    return update_po_status(
        db=db,
        organization_id=current_user.organization_id,
        po_id=po_id,
        new_status=req.status,
        user_id=current_user.id
    )

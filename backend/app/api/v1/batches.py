from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import Batch, User
from app.schemas.schemas import BatchOut, BatchAdjustment
from app.services.inventory_service import adjust_stock

router = APIRouter(prefix="/batches", tags=["Batch & Inventory Movements"])

@router.get("", response_model=List[BatchOut])
def list_batches(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    query = db.query(Batch).filter(
        Batch.organization_id == current_user.organization_id,
        Batch.quantity > 0
    )
    if product_id is not None:
        query = query.filter(Batch.product_id == product_id)
        
    batches = query.order_by(Batch.expiry_date.asc().nullslast()).all()
    return batches


@router.post("/adjust", status_code=status.HTTP_200_OK)
def adjust_batch_stock(
    req: BatchAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    adjust_stock(
        db=db,
        organization_id=current_user.organization_id,
        product_id=req.product_id,
        quantity=abs(req.quantity),
        transaction_type=req.transaction_type,
        notes=req.notes,
        batch_number=req.batch_number,
        expiry_date=req.expiry_date,
        user_id=current_user.id
    )
    return {"message": "Stock adjusted successfully"}


@router.get("/alerts", response_model=dict)
def get_batch_expiry_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    # 1. Already Expired
    expired = db.query(Batch).filter(
        Batch.organization_id == current_user.organization_id,
        Batch.quantity > 0,
        Batch.expiry_date < today
    ).all()

    # 2. Expiring in 7 days
    expiring_7 = db.query(Batch).filter(
        Batch.organization_id == current_user.organization_id,
        Batch.quantity > 0,
        Batch.expiry_date >= today,
        Batch.expiry_date <= in_7_days
    ).all()

    # 3. Expiring in 30 days
    expiring_30 = db.query(Batch).filter(
        Batch.organization_id == current_user.organization_id,
        Batch.quantity > 0,
        Batch.expiry_date > in_7_days,
        Batch.expiry_date <= in_30_days
    ).all()

    return {
        "expired": [BatchOut.model_validate(b) for b in expired],
        "expiring_7": [BatchOut.model_validate(b) for b in expiring_7],
        "expiring_30": [BatchOut.model_validate(b) for b in expiring_30]
    }

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_manager, require_staff
from app.models.models import User, WastageLog, Product, AuditLog
from app.schemas.schemas import WastageLogCreate, WastageLogOut
from app.services.inventory_service import adjust_stock

router = APIRouter(prefix="/wastage", tags=["Wastage Tracking"])

@router.post("", response_model=WastageLogOut, status_code=status.HTTP_201_CREATED)
def log_wastage(
    req: WastageLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    org_id = current_user.organization_id

    # 1. Fetch product
    product = db.query(Product).filter(
        Product.id == req.product_id,
        Product.organization_id == org_id
    ).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found in this organization"
        )

    # 2. Check if there is enough stock
    if product.current_stock < req.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot log wastage: Requested {req.quantity} {product.unit}, but only {product.current_stock} {product.unit} is in stock."
        )

    # 3. Call adjust_stock to deduct from FEFO batches and create transaction
    adjust_stock(
        db=db,
        organization_id=org_id,
        product_id=req.product_id,
        quantity=req.quantity,
        transaction_type="STOCK_OUT",
        notes=f"Wastage logged: {req.reason}",
        user_id=current_user.id
    )

    # 4. Calculate cost loss
    cost_loss = req.quantity * product.cost_price

    # 5. Create WastageLog entry
    wastage = WastageLog(
        organization_id=org_id,
        product_id=req.product_id,
        quantity=req.quantity,
        cost_loss=cost_loss,
        reason=req.reason
    )
    db.add(wastage)
    
    # 6. Audit Log
    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="LOG_WASTAGE",
        entity_type="wastage",
        entity_id=wastage.id
    )
    db.add(audit)
    
    db.commit()
    db.refresh(wastage)
    return wastage


@router.get("", response_model=List[WastageLogOut])
def list_wastage(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    records = db.query(WastageLog).filter(
        WastageLog.organization_id == current_user.organization_id
    ).order_by(WastageLog.created_at.desc()).all()
    return records


@router.delete("/{wastage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_wastage(
    wastage_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    org_id = current_user.organization_id

    # 1. Fetch wastage log
    record = db.query(WastageLog).filter(
        WastageLog.id == wastage_id,
        WastageLog.organization_id == org_id
    ).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wastage record not found"
        )

    # 2. Revert the stock deduction (re-add to inventory)
    adjust_stock(
        db=db,
        organization_id=org_id,
        product_id=record.product_id,
        quantity=record.quantity,
        transaction_type="STOCK_IN",
        notes=f"Reverted wastage log entry #{wastage_id}",
        user_id=current_user.id
    )

    # 3. Delete record
    db.delete(record)

    # 4. Audit Log
    audit = AuditLog(
        organization_id=org_id,
        user_id=current_user.id,
        action="DELETE_WASTAGE_LOG",
        entity_type="wastage",
        entity_id=wastage_id
    )
    db.add(audit)

    db.commit()
    return

from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    Product,
    WastageLog,
    AuditLog,
)
from app.services.inventory_service import adjust_stock

def record_wastage(
    db: Session,
    organization_id: int,
    product_id: int,
    quantity: float,
    reason: str,
    notes: str | None,
    user_id: int,
):
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.organization_id == organization_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero",
        )

    if product.current_stock < quantity:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient stock. "
                f"Available: {product.current_stock}, "
                f"Requested: {quantity}"
            ),
        )

    # Deduct inventory using FEFO
    adjust_stock(
        db=db,
        organization_id=organization_id,
        product_id=product_id,
        quantity=quantity,
        transaction_type="STOCK_OUT",
        notes=f"Wastage: {reason}",
        user_id=user_id,
    )

    # Calculate financial loss
    cost_loss = round(product.cost_price * quantity, 2)

    # Create wastage log
    wastage = WastageLog(
        organization_id=organization_id,
        product_id=product_id,
        quantity=quantity,
        cost_loss=cost_loss,
        reason=reason,
        notes=notes,
    )

    db.add(wastage)
    db.flush()

    # Audit log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="RECORD_WASTAGE",
        entity_type="wastage",
        entity_id=wastage.id,
    )

    db.add(audit)

    db.commit()
    db.refresh(wastage)

    return wastage

def delete_wastage(
    db: Session,
    organization_id: int,
    wastage_id: int,
    user_id: int,
):
    wastage = (
        db.query(WastageLog)
        .filter(
            WastageLog.id == wastage_id,
            WastageLog.organization_id == organization_id,
        )
        .first()
    )

    if not wastage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wastage record not found",
        )

    # Restore inventory
    adjust_stock(
        db=db,
        organization_id=organization_id,
        product_id=wastage.product_id,
        quantity=wastage.quantity,
        transaction_type="STOCK_IN",
        notes="Wastage record deleted",
        user_id=user_id,
    )

    # Audit log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="DELETE_WASTAGE",
        entity_type="wastage",
        entity_id=wastage.id,
    )

    db.add(audit)

    db.delete(wastage)

    db.commit()
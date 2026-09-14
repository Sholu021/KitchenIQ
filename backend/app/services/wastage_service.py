from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.models import (
    Product,
    WastageLog,
    AuditLog,
    InventoryTransaction,
    Batch,
)
from app.services.inventory_service import (
    adjust_stock,
    calculate_fefo_cost,
)

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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be greater than zero",
        )

    if product.current_stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock. "
                f"Available: {product.current_stock}, "
                f"Requested: {quantity}"
            ),
        )

    # Calculate the actual batch-level loss before consuming stock.
    # Expired batches are allowed because this is a disposal operation.
    cost_loss = calculate_fefo_cost(
        db=db,
        organization_id=organization_id,
        product_id=product_id,
        quantity=quantity,
        allow_expired=True,
    )

    # Create the wastage record first so we have its ID for transaction tracing.
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

    # Deduct inventory using FEFO.
    # Expired batches are allowed because they are being disposed of.
    adjust_stock(
        db=db,
        organization_id=organization_id,
        product_id=product_id,
        quantity=quantity,
        transaction_type="STOCK_OUT",
        notes=f"Wastage: {reason}",
        user_id=user_id,
        reference=f"WASTAGE:{wastage.id}",
        allow_expired=True,
    )

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

    # Find the inventory transactions created by this wastage.
    wastage_transactions = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.organization_id == organization_id,
            InventoryTransaction.product_id == wastage.product_id,
            InventoryTransaction.reference == f"WASTAGE:{wastage.id}",
            InventoryTransaction.transaction_type == "STOCK_OUT",
        )
        .order_by(InventoryTransaction.id.asc())
        .all()
    )

    # New wastage records must have batch-level transaction traceability.
    if not wastage_transactions:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This wastage record has no traceable inventory transactions "
                "and cannot be safely reversed."
            ),
        )

    restored_quantity = 0.0

    for transaction in wastage_transactions:
        if not transaction.batch_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Wastage transaction {transaction.id} has no batch "
                    "reference and cannot be safely reversed."
                ),
            )

        batch = (
            db.query(Batch)
            .filter(
                Batch.id == transaction.batch_id,
                Batch.organization_id == organization_id,
                Batch.product_id == wastage.product_id,
            )
            .with_for_update()
            .first()
        )

        if not batch:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Original batch {transaction.batch_id} could not be found. "
                    "Wastage cannot be safely reversed."
                ),
            )

        restore_qty = abs(transaction.quantity)

        batch.remaining_quantity += restore_qty
        restored_quantity += restore_qty

        reversal = InventoryTransaction(
            organization_id=organization_id,
            product_id=wastage.product_id,
            batch_id=batch.id,
            created_by=user_id,
            transaction_type="STOCK_IN",
            quantity=restore_qty,
            notes=f"Reversal of Wastage #{wastage.id}",
            reference=f"WASTAGE_REVERSAL:{wastage.id}",
        )

        db.add(reversal)

    # Restore product-level stock exactly once.
    product = (
        db.query(Product)
        .filter(
            Product.id == wastage.product_id,
            Product.organization_id == organization_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.current_stock += restored_quantity

    # Audit deletion/reversal.
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
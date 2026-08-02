from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Product, InventoryTransaction, Batch, AuditLog
from app.models.models import Organization

def calculate_fefo_cost(
    db: Session,
    organization_id: int,
    product_id: int,
    quantity: float,
) -> float:

    batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == organization_id,
            Batch.product_id == product_id,
            Batch.remaining_quantity > 0,
        )
        .order_by(
            Batch.expiry_date.asc().nullslast(),
            Batch.received_at.asc(),
        )
        .all()
    )

    remaining = quantity
    total_cost = 0.0

    for batch in batches:

        if remaining <= 0:
            break

        used = min(batch.remaining_quantity, remaining)

        total_cost += used * batch.purchase_price

        remaining -= used

    if remaining > 0:
        raise HTTPException(
            status_code=400,
            detail="Insufficient batch inventory for cost calculation",
        )

    return round(total_cost, 2)

def adjust_stock(
    db: Session,
    organization_id: int,
    product_id: int,
    quantity: float,
    transaction_type: str,
    notes: Optional[str] = None,
    batch_number: Optional[str] = None,
    expiry_date: Optional[date] = None,
    user_id: Optional[int] = None,
    purchase_price: Optional[float] = None,
    purchase_order_id: Optional[int] = None,
) -> InventoryTransaction:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == organization_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Determine net stock change direction
    # STOCK_IN increases stock
    # STOCK_OUT decreases stock
    # ADJUSTMENT quantity can represent absolute delta (if quantity > 0 we treat as input, else output)
    if transaction_type == "STOCK_IN":
        net_change = quantity
    elif transaction_type == "STOCK_OUT":
        net_change = -quantity
    elif transaction_type == "ADJUSTMENT":
        net_change = quantity  # can be positive or negative
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transaction type: {transaction_type}"
        )

    # Prevent negative inventory
    if product.current_stock + net_change < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient inventory for product '{product.name}'. Available: {product.current_stock}, Requested reduction: {abs(net_change)}"
        )

    # --- Batch Management ---
    # For incoming stock, insert/update batch
    if net_change > 0:

        b_num = batch_number or f"BATCH-{date.today():%Y%m%d}"

        batch = (
            db.query(Batch)
            .filter(
                Batch.product_id == product_id,
                Batch.batch_number == b_num,
                Batch.organization_id == organization_id,
            )
            .first()
        )

        if batch:
            # Existing batch
            batch.quantity += net_change
            batch.remaining_quantity += net_change

            if expiry_date is not None:
                batch.expiry_date = expiry_date

            if purchase_price is not None:
                batch.purchase_price = purchase_price

        else:
            # Create new batch
            batch = Batch(
                organization_id=organization_id,
                product_id=product_id,
                batch_number=b_num,
                expiry_date=expiry_date,
                quantity=net_change,
                remaining_quantity=net_change,
                purchase_price=purchase_price or product.cost_price,
            )
            db.add(batch)
            db.flush()    # ensures batch.id is available
            
    # For outgoing stock, deduct from batches using FEFO (First-Expiring-First-Out)
    elif net_change < 0:
        reduction_needed = abs(net_change)
        
        # Query active batches, sorting by expiry date (nulls last)
        from sqlalchemy import or_

        batches = (
            db.query(Batch)
            .filter(
                Batch.product_id == product_id,
                Batch.organization_id == organization_id,
                Batch.remaining_quantity > 0,
                or_(
                    Batch.expiry_date == None,
                    Batch.expiry_date >= date.today(),
                ),
            )
            .order_by(
                Batch.expiry_date.asc().nullslast(),
                Batch.received_at.asc(),
            )
            .all()
        )
        print("\n========== FEFO ==========")
        print("Product:", product.name)
        print("Need:", reduction_needed)

        for b in batches:
            print(
                b.id,
                b.batch_number,
                b.remaining_quantity,
                b.expiry_date,
            )
        # Verify total batch quantity matches
        total_batch_qty = sum(b.remaining_quantity for b in batches)
        if total_batch_qty < reduction_needed:
            # If batches are out of sync, make up from a default batch or raise error
            # To be safe and strict, raise error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient batch quantities for product '{product.name}'. Total batches available: {total_batch_qty}, Needed: {reduction_needed}"
            )
        for batch in batches:
            if reduction_needed <= 0:
                break

            if batch.remaining_quantity >= reduction_needed:
                used = reduction_needed
                batch.remaining_quantity -= used
                reduction_needed = 0
            else:
                used = batch.remaining_quantity
                batch.remaining_quantity = 0
                reduction_needed -= used

            txn = InventoryTransaction(
                organization_id=organization_id,
                product_id=product_id,
                batch_id=batch.id,
                purchase_order_id=purchase_order_id,
                created_by=user_id,
                transaction_type=transaction_type,
                quantity=net_change,
                notes=notes,
            )
            db.add(txn)
            db.flush()

            print(
                "Saved transaction:",
                txn.id,
                txn.batch_id,
                txn.transaction_type,
                txn.quantity,
            )

            print(
                "Using batch:",
                batch.batch_number,
                "Remaining:",
                batch.remaining_quantity,
            )

    # ----------------------------
    # Update product stock
    # ----------------------------
    product.current_stock += net_change

    # Create STOCK_IN transaction only.
    if transaction_type == "STOCK_IN":
        txn = InventoryTransaction(
            organization_id=organization_id,
            product_id=product_id,
            batch_id=batch.id,
            purchase_order_id=None,
            created_by=user_id,
            transaction_type=transaction_type,
            quantity=net_change,
            notes=notes,
        )
        db.add(txn)
    else:
        txn = None

    db.flush()

    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=f"STOCK_ADJUSTMENT_{transaction_type}",
        entity_type="product",
        entity_id=product_id,
    )
    db.add(audit)

    return txn
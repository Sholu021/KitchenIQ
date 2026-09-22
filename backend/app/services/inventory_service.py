from datetime import date
from sqlalchemy import or_
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Product, InventoryTransaction, Batch, AuditLog, Organization
from app.models.models import Organization

def calculate_fefo_cost(
    db: Session,
    organization_id: int,
    product_id: int,
    quantity: float,
    allow_expired: bool = False,
) -> float:
    query = (
        db.query(Batch)
        .filter(
            Batch.organization_id == organization_id,
            Batch.product_id == product_id,
            Batch.remaining_quantity > 0,
        )
    )

    if not allow_expired:
        query = query.filter(
            or_(
                Batch.expiry_date.is_(None),
                Batch.expiry_date >= date.today(),
            )
        )

    batches = (
        query
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
    batch_id: Optional[int] = None,
    batch_number: Optional[str] = None,
    expiry_date: Optional[date] = None,
    user_id: Optional[int] = None,
    purchase_price: Optional[float] = None,
    purchase_order_id: Optional[int] = None,
    reference: Optional[str] = None,
    allow_expired: bool = False,
    ) -> InventoryTransaction:

    if transaction_type in ("STOCK_IN", "STOCK_OUT") and quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock quantity must be greater than zero.",
        )

    if transaction_type == "ADJUSTMENT" and quantity == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment quantity cannot be zero.",
        )

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
    # ADJUSTMENT quantity can be positive or negative
    if transaction_type == "STOCK_IN":
        net_change = quantity
    elif transaction_type == "STOCK_OUT":
        net_change = -quantity
    elif transaction_type == "ADJUSTMENT":
        net_change = quantity
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid transaction type: {transaction_type}",
        )

    # Prevent negative inventory
    if product.current_stock + net_change < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient inventory for product '{product.name}'. "
                f"Available: {product.current_stock}, "
                f"Requested reduction: {abs(net_change)}"
            ),
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
            # New batch
            organization = (
                db.query(Organization)
                .filter(
                    Organization.id == organization_id
                )
                .first()
            )

            if organization and organization.subscription_tier == "Free":
                active_batch_count = (
                    db.query(Batch)
                    .filter(
                        Batch.organization_id == organization_id,
                        Batch.quantity > 0,
                    )
                    .count()
                )

                if active_batch_count >= 5:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=(
                            "Free tier active batch limit (5) reached. "
                            "Upgrade to Pro to create additional batches."
                        ),
                    )

            batch = Batch(
                organization_id=organization_id,
                product_id=product_id,
                batch_number=b_num,
                expiry_date=expiry_date,
                quantity=net_change,
                remaining_quantity=net_change,
                purchase_price=(
                    purchase_price
                    if purchase_price is not None
                    else product.cost_price
                ),
            )

            db.add(batch)
            db.flush()

    # For outgoing stock, deduct from batches using FEFO
    elif net_change < 0:
        reduction_needed = abs(net_change)

        # ---------------------------------------------------------
        # Exact batch requested
        # ---------------------------------------------------------
        if batch_id is not None:
            batch_query = (
                db.query(Batch)
                .filter(
                    Batch.id == batch_id,
                    Batch.product_id == product_id,
                    Batch.organization_id == organization_id,
                    Batch.remaining_quantity > 0,
                )
            )

            if not allow_expired:
                batch_query = batch_query.filter(
                    or_(
                        Batch.expiry_date.is_(None),
                        Batch.expiry_date >= date.today(),
                    )
                )

            batch = batch_query.first()

            if not batch:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Selected batch not found or has no remaining stock.",
                )

            if batch.remaining_quantity < reduction_needed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient stock in batch '{batch.batch_number}'. "
                        f"Available: {batch.remaining_quantity}, "
                        f"Requested: {reduction_needed}"
                    ),
                )

            batch.remaining_quantity -= reduction_needed

            txn = InventoryTransaction(
                organization_id=organization_id,
                product_id=product_id,
                batch_id=batch.id,
                purchase_order_id=purchase_order_id,
                created_by=user_id,
                transaction_type=transaction_type,
                quantity=net_change,
                notes=notes,
                reference=reference,
            )

            db.add(txn)
            db.flush()

        # ---------------------------------------------------------
        # No batch specified → normal FEFO
        # ---------------------------------------------------------
        else:
            batch_query = (
                db.query(Batch)
                .filter(
                    Batch.product_id == product_id,
                    Batch.organization_id == organization_id,
                    Batch.remaining_quantity > 0,
                )
            )

            if not allow_expired:
                batch_query = batch_query.filter(
                    or_(
                        Batch.expiry_date.is_(None),
                        Batch.expiry_date >= date.today(),
                    )
                )

            batches = (
                batch_query
                .order_by(
                    Batch.expiry_date.asc().nullslast(),
                    Batch.received_at.asc(),
                )
                .all()
            )

            total_batch_qty = sum(
                b.remaining_quantity for b in batches
            )

            if total_batch_qty < reduction_needed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Insufficient batch quantities for product "
                        f"'{product.name}'. "
                        f"Total batches available: {total_batch_qty}, "
                        f"Needed: {reduction_needed}"
                    ),
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
                    quantity=-used,
                    notes=notes,
                    reference=reference,
                )

                db.add(txn)
                db.flush()

    # ----------------------------
    # Update product stock
    # ----------------------------
    product.current_stock += net_change

    # Incoming stock or positive adjustment:
    # create one transaction for the batch that received the quantity.
    if net_change > 0:
        txn = InventoryTransaction(
            organization_id=organization_id,
            product_id=product_id,
            batch_id=batch.id,
            purchase_order_id=purchase_order_id,
            created_by=user_id,
            transaction_type=transaction_type,
            quantity=net_change,
            notes=notes,
            reference=reference,
        )

        db.add(txn)
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
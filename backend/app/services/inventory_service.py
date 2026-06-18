from datetime import date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Product, InventoryTransaction, Batch, AuditLog

def adjust_stock(
    db: Session,
    organization_id: int,
    product_id: int,
    quantity: float,  # Always positive in call parameters; sign determined by type
    transaction_type: str,  # STOCK_IN, STOCK_OUT, ADJUSTMENT
    notes: Optional[str] = None,
    batch_number: Optional[str] = None,
    expiry_date: Optional[date] = None,
    user_id: Optional[int] = None
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
        b_num = batch_number or f"BATCH-{date.today().strftime('%Y%m%d')}"
        # Find if batch already exists for this product
        batch = db.query(Batch).filter(
            Batch.product_id == product_id,
            Batch.batch_number == b_num,
            Batch.organization_id == organization_id
        ).first()

        # Check active batches limit for Free tier
        from app.models.models import Organization
        org = db.query(Organization).filter(Organization.id == organization_id).first()
        if org and org.subscription_tier == "Free":
            if not batch or batch.quantity <= 0:
                active_batches_count = db.query(Batch).filter(
                    Batch.organization_id == organization_id,
                    Batch.quantity > 0
                ).count()
                if active_batches_count >= 5:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Organization active batch limit (5) reached on Free tier. Upgrade to Pro."
                    )

        if batch:
            batch.quantity += net_change
            if expiry_date:
                batch.expiry_date = expiry_date
        else:
            batch = Batch(
                organization_id=organization_id,
                product_id=product_id,
                batch_number=b_num,
                expiry_date=expiry_date,
                quantity=net_change
            )
            db.add(batch)
            
    # For outgoing stock, deduct from batches using FEFO (First-Expiring-First-Out)
    elif net_change < 0:
        reduction_needed = abs(net_change)
        
        # Query active batches, sorting by expiry date (nulls last)
        batches = db.query(Batch).filter(
            Batch.product_id == product_id,
            Batch.organization_id == organization_id,
            Batch.quantity > 0
        ).order_by(
            Batch.expiry_date.asc().nullslast()
        ).all()
        
        # Verify total batch quantity matches
        total_batch_qty = sum(b.quantity for b in batches)
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
            if batch.quantity >= reduction_needed:
                batch.quantity -= reduction_needed
                reduction_needed = 0
            else:
                reduction_needed -= batch.quantity
                batch.quantity = 0.0

    # Update product current stock
    product.current_stock += net_change

    # Create Inventory Transaction Log
    txn = InventoryTransaction(
        organization_id=organization_id,
        product_id=product_id,
        transaction_type=transaction_type,
        quantity=net_change,
        notes=notes
    )
    db.add(txn)
    db.flush()

    # Create Audit Log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=f"STOCK_ADJUSTMENT_{transaction_type}",
        entity_type="product",
        entity_id=product_id
    )
    db.add(audit)
    
    return txn

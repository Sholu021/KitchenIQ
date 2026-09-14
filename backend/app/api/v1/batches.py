from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import Batch, User,InventoryTransaction, Product, AuditLog
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
        Batch.remaining_quantity > 0
    )
    if product_id is not None:
        query = query.filter(Batch.product_id == product_id)
        
    batches = query.order_by(Batch.expiry_date.asc().nullslast()).all()
    return batches


@router.post("/adjust", status_code=status.HTTP_200_OK)
def adjust_batch_stock(
    req: BatchAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    transaction_type = req.transaction_type.upper()

    if transaction_type not in {"STOCK_IN", "STOCK_OUT"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual stock adjustments only support STOCK_IN or STOCK_OUT.",
        )

    adjust_stock(
        db=db,
        organization_id=current_user.organization_id,
        product_id=req.product_id,
        quantity=abs(req.quantity),
        transaction_type=transaction_type,
        notes=req.notes,
        batch_number=req.batch_number,
        expiry_date=req.expiry_date,
        user_id=current_user.id,
    )

    db.commit()

    return {"message": "Stock adjusted successfully"}

@router.get("/alerts", response_model=dict)
def get_batch_expiry_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    today = date.today()
    in_7_days = today + timedelta(days=7)
    in_30_days = today + timedelta(days=30)

    # 1. Already Expired
    expired = (
        db.query(Batch)
        .filter(
            Batch.organization_id == current_user.organization_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date < today,
        )
        .all()
    )

    # 2. Expiring in 7 days
    expiring_7 = (
        db.query(Batch)
        .filter(
            Batch.organization_id == current_user.organization_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date >= today,
            Batch.expiry_date <= in_7_days,
        )
        .all()
    )

    # 3. Expiring in 30 days
    expiring_30 = (
        db.query(Batch)
        .filter(
            Batch.organization_id == current_user.organization_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date > in_7_days,
            Batch.expiry_date <= in_30_days,
        )
        .all()
    )

    # Inventory value at risk
    expired_value = sum(
        (b.remaining_quantity or 0) * (b.purchase_price or 0)
        for b in expired
    )

    expiring_7_value = sum(
        (b.remaining_quantity or 0) * (b.purchase_price or 0)
        for b in expiring_7
    )

    expiring_30_value = sum(
        (b.remaining_quantity or 0) * (b.purchase_price or 0)
        for b in expiring_30
    )

    return {
        "expired": [BatchOut.model_validate(b) for b in expired],
        "expired_value": round(expired_value, 2),

        "expiring_7": [BatchOut.model_validate(b) for b in expiring_7],
        "expiring_7_value": round(expiring_7_value, 2),

        "expiring_30": [BatchOut.model_validate(b) for b in expiring_30],
        "expiring_30_value": round(expiring_30_value, 2),

        "total_value_at_risk": round(
            expired_value +
            expiring_7_value +
            expiring_30_value,
            2,
        ),
    }
@router.get("/value", response_model=dict)
def get_inventory_value(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    org_id = current_user.organization_id

    batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == org_id,
            Batch.remaining_quantity > 0,
        )
        .order_by(Batch.product_id, Batch.expiry_date.asc().nullslast())
        .all()
    )

    total_value = 0.0
    product_summary = {}
    today = date.today()
    in_30_days = today + timedelta(days=30)

    expired_value = 0.0
    expiring_value = 0.0
    for batch in batches:

        value = batch.remaining_quantity * batch.purchase_price
        if batch.expiry_date:

           if batch.expiry_date < today:
               expired_value += value

           elif batch.expiry_date <= in_30_days:
               expiring_value += value
        total_value += value

        key = batch.product_id

        if key not in product_summary:
            product_summary[key] = {
                "product_id": batch.product_id,
                "product_name": batch.product.name,
                "total_quantity": 0.0,
                "inventory_value": 0.0,
                "batch_count": 0,
            }

        product_summary[key]["total_quantity"] += batch.remaining_quantity
        product_summary[key]["inventory_value"] += value
        product_summary[key]["batch_count"] += 1

    return {
        "total_inventory_value": round(total_value, 2),

        "expired_inventory_value": round(expired_value, 2),

        "inventory_at_risk": round(expiring_value, 2),

        "total_products": len(product_summary),

        "products": sorted(
            product_summary.values(),
            key=lambda x: x["inventory_value"],
            reverse=True,
        ),
    }

@router.get("/products/{product_id}/ledger")
def get_product_inventory_ledger(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    # Verify product belongs to current organization
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    transactions = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.product_id == product_id,
            InventoryTransaction.organization_id
            == current_user.organization_id,
        )
        .order_by(
            InventoryTransaction.created_at.desc(),
            InventoryTransaction.id.desc(),
        )
        .all()
    )

    ledger = []

    running_balance = product.current_stock

    for transaction in transactions:

        batch = None

        if transaction.batch_id:
            batch = (
                db.query(Batch)
                .filter(
                    Batch.id == transaction.batch_id,
                    Batch.organization_id == current_user.organization_id,
                )
                .first()
            )

        created_by_name = None
        user = None

        if transaction.created_by:
            user = (
                db.query(User)
                .filter(
                    User.id == transaction.created_by,
                    User.organization_id == current_user.organization_id,
                )
                .first()
            )

        if user:
            created_by_name = (
                getattr(user, "name", None)
                or getattr(user, "full_name", None)
                or getattr(user, "username", None)
                or getattr(user, "email", None)
            )
  
        balance_after = running_balance

        ledger.append(
            {
                "id": transaction.id,
                "product_id": transaction.product_id,
                "batch_id": transaction.batch_id,
                "batch_number": (
                    batch.batch_number
                    if batch
                    else None
                ),
                "expiry_date": (
                    batch.expiry_date.isoformat()
                    if batch and batch.expiry_date
                    else None
                ),
                "transaction_type": transaction.transaction_type,
                "quantity": transaction.quantity,
                "balance": balance_after,
                "notes": transaction.notes,
                "reference": transaction.reference,
                "purchase_order_id": transaction.purchase_order_id,
                "created_by": transaction.created_by,
                "created_by_name": created_by_name,
                "created_at": (
                    transaction.created_at.isoformat()
                    if transaction.created_at
                    else None
                ),
            }
        )

        # Move backwards through the ledger
        # because transactions are newest -> oldest.
        running_balance -= transaction.quantity


    return {
        "product_id": product.id,
        "product_name": product.name,
        "current_stock": product.current_stock,
        "unit": product.unit,
        "transactions": ledger,
    }

@router.get("/transactions/recent")
def get_recent_inventory_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    transactions = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.organization_id
            == current_user.organization_id,
        )
        .order_by(
            InventoryTransaction.created_at.desc(),
            InventoryTransaction.id.desc(),
        )
        .limit(10)
        .all()
    )

    return [
        {
            "id": transaction.id,
            "product_id": transaction.product_id,
            "product_name": (
                transaction.product.name
                if transaction.product
                else "Unknown Product"
            ),
            "transaction_type": transaction.transaction_type,
            "quantity": transaction.quantity,
            "notes": transaction.notes,
            "reference": transaction.reference,
            "purchase_order_id": transaction.purchase_order_id,
            "created_by": transaction.created_by,
            "created_at": (
                transaction.created_at.isoformat()
                if transaction.created_at
                else None
            ),
        }
        for transaction in transactions
    ]
    
@router.get("/{batch_id}/history")
def get_batch_history(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    batch = (
        db.query(Batch)
        .filter(
            Batch.id == batch_id,
            Batch.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    transactions = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.batch_id == batch.id,
            InventoryTransaction.organization_id
            == current_user.organization_id,
        )
        .order_by(InventoryTransaction.created_at)
        .all()
    )

    return {
        "batch_id": batch.id,
        "batch_number": batch.batch_number,
        "product": batch.product.name,
        "received": batch.received_at,
        "expiry_date": batch.expiry_date,
        "purchase_price": batch.purchase_price,
        "original_quantity": batch.quantity,
        "remaining_quantity": batch.remaining_quantity,
        "history": [
            {
                "date": t.created_at,
                "type": t.transaction_type,
                "quantity": t.quantity,
                "purchase_order_id": t.purchase_order_id,
                "notes": t.notes,
            }
            for t in transactions
        ],
    }
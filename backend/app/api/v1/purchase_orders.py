from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime, timedelta, date, UTC
from sqlalchemy import func
from app.core.deps import get_db, get_current_user, require_manager, require_staff
from app.models.models import (
    Product,
    PurchaseOrder,
    PurchaseOrderItem,
    Batch,
    InventoryTransaction,
    User,
    Sale,
    SaleItem,
    RecipeIngredient,
)
from app.schemas.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderOut,
    PurchaseOrderStatusUpdate
)
from app.schemas.purchase import (
    SupplierInvoiceCreate,
    SupplierInvoiceOut,
)
from app.schemas.purchase_order import ReceivePurchaseOrderRequest
from app.services.purchase_service import create_purchase_order, update_po_status, generate_purchase_orders_from_recommendations, approve_purchase_order_service, create_supplier_invoice
from app.services.inventory_service import adjust_stock

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

@router.post(
    "",
    response_model=PurchaseOrderOut,
    status_code=status.HTTP_201_CREATED,
)
def create_po(
    req: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    items_data = [
        item.model_dump()
        for item in req.items
    ]

    return create_purchase_order(
        db=db,
        organization_id=current_user.organization_id,
        supplier_id=req.supplier_id,
        items_data=items_data,
        user_id=current_user.id,
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
    print(
        "Current User:",
        current_user.id,
        current_user.email,
        current_user.role,
    )

    return update_po_status(
        db=db,
        organization_id=current_user.organization_id,
        po_id=po_id,
        new_status=req.status,
        user_id=current_user.id
    )

@router.post("/generate")
def generate_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return generate_purchase_orders_from_recommendations(
        db=db,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
    )


@router.post("/{purchase_order_id}/receive")
def receive_purchase_order(
    purchase_order_id: int,
    request: ReceivePurchaseOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    org_id = current_user.organization_id

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == purchase_order_id,
            PurchaseOrder.organization_id == org_id,
        )
        .with_for_update()
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    if po.status not in ("SENT", "PARTIALLY_RECEIVED"):
        raise HTTPException(
            status_code=400,
            detail=(
                "Purchase Order must be SENT or "
                "PARTIALLY_RECEIVED before receiving."
            ),
        )

    items_lookup = {
        item.purchase_order_item_id: item
        for item in request.items
    }

    po_items = (
        db.query(PurchaseOrderItem)
        .filter(PurchaseOrderItem.purchase_order_id == po.id)
        .all()
    )

    for po_item in po_items:
        received = items_lookup.get(po_item.id)
        if not received:
            raise HTTPException(
                status_code=400,
                detail=f"No receive data provided for purchase order item {po_item.id}",
            )
     
        receive_qty = received.quantity

        remaining_qty = (
            po_item.quantity - po_item.received_quantity
        )

        if receive_qty > remaining_qty:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot receive {receive_qty}. "
                    f"Only {remaining_qty} remaining."
                ),
            )

        product = (
            db.query(Product)
            .filter(
                Product.id == po_item.product_id,
                Product.organization_id == org_id,
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {po_item.product_id} not found in your organization.",
            )

        db.flush()

        # Update current stock
        adjust_stock(
            db=db,
            organization_id=org_id,
            product_id=product.id,
            quantity=receive_qty,
            transaction_type="STOCK_IN",
            batch_number=received.batch_number,
            expiry_date=received.expiry_date,
            user_id=current_user.id,
            purchase_order_id=po.id,
            notes=f"Purchase Order {po.po_number} received",
            purchase_price=po_item.unit_price,
        )

        batch = (
            db.query(Batch)
            .filter(
                Batch.organization_id == org_id,
                Batch.product_id == product.id,
                Batch.batch_number == received.batch_number,
            )
            .first()
        )
        # Save received batch details
        po_item.batch_number = received.batch_number
        po_item.expiry_date = received.expiry_date
        po_item.received_quantity += receive_qty

        # Create inventory transaction
        

    all_received = all(
        item.received_quantity >= item.quantity
        for item in po_items
    )

    if all_received:
        po.status = "RECEIVED"
        po.received_date = datetime.now(UTC)
    else:
        po.status = "PARTIALLY_RECEIVED"

    db.commit()

    return {
        "message": (
            "Purchase Order fully received."
            if all_received
            else "Purchase Order partially received."
        ),
        "status": po.status,
    }

@router.post("/{po_id}/approve")
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return approve_purchase_order_service(
        db=db,
        organization_id=current_user.organization_id,
        po_id=po_id,
        user_id=current_user.id,
    )

@router.post(
    "/invoice",
    response_model=SupplierInvoiceOut,
)
def create_invoice(
    request: SupplierInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return create_supplier_invoice(
        db=db,
        organization_id=current_user.organization_id,
        purchase_order_id=request.purchase_order_id,
        invoice_number=request.invoice_number,
        invoice_date=request.invoice_date,
        invoice_amount=request.invoice_amount,
    )
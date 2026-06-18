from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import PurchaseOrder, PurchaseOrderItem, Product, AuditLog
from app.services.inventory_service import adjust_stock

def create_purchase_order(
    db: Session,
    organization_id: int,
    supplier_id: int,
    items_data: List[dict],
    user_id: Optional[int] = None
) -> PurchaseOrder:
    # Validate supplier exists in organization
    from app.models.models import Supplier
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.organization_id == organization_id
    ).first()
    
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    # 1. Create PurchaseOrder
    po = PurchaseOrder(
        organization_id=organization_id,
        supplier_id=supplier_id,
        status="PENDING",
        total_amount=0.0
    )
    db.add(po)
    db.flush()

    # 2. Add Items
    total_amount = 0.0
    for item in items_data:
        prod_id = item["product_id"]
        qty = item["quantity"]
        u_price = item["unit_price"]

        # Validate product exists in org
        prod = db.query(Product).filter(
            Product.id == prod_id,
            Product.organization_id == organization_id
        ).first()
        if not prod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product ID {prod_id} not found"
            )

        po_item = PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=prod_id,
            quantity=qty,
            unit_price=u_price
        )
        db.add(po_item)
        total_amount += qty * u_price

    po.total_amount = total_amount
    db.flush()

    # Audit Log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="CREATE_PURCHASE_ORDER",
        entity_type="purchase_order",
        entity_id=po.id
    )
    db.add(audit)
    db.commit()
    db.refresh(po)
    
    return po

def update_po_status(
    db: Session,
    organization_id: int,
    po_id: int,
    new_status: str,
    user_id: Optional[int] = None
) -> PurchaseOrder:
    po = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == po_id,
        PurchaseOrder.organization_id == organization_id
    ).first()

    if not po:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase order not found"
        )

    valid_statuses = ["PENDING", "SENT", "RECEIVED", "CANCELLED"]
    new_status = new_status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PO status: {new_status}"
        )

    # Prevent transitions out of terminal states
    if po.status in ["RECEIVED", "CANCELLED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from terminal state '{po.status}'"
        )

    # Handle transitions
    if new_status == "RECEIVED":
        # Increment stock for all items
        for item in po.items:
            adjust_stock(
                db=db,
                organization_id=organization_id,
                product_id=item.product_id,
                quantity=item.quantity,
                transaction_type="STOCK_IN",
                notes=f"Auto stock increase from received Purchase Order #{po.id}",
                batch_number=f"PO-{po.id}",
                expiry_date=None,  # Default to no expiry for PO receive, or adjust later
                user_id=user_id
            )

    po.status = new_status
    
    # Audit Log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action=f"UPDATE_PO_STATUS_{new_status}",
        entity_type="purchase_order",
        entity_id=po.id
    )
    db.add(audit)
    db.commit()
    db.refresh(po)
    
    return po

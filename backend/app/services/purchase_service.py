from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.services.forecast_service import calculate_reorder_recommendations
from collections import defaultdict
from app.models.models import PurchaseOrder, PurchaseOrderItem, Product, Supplier, AuditLog, SupplierInvoice
from app.services.inventory_service import adjust_stock
from datetime import datetime, date,  timedelta, UTC
from app.services.audit_service import AuditService
from app.services.notification_service import create_notification

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

    if not items_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase order must contain at least one item."
        )

    today = date.today()

    # Generate a PO number
    po_number = f"PO-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}"

    po = PurchaseOrder(
        organization_id=organization_id,
        supplier_id=supplier_id,
        status="DRAFT",
        total_amount=0.0,
        po_number=po_number,
        order_date=date.today(),
        created_by=user_id,
    )
    db.add(po)
    db.flush()

        # 2. Add Items
    total_amount = 0.0

    for item in items_data:
        prod_id = item["product_id"]
        qty = item["quantity"]
        u_price = item["unit_price"]

        if qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than zero."
            )

        if u_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unit price cannot be negative."
            )

        batch_number = item.get("batch_number")
        expiry_date = item.get("expiry_date")

        print("ITEM RECEIVED:", item)
        print("Batch:", batch_number)
        print("Expiry:", expiry_date)

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
            unit_price=u_price,
            batch_number=batch_number,
            expiry_date=expiry_date,
        )

        db.add(po_item)

        total_amount += qty * u_price

    po.total_amount = total_amount

    if po.total_amount >= 500:
        po.status = "PENDING_APPROVAL"

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Purchase Order Approval Required",
            message=f"Purchase Order {po.po_number} requires approval.",
            notification_type="INFO",
        )

    db.commit()
    db.refresh(po)
    
    AuditService.log(
        db=db,
        organization_id=po.organization_id,
        user_id=user_id,
        action="CREATE",
        entity_type="Purchase Order",
        entity_id=po.id,
    )
    return po

def update_po_status(
    db: Session,
    organization_id: int,
    po_id: int,
    new_status: str,
    user_id: Optional[int] = None,
) -> PurchaseOrder:

    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.organization_id == organization_id,
        )
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    new_status = new_status.upper()

    valid_statuses = [
        "DRAFT",
        "PENDING",
        "PENDING_APPROVAL",
        "SENT",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CANCELLED",
    ]

    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid purchase order status",
        )

    # Terminal states
    current_status = po.status.upper()

    if current_status in ["RECEIVED", "CANCELLED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Purchase Order already {po.status}",
        )

    # -----------------------------
    # DRAFT -> SENT
    # -----------------------------
    current_status = po.status.upper()

    # -----------------------------
    # DRAFT -> PENDING_APPROVAL
    # -----------------------------
    if current_status == "DRAFT" and new_status == "PENDING_APPROVAL":
        po.status = "PENDING_APPROVAL"

    # -----------------------------
    # DRAFT/PENDING -> SENT
    # -----------------------------
    elif current_status in ["DRAFT", "PENDING"] and new_status == "SENT":
        po.status = "SENT"
        po.sent_date = datetime.now(UTC)

    # -----------------------------
    # SENT -> RECEIVED
    # -----------------------------
    elif po.status.upper() == "SENT" and new_status == "RECEIVED":
        po.status = "RECEIVED"
        po.received_date = datetime.now(UTC)

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Purchase Order Received",
            message=f"{po.po_number} has been fully received.",
            notification_type="SUCCESS",
        )
    # -----------------------------
    # SENT -> CANCELLED
    # -----------------------------
    elif po.status.upper() == "SENT" and new_status == "CANCELLED":
        po.status = "CANCELLED"

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change status from {po.status} to {new_status}",
        )

    db.commit()
    db.refresh(po)

    AuditService.log(
        db=db,
        organization_id=po.organization_id,
        user_id=user_id,
        action=f"STATUS_CHANGED_TO_{new_status}",
        entity_type="Purchase Order",
        entity_id=po.id,
    )

    return po

def generate_purchase_orders_from_recommendations(
    db: Session,
    organization_id: int,
    user_id: int,
):
    recommendations = calculate_reorder_recommendations(
        db=db,
        organization_id=organization_id,
    )

    if not recommendations:
        return {
            "message": "No reorder recommendations available.",
            "purchase_orders": [],
        }

    supplier_groups = defaultdict(list)

    for recommendation in recommendations:

        # Skip products that don't actually need ordering
        if recommendation["recommended_order_quantity"] <= 0:
            continue

        product = (
            db.query(Product)
            .filter(
                Product.id == recommendation["product_id"],
                Product.organization_id == organization_id,
            )
            .first()
        )

        if not product or not product.supplier_id:
            continue

        supplier_groups[product.supplier_id].append(
            {
                "product": product,
                "quantity": recommendation["recommended_order_quantity"],
            }
        )
    print(supplier_groups)
    created_purchase_orders = []

    for supplier_id, items in supplier_groups.items():

        valid_items = [
            item
            for item in items
            if item["quantity"] > 0
        ]

        if not valid_items:
            continue

        supplier = (
            db.query(Supplier)
            .filter(
                Supplier.id == supplier_id,
                Supplier.organization_id == organization_id,
            )
            .first()
        )

        if not supplier:
            continue
        
        existing_po = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.organization_id == organization_id,
                PurchaseOrder.supplier_id == supplier_id,
                PurchaseOrder.status == "DRAFT",
            )
            .first()
        )
        print("Supplier:", supplier_id)
        print("Existing PO:", existing_po.id if existing_po else None)
        if existing_po:
            print(f"USING EXISTING PO: {existing_po.id}")
            po = existing_po
        else:
            print("CREATING NEW PO")

            po = PurchaseOrder(
                organization_id=organization_id,
                supplier_id=supplier.id,
                status="DRAFT",
                total_amount=0,
                po_number=f"PO-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
                order_date=date.today(),
                expected_delivery_date=date.today() + timedelta(days=supplier.lead_time_days),
                created_by=user_id,
            )

            db.add(po)
            db.flush()

            print(f"NEW PO ID: {po.id}")

        total = 0

        for item in valid_items:

            product = item["product"]
            quantity = item["quantity"]

            if quantity <= 0:
                continue

            line_total = quantity * product.cost_price
            total += line_total

            existing_item = (
                db.query(PurchaseOrderItem)
                .filter(
                    PurchaseOrderItem.purchase_order_id == po.id,
                    PurchaseOrderItem.product_id == product.id,
                )
                .first()
            )

            if existing_item:

               existing_item.quantity += quantity

            else:

                po_item = PurchaseOrderItem(
                    purchase_order_id=po.id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.cost_price,
                )

                db.add(po_item)

        po.total_amount = round(
            sum(
                item.quantity * item.unit_price
                for item in po.items
            ),
            2,
        )
        if po.total_amount >= 500:
            po.status = "PENDING_APPROVAL"

            create_notification(
                db=db,
                organization_id=organization_id,
                title="Purchase Order Approval Required",
                message=f"Purchase Order {po.po_number} requires approval.",
                notification_type="INFO",
            )

        else:
            po.status = "DRAFT"

        db.commit()
        db.refresh(po)

        AuditService.log(
            db=db,
            organization_id=po.organization_id,
            user_id=user_id,
            action="AUTO_GENERATE",
            entity_type="Purchase Order",
            entity_id=po.id,
        )
        
        created_purchase_orders.append(
            {
                "id": po.id,
                "po_number": po.po_number,
                "supplier_id": po.supplier_id,
                "supplier_name": supplier.name,
                "status": po.status,
                "total_amount": float(po.total_amount),
                "items": len(valid_items),
            }
        )

    db.commit()

    return {
        "message": f"Generated {len(created_purchase_orders)} purchase order(s).",
        "purchase_orders": created_purchase_orders,
    }

def approve_purchase_order_service(
    db: Session,
    organization_id: int,
    po_id: int,
    user_id: int,
):
    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == po_id,
            PurchaseOrder.organization_id == organization_id,
        )
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    if po.status != "PENDING_APPROVAL":
        raise HTTPException(
            status_code=400,
            detail="Purchase Order is not awaiting approval.",
        )
    now = datetime.now(UTC)

    po.status = "SENT"
    po.sent_date = now
    po.approved_by = user_id
    po.approved_at = now

    db.commit()
    db.refresh(po)

    AuditService.log(
        db=db,
        organization_id=po.organization_id,
        user_id=user_id,
        action="APPROVE",
        entity_type="Purchase Order",
        entity_id=po.id,
    )
    return po

def create_supplier_invoice(
    db: Session,
    organization_id: int,
    purchase_order_id: int,
    invoice_number: str,
    invoice_date: date,
    invoice_amount: float,
    user_id: Optional[int] = None,
):
    po = (
        db.query(PurchaseOrder)
        .filter(
            PurchaseOrder.id == purchase_order_id,
            PurchaseOrder.organization_id == organization_id,
        )
        .first()
    )

    if not po:
        raise HTTPException(
            status_code=404,
            detail="Purchase Order not found",
        )

    invoice = SupplierInvoice(
        organization_id=organization_id,
        purchase_order_id=po.id,
        supplier_id=po.supplier_id,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        invoice_amount=invoice_amount,
        status="PENDING",
    )

    db.add(invoice)
    db.flush()

    # -----------------------------
    # 3-Way Match
    # -----------------------------
    po_total = round(po.total_amount, 2)

    ordered_qty = sum(item.quantity for item in po.items)
    received_qty = sum(item.received_quantity for item in po.items)

    if received_qty < ordered_qty:
        invoice.status = "QUANTITY_MISMATCH"

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Invoice Quantity Mismatch",
            message=f"Invoice {invoice.invoice_number} quantity does not match Purchase Order {po.po_number}.",
            notification_type="ERROR",
        )

    elif round(invoice_amount, 2) != po_total:
        invoice.status = "TOTAL_MISMATCH"

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Invoice Amount Mismatch",
            message=f"Invoice {invoice.invoice_number} amount does not match Purchase Order {po.po_number}.",
            notification_type="ERROR",
        )

    else:
        invoice.status = "MATCHED"

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Invoice Verified",
            message=f"Invoice {invoice.invoice_number} successfully matched Purchase Order {po.po_number}.",
            notification_type="SUCCESS",
        )

    db.commit()
    db.refresh(invoice)

    AuditService.log(
        db=db,
        organization_id=organization_id,
        user_id=user_id,
        action="CREATE_INVOICE",
        entity_type="Supplier Invoice",
        entity_id=invoice.id,
    )

    return invoice
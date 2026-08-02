from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from app.models.models import Supplier, PurchaseOrder


def get_supplier_summary(
    db: Session,
    organization_id: int,
):
    suppliers = (
        db.query(Supplier)
        .filter(
            Supplier.organization_id == organization_id,
        )
        .all()
    )

    results = []

    for supplier in suppliers:

        purchase_orders = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.organization_id == organization_id,
                PurchaseOrder.supplier_id == supplier.id,
            )
            .all()
        )

        total_spend = sum(po.total_amount for po in purchase_orders)

        received_orders = [
            po for po in purchase_orders
            if po.status == "RECEIVED"
        ]

        pending_orders = [
            po for po in purchase_orders
            if po.status == "DRAFT"
        ]
        
        average_order_value = (
            total_spend / len(purchase_orders)
            if purchase_orders
            else 0
        )

        received_count = len(received_orders)

        fill_rate = (
            round((received_count / len(purchase_orders)) * 100, 2)
            if purchase_orders
            else 0
        )

        late_orders = [
            po
            for po in received_orders
            if (
                po.sent_date
                and po.received_date
                and supplier.lead_time_days
                and (
                    po.received_date.date()
                    >
                    po.sent_date.date() + timedelta(days=supplier.lead_time_days)
                )
            )
        ]
        on_time_delivery = (
            round(
                (
                    (received_count - len(late_orders))
                    / received_count
                ) * 100,
                2,
            )
            if received_count
            else 100
        )

        supplier_score = round(
            (fill_rate * 0.6)
            + (on_time_delivery * 0.4),
            2,
        )

        if supplier_score >= 90:
            rating = "A"
        elif supplier_score >= 75:
            rating = "B"
        elif supplier_score >= 60:
            rating = "C"
        else:
            rating = "D"
        lead_times = []

        for po in received_orders:
            if po.sent_date and po.received_date:
                lead_times.append(
                    (po.received_date - po.sent_date).days
                )

        average_actual_lead_time = (
            round(sum(lead_times) / len(lead_times), 1)
            if lead_times
            else None
        )
        results.append(
            {
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "purchase_orders": len(purchase_orders),
                "received_orders": len(received_orders),
                "pending_orders": len(pending_orders),
                "total_spend": round(total_spend, 2),
                "average_order_value": round(
                    average_order_value,
                    2,
                ),
                "lead_time_days": supplier.lead_time_days,
                "average_actual_lead_time": average_actual_lead_time,
                "fill_rate": fill_rate,
                "on_time_delivery": on_time_delivery,
                "supplier_score": supplier_score,
                "rating": rating,
                "preferred_supplier": supplier.preferred_supplier,
            }
        )

    results = sorted(
        results,
        key=lambda x: x["supplier_score"],
        reverse=True,
    )

    for index, supplier in enumerate(results):
        supplier["rank"] = index + 1
        supplier["recommended_supplier"] = index == 0

    return results


def get_supplier_details(
    db: Session,
    organization_id: int,
    supplier_id: int,
):
    supplier = (
        db.query(Supplier)
        .filter(
            Supplier.id == supplier_id,
            Supplier.organization_id == organization_id,
        )
        .first()
    )

    if not supplier:
        return {"detail": "Supplier not found"}

    purchase_orders = (
        db.query(PurchaseOrder)
        .options(
            joinedload(PurchaseOrder.items)
            .joinedload(PurchaseOrderItem.product)
        )
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.supplier_id == supplier_id,
        )
        .order_by(PurchaseOrder.created_at.desc())
        .all()
    )

    total_spend = sum(po.total_amount for po in purchase_orders)

    top_products = {}

    for po in purchase_orders:
        for item in po.items:
            name = item.product.name

            top_products[name] = (
                top_products.get(name, 0)
                + item.quantity
            )

    top_products = sorted(
        top_products.items(),
        key=lambda x: x[1],
        reverse=True,
    )[:5]

    return {
        "supplier": {
            "id": supplier.id,
            "name": supplier.name,
            "email": supplier.email,
            "phone": supplier.phone,
            "lead_time_days": supplier.lead_time_days,
        },
        "summary": {
            "purchase_orders": len(purchase_orders),
            "total_spend": round(total_spend, 2),
            "average_order_value": round(
                total_spend / len(purchase_orders),
                2,
            ) if purchase_orders else 0,
        },
        "top_products": [
            {
                "product": product,
                "ordered_quantity": quantity,
            }
            for product, quantity in top_products
        ],
        "recent_purchase_orders": [
            {
                "id": po.id,
                "status": po.status,
                "total_amount": po.total_amount,
            }
            for po in purchase_orders[:10]
        ],
    }
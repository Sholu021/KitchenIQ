from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import Sale, Batch, Product, Supplier, PurchaseOrder, InventoryTransaction


def sales_trend(
    db: Session,
    organization_id: int,
    days: int = 30,
):
    start_date = datetime.now(UTC) - timedelta(days=days)

    rows = (
        db.query(
            func.date(Sale.sale_date).label("date"),
            func.sum(Sale.total_amount).label("revenue"),
            func.sum(Sale.gross_profit).label("profit"),
            func.count(Sale.id).label("orders"),
        )
        .filter(
            Sale.organization_id == organization_id,
            Sale.sale_date >= start_date,
        )
        .group_by(
            func.date(Sale.sale_date),
        )
        .order_by(
            func.date(Sale.sale_date),
        )
        .all()
    )

    return [
        {
            "date": str(row.date),
            "revenue": round(float(row.revenue or 0), 2),
            "profit": round(float(row.profit or 0), 2),
            "orders": row.orders,
            "average_order_value": round(
                float(row.revenue or 0) / row.orders,
                2,
            ) if row.orders else 0,
        }
        for row in rows
    ]

def abc_inventory_analysis(
    db: Session,
    organization_id: int,
):
    rows = (
        db.query(
            Product.id,
            Product.name,
            func.sum(Batch.remaining_quantity).label("quantity"),
            func.sum(
                Batch.remaining_quantity * Batch.purchase_price
            ).label("inventory_value"),
        )
        .join(
            Batch,
            Batch.product_id == Product.id,
        )
        .filter(
            Product.organization_id == organization_id,
            Product.is_finished_product == False,
            Batch.remaining_quantity > 0,
            Batch.purchase_price > 0,
        )
        .group_by(
            Product.id,
            Product.name,
        )
        .all()
    )

    products = [
        {
            "product_id": row.id,
            "product_name": row.name,
            "quantity": float(row.quantity or 0),
            "value": float(row.inventory_value or 0),
        }
        for row in rows
    ]

    products.sort(
        key=lambda x: x["value"],
        reverse=True,
    )

    total_value = sum(p["value"] for p in products)

    running = 0

    for p in products:

        previous_percent = (
            running / total_value * 100
            if total_value
            else 0
        )

        running += p["value"]

        percent = (
            running / total_value * 100
            if total_value
            else 0
        )

        if previous_percent < 70:
            category = "A"
        elif previous_percent < 90:
            category = "B"
        else:
            category = "C"

        p["category"] = category
        p["cumulative_percent"] = round(percent, 2)

    return {
        "total_inventory_value": round(total_value, 2),
        "items": products,
    }

def supplier_performance(
    db: Session,
    organization_id: int,
):
    rows = (
        db.query(
            Supplier.id,
            Supplier.name,
            func.count(PurchaseOrder.id).label("purchase_orders"),
            func.coalesce(
                func.sum(PurchaseOrder.total_amount),
                0,
            ).label("total_spend"),
            func.avg(
                PurchaseOrder.total_amount,
            ).label("average_order"),
            func.max(
                PurchaseOrder.received_date,
            ).label("last_purchase"),
        )
        .join(
            PurchaseOrder,
            PurchaseOrder.supplier_id == Supplier.id,
        )
        .filter(
            Supplier.organization_id == organization_id,
            PurchaseOrder.status.in_(["RECEIVED", "PARTIALLY_RECEIVED"]),
        )
        
        .group_by(
            Supplier.id,
            Supplier.name,
        )
        .order_by(
            func.sum(PurchaseOrder.total_amount).desc(),
        )
        .all()
    )

    suppliers = []

    for rank, row in enumerate(rows, start=1):
        suppliers.append(
            {
                "rank": rank,
                "supplier_id": row.id,
                "supplier_name": row.name,
                "purchase_orders": row.purchase_orders,
                "total_spend": round(
                    float(row.total_spend or 0),
                    2,
                ),
                "average_order_value": round(
                    float(row.average_order or 0),
                    2,
                ),
            }
        )

    return {
        "count": len(suppliers),
        "suppliers": suppliers,
        "last_purchase": row.last_purchase,
    }

def inventory_ledger(
    db: Session,
    organization_id: int,
    product_id: int,
):
    rows = (
        db.query(InventoryTransaction)
        .filter(
            InventoryTransaction.organization_id == organization_id,
            InventoryTransaction.product_id == product_id,
        )
        .order_by(
            InventoryTransaction.created_at.asc(),
        )
        .all()
    )

    balance = 0
    ledger = []

    for row in rows:

        quantity = abs(float(row.quantity))

        qty_in = 0
        qty_out = 0

        if row.transaction_type in [
            "STOCK_IN",
            "PURCHASE",
            "PRODUCTION_IN",
            "ADJUSTMENT_IN",
        ]:
            qty_in = quantity
            balance += quantity

        else:
            qty_out = quantity
            balance -= quantity

        ledger.append(
            {
                "date": row.created_at,
                "transaction_type": row.transaction_type,
                "reference": row.reference,
                "quantity_in": qty_in,
                "quantity_out": qty_out,
                "balance": round(balance, 2),
                "notes": row.notes,
            }
        )
    return ledger
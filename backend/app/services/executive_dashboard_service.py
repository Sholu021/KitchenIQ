from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import (
    PurchaseOrder,
    Supplier,
    Production,
    WastageLog,
)

from app.services.financial_service import profit_and_loss
from app.services.analytics_service import (
    calculate_inventory_value,
    calculate_inventory_health_score,
    get_low_stock_products,
    get_expiring_batches,
)

from app.services.dashboard_service import (
    get_top_selling_products,
    get_top_profitable_items,
)

from app.services.report_service import supplier_performance
from app.services.cashflow_service import CashFlowService
from app.services.business_health_service import BusinessHealthService
from app.services.forecast_accuracy_service import ForecastAccuracyService

def executive_dashboard(
    db: Session,
    organization_id: int,
    from_date: date,
    to_date: date,
):
    pnl = profit_and_loss(
        db=db,
        organization_id=organization_id,
        from_date=from_date,
        to_date=to_date,
    )
    inventory = calculate_inventory_value(
        db=db,
        organization_id=organization_id,
    )

    health = calculate_inventory_health_score(
        db=db,
        organization_id=organization_id,
    )

    low_stock = get_low_stock_products(
        db=db,
        organization_id=organization_id,
    )

    expiring = get_expiring_batches(
        db=db,
        organization_id=organization_id,
    )

    pending_orders = (
        db.query(func.count(PurchaseOrder.id))
        .filter(
            PurchaseOrder.organization_id == organization_id,
            PurchaseOrder.status.in_(
                [
                    "DRAFT",
                    "PENDING_APPROVAL",
                    "SENT",
                ]
            ),
        )
        .scalar()
    )

    suppliers = (
        db.query(func.count(Supplier.id))
        .filter(
            Supplier.organization_id == organization_id,
        )
        .scalar()
    )

    supplier_stats = supplier_performance(
        db=db,
        organization_id=organization_id,
    )

    production_runs = (
        db.query(func.count(Production.id))
        .filter(
            Production.organization_id == organization_id,
        )
        .scalar()
    )

    wastage_events = (
        db.query(func.count(WastageLog.id))
        .filter(
            WastageLog.organization_id == organization_id,
        )
        .scalar()
    )
    
    wastage_cost = (
        db.query(func.coalesce(func.sum(WastageLog.cost_loss), 0))
        .filter(
            WastageLog.organization_id == organization_id,
        )
        .scalar()
    )

    top_products = get_top_selling_products(
        db=db,
        organization_id=organization_id,
    )

    top_profitable = get_top_profitable_items(
        db=db,
        organization_id=organization_id,
    )

    cash_flow = CashFlowService.cash_flow_summary(
        db=db,
        organization_id=organization_id,
    )

    business_health = BusinessHealthService.business_health(
        db=db,
        organization_id=organization_id,
    )

    forecast = ForecastAccuracyService.forecast_accuracy(
        db=db,
        organization_id=organization_id,
    )
    
    highlights = []

    highlights.append(
        f"Net cash flow is {cash_flow['cash_status'].lower()}."
    )

    if health["grade"] == "A":
        highlights.append("Inventory health is excellent.")
    elif health["grade"] in ("B", "C"):
        highlights.append("Inventory health should be monitored.")
    else:
        highlights.append("Inventory health requires immediate attention.")

    if len(low_stock) > 0:
        highlights.append(
            f"{len(low_stock)} products are below reorder level."
        )

    if len(expiring) > 0:
        highlights.append(
            f"{len(expiring)} batches are nearing expiry."
        )

    highlights.append(
        f"Forecast accuracy is {forecast['accuracy']}%."
    )
        
    ai_summary = {
        "headline": f"Business Health: {business_health['grade']}",
        "highlights": highlights,
        "meta": {
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "generated_at": date.today().isoformat(),
        }
    }

    return {
        "sales": {
            "revenue": pnl["revenue"],
            "profit": pnl["gross_profit"],
            "margin": pnl["gross_margin"],
        },

        "inventory": {
            "value": inventory["inventory_value"],
            "health_score": health["score"],
            "grade": health["grade"],
            "low_stock": len(low_stock),
            "expiring": len(expiring),
        },

        "purchasing": {
            "total_spend": pnl["purchases"],
            "pending_orders": pending_orders,
            "suppliers": suppliers,
        },

        "operations": {
            "production_runs": production_runs,
            "wastage_events": wastage_events,
            "wastage_cost": round(wastage_cost, 2),
        },

        "cash_flow": cash_flow,

        "business_health": business_health,

        "forecast_accuracy": forecast,

        "top_products": top_products,

        "top_profitable": top_profitable["items"],

        "supplier_performance": supplier_stats["suppliers"],
        "ai_summary": ai_summary,
    }
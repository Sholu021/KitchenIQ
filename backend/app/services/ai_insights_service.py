from sqlalchemy.orm import Session

from app.services.analytics_service import (
    get_low_stock_products,
    get_dead_stock,
    get_expiring_batches,
)

from app.services.dashboard_service import (
    get_top_selling_products,
    get_top_profitable_items,
)

from app.services.report_service import (
    supplier_performance
)

def generate_ai_insights(
    db: Session,
    organization_id: int,
):

    low_stock = get_low_stock_products(
        db=db,
        organization_id=organization_id,
    )

    dead_stock = get_dead_stock(
        db=db,
        organization_id=organization_id,
    )

    expiring = get_expiring_batches(
        db=db,
        organization_id=organization_id,
    )

    top_products = get_top_selling_products(
        db=db,
        organization_id=organization_id,
    )

    top_profit = get_top_profitable_items(
        db=db,
        organization_id=organization_id,
    )

    supplier_stats = supplier_performance(
        db=db,
        organization_id=organization_id,
    )

    insights = []

    if len(low_stock) > 0:
        insights.append({
            "type": "warning",
            "title": "Low Stock Alert",
            "message": f"{len(low_stock)} products need reordering."
        })

    if len(expiring) > 0:
        insights.append({
            "type": "warning",
            "title": "Expiring Inventory",
            "message": f"{len(expiring)} batches will expire soon."
        })

    if len(dead_stock) > 0:
        insights.append({
            "type": "warning",
            "title": "Dead Stock",
            "message": f"{len(dead_stock)} products have not moved recently."
        })

    if top_products:
        product = top_products[0]

        insights.append({
            "type": "success",
            "title": "Best Seller",
            "message": f"{product['recipe_name']} is your highest selling menu item."
        })

    if top_profit["items"]:
        item = top_profit["items"][0]

        insights.append({
            "type": "success",
            "title": "Highest Profit Item",
            "message": f"{item['recipe_name']} generates the highest profit."
        })

    if supplier_stats["suppliers"]:
        supplier = supplier_stats["suppliers"][0]

        insights.append({
            "type": "info",
            "title": "Top Supplier",
            "message": f"{supplier['supplier_name']} has supplied the highest purchase value."
        })

    return {
        "count": len(insights),
        "insights": insights,
    }
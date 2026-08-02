from app.services.notification_service import create_notification

from app.services.analytics_service import (
    get_low_stock_products,
    get_expiring_batches,
)

from app.services.forecast_service import (
    calculate_reorder_recommendations,
)


def generate_system_notifications(
    db,
    organization_id: int,
):
    # -----------------------------
    # Low Stock
    # -----------------------------
    low_stock = get_low_stock_products(
        db=db,
        organization_id=organization_id,
    )

    for product in low_stock:

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Low Stock",
            message=f"{product['product_name']} is below reorder level.",
            notification_type="LOW_STOCK",
            priority="HIGH",
        )

    # -----------------------------
    # Expiring Products
    # -----------------------------
    expiring = get_expiring_batches(
        db=db,
        organization_id=organization_id,
    )

    for batch in expiring:

        create_notification(
            db=db,
            organization_id=organization_id,
            title="Expiring Inventory",
            message=f"{batch['product_name']} expires on {batch['expiry_date']}.",
            notification_type="EXPIRY",
            priority="HIGH",
        )

    # -----------------------------
    # AI Reorder
    # -----------------------------
    reorder = calculate_reorder_recommendations(
        db=db,
        organization_id=organization_id,
    )

    for item in reorder["recommendations"]:

        if item["priority"] == "HIGH":

            create_notification(
                db=db,
                organization_id=organization_id,
                title="AI Reorder Recommendation",
                message=f"Reorder {item['product_name']} ({item['recommended_order_quantity']}).",
                notification_type="AI_REORDER",
                priority="HIGH",
            )
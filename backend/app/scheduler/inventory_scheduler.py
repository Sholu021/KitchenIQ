from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Organization
from app.services.notification_service import create_notification
from app.services.analytics_service import (
    get_low_stock_products,
    get_expiring_batches,
)

from apscheduler.schedulers.background import BackgroundScheduler


scheduler = BackgroundScheduler()


def daily_inventory_scan():
    db: Session = SessionLocal()

    try:
        organizations = db.query(Organization).all()

        for org in organizations:
            low_stock = get_low_stock_products(
                db=db,
                organization_id=org.id,
            )
            if low_stock:
                create_notification(
                    db=db,
                    organization_id=org.id,
                    title="Low Stock Alert",
                    message="One or more products are below the reorder level. Review current stock levels.",
                    notification_type="WARNING",
                )

            expiring = get_expiring_batches(
                db=db,
                organization_id=org.id,
            )
            if expiring:
                create_notification(
                    db=db,
                    organization_id=org.id,
                    title="Expiring Inventory",
                    message="One or more inventory batches are approaching expiry. Review expiry dates.",
                    notification_type="WARNING",
                )

        db.commit()
        print("Daily inventory scan completed.")

    finally:
        db.close()


scheduler.add_job(
    daily_inventory_scan,
    trigger="cron",
    hour=6,
    minute=0,
    id="daily_inventory_scan",
    replace_existing=True,
)
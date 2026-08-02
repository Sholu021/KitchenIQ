from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Organization
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
            get_low_stock_products(
                db=db,
                organization_id=org.id,
            )

            get_expiring_batches(
                db=db,
                organization_id=org.id,
            )

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
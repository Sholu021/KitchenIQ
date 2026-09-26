from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import Organization
from app.services.purchase_service import generate_purchase_orders_from_recommendations

scheduler = BackgroundScheduler()


def nightly_reorder_job():
    db: Session = SessionLocal()
    try:
        organizations = db.query(Organization).all()
        for org in organizations:
            generate_purchase_orders_from_recommendations(
                db=db,
                organization_id=org.id,
                user_id=None,
            )
    finally:
        db.close()


scheduler.add_job(
    nightly_reorder_job,
    trigger="cron",
    hour=2,
    minute=0,
    id="nightly_ai_reorder",
    replace_existing=True,
)

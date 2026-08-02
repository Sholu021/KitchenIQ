from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.models import User
from app.services.ceo_digest_service import CEODigestService


scheduler = BackgroundScheduler()


def send_weekly_ceo_digest():
    db: Session = SessionLocal()

    try:
        owners = (
            db.query(User)
            .filter(
                User.role == "OWNER",
                User.is_active == True,
            )
            .all()
        )

        for owner in owners:
            CEODigestService.send_digest(
                db=db,
                organization_id=owner.organization_id,
                recipient_email=owner.email,
            )

        print("Weekly CEO Digest completed.")

    finally:
        db.close()

scheduler.add_job(
    send_weekly_ceo_digest,
    trigger="cron",
    day_of_week="mon",
    hour=8,
    minute=0,
    id="weekly_ceo_digest",
    replace_existing=True,
)
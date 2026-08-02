from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.services.scheduled_report_service import send_scheduled_reports

scheduler = BackgroundScheduler()


def scheduled_reports_job():
    db = SessionLocal()

    try:
        send_scheduled_reports(db)
    finally:
        db.close()


scheduler.add_job(
    scheduled_reports_job,
    trigger="cron",
    hour="8",
    minute="0",
)
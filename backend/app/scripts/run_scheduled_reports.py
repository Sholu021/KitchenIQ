from app.core.database import SessionLocal
from app.services.scheduled_report_service import send_scheduled_reports

db = SessionLocal()

try:
    print("Starting Scheduled Report Job...")

    send_scheduled_reports(db)

    print("Finished.")
finally:
    db.close()
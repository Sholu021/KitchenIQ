from sqlalchemy.orm import Session
from datetime import datetime, timedelta, UTC
from app.models.models import ScheduledReport

from app.services.pdf_service import (
    generate_sales_report_pdf,
    generate_inventory_report_pdf,
)

from app.services.excel_service import (
    generate_sales_report_excel,
    generate_inventory_report_excel,
)

from app.services.email_service import send_email

def create_scheduled_report(
    db: Session,
    organization_id: int,
    data,
):
    report = ScheduledReport(
        organization_id=organization_id,
        report_type=data.report_type,
        frequency=data.frequency,
        email=data.email,
        export_format=data.export_format,
        enabled=True,
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


def list_scheduled_reports(
    db: Session,
    organization_id: int,
):
    return (
        db.query(ScheduledReport)
        .filter(
            ScheduledReport.organization_id == organization_id,
        )
        .order_by(ScheduledReport.created_at.desc())
        .all()
    )


def update_scheduled_report(
    db: Session,
    report_id: int,
    organization_id: int,
    data,
):
    report = (
        db.query(ScheduledReport)
        .filter(
            ScheduledReport.id == report_id,
            ScheduledReport.organization_id == organization_id,
        )
        .first()
    )

    if not report:
        return None

    report.report_type = data.report_type
    report.frequency = data.frequency
    report.email = data.email
    report.export_format = data.export_format
    report.enabled = data.enabled

    db.commit()
    db.refresh(report)

    return report


def delete_scheduled_report(
    db: Session,
    report_id: int,
    organization_id: int,
):
    report = (
        db.query(ScheduledReport)
        .filter(
            ScheduledReport.id == report_id,
            ScheduledReport.organization_id == organization_id,
        )
        .first()
    )

    if not report:
        return False

    db.delete(report)
    db.commit()

    return True

def process_scheduled_reports(db):
    reports = (
        db.query(ScheduledReport)
        .filter(ScheduledReport.enabled == True)
        .all()
    )

    for report in reports:

        print(
            f"Generating {report.report_type} "
            f"for {report.email}"
        )

        # TODO:
        # generate PDF
        # send email

        report.last_sent = datetime.now(UTC)

    db.commit()

def send_scheduled_reports(db):

    reports = (
        db.query(ScheduledReport)
        .filter(ScheduledReport.enabled == True)
        .all()
    )
    print("Reports found:", len(reports))
    now = datetime.now(UTC)

    for report in reports:

        should_send = True

        last_sent = report.last_sent

        if last_sent is not None and last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=UTC)

        if last_sent is None:
            should_send = True

        elif report.frequency == "daily":
            should_send = (
                now - last_sent
            ) >= timedelta(days=1)

        elif report.frequency == "weekly":
            should_send = (
                now - last_sent
            ) >= timedelta(days=7)

        elif report.frequency == "monthly":
            should_send = (
                now - last_sent
            ) >= timedelta(days=30)

        if not should_send:
            continue

        print("Forcing report send...")
        print("Should send:", should_send)
        if report.export_format == "pdf":

            if report.report_type == "sales":
                file_path = generate_sales_report_pdf(
                    db,
                    report.organization_id,
                )
            else:
                file_path = generate_inventory_report_pdf(
                    db,
                    report.organization_id,
                )

        else:

            if report.report_type == "sales":
                file_path = generate_sales_report_excel(
                    db,
                    report.organization_id,
                )
            else:
                file_path = generate_inventory_report_excel(
                    db,
                    report.organization_id,
                )

        subject = f"{report.report_type.title()} Report"

        body = (
            f"Hello,\n\n"
            f"Please find your scheduled {report.report_type} report attached.\n\n"
            f"KitchenIQ"
        )
        send_email(
            to_email=report.email,
            subject=subject,
            body=body,
            attachments=[file_path],
        )

        print(
            report.id,
            report.report_type,
            report.frequency,
            report.enabled,
            report.last_sent,
        )
        report.last_sent = now

    db.commit()

from datetime import date

from sqlalchemy.orm import Session

from app.services.executive_dashboard_service import executive_dashboard
from app.services.email_service import send_email
from app.services.export_service import ExportService

class CEODigestService:

    @staticmethod
    def generate(
        db: Session,
        organization_id: int,
    ):
        today = date.today()

        dashboard = executive_dashboard(
            db=db,
            organization_id=organization_id,
            from_date=today.replace(day=1),
            to_date=today,
        )

        summary = dashboard["ai_summary"]

        subject = (
            f"KitchenIQ Weekly CEO Digest - {today.isoformat()}"
        )

        body = f"""
Business Health: {dashboard["business_health"]["grade"]}

Revenue:
{dashboard["sales"]["revenue"]}

Gross Profit:
{dashboard["sales"]["profit"]}

Gross Margin:
{dashboard["sales"]["margin"]}%

Cash Flow:
{dashboard["cash_flow"]["cash_status"]}

Highlights:

"""

        for item in summary["highlights"]:
            body += f"• {item}\n"

        return {
            "subject": subject,
            "body": body,
            "dashboard": dashboard,
        }

    @staticmethod
    def send_digest(
        db: Session,
        organization_id: int,
        recipient_email: str,
    ):
        print("Step 1: Generate digest")

        digest = CEODigestService.generate(
            db=db,
            organization_id=organization_id,
        )

        print("Step 2: Digest generated")

        today = date.today()

        print("Step 3: Generate PDF")

        pdf_path = ExportService.generate_executive_pdf(
            db=db,
            organization_id=organization_id,
            from_date=today.replace(day=1),
            to_date=today,
        )

        print(pdf_path)

        print("Step 4: Generate Excel")

        excel_path = ExportService.generate_executive_excel(
            db=db,
            organization_id=organization_id,
            from_date=today.replace(day=1),
            to_date=today,
        )

        print(excel_path)

        print("Step 5: Send Email")

        send_email(
            to_email=recipient_email,
            subject=digest["subject"],
            body=digest["body"],
            attachments=[
                pdf_path,
                excel_path,
            ],
        )

        print("Step 6: Done")
        
    @staticmethod
    def send_email(
        to_email,
        subject,
        body,
        attachment=None,
    ):
        return {
            "status": "success",
            "message": "CEO Digest sent successfully.",
        }
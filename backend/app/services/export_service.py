from datetime import date
from pathlib import Path

from openpyxl import Workbook
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from app.services.export_report_service import executive_report


class ExportService:

    REPORT_DIR = Path("reports")

    @classmethod
    def ensure_directory(cls):
        cls.REPORT_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

    @classmethod
    def generate_executive_pdf(
        cls,
        db: Session,
        organization_id: int,
        from_date: date,
        to_date: date,
    ):
        cls.ensure_directory()

        data = executive_report(
            db=db,
            organization_id=organization_id,
            from_date=from_date,
            to_date=to_date,
        )

        filename = (
            cls.REPORT_DIR /
            f"executive_report_{date.today().isoformat()}.pdf"
        )

        doc = SimpleDocTemplate(str(filename))
        styles = getSampleStyleSheet()
        story = []

        story.append(
            Paragraph(
                "KitchenIQ Executive Report",
                styles["Heading1"],
            )
        )

        story.append(Spacer(1, 12))

        story.append(
            Paragraph(
                f"<b>Revenue:</b> {data['sales']['revenue']}",
                styles["BodyText"],
            )
        )

        story.append(
            Paragraph(
                f"<b>Gross Profit:</b> {data['sales']['profit']}",
                styles["BodyText"],
            )
        )

        story.append(
            Paragraph(
                f"<b>Gross Margin:</b> {data['sales']['margin']}%",
                styles["BodyText"],
            )
        )

        doc.build(story)

        return str(filename)

    @classmethod
    def generate_executive_excel(
        cls,
        db: Session,
        organization_id: int,
        from_date: date,
        to_date: date,
    ):
        cls.ensure_directory()

        data = executive_report(
            db=db,
            organization_id=organization_id,
            from_date=from_date,
            to_date=to_date,
        )

        wb = Workbook()
        ws = wb.active
        ws.title = "Executive Report"

        ws.append(["Metric", "Value"])
        ws.append(["Revenue", data["sales"]["revenue"]])
        ws.append(["Gross Profit", data["sales"]["profit"]])
        ws.append(["Gross Margin", data["sales"]["margin"]])

        filename = (
            cls.REPORT_DIR /
            f"executive_report_{date.today().isoformat()}.xlsx"
        )

        wb.save(filename)

        return str(filename)
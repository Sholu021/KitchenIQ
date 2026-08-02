import os
from datetime import datetime, date

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
)

from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from app.services.financial_service import profit_and_loss
from app.services.analytics_service import (
    calculate_inventory_value,
)

REPORT_FOLDER = "reports/pdf"

os.makedirs(REPORT_FOLDER, exist_ok=True)

def generate_sales_report_pdf(
    db,
    organization_id,
):
    filename = (
        f"sales_{organization_id}_"
        f"{datetime.now():%Y%m%d_%H%M%S}.pdf"
    )

    filepath = os.path.join(
        REPORT_FOLDER,
        filename,
    )

    report = profit_and_loss(
        db=db,
        organization_id=organization_id,
        from_date=None,
        to_date=None,
    )

    doc = SimpleDocTemplate(filepath)

    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(
            "KitchenIQ Sales Report",
            styles["Heading1"],
        )
    )

    table = Table(
        [
            ["Metric", "Value"],
            ["Revenue", str(report["revenue"])],
            ["Purchases", str(report["purchases"])],
            ["Gross Profit", str(report["gross_profit"])],
            ["Gross Margin", str(report["gross_margin"])],
        ]
    )

    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0,0), (-1,0), colors.darkblue),
                ("TEXTCOLOR",(0,0),(-1,0),colors.white),

                ("GRID",(0,0),(-1,-1),1,colors.black),

                ("BOTTOMPADDING",(0,0),(-1,0),12),

                ("BACKGROUND",(0,1),(-1,-1),colors.beige),
            ]
        )
    )

    elements.append(table)

    doc.build(elements)
    
    print("PDF path:", filepath)
    print("PDF exists:", os.path.exists(filepath))
    print("PDF size:", os.path.getsize(filepath) if os.path.exists(filepath) else 0)
    
    return filepath

def generate_inventory_report_pdf(
    db,
    organization_id,
):
    filename = (
        f"inventory_{organization_id}_"
        f"{datetime.now():%Y%m%d_%H%M%S}.pdf"
    )

    filepath = os.path.join(
        REPORT_FOLDER,
        filename,
    )

    inventory = calculate_inventory_value(
        db=db,
        organization_id=organization_id,
    )

    doc = SimpleDocTemplate(filepath)

    styles = getSampleStyleSheet()

    elements = []

    elements.append(
        Paragraph(
            "KitchenIQ Inventory Report",
            styles["Heading1"],
        )
    )

    table = Table(
        [
            ["Metric","Value"],
            [
                "Inventory Value",
                str(inventory["inventory_value"]),
            ],
        ]
    )

    table.setStyle(
        TableStyle(
            [
                ("GRID",(0,0),(-1,-1),1,colors.black),
                ("BACKGROUND",(0,0),(-1,0),colors.grey),
                ("TEXTCOLOR",(0,0),(-1,0),colors.white),
            ]
        )
    )

    elements.append(table)

    doc.build(elements)

    return filepath


import os
from datetime import datetime

from openpyxl import Workbook

from app.services.financial_service import profit_and_loss

REPORT_FOLDER = "reports/excel"

os.makedirs(REPORT_FOLDER, exist_ok=True)


def generate_sales_report_excel(
    db,
    organization_id,
):
    filename = (
        f"sales_{organization_id}_"
        f"{datetime.now():%Y%m%d_%H%M%S}.xlsx"
    )

    filepath = os.path.join(
        REPORT_FOLDER,
        filename,
    )

    report = profit_and_loss(
        db=db,
        organization_id=organization_id,
    )

    wb = Workbook()

    ws = wb.active

    ws.title = "Sales Report"

    ws.append(["Metric", "Value"])

    ws.append(["Revenue", report["revenue"]])
    ws.append(["Purchases", report["purchases"]])
    ws.append(["Gross Profit", report["gross_profit"]])
    ws.append(["Gross Margin", report["gross_margin"]])

    wb.save(filepath)

    return filepath


def generate_inventory_report_excel(
    db,
    organization_id,
):
    return None
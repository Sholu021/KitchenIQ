from datetime import datetime, timedelta, UTC
from decimal import Decimal

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.models import Sale, PurchaseOrder

class CashFlowService:

    @staticmethod
    def cash_flow_summary(
        db: Session,
        organization_id: int,
    ):
        # Total Sales (Cash In)
        total_sales = (
            db.query(func.sum(Sale.total_amount))
            .filter(
                Sale.organization_id == organization_id,
            )
            .scalar()
            or Decimal("0")
        )

        # Total Purchases (Cash Out)
        total_purchases = (
            db.query(func.sum(PurchaseOrder.total_amount))
            .filter(
                PurchaseOrder.organization_id == organization_id,
                PurchaseOrder.status == "RECEIVED",
            )
            .scalar()
            or Decimal("0")
        )

        # Normalize numeric types before arithmetic
        total_sales = Decimal(str(total_sales))
        total_purchases = Decimal(str(total_purchases))

        # Net Cash Flow
        net_cash_flow = total_sales - total_purchases

        # Cash Status
        if net_cash_flow > 0:
            cash_status = "POSITIVE"
        elif net_cash_flow < 0:
            cash_status = "NEGATIVE"
        else:
            cash_status = "BREAKEVEN"

        return {
            "total_sales": float(total_sales),
            "total_purchases": float(total_purchases),
            "net_cash_flow": float(net_cash_flow),
            "cash_status": cash_status,
        }

    @staticmethod
    def monthly_cash_flow(
        db: Session,
        organization_id: int,
        year: int | None = None,
    ):
        if year is None:
            year = datetime.now(UTC).year

        sales = (
            db.query(
                extract("month", Sale.sale_date).label("month"),
                func.sum(Sale.total_amount).label("income"),
            )
            .filter(
                Sale.organization_id == organization_id,
                extract("year", Sale.sale_date) == year,
            )
            .group_by(extract("month", Sale.sale_date))
            .all()
        )

        purchases = (
            db.query(
                extract("month", PurchaseOrder.order_date).label("month"),
                func.sum(PurchaseOrder.total_amount).label("expense"),
            )
            .filter(
                PurchaseOrder.organization_id == organization_id,
                PurchaseOrder.status == "RECEIVED",
                extract("year", PurchaseOrder.order_date) == year,
            )
            .group_by(extract("month", PurchaseOrder.order_date))
            .all()
        )

        sales_data = {
            int(month): float(income or 0)
            for month, income in sales
        }

        purchase_data = {
            int(month): float(expense or 0)
            for month, expense in purchases
        }

        month_names = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec",
        ]

        result = []

        for month in range(1, 13):
            income = sales_data.get(month, 0.0)
            expense = purchase_data.get(month, 0.0)

            result.append(
                {
                    "month": month_names[month - 1],
                    "income": income,
                    "expense": expense,
                    "net": income - expense,
                }
            )

        return result 

    @staticmethod
    def cash_flow_trend(
        db: Session,
        organization_id: int,
        months: int = 12,
    ):
        monthly_data = CashFlowService.monthly_cash_flow(
            db=db,
            organization_id=organization_id,
        )

        trend = []

        for item in monthly_data:
            trend.append(
                {
                    "period": item["month"],
                    "cash_flow": item["net"],
                }
            )

        return trend[-months:]
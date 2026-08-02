from datetime import datetime, timedelta, UTC

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.models import Sale, PurchaseOrder

class ProfitService:

    @staticmethod
    def monthly_profit_trend(
        db: Session,
        organization_id: int,
        year: int | None = None,
    ):
        if year is None:
            year = datetime.now(UTC).year

        results = (
            db.query(
                extract("month", Sale.sale_date).label("month"),
                func.sum(Sale.total_amount).label("revenue"),
                func.sum(Sale.cost_of_goods_sold).label("cogs"),
            )
            .filter(
                Sale.organization_id == organization_id,
                extract("year", Sale.sale_date) == year,
            )
            .group_by(extract("month", Sale.sale_date))
            .all()
        )

        month_names = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec",
        ]

        profit_data = {}

        for month, revenue, cogs in results:
            revenue = float(revenue or 0)
            cogs = float(cogs or 0)

            profit_data[int(month)] = {
                "revenue": revenue,
                "cogs": cogs,
                "gross_profit": revenue - cogs,
            }

        response = []

        for month in range(1, 13):
            data = profit_data.get(
                month,
                {
                    "revenue": 0.0,
                    "cogs": 0.0,
                    "gross_profit": 0.0,
                },
            )

            response.append(
                {
                    "month": month_names[month - 1],
                    **data,
                }
            )

        return response

    @staticmethod
    def revenue_trend(
        db: Session,
        organization_id: int,
        year: int | None = None,
    ):
        if year is None:
            year = datetime.now(UTC).year

        results = (
            db.query(
                extract("month", Sale.sale_date).label("month"),
                func.sum(Sale.total_amount).label("revenue"),
            )
            .filter(
                Sale.organization_id == organization_id,
                extract("year", Sale.sale_date) == year,
            )
            .group_by(extract("month", Sale.sale_date))
            .all()
        )

        revenue_data = {
            int(month): float(revenue or 0)
            for month, revenue in results
        }

        month_names = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec",
        ]

        response = []

        for month in range(1, 13):
            response.append(
                {
                    "month": month_names[month - 1],
                    "revenue": revenue_data.get(month, 0.0),
                }
            )

        return response

    @staticmethod
    def gross_margin_trend(
        db: Session,
        organization_id: int,
        year: int | None = None,
    ):
        if year is None:
            year = datetime.now(UTC).year

        results = (
            db.query(
                extract("month", Sale.sale_date).label("month"),
                func.sum(Sale.total_amount).label("revenue"),
                func.sum(Sale.cost_of_goods_sold).label("cogs"),
            )
            .filter(
                Sale.organization_id == organization_id,
                extract("year", Sale.sale_date) == year,
            )
            .group_by(extract("month", Sale.sale_date))
            .all()
        )

        margin_data = {}

        for month, revenue, cogs in results:
            revenue = float(revenue or 0)
            cogs = float(cogs or 0)

            if revenue > 0:
                gross_margin = round(((revenue - cogs) / revenue) * 100, 2)
            else:
                gross_margin = 0.0

            margin_data[int(month)] = gross_margin

        month_names = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec",
        ]

        response = []

        for month in range(1, 13):
            response.append(
                {
                    "month": month_names[month - 1],
                    "gross_margin": margin_data.get(month, 0.0),
                }
            )

        return response

    @staticmethod
    def expense_breakdown(
        db: Session,
        organization_id: int,
        year: int | None = None,
    ):
        if year is None:
            year = datetime.now(UTC).year

        results = (
            db.query(
                extract("month", PurchaseOrder.created_at).label("month"),
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

        expense_data = {
            int(month): float(expense or 0)
            for month, expense in results
        }

        month_names = [
            "Jan", "Feb", "Mar", "Apr",
            "May", "Jun", "Jul", "Aug",
            "Sep", "Oct", "Nov", "Dec",
        ]

        response = []

        for month in range(1, 13):
            response.append(
                {
                    "month": month_names[month - 1],
                    "expense": expense_data.get(month, 0.0),
                }
            )

        return response
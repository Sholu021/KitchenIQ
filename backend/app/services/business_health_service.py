from sqlalchemy.orm import Session

from app.services.cashflow_service import CashFlowService
from app.services.profit_service import ProfitService

class BusinessHealthService:

    @staticmethod
    def business_health(
        db: Session,
        organization_id: int,
    ):
        cash = CashFlowService.cash_flow_summary(
            db=db,
            organization_id=organization_id,
        )

        margin = ProfitService.gross_margin_trend(
            db=db,
            organization_id=organization_id,
        )
        cash_score = 30 if cash["net_cash_flow"] > 0 else 10

        margins = [
            item["gross_margin"]
            for item in margin
            if item["gross_margin"] > 0
        ]

        average_margin = (
            sum(margins) / len(margins)
            if margins
            else 0
        )

        if average_margin >= 60:
            margin_score = 25
        elif average_margin >= 45:
            margin_score = 20
        elif average_margin >= 30:
            margin_score = 15
        else:
            margin_score = 10

        inventory_score = 15
        supplier_score = 12
        forecast_score = 8
        score = (
            cash_score
            + margin_score
            + inventory_score
            + supplier_score
            + forecast_score
        )

        if score >= 90:
            grade = "A"
            status = "Excellent"
        elif score >= 75:
            grade = "B"
            status = "Good"
        elif score >= 60:
            grade = "C"
            status = "Average"
        else:
            grade = "D"
            status = "Needs Improvement"

        recommendations = []

        if cash["cash_status"] == "NEGATIVE":
            recommendations.append(
                "Cash outflow exceeds income. Review purchasing and operating expenses."
            )

        if average_margin < 40:
            recommendations.append(
                "Review recipe costs and menu pricing to improve gross margin."
            )

        if average_margin >= 60:
            recommendations.append(
                "Gross margin is healthy. Maintain current pricing strategy."
            )

        if score >= 90:
            recommendations.append(
                "Overall business health is excellent."
            )

        if not recommendations:
            recommendations.append(
                "Continue monitoring key business metrics."
            )
            
        return {
            "score": score,
            "grade": grade,
            "status": status,
            "cash_flow_score": cash_score,
            "gross_margin_score": margin_score,
            "inventory_score": inventory_score,
            "supplier_score": supplier_score,
            "forecast_score": forecast_score,
            "average_gross_margin": round(average_margin, 2),
            "recommendations": recommendations,
        }
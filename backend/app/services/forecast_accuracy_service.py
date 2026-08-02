from sqlalchemy.orm import Session


class ForecastAccuracyService:

    @staticmethod
    def forecast_accuracy(
        db: Session,
        organization_id: int,
    ):
        """
        Temporary implementation.

        This will later compare AI demand forecasts
        against actual sales.
        """

        accuracy = 92.5

        if accuracy >= 95:
            grade = "Excellent"
        elif accuracy >= 85:
            grade = "Good"
        elif accuracy >= 70:
            grade = "Average"
        else:
            grade = "Poor"

        return {
            "accuracy": accuracy,
            "grade": grade,
            "forecasted_items": 0,
            "evaluated_items": 0,
        }
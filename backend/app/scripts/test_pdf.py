from app.core.database import SessionLocal
from app.services.pdf_service import generate_sales_report_pdf

db = SessionLocal()

path = generate_sales_report_pdf(
    db=db,
    organization_id=1,
)

print(path)
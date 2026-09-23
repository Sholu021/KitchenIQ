from app.core.database import SessionLocal
from app.services.excel_service import generate_sales_report_excel

db = SessionLocal()

path = generate_sales_report_excel(
    db=db,
    organization_id=1,
)

print(path)
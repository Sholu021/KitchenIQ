from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    require_staff,
)
from app.models.models import User

from app.services.export_report_service import (
    financial_report,
    inventory_report,
    supplier_report,
    executive_report,
)
from fastapi.responses import StreamingResponse
from app.services.export_service import ExportService
from app.services.pdf_export_service import generate_pdf
from app.services.excel_export_service import generate_excel

router = APIRouter(
    prefix="/export",
    tags=["Export Reports"],
)

@router.get("/financial")
def export_financial(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return financial_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

@router.get("/inventory")
def export_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return inventory_report(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/suppliers")
def export_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return supplier_report(
        db=db,
        organization_id=current_user.organization_id,
    )

@router.get("/executive")
def export_executive(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return executive_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

@router.get("/financial/pdf")
def financial_pdf(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = financial_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

    pdf = generate_pdf(
        "Financial Report",
        report["profit_and_loss"],
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=financial_report.pdf"
        },
    )

@router.get("/executive/pdf")
def executive_pdf(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = executive_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

    pdf = generate_pdf(
        "Executive Dashboard",
        report,
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=executive_dashboard.pdf"
        },
    )

@router.get("/inventory/pdf")
def inventory_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = inventory_report(
        db=db,
        organization_id=current_user.organization_id,
    )

    pdf = generate_pdf(
        "Inventory Report",
        report,
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=inventory_report.pdf"
        },
    )

@router.get("/suppliers/pdf")
def supplier_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = supplier_report(
        db=db,
        organization_id=current_user.organization_id,
    )

    pdf = generate_pdf(
        "Supplier Report",
        report,
    )

    return StreamingResponse(
        pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=supplier_report.pdf"
        },
    )

@router.get("/financial/excel")
def financial_excel(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = financial_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

    excel = generate_excel(
        "Financial Report",
        report,
    )

    return StreamingResponse(
        excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=financial_report.xlsx"
        },
    )

@router.get("/suppliers/excel")
def suppliers_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):

    report = supplier_report(
        db=db,
        organization_id=current_user.organization_id,
    )

    excel = generate_excel(
        "Suppliers",
        report["suppliers"],
    )

    return StreamingResponse(
        excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            "attachment; filename=suppliers.xlsx"
        },
    )

@router.get("/inventory/excel")
def inventory_excel(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = inventory_report(
        db=db,
        organization_id=current_user.organization_id,
    )

    excel = generate_excel(
        "Inventory Report",
        report,
    )

    return StreamingResponse(
        excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=inventory_report.xlsx"
        },
    )

@router.get("/executive/excel")
def executive_excel(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    report = executive_report(
        db=db,
        organization_id=current_user.organization_id,
        from_date=from_date,
        to_date=to_date,
    )

    excel = generate_excel(
        "Executive Dashboard",
        report,
    )

    return StreamingResponse(
        excel,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=executive_dashboard.xlsx"
        },
    )
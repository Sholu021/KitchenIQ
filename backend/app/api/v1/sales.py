from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_staff
from app.models.models import Sale, User
from app.schemas.schemas import SaleCreate, SaleOut
from app.services.sales_service import create_sale

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def record_sale(
    req: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    items_data = [item.model_dump() for item in req.items]
    return create_sale(
        db=db,
        organization_id=current_user.organization_id,
        items_data=items_data,
        user_id=current_user.id
    )


@router.get("", response_model=List[SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    sales = db.query(Sale).filter(
        Sale.organization_id == current_user.organization_id
    ).order_by(Sale.sale_date.desc()).all()
    return sales

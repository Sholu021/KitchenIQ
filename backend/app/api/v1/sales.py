from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_staff, require_manager
from app.models.models import Sale, User
from app.schemas.schemas import SaleCreate, SaleOut
from app.services.sales_service import create_sale

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("", response_model=List[SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff)
):
    sales = db.query(Sale).filter(
        Sale.organization_id == current_user.organization_id
    ).order_by(Sale.sale_date.desc()).all()
    return sales

@router.post("/", response_model=SaleOut, status_code=status.HTTP_201_CREATED)
def record_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return create_sale(
        db=db,
        organization_id=current_user.organization_id,
        items_data=[
            {
                "recipe_id": item.recipe_id,
                "quantity": item.quantity,
            }
            for item in payload.items
        ],
        user_id=current_user.id,
    )
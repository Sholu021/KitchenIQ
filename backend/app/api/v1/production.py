from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_manager
from app.models.models import User

from app.services.production_service import produce_recipe
from app.schemas.schemas import ProductionCreate, ProductionOut

router = APIRouter(
    prefix="/production",
    tags=["Production"],
)


@router.post(
    "",
    response_model=ProductionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_production(
    req: ProductionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    return produce_recipe(
        db=db,
        organization_id=current_user.organization_id,
        recipe_id=req.recipe_id,
        quantity_produced=req.quantity_produced,
        batch_number=req.batch_number,
        expiry_date=req.expiry_date,
        user_id=current_user.id,
    )
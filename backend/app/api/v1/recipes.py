from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_db,
    require_manager,
    require_staff,
)
from app.models.models import Recipe, User, AuditLog, Organization
from app.schemas.schemas import RecipeCreate, RecipeOut
from app.services.recipe_service import create_recipe, calculate_recipe_cost

router = APIRouter(prefix="/recipes", tags=["Recipes"])

@router.post("", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_new_recipe(
    req: RecipeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    # Check subscription limits
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if org and org.subscription_tier == "Free":
        recipes_count = db.query(Recipe).filter(Recipe.organization_id == current_user.organization_id).count()
        if recipes_count >= 2:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Organization recipe limit (2) reached on Free tier. Upgrade to Pro."
            )

    ingredients_data = [ing.model_dump() for ing in req.ingredients]
    
    # Check duplicate recipe name
    existing = db.query(Recipe).filter(
        Recipe.name.ilike(req.name),
        Recipe.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A recipe with this name already exists."
        )

    recipe = create_recipe(
        db=db,
        organization_id=current_user.organization_id,
        name=req.name,
        description=req.description,
        yield_quantity=req.yield_quantity,
        yield_unit=req.yield_unit,
        selling_price=req.selling_price,
        ingredients_data=ingredients_data,
        user_id=current_user.id,
    )

    # Convert to schema with computed cost
    cost = calculate_recipe_cost(
        db=db,
        recipe_id=recipe.id,
    )

    out = RecipeOut.model_validate(recipe)
    out.cost_price = cost["total_cost"]
    return out


@router.get("", response_model=List[RecipeOut])
def list_recipes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    recipes = (
        db.query(Recipe)
        .filter(
            Recipe.organization_id == current_user.organization_id
        )
        .order_by(Recipe.name.asc())
        .all()
    )

    output = []

    for recipe in recipes:

        cost = calculate_recipe_cost(
            db=db,
            recipe_id=recipe.id,
        )

        schema_out = RecipeOut.model_validate(recipe)
        schema_out.cost_price = cost["total_cost"]

        output.append(schema_out)

    return output

@router.get("/{recipe_id}", response_model=RecipeOut)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    recipe = (
        db.query(Recipe)
        .filter(
            Recipe.id == recipe_id,
            Recipe.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found",
        )

    cost = calculate_recipe_cost(
        db=db,
        recipe_id=recipe.id,
    )

    out = RecipeOut.model_validate(recipe)
    out.cost_price = cost["total_cost"]

    return out

@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.organization_id == current_user.organization_id
    ).first()

    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )

    db.delete(recipe)
    
    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action="DELETE_RECIPE",
        entity_type="recipe",
        entity_id=recipe_id
    )
    db.add(audit)
    db.commit()
    return

@router.get("/{recipe_id}/cost")
def recipe_cost(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_staff),
):
    return calculate_recipe_cost(
        db=db,
        recipe_id=recipe_id,
    )
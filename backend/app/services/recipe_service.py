from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.models import Recipe, RecipeIngredient, Product, AuditLog

def get_unit_conversion_factor(recipe_unit: str, product_unit: str) -> float:
    """
    Returns the multiplication factor to convert product cost to recipe ingredient cost.
    Assumes cost_price is per product_unit.
    """
    r_unit = recipe_unit.lower().strip()
    p_unit = product_unit.lower().strip()
    
    if r_unit == p_unit:
        return 1.0
        
    # Mass conversions
    if r_unit == "g" and p_unit in ["kg", "kilogram", "kilograms"]:
        return 0.001
    if r_unit == "kg" and p_unit in ["g", "gram", "grams"]:
        return 1000.0
        
    # Volume conversions
    if r_unit == "ml" and p_unit in ["l", "liter", "litre", "liters", "litres"]:
        return 0.001
    if r_unit in ["l", "liter", "litre", "liters", "litres"] and p_unit == "ml":
        return 1000.0
        
    # Default fallback
    return 1.0

def calculate_recipe_cost(
    db: Session,
    organization_id: int,
    recipe_id: int,
) -> dict:
    recipe = (
        db.query(Recipe)
        .filter(
            Recipe.id == recipe_id,
            Recipe.organization_id == organization_id,
        )
        .first()
    )
    
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
        
    total_cost = 0
    breakdown = []

    for ingredient in recipe.ingredients:
        product = ingredient.product

        if not product:
            continue

        cost = ingredient.quantity_required * product.cost_price
        total_cost += cost

        breakdown.append(
            {
                "ingredient": product.name,
                "quantity": ingredient.quantity_required,
                "unit": product.unit,
                "unit_cost": product.cost_price,
                "cost": round(cost, 2),
            }
        )

    cost_per_serving = (
        total_cost / recipe.yield_quantity
        if recipe.yield_quantity
        else total_cost
    )

    return {
        "recipe_id": recipe.id,
        "recipe_name": recipe.name,
        "yield_quantity": recipe.yield_quantity,
        "yield_unit": recipe.yield_unit,
        "total_cost": round(total_cost, 2),
        "cost_per_serving": round(cost_per_serving, 2),
        "ingredients": breakdown,
    }

def calculate_recipe_cost_value(
    db: Session,
    organization_id: int,
    recipe_id: int,
) -> float:
    data = calculate_recipe_cost(
        db=db,
        organization_id=organization_id,
        recipe_id=recipe_id,
    )

    return data["cost_per_serving"]
    
def create_recipe(
    db: Session,
    organization_id: int,
    name: str,
    yield_quantity: float,
    yield_unit: str,
    selling_price: float,
    description: Optional[str] = None,
    ingredients_data: Optional[List[dict]] = None,
    user_id: Optional[int] = None,
) -> Recipe:

    if ingredients_data is None:
        ingredients_data = []

    # 1. Create finished product
    finished_product = Product(
        organization_id=organization_id,
        name=name,
        sku=None,
        unit=yield_unit,
        current_stock=0,
        reorder_level=0,
        preferred_order_quantity=0,
        minimum_order_quantity=0,
        cost_price=0,
        selling_price=selling_price,
        is_finished_product=True,
    )

    db.add(finished_product)
    db.flush()

    # 2. Create recipe
    recipe = Recipe(
        organization_id=organization_id,
        name=name,
        description=description,
        yield_quantity=yield_quantity,
        yield_unit=yield_unit,
        selling_price=selling_price,
        finished_product_id=finished_product.id,
    )

    db.add(recipe)
    db.flush()

    # 3. Add ingredients
    for ing in ingredients_data:

        product = (
            db.query(Product)
            .filter(
                Product.id == ing["product_id"],
                Product.organization_id == organization_id,
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {ing['product_id']} not found",
            )

        db.add(
            RecipeIngredient(
                recipe_id=recipe.id,
                product_id=product.id,
                quantity_required=ing["quantity_required"],
            )
        )

    # 4. Audit log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="CREATE_RECIPE",
        entity_type="recipe",
        entity_id=recipe.id,
    )

    db.add(audit)

    db.commit()
    db.refresh(recipe)

    return recipe
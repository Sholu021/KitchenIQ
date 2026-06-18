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
    recipe_id: int
) -> float:
    recipe = db.query(Recipe).filter(
        Recipe.id == recipe_id,
        Recipe.organization_id == organization_id
    ).first()
    
    if not recipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe not found"
        )
        
    total_cost = 0.0
    for ingredient in recipe.ingredients:
        product = ingredient.product
        if not product:
            continue
            
        factor = get_unit_conversion_factor(product.unit, product.unit)  # Just fallback
        # Let's check unit compatibility and factor
        # If product unit is 'kg' and ingredient needs 'g', cost per gram is product.cost_price / 1000
        # Wait, the ingredient doesn't store a separate unit. The recipe ingredient requires quantity in the product's unit!
        # Ah, looking at the schema, recipe_ingredients has quantity_required. It doesn't have a separate unit, so it's in the product's unit.
        # But wait! If it's in the product's unit, conversion factor is 1.0.
        # But if the user specifies it, wait, we can assume the quantity required is in the product's base unit.
        # Let's check: quantity_required * product.cost_price is the default.
        # What if we want to support a separate ingredient unit? The schema doesn't have recipe_ingredient.unit.
        # So quantity_required is always in the product's unit. The cost is simply quantity_required * product.cost_price.
        # That's even easier and less error-prone! We will do:
        total_cost += ingredient.quantity_required * product.cost_price
        
    return total_cost

def create_recipe(
    db: Session,
    organization_id: int,
    name: str,
    description: Optional[str] = None,
    ingredients_data: List[dict] = [],
    user_id: Optional[int] = None
) -> Recipe:
    # 1. Create Recipe
    recipe = Recipe(
        organization_id=organization_id,
        name=name,
        description=description
    )
    db.add(recipe)
    db.flush()

    # 2. Add Ingredients
    for ing in ingredients_data:
        prod_id = ing["product_id"]
        qty = ing["quantity_required"]

        # Validate product exists in org
        prod = db.query(Product).filter(
            Product.id == prod_id,
            Product.organization_id == organization_id
        ).first()
        if not prod:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product ID {prod_id} not found"
            )

        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            product_id=prod_id,
            quantity_required=qty
        )
        db.add(ingredient)

    db.flush()

    # Audit Log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="CREATE_RECIPE",
        entity_type="recipe",
        entity_id=recipe.id
    )
    db.add(audit)
    db.commit()
    db.refresh(recipe)

    return recipe

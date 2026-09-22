from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.services.inventory_service import adjust_stock, calculate_fefo_cost
from datetime import datetime, date


from app.models.models import (
    Batch,
    Production,
    Product,
    Recipe,
    InventoryTransaction,
    AuditLog,
)

def consume_recipe(
    db: Session,
    organization_id: int,
    recipe_id: int,
    servings: float,
    user_id: int,
):
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
            detail="Recipe not found",
        )

    for ingredient in recipe.ingredients:

        required = ingredient.quantity_required * servings

        adjust_stock(
            db=db,
            organization_id=organization_id,
            product_id=ingredient.product_id,
            quantity=required,
            transaction_type="STOCK_OUT",
            notes=f"Recipe consumption: {recipe.name}",
            user_id=user_id,
        )

    return True

def produce_recipe(
    db: Session,
    organization_id: int,
    recipe_id: int,
    quantity_produced: float,
    batch_number: str,
    expiry_date,
    user_id: int,
):
    if quantity_produced <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Production quantity must be greater than zero.",
        )

    if not batch_number or not batch_number.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch number is required.",
        )

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
            detail="Recipe not found",
        )
        
    for ingredient in recipe.ingredients:

        required = (
            ingredient.quantity_required *
            quantity_produced
        )

        available = (
            db.query(
                func.coalesce(
                    func.sum(Batch.remaining_quantity),
                    0,
                )
            )
            .filter(
                Batch.organization_id == organization_id,
                Batch.product_id == ingredient.product_id,
                Batch.remaining_quantity > 0,
                or_(
                    Batch.expiry_date.is_(None),
                    Batch.expiry_date >= date.today(),
                ),
            )
            .scalar()
        )

        if available < required:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for "
                    f"{ingredient.product.name}"
                ),
            )

    finished_product = (
        db.query(Product)
        .filter(
            Product.id == recipe.finished_product_id,
            Product.organization_id == organization_id,
        )
        .first()
    )

    if finished_product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipe finished product not found.",
        )

    production_unit_cost = 0.0

    for ingredient in recipe.ingredients:
        required_quantity = (
            ingredient.quantity_required * quantity_produced
        )

        production_unit_cost += calculate_fefo_cost(
            db=db,
            organization_id=organization_id,
            product_id=ingredient.product_id,
            quantity=required_quantity,
        )

    production_unit_cost = round(production_unit_cost, 2)
    
    for ingredient in recipe.ingredients:

        required = (
            ingredient.quantity_required *
            quantity_produced
        )

        adjust_stock(
            db=db,
            organization_id=organization_id,
            product_id=ingredient.product_id,
            quantity=required,
            transaction_type="STOCK_OUT",
            notes=f"Production of {recipe.name}",
            user_id=user_id,
        )

    production = Production(
        organization_id=organization_id,
        recipe_id=recipe.id,
        quantity_produced=quantity_produced,
        batch_number=batch_number,
        expiry_date=expiry_date,
        produced_by=user_id,
    )

    db.add(production)
    db.flush()

    finished_batch = Batch(
        organization_id=organization_id,
        product_id=recipe.finished_product_id,
        batch_number=batch_number,
        expiry_date=expiry_date,
        quantity=quantity_produced,
        remaining_quantity=quantity_produced,
        purchase_price=production_unit_cost,
    )

    db.add(finished_batch)
    db.flush()
    
    finished_product.current_stock += quantity_produced
        
    transaction = InventoryTransaction(
        organization_id=organization_id,
        product_id=finished_product.id,
        batch_id=finished_batch.id,
        created_by=user_id,
        transaction_type="STOCK_IN",
        quantity=quantity_produced,
        notes=f"Production #{production.id}",
    )

    db.add(transaction)

    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="PRODUCE_RECIPE",
        entity_type="production",
        entity_id=production.id,
    )

    db.add(audit)

    try:
        db.commit()
        db.refresh(production)
        return production

    except Exception:
        db.rollback()
        raise
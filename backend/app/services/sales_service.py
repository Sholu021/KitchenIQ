from datetime import datetime, date, timedelta, UTC
from typing import List, Optional, Dict
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.models.models import (
    Sale,
    SaleItem,
    Recipe,
    Product,
    Batch,
    AuditLog,
)
from app.services.inventory_service import (
    adjust_stock,
    calculate_fefo_cost,
)

def create_sale(
    db: Session,
    organization_id: int,
    items_data: List[dict],  # list of {"recipe_id": int, "quantity": int}
    user_id: Optional[int] = None
) -> Sale:
    # 1. Aggregate ingredient requirements to prevent partial deduction errors
    needed_ingredients: Dict[int, float] = {}  # product_id -> total_qty_needed
    recipe_cache: Dict[int, Recipe] = {}
    
    for item in items_data:
        rec_id = item["recipe_id"]
        sale_qty = item["quantity"]
        
        if sale_qty <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sale quantity must be positive"
            )

        recipe = db.query(Recipe).filter(
            Recipe.id == rec_id,
            Recipe.organization_id == organization_id
        ).first()
        
        if not recipe:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Recipe ID {rec_id} not found"
            )
            
        recipe_cache[rec_id] = recipe
        
        for ingredient in recipe.ingredients:
            prod_id = ingredient.product_id
            needed_qty = ingredient.quantity_required * sale_qty
            needed_ingredients[prod_id] = needed_ingredients.get(prod_id, 0.0) + needed_qty

    # 2. Pre-verify all ingredient stocks
    for prod_id, total_needed in needed_ingredients.items():
        product = db.query(Product).filter(
            Product.id == prod_id,
            Product.organization_id == organization_id
        ).first()
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Ingredient Product ID {prod_id} not found"
            )
            
        available = (
            db.query(func.coalesce(func.sum(Batch.remaining_quantity), 0))
            .filter(
                Batch.organization_id == organization_id,
                Batch.product_id == prod_id,
                Batch.remaining_quantity > 0,
                or_(
                    Batch.expiry_date == None,
                    Batch.expiry_date >= date.today(),
                ),
            )
            .scalar()
        )

        if available < total_needed:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient batch inventory for {product.name}. "
                       f"Required {total_needed}, Available {available}"
            )

    # 3. Create the Sale
    sale = Sale(
        organization_id=organization_id,
        sale_date=datetime.now(UTC),
        total_amount=0.0
    )
    db.add(sale)
    db.flush()

    # 4. Deduct stock and write SaleItems
    total_sale_amount = 0.0
    total_cogs = 0.0
    for item in items_data:
        rec_id = item["recipe_id"]
        sale_qty = item["quantity"]
        recipe = recipe_cache[rec_id]
        
        # Calculate selling price of the recipe
        # For simplicity, let's sum product selling prices, or use a fixed recipe price
        # Since recipes do not have a selling_price in database design (only recipes + recipe_ingredients),
        # we can calculate recipe cost and apply a markup or sum ingredient selling prices.
        # Let's sum ingredient selling prices or assume a 100% markup on ingredient cost,
        # or better yet: sum product.selling_price * quantity_required for ingredients.
        # Let's sum (product.selling_price * ingredient.quantity_required) to represent the menu item price!
        finished_product = (
            db.query(Product)
            .filter(
                Product.id == recipe.finished_product_id,
                Product.organization_id == organization_id,
            )
           .first()
        )

        if not finished_product:
            raise HTTPException(
                status_code=400,
                detail=f"Finished product not found for recipe {recipe.name}",
            )

        recipe_price = finished_product.selling_price

        recipe_revenue = recipe_price * sale_qty

        recipe_cogs = 0.0

        for ingredient in recipe.ingredients:
            ingredient_qty = ingredient.quantity_required * sale_qty

            recipe_cogs += calculate_fefo_cost(
                db=db,
                organization_id=organization_id,
                product_id=ingredient.product_id,
                quantity=ingredient_qty,
            )

        sale_item = SaleItem(
            sale_id=sale.id,
            recipe_id=rec_id,
            quantity=sale_qty,

            unit_price=recipe_price,
            revenue=round(recipe_revenue, 2),
            cost_of_goods_sold=round(recipe_cogs, 2),
            gross_profit=round(recipe_revenue - recipe_cogs, 2),
        )

        db.add(sale_item)
    # Apply deductions
        total_sale_amount += recipe_revenue
        total_cogs += recipe_cogs
        
        # Deduct ingredient inventory (FEFO)
    for prod_id, total_needed in needed_ingredients.items():

        adjust_stock(
            db=db,
            organization_id=organization_id,
            product_id=prod_id,
            quantity=total_needed,
            transaction_type="STOCK_OUT",
            notes=f"Auto recipe deduction for Sale #{sale.id}",
            user_id=user_id,
        )

    sale.total_amount = total_sale_amount
    sale.cost_of_goods_sold = round(total_cogs, 2)
    sale.gross_profit = round(
        sale.total_amount - sale.cost_of_goods_sold,
        2,
    )
    db.flush()

    # Audit Log
    audit = AuditLog(
        organization_id=organization_id,
        user_id=user_id,
        action="RECORD_SALE",
        entity_type="sale",
        entity_id=sale.id
    )
    db.add(audit)
    db.commit()
    db.refresh(sale)

    return sale

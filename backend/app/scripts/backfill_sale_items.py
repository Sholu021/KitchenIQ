from app.core.database import SessionLocal
from app.models.models import SaleItem, Recipe, Product
from app.services.recipe_service import calculate_recipe_cost


def run():
    db = SessionLocal()

    try:
        sale_items = db.query(SaleItem).all()

        print(f"Found {len(sale_items)} sale items")

        updated = 0

        for item in sale_items:
            recipe = (
                db.query(Recipe)
                .filter(Recipe.id == item.recipe_id)
                .first()
            )

            if not recipe:
                continue

            product = (
                db.query(Product)
                .filter(Product.id == recipe.finished_product_id)
                .first()
            )

            if not product:
                continue

            selling_price = float(product.selling_price)

            recipe_cost = calculate_recipe_cost_value(
                db=db,
                organization_id=sale.organization_id,
                recipe_id=recipe.id,
            )

            revenue = selling_price * item.quantity
            cogs = recipe_cost * item.quantity
            profit = revenue - cogs

            item.unit_price = selling_price
            item.revenue = revenue
            item.cost_of_goods_sold = cogs
            item.gross_profit = profit

            updated += 1

        db.commit()

        print(f"Updated {updated} sale items.")

    finally:
        db.close()


if __name__ == "__main__":
    run()
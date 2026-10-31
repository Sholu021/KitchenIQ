import pytest

from app.core.seed import seed_db
from app.models.models import Sale, SaleItem


def test_seeded_historical_sales_use_finished_product_menu_price(db):
    seed_db(db)

    sale = db.query(Sale).order_by(Sale.sale_date.desc()).first()
    assert sale is not None

    latte_item = (
        db.query(SaleItem)
        .filter(SaleItem.sale_id == sale.id)
        .join(SaleItem.recipe)
        .filter_by(name="Vanilla Latte")
        .one()
    )

    assert latte_item.unit_price == pytest.approx(round(latte_item.recipe.finished_product.selling_price, 2))
    assert latte_item.revenue == pytest.approx(
        latte_item.recipe.finished_product.selling_price * latte_item.quantity
    )

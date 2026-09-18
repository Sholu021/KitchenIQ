from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime, UTC
from sqlalchemy import func

from app.models.models import (
    Product,
    Batch,
    Sale,
    SaleItem,
    RecipeIngredient,
    InventoryTransaction,
)
from app.services.notification_service import create_notification

def calculate_inventory_value(
    db: Session,
    organization_id: int,
):
    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
        )
        .all()
    )

    inventory_value = 0.0
    raw_material_value = 0.0
    finished_goods_value = 0.0
    total_units = 0.0

    for product in products:
        stock = float(product.current_stock or 0)
        cost = float(product.cost_price or 0)

        value = stock * cost

        inventory_value += value
        total_units += stock

        if product.is_finished_product:
            finished_goods_value += value
        else:
            raw_material_value += value

    active_batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
        )
        .count()
    )

    return {
        "inventory_value": round(inventory_value, 2),
        "raw_material_value": round(raw_material_value, 2),
        "finished_goods_value": round(finished_goods_value, 2),
        "active_batches": active_batches,
        "total_units": round(total_units, 2),
    }

def calculate_inventory_health_score(
    db: Session,
    organization_id: int,
):
    low_stock = get_low_stock_products(
        db=db,
        organization_id=organization_id,
    )

    expiring = get_expiring_batches(
        db=db,
        organization_id=organization_id,
        days=7,
    )

    dead_stock = get_dead_stock(
        db=db,
        organization_id=organization_id,
    )

    health = inventory_health(
        db=db,
        organization_id=organization_id,
    )

    health_products = health.get("products", [])

    healthy_products = sum(
        1
        for item in health_products
        if item["status"] == "OK"
    )

    reorder_now = sum(
        1
        for item in health_products
        if item["status"] == "REORDER NOW"
    )

    low_stock_count = len(low_stock)
    expiring_count = len(expiring)
    dead_stock_count = len(dead_stock)

    score = 100
    score -= reorder_now * 15
    score -= low_stock_count * 8
    score -= expiring_count * 5
    score -= dead_stock_count * 10

    score = max(score, 0)
    if score >= 90:
        grade = "A"
    elif score >= 75:
        grade = "B"
    elif score >= 60:
        grade = "C"
    else:
        grade = "D"

    return {
        "score": score,
        "grade": grade,
        "healthy_products": healthy_products,
        "low_stock": low_stock_count,
        "expiring": expiring_count,
        "dead_stock": dead_stock_count,
        "reorder_now": reorder_now,
    }

def get_dead_stock(
    db: Session,
    organization_id: int,
    days: int = 30,
):
    cutoff = date.today()

    batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
        )
        .all()
    )

    results = []

    for batch in batches:

        if not batch.received_at:
            continue

        age = (cutoff - batch.received_at.date()).days

        if age >= days:
            results.append(
                {
                    "product": batch.product.name,
                    "batch_number": batch.batch_number,
                    "remaining_quantity": batch.remaining_quantity,
                    "purchase_price": batch.purchase_price,
                    "inventory_value": round(
                        batch.remaining_quantity * batch.purchase_price,
                        2,
                    ),
                    "days_in_stock": age,
                    "expiry_date": batch.expiry_date,
                }
            )

    results.sort(
        key=lambda x: x["inventory_value"],
        reverse=True,
    )

    return results

def get_inventory_aging(
    db: Session,
    organization_id: int,
):
    today = date.today()

    buckets = {
        "0_30_days": {"units": 0.0, "value": 0.0},
        "31_60_days": {"units": 0.0, "value": 0.0},
        "61_90_days": {"units": 0.0, "value": 0.0},
        "90_plus_days": {"units": 0.0, "value": 0.0},
    }

    batches = (
        db.query(Batch)
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
        )
        .all()
    )

    for batch in batches:

        if not batch.received_at:
            continue

        age = (today - batch.received_at.date()).days

        value = (
            batch.remaining_quantity
            * batch.purchase_price
        )

        if age <= 30:
            bucket = buckets["0_30_days"]

        elif age <= 60:
            bucket = buckets["31_60_days"]

        elif age <= 90:
            bucket = buckets["61_90_days"]

        else:
            bucket = buckets["90_plus_days"]

        bucket["units"] += batch.remaining_quantity
        bucket["value"] += value

    for bucket in buckets.values():
        bucket["units"] = round(bucket["units"], 2)
        bucket["value"] = round(bucket["value"], 2)

    return buckets


def get_low_stock_products(
    db: Session,
    organization_id: int,
):
    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            Product.is_finished_product == False,
            Product.reorder_level > 0,
            Product.current_stock <= Product.reorder_level,
        )
        .order_by(Product.current_stock.asc())
        .all()
    )
    result = []

    for product in products:
        recommended = max(
            product.preferred_order_quantity,
            product.reorder_level * 2 - product.current_stock,
        )

        result.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": product.current_stock,
                "reorder_level": product.reorder_level,
                "recommended_order": recommended,
                "unit": product.unit,
            }
        )
    if result:
        create_notification(
            db=db,
            organization_id=organization_id,
            title="Low Stock Alert",
            message=f"{len(result)} product(s) are below the reorder level.",
            notification_type="WARNING",
        )

    return result

def get_expiring_batches(
    db: Session,
    organization_id: int,
    days: int = 7,
):
    today = date.today()
    limit = today + timedelta(days=days)

    batches = (
        db.query(Batch)
        .join(Product, Product.id == Batch.product_id)
        .filter(
            Batch.organization_id == organization_id,
            Batch.remaining_quantity > 0,
            Batch.expiry_date != None,
            Batch.expiry_date >= today,
            Batch.expiry_date <= limit,
            Product.is_finished_product == False,
        )
        .order_by(Batch.expiry_date.asc())
        .all()
    )

    results = []

    for batch in batches:
        results.append(
            {
                "batch_id": batch.id,
                "batch_number": batch.batch_number,
                "product_id": batch.product.id,
                "product_name": batch.product.name,
                "expiry_date": batch.expiry_date,
                "days_remaining": (
                    batch.expiry_date - today
                ).days,
                "remaining_quantity": batch.remaining_quantity,
                "unit": batch.product.unit,
            }
        )
    if batches:
        create_notification(
            db=db,
            organization_id=organization_id,
            title="Expiring Inventory",
            message=f"{len(batches)} batch(es) are approaching expiry.",
            notification_type="WARNING",
        )
    return results

def demand_forecast(
    db: Session,
    organization_id: int,
):
    start_date = datetime.now(UTC) - timedelta(days=30)

    products = (
        db.query(Product)
        .filter(
            Product.organization_id == organization_id,
            Product.is_finished_product.is_(False),
        )
        .order_by(Product.name)
        .all()
    )

    print("\n========== DEMAND FORECAST ==========")
    print(__file__)

    print("\nProducts returned from query:")
    for p in products:
        print(
            f"id={p.id}, "
            f"name={p.name}, "
            f"is_finished_product={p.is_finished_product}"
        )
        
    forecast = []

    for product in products:

        total_used = (
           db.query(
               func.coalesce(
                   func.sum(
                       SaleItem.quantity *
                       RecipeIngredient.quantity_required
                    ),
                    0,
                )
            )
            .join(
                Sale,
                Sale.id == SaleItem.sale_id,
            )
            .join(
                RecipeIngredient,
                RecipeIngredient.recipe_id == SaleItem.recipe_id,
            )
            .filter(
                Sale.organization_id == organization_id,
                RecipeIngredient.product_id == product.id,
                Sale.sale_date >= start_date,
            )
            .scalar()
        )

        avg_daily_usage = round(total_used / 30, 2)

        if avg_daily_usage > 0:
            days_remaining = round(
                product.current_stock / avg_daily_usage,
                1,
            )

            lead_time = 3          # supplier delivery days
            safety_stock = 7       # safety buffer

            target_stock = (
                avg_daily_usage *
                (lead_time + safety_stock)
            )

            target_stock = max(
                target_stock,
                product.reorder_level,
            )

            recommended_order = max(
                0,
                round(target_stock - product.current_stock, 2),
            )
        else:
            days_remaining = None
            recommended_order = 0

        forecast.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "current_stock": float(product.current_stock),
                "avg_daily_usage": avg_daily_usage,
                "forecast_7_days": round(avg_daily_usage * 7, 2),
                "forecast_15_days": round(avg_daily_usage * 15, 2),
                "forecast_30_days": round(avg_daily_usage * 30, 2),
                "days_remaining": days_remaining,
                "recommended_order": recommended_order,
                "lead_time_days": product.lead_time_days,
                "unit": product.unit,
            }
        )

    return forecast

def inventory_health(
    db: Session,
    organization_id: int,
):
    forecast = demand_forecast(
        db=db,
        organization_id=organization_id,
    )

    results = []

    for item in forecast:

        product = (
            db.query(Product)
            .filter(
                Product.id == item["product_id"],
                Product.organization_id == organization_id,
            )
            .first()
        )

        lead_time = product.lead_time_days if product else 3
        safety_days = 3

        reorder_trigger = lead_time + safety_days
        warning_trigger = reorder_trigger * 2

        if item["days_remaining"] is None:
            status = "NO CONSUMPTION"
        elif item["days_remaining"] <= reorder_trigger:
            status = "REORDER NOW"
        elif item["days_remaining"] <= warning_trigger:
            status = "LOW STOCK"
        else:
            status = "OK"

        results.append(
            {
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "current_stock": item["current_stock"],
                "avg_daily_usage": item["avg_daily_usage"],
                "days_remaining": item["days_remaining"],
                "status": status,
            }
        )
        
    health_candidates = [
        item
        for item in results
        if item["status"] != "NO CONSUMPTION"
    ] 

    if health_candidates:
        healthy_count = sum(
            1
            for item in health_candidates
            if item["status"] == "OK"
        )

        health_score = round(
            (healthy_count / len(health_candidates)) * 100
        )
    else:
        health_score = 100

    return {
        "health_score": health_score,
        "products": results,
    }
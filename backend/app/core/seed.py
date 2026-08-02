from datetime import date, datetime, timedelta, UTC
from sqlalchemy.orm import Session
from app.models.models import Organization, User, Category, Product, Supplier, Recipe, RecipeIngredient, Batch, Sale, SaleItem, InventoryTransaction
from app.core.security import get_password_hash

def seed_db(db: Session):
    # Check if we already have seeded data
    if db.query(Organization).first() is not None:
        print("Database already contains data, skipping seeding.")
        return

    print("Seeding database with demo organization, users, inventory, batches, recipes, and sales...")

    # 1. Create Organization
    org = Organization(name="KitchenIQ Demo Café")
    db.add(org)
    db.flush()

    # 2. Create Users (Owner, Manager, Staff)
    hashed_pwd = get_password_hash("password123")
    
    owner = User(
        organization_id=org.id,
        full_name="Alice Owner",
        email="owner@kitcheniq.com",
        hashed_password=hashed_pwd,
        role="Owner",
        is_active=True
    )
    manager = User(
        organization_id=org.id,
        full_name="Bob Manager",
        email="manager@kitcheniq.com",
        hashed_password=hashed_pwd,
        role="Manager",
        is_active=True
    )
    staff = User(
        organization_id=org.id,
        full_name="Charlie Staff",
        email="staff@kitcheniq.com",
        hashed_password=hashed_pwd,
        role="Staff",
        is_active=True
    )
    db.add_all([owner, manager, staff])
    db.flush()

    # 3. Create Suppliers
    dairy_supplier = Supplier(
        organization_id=org.id,
        name="Fresh Dairy Co.",
        phone="555-0199",
        email="orders@freshdairy.com",
        address="100 Milky Way Lane, Dairy City"
    )
    coffee_supplier = Supplier(
        organization_id=org.id,
        name="RoastMasters Imports",
        phone="555-0182",
        email="wholesale@roastmasters.com",
        address="456 Arabica Blvd, Seattle"
    )
    bakery_supplier = Supplier(
        organization_id=org.id,
        name="Artisanal Bakery Wholesalers",
        phone="555-0122",
        email="sales@artbakery.com",
        address="789 Yeast Street, Flourville"
    )
    db.add_all([dairy_supplier, coffee_supplier, bakery_supplier])
    db.flush()

    # 4. Create Categories
    cat_beverage = Category(organization_id=org.id, name="Beverage Ingredients")
    cat_dairy = Category(organization_id=org.id, name="Dairy Products")
    cat_bakery = Category(organization_id=org.id, name="Prepared Bakery")
    db.add_all([cat_beverage, cat_dairy, cat_bakery])
    db.flush()

    # 5. Create Products
    p_beans = Product(
        organization_id=org.id,
        category_id=cat_beverage.id,
        name="Espresso Beans",
        sku="COFFEE-ESP-1KG",
        unit="g",
        current_stock=2500.0,
        reorder_level=1000.0,
        cost_price=0.03,  # $30 per kg
        selling_price=0.08
    )
    p_milk = Product(
        organization_id=org.id,
        category_id=cat_dairy.id,
        name="Whole Milk",
        sku="DAIRY-MILK-1L",
        unit="ml",
        current_stock=6000.0,
        reorder_level=3000.0,
        cost_price=0.002,  # $2 per Litre
        selling_price=0.005
    )
    p_syrup = Product(
        organization_id=org.id,
        category_id=cat_beverage.id,
        name="Vanilla Syrup",
        sku="SYRUP-VAN-750ML",
        unit="ml",
        current_stock=1500.0,
        reorder_level=500.0,
        cost_price=0.015,  # $11.25 per bottle
        selling_price=0.04
    )
    p_croissant = Product(
        organization_id=org.id,
        category_id=cat_bakery.id,
        name="Butter Croissant",
        sku="BAKE-CROIS-PCS",
        unit="pcs",
        current_stock=15.0,
        reorder_level=8.0,
        cost_price=1.25,
        selling_price=3.50
    )
    p_tea = Product(
        organization_id=org.id,
        category_id=cat_beverage.id,
        name="Matcha Powder",
        sku="TEA-MATCHA-500G",
        unit="g",
        current_stock=50.0,  # Below reorder level (low stock!)
        reorder_level=200.0,
        cost_price=0.15,
        selling_price=0.45
    )
    db.add_all([p_beans, p_milk, p_syrup, p_croissant, p_tea])
    db.flush()

    # 6. Create Batches
    today = date.today()
    
    # Milk batches (Expiring soon and fresh)
    b_milk_1 = Batch(
        organization_id=org.id,
        product_id=p_milk.id,
        batch_number="MILK-LOT-A",
        expiry_date=today + timedelta(days=3),  # Expiring in 3 days!
        quantity=2000.0
    )
    b_milk_2 = Batch(
        organization_id=org.id,
        product_id=p_milk.id,
        batch_number="MILK-LOT-B",
        expiry_date=today + timedelta(days=10),
        quantity=4000.0
    )
    
    # Coffee beans batch (long shelf life)
    b_beans = Batch(
        organization_id=org.id,
        product_id=p_beans.id,
        batch_number="ESP-ROAST-99",
        expiry_date=today + timedelta(days=90),
        quantity=2500.0
    )
    
    # Syrup batch
    b_syrup = Batch(
        organization_id=org.id,
        product_id=p_syrup.id,
        batch_number="SYR-VAN-02",
        expiry_date=today + timedelta(days=180),
        quantity=1500.0
    )
    
    # Croissant batches (already expired, and fresh)
    b_crois_expired = Batch(
        organization_id=org.id,
        product_id=p_croissant.id,
        batch_number="CROIS-YESTERDAY",
        expiry_date=today - timedelta(days=1),  # Already expired!
        quantity=5.0
    )
    b_crois_fresh = Batch(
        organization_id=org.id,
        product_id=p_croissant.id,
        batch_number="CROIS-TODAY",
        expiry_date=today + timedelta(days=1),
        quantity=10.0
    )
    
    # Matcha batch
    b_matcha = Batch(
        organization_id=org.id,
        product_id=p_tea.id,
        batch_number="MATCHA-08",
        expiry_date=today + timedelta(days=45),
        quantity=50.0
    )

    db.add_all([b_milk_1, b_milk_2, b_beans, b_syrup, b_crois_expired, b_crois_fresh, b_matcha])
    db.flush()

    # 7. Add stock transactions for audit tracking
    t_beans = InventoryTransaction(organization_id=org.id, product_id=p_beans.id, transaction_type="STOCK_IN", quantity=2500, notes="Initial bulk roast receive")
    t_milk = InventoryTransaction(organization_id=org.id, product_id=p_milk.id, transaction_type="STOCK_IN", quantity=6000, notes="Fresh dairy delivery")
    t_syrup = InventoryTransaction(organization_id=org.id, product_id=p_syrup.id, transaction_type="STOCK_IN", quantity=1500, notes="Syrup inventory upload")
    t_crois = InventoryTransaction(organization_id=org.id, product_id=p_croissant.id, transaction_type="STOCK_IN", quantity=15, notes="Morning delivery croissants")
    t_matcha = InventoryTransaction(organization_id=org.id, product_id=p_tea.id, transaction_type="STOCK_IN", quantity=50, notes="Remaining tea powder import")
    db.add_all([t_beans, t_milk, t_syrup, t_crois, t_matcha])
    db.flush()

    # 8. Create Recipes
    # Vanilla Latte Recipe
    r_latte = Recipe(organization_id=org.id, name="Vanilla Latte", description="Classic 12oz iced or hot vanilla latte")
    db.add(r_latte)
    db.flush()
    ing_latte_beans = RecipeIngredient(recipe_id=r_latte.id, product_id=p_beans.id, quantity_required=18.0)  # 18g espresso
    ing_latte_milk = RecipeIngredient(recipe_id=r_latte.id, product_id=p_milk.id, quantity_required=250.0)  # 250ml milk
    ing_latte_syrup = RecipeIngredient(recipe_id=r_latte.id, product_id=p_syrup.id, quantity_required=20.0)  # 20ml syrup
    db.add_all([ing_latte_beans, ing_latte_milk, ing_latte_syrup])

    # Espresso Shot Recipe
    r_espresso = Recipe(organization_id=org.id, name="Espresso Double", description="Double shot of signature roast")
    db.add(r_espresso)
    db.flush()
    ing_esp_beans = RecipeIngredient(recipe_id=r_espresso.id, product_id=p_beans.id, quantity_required=18.0)
    db.add(ing_esp_beans)

    # Matcha Latte Recipe
    r_matcha = Recipe(organization_id=org.id, name="Matcha Latte", description="Organic stone-ground green tea latte")
    db.add(r_matcha)
    db.flush()
    ing_matcha_powder = RecipeIngredient(recipe_id=r_matcha.id, product_id=p_tea.id, quantity_required=6.0)  # 6g powder
    ing_matcha_milk = RecipeIngredient(recipe_id=r_matcha.id, product_id=p_milk.id, quantity_required=250.0)
    db.add_all([ing_matcha_powder, ing_matcha_milk])
    
    db.flush()

    # 9. Create Historical Sales (last 5 days)
    # Day -4: 10 Lattes, 5 Espressos
    # Day -3: 12 Lattes, 8 Espressos
    # Day -2: 15 Lattes, 10 Espressos
    # Day -1: 20 Lattes, 12 Espressos, 2 Matcha Lattes
    # Today: 8 Lattes, 4 Espressos
    
    # We will simulate sales using DB records. Note: we are NOT deducting stock for historical seeds so that current_stock remains high and populated.
    # But we calculate the total amount correctly:
    # Vanilla Latte cost = 18*0.03 + 250*0.002 + 20*0.015 = 0.54 + 0.50 + 0.30 = $1.34 cost
    # Vanilla Latte selling = 18*0.08 + 250*0.005 + 20*0.04 = 1.44 + 1.25 + 0.80 = $3.49 selling price
    # Espresso Double cost = 18*0.03 = $0.54 cost
    # Espresso Double selling = 18*0.08 = $1.44 selling price
    # Matcha Latte cost = 6*0.15 + 250*0.002 = 0.90 + 0.50 = $1.40 cost
    # Matcha Latte selling = 6*0.45 + 250*0.005 = 2.70 + 1.25 = $3.95 selling price

    sales_history = [
        (4, {r_latte: 10, r_espresso: 5}),
        (3, {r_latte: 12, r_espresso: 8}),
        (2, {r_latte: 15, r_espresso: 10}),
        (1, {r_latte: 20, r_espresso: 12, r_matcha: 2}),
        (0, {r_latte: 8, r_espresso: 4})
    ]

    for days_ago, items in sales_history:
        sale_time = datetime.now(UTC) - timedelta(days=days_ago)
        
        # Calculate total price
        total = 0.0
        for recipe, qty in items.items():
            price = sum(ing.product.selling_price * ing.quantity_required for ing in recipe.ingredients)
            total += price * qty
            
        sale = Sale(
            organization_id=org.id,
            sale_date=sale_time,
            total_amount=total
        )
        db.add(sale)
        db.flush()
        
        for recipe, qty in items.items():
            s_item = SaleItem(
                sale_id=sale.id,
                recipe_id=recipe.id,
                quantity=qty
            )
            db.add(s_item)

    db.commit()
    print("Database seeding completed successfully!")
if __name__ == "__main__":
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()
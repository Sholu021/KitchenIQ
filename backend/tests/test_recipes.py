from app.models.models import Product, Recipe, RecipeIngredient, AuditLog


def _manager_headers(client):
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "manager_a@test.com", "password": "testpass"},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.cookies['kitcheniq_access']}"}


def _ingredient_product(db, organization_id, **overrides):
    values = {
        "organization_id": organization_id,
        "name": "Flour",
        "sku": "FLOUR-001",
        "unit": "kg",
        "current_stock": 10,
        "reorder_level": 1,
        "cost_price": 80,
        "selling_price": 100,
    }
    values.update(overrides)
    product = Product(**values)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_create_recipe_persists_ingredients_and_calculates_cost(client, db, seed_test_data):
    product = _ingredient_product(db, seed_test_data["org_a_id"])
    headers = _manager_headers(client)

    response = client.post(
        "/api/v1/recipes",
        headers=headers,
        json={
            "name": "Test Pancakes",
            "description": "Recipe API test",
            "yield_quantity": 4,
            "yield_unit": "serving",
            "selling_price": 60,
            "ingredients": [{"product_id": product.id, "quantity_required": 0.5}],
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Pancakes"
    assert data["cost_price"] == 40
    assert len(data["ingredients"]) == 1
    assert data["ingredients"][0]["product_id"] == product.id
    assert data["finished_product_id"] is not None

    recipe = db.query(Recipe).filter(Recipe.id == data["id"]).one()
    assert recipe.organization_id == seed_test_data["org_a_id"]
    assert db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).count() == 1
    assert db.query(AuditLog).filter(
        AuditLog.entity_type == "recipe",
        AuditLog.entity_id == recipe.id,
        AuditLog.action == "CREATE_RECIPE",
    ).count() == 1


def test_create_recipe_rejects_inactive_ingredient_without_partial_records(client, db, seed_test_data):
    product = _ingredient_product(
        db,
        seed_test_data["org_a_id"],
        name="Inactive Flour",
        sku="INACTIVE-FLOUR",
        is_active=False,
    )
    headers = _manager_headers(client)

    response = client.post(
        "/api/v1/recipes",
        headers=headers,
        json={
            "name": "Invalid Recipe",
            "yield_quantity": 1,
            "yield_unit": "serving",
            "selling_price": 50,
            "ingredients": [{"product_id": product.id, "quantity_required": 1}],
        },
    )

    assert response.status_code == 400
    assert "inactive" in response.json()["detail"].lower()
    assert db.query(Recipe).filter(
        Recipe.organization_id == seed_test_data["org_a_id"],
        Recipe.name == "Invalid Recipe",
    ).count() == 0
    assert db.query(Product).filter(
        Product.organization_id == seed_test_data["org_a_id"],
        Product.name == "Invalid Recipe",
    ).count() == 0


def test_recipe_detail_and_list_are_tenant_scoped(client, db, seed_test_data):
    product = _ingredient_product(db, seed_test_data["org_a_id"])
    headers_a = _manager_headers(client)
    created = client.post(
        "/api/v1/recipes",
        headers=headers_a,
        json={
            "name": "Org A Recipe",
            "yield_quantity": 1,
            "yield_unit": "serving",
            "selling_price": 50,
            "ingredients": [{"product_id": product.id, "quantity_required": 1}],
        },
    )
    assert created.status_code == 201
    recipe_id = created.json()["id"]

    list_a = client.get("/api/v1/recipes", headers=headers_a)
    assert list_a.status_code == 200
    assert any(item["id"] == recipe_id for item in list_a.json())

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "owner_b@test.com", "password": "testpass"},
    )
    headers_b = {"Authorization": f"Bearer {login_b.cookies['kitcheniq_access']}"}
    detail_b = client.get(f"/api/v1/recipes/{recipe_id}", headers=headers_b)
    assert detail_b.status_code == 404
    list_b = client.get("/api/v1/recipes", headers=headers_b)
    assert list_b.status_code == 200
    assert all(item["id"] != recipe_id for item in list_b.json())


def test_recipe_cost_endpoint_returns_not_found_for_other_tenant(client, db, seed_test_data):
    product = _ingredient_product(db, seed_test_data["org_a_id"])
    headers_a = _manager_headers(client)
    created = client.post(
        "/api/v1/recipes",
        headers=headers_a,
        json={
            "name": "Org A Cost Recipe",
            "yield_quantity": 1,
            "yield_unit": "serving",
            "selling_price": 50,
            "ingredients": [{"product_id": product.id, "quantity_required": 1}],
        },
    )
    assert created.status_code == 201

    login_b = client.post(
        "/api/v1/auth/login",
        json={"email": "owner_b@test.com", "password": "testpass"},
    )
    headers_b = {"Authorization": f"Bearer {login_b.cookies['kitcheniq_access']}"}
    response = client.get(
        f"/api/v1/recipes/{created.json()['id']}/cost",
        headers=headers_b,
    )
    assert response.status_code == 404

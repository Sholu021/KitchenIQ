def test_root_endpoint(client):
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["app"] == "KitchenIQ AI API"
    assert data["status"] == "online"
    assert data["version"] == "1.0.0"
"""API tests: send real HTTP requests to the app, without starting a server."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_quote():
    response = client.post(
        "/quote",
        json={
            "items": [{"name": "Lamp", "price_cents": 6500, "quantity": 1}],
            "discount_code": "SAVE20",
        },
    )
    assert response.status_code == 200
    assert response.json() == {"subtotal": 6500, "discount": 1300, "shipping": 0, "total": 5200}


def test_unknown_discount_code_is_a_400():
    response = client.post(
        "/quote",
        json={
            "items": [{"name": "Lamp", "price_cents": 6000, "quantity": 1}],
            "discount_code": "FREESTUFF",
        },
    )
    assert response.status_code == 400


def test_empty_basket_is_rejected():
    response = client.post("/quote", json={"items": []})
    assert response.status_code == 422

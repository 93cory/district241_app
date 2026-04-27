"""Tests for the global search endpoint."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username: str = "ministre", password: str = "ministre-dev-password") -> dict:
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_search_requires_auth():
    resp = client.get("/search/global?q=test")
    assert resp.status_code == 401


def test_search_requires_min_query():
    headers = auth_headers()
    resp = client.get("/search/global?q=a", headers=headers)
    assert resp.status_code == 422  # min_length=2


def test_search_returns_results_format():
    headers = auth_headers()
    resp = client.get("/search/global?q=bois", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "query" in data
    assert "count" in data
    assert "results" in data
    assert isinstance(data["results"], list)


def test_search_filter_by_type():
    headers = auth_headers()
    resp = client.get("/search/global?q=bois&type=ati", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    for item in data["results"]:
        assert item["type"] == "ati"


def test_search_filter_operateur():
    headers = auth_headers()
    resp = client.get("/search/global?q=gabon&type=operateur", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    for item in data["results"]:
        assert item["type"] == "operateur"


def test_search_limit():
    headers = auth_headers()
    resp = client.get("/search/global?q=bois&limit=3", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) <= 3

"""Tests for the health score module."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def admin_headers():
    resp = client.post("/auth/token", data={"username": "ministre", "password": "ministre-dev-password"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_health_score_requires_auth():
    resp = client.get("/health/score")
    assert resp.status_code == 401


def test_health_score_returns_score():
    headers = admin_headers()
    resp = client.get("/health/score", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data
    assert "grade" in data
    assert "details" in data
    assert 0 <= data["score"] <= 100
    assert data["grade"] in ("A", "B", "C", "D", "F")


def test_health_live():
    resp = client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json()["status"] == "alive"


def test_health_basic():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"

"""Tests for the CSRF middleware."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.csrf import CSRFMiddleware


@pytest.fixture
def csrf_app():
    app = FastAPI()
    app.add_middleware(CSRFMiddleware, allowed_origins=["http://localhost:3000"])

    @app.get("/data")
    def get_data():
        return {"ok": True}

    @app.post("/data")
    def post_data():
        return {"created": True}

    return app


@pytest.fixture
def csrf_client(csrf_app):
    return TestClient(csrf_app)


def test_get_always_allowed(csrf_client):
    resp = csrf_client.get("/data")
    assert resp.status_code == 200


def test_post_no_origin_allowed(csrf_client):
    """Requests without Origin header (same-origin, curl) are allowed."""
    resp = csrf_client.post("/data")
    assert resp.status_code == 200


def test_post_valid_origin(csrf_client):
    resp = csrf_client.post("/data", headers={"Origin": "http://localhost:3000"})
    assert resp.status_code == 200


def test_post_invalid_origin_blocked(csrf_client):
    resp = csrf_client.post("/data", headers={"Origin": "http://evil.com"})
    assert resp.status_code == 403
    assert "Origine non autorisee" in resp.json()["detail"]


def test_post_api_key_bypasses_csrf(csrf_client):
    resp = csrf_client.post("/data", headers={"Origin": "http://evil.com", "x-api-key": "test"})
    assert resp.status_code == 200

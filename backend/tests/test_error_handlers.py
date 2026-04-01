"""Tests for the global error handlers."""
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.core.error_handlers import register_error_handlers


@pytest.fixture
def app_with_handlers():
    app = FastAPI()
    register_error_handlers(app)

    @app.get("/ok")
    def ok():
        return {"status": "ok"}

    @app.get("/not-found")
    def not_found():
        raise HTTPException(status_code=404, detail="Resource introuvable")

    @app.get("/crash")
    def crash():
        raise RuntimeError("Something went wrong")

    return app


@pytest.fixture
def client(app_with_handlers):
    return TestClient(app_with_handlers, raise_server_exceptions=False)


def test_http_exception_format(client):
    resp = client.get("/not-found")
    assert resp.status_code == 404
    body = resp.json()
    assert body["error"] is True
    assert body["status_code"] == 404
    assert "introuvable" in body["detail"]
    assert body["path"] == "/not-found"


def test_unhandled_exception_returns_500(client):
    resp = client.get("/crash")
    assert resp.status_code == 500
    body = resp.json()
    assert body["error"] is True
    assert body["status_code"] == 500
    assert "interne" in body["detail"].lower()


def test_ok_endpoint(client):
    resp = client.get("/ok")
    assert resp.status_code == 200

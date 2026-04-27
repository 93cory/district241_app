"""Tests for the API keys management endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def admin_headers():
    resp = client.post("/auth/token", data={"username": "admin", "password": "admin-dev-password"})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_list_api_keys_requires_admin():
    resp = client.get("/admin/api-keys")
    assert resp.status_code == 401


def test_create_and_list_api_key():
    headers = admin_headers()

    # Create
    resp = client.post(
        "/admin/api-keys",
        json={
            "name": "Test Integration",
            "system_id": "test_system",
            "permissions": ["read"],
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "api_key" in data
    assert data["name"] == "Test Integration"
    assert len(data["api_key"]) > 20
    key_id = data["id"]

    # List
    resp = client.get("/admin/api-keys", headers=headers)
    assert resp.status_code == 200
    keys = resp.json()
    assert any(k["id"] == key_id for k in keys)

    # Revoke
    resp = client.delete(f"/admin/api-keys/{key_id}", headers=headers)
    assert resp.status_code == 200


def test_revoke_nonexistent():
    headers = admin_headers()
    resp = client.delete("/admin/api-keys/nonexistent-id", headers=headers)
    assert resp.status_code == 404

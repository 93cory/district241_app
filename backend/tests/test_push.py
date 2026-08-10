"""Tests pour routers/push.py (dette D-006 — router non couvert)."""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Endpoint sur l'allowlist SSRF (_ALLOWED_PUSH_HOST) : seul fcm.googleapis.com
# et consorts sont acceptes par le validator Pydantic.
_ALLOWED_ENDPOINT_BASE = "https://fcm.googleapis.com/fcm/send/"


def auth_headers(username="ministre", password="ministre-dev-password"):
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def _subscribe_payload(endpoint: str | None = None) -> dict:
    return {
        "endpoint": endpoint or f"{_ALLOWED_ENDPOINT_BASE}{uuid.uuid4().hex}",
        "keys": {"p256dh": "a" * 32, "auth": "b" * 16},
        "user_agent": "pytest-agent",
    }


def test_vapid_key_public_endpoint_no_auth_needed():
    resp = client.get("/push/vapid-key")
    assert resp.status_code == 200
    data = resp.json()
    assert "public_key" in data
    assert "enabled" in data


def test_subscribe_requires_auth():
    resp = client.post("/push/subscribe", json=_subscribe_payload())
    assert resp.status_code == 401


def test_subscribe_rejects_ssrf_endpoint():
    """Un endpoint hors allowlist (SSRF potentiel) doit etre rejete par la
    validation Pydantic, pas silencieusement accepte."""
    headers = auth_headers()
    payload = _subscribe_payload(endpoint="https://attacker.example.com/collect")
    resp = client.post("/push/subscribe", headers=headers, json=payload)
    assert resp.status_code == 422


def test_subscribe_create_list_unsubscribe_roundtrip():
    headers = auth_headers()
    payload = _subscribe_payload()

    create_resp = client.post("/push/subscribe", headers=headers, json=payload)
    assert create_resp.status_code == 200
    assert create_resp.json()["status"] == "created"

    list_resp = client.get("/push/subscriptions", headers=headers)
    assert list_resp.status_code == 200
    subs = list_resp.json()
    assert any(s["user_agent"] == "pytest-agent" for s in subs)

    unsub_resp = client.post("/push/unsubscribe", headers=headers, json={"endpoint": payload["endpoint"]})
    assert unsub_resp.status_code == 200
    assert unsub_resp.json()["status"] == "deleted"


def test_subscribe_same_endpoint_twice_updates_not_duplicates():
    headers = auth_headers()
    payload = _subscribe_payload()

    first = client.post("/push/subscribe", headers=headers, json=payload)
    assert first.status_code == 200
    assert first.json()["status"] == "created"

    second = client.post("/push/subscribe", headers=headers, json=payload)
    assert second.status_code == 200
    assert second.json()["status"] == "updated"
    assert second.json()["id"] == first.json()["id"]

    client.post("/push/unsubscribe", headers=headers, json={"endpoint": payload["endpoint"]})


def test_subscribe_endpoint_stolen_by_other_user_is_rejected():
    """Un endpoint deja enregistre par un autre utilisateur ne doit jamais
    etre reassigne silencieusement (vol d'abonnement)."""
    ministre_headers = auth_headers("ministre", "ministre-dev-password")
    instructeur_headers = auth_headers("instructeur", "instructeur-dev-password")
    payload = _subscribe_payload()

    first = client.post("/push/subscribe", headers=ministre_headers, json=payload)
    assert first.status_code == 200

    stolen = client.post("/push/subscribe", headers=instructeur_headers, json=payload)
    assert stolen.status_code == 409

    client.post("/push/unsubscribe", headers=ministre_headers, json={"endpoint": payload["endpoint"]})


def test_unsubscribe_nonexistent_endpoint_returns_not_found_status():
    headers = auth_headers()
    resp = client.post(
        "/push/unsubscribe",
        headers=headers,
        json={"endpoint": f"{_ALLOWED_ENDPOINT_BASE}{uuid.uuid4().hex}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "not_found"


def test_test_push_disabled_returns_503_when_vapid_not_configured():
    """En environnement de test, PNPI_VAPID_PUBLIC_KEY/PRIVATE_KEY ne sont
    pas definis -> PUSH_ENABLED=False -> 503 explicite (pas un crash)."""
    headers = auth_headers()
    resp = client.post(
        "/push/test",
        headers=headers,
        json={"title": "Test", "body": "Corps du message"},
    )
    assert resp.status_code == 503

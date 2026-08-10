"""Tests pour routers/ws.py (dette D-006 — router non couvert)."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def get_token(username="ministre", password="ministre-dev-password") -> str:
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_ws_invalid_token_closes_connection():
    # Le serveur ferme immediatement avec le code 4001 (cf
    # routers/ws.py::ws_notifications). Le TestClient de starlette leve
    # WebSocketDisconnect des l'entree du context manager quand la
    # fermeture arrive avant tout message applicatif.
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with (
        pytest.raises(WebSocketDisconnect) as exc_info,
        client.websocket_connect("/ws/notifications?token=token-invalide-bidon"),
    ):
        pass
    assert exc_info.value.code == 4001


def test_ws_valid_token_receives_init_message():
    token = get_token()
    with client.websocket_connect(f"/ws/notifications?token={token}") as ws:
        message = ws.receive_json()
        assert message["type"] == "init"
        assert "unread_count" in message
        assert isinstance(message["unread_count"], int)
        assert "timestamp" in message


def test_ws_ping_pong():
    token = get_token()
    with client.websocket_connect(f"/ws/notifications?token={token}") as ws:
        ws.receive_json()  # init
        ws.send_text("ping")
        pong = ws.receive_json()
        assert pong["type"] == "pong"


def test_ws_missing_token_returns_422():
    """`token` est un Query(...) obligatoire : son absence doit etre
    rejetee au niveau du handshake, avant meme d'atteindre la logique
    d'authentification."""
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect), client.websocket_connect("/ws/notifications") as ws:
        ws.receive_json()

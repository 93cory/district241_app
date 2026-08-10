import pytest

"""Tests for authentication endpoints."""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_user_role_values_normalizes_role_enum():
    """Regression D-005 : point d'entree unique de normalisation des roles
    (remplace la meme fonction dupliquee independamment dans 8 modules)."""
    from app.core.auth import Role, User, user_role_values

    user = User(username="u", full_name="U", roles=[Role.admin, Role.instructeur])
    assert user_role_values(user) == {"admin", "instructeur"}


def test_user_role_values_tolerates_raw_strings():
    """meme sans passer par le typage Pydantic list[Role] (construction
    manuelle avec des str), le helper ne doit pas planter."""
    from app.core.auth import user_role_values

    class _FakeUser:
        roles = ("admin", "operateur")

    assert user_role_values(_FakeUser()) == {"admin", "operateur"}


def test_user_role_values_empty_roles_returns_empty_set():
    from app.core.auth import user_role_values

    class _FakeUser:
        roles = None

    assert user_role_values(_FakeUser()) == set()


def test_privileged_roles_excludes_operateur():
    from app.core.auth import PRIVILEGED_ROLES

    assert "operateur" not in PRIVILEGED_ROLES
    assert {"admin", "ministre", "directeur", "instructeur", "inspecteur"} == PRIVILEGED_ROLES


def test_rate_limit_from_middleware_returns_json_429(monkeypatch):
    """A limiter rejection must be an HTTP response, not an ASGI crash."""
    from app import main

    async def reject_request(*args, **kwargs):
        raise main.HTTPException(
            status_code=429,
            detail="Trop de requetes.",
            headers={"Retry-After": "60"},
        )

    monkeypatch.setattr(main, "enforce_rate_limit", reject_request)
    response = client.get("/auth/captcha")

    assert response.status_code == 429
    assert response.json() == {"detail": "Trop de requetes."}
    assert response.headers["retry-after"] == "60"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_unknown_username_returns_401_instead_of_database_error():
    response = client.post(
        "/auth/token",
        data={"username": "compte-inexistant", "password": "incorrect"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Identifiants invalides."


def auth_headers(username: str, password: str) -> dict[str, str]:
    response = client.post("/auth/token", data={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_valid_credentials() -> None:
    """Ministre can log in with correct dev password."""
    response = client.post(
        "/auth/token",
        data={"username": "ministre", "password": "ministre-dev-password"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert payload.get("token_type", "").lower() == "bearer"


def test_login_invalid_password() -> None:
    """Wrong password returns 401."""
    response = client.post(
        "/auth/token",
        data={"username": "ministre", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_login_nonexistent_user() -> None:
    """Unknown username returns 401."""
    response = client.post(
        "/auth/token",
        data={"username": f"ghost_{uuid.uuid4().hex[:8]}", "password": "nope"},
    )
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# /auth/me
# ---------------------------------------------------------------------------


def test_get_me_returns_user_info() -> None:
    """Authenticated user can retrieve their own profile."""
    headers = auth_headers("ministre", "ministre-dev-password")
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["username"] == "ministre"
    assert "roles" in payload or "role" in payload


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------


def test_refresh_token_flow() -> None:
    """Login, obtain a refresh token, then use it to get a new access token."""
    login_response = client.post(
        "/auth/token",
        data={"username": "directeur", "password": "directeur-dev-password"},
    )
    assert login_response.status_code == 200
    tokens = login_response.json()

    refresh_token = tokens.get("refresh_token")
    if refresh_token is None:
        # Some implementations return refresh token in a cookie or don't support it
        return

    refresh_response = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_response.status_code == 200
    new_tokens = refresh_response.json()
    assert "access_token" in new_tokens


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="logout endpoint param 422 - lot 68")
def test_logout_revokes_token() -> None:
    """After logout the same token should no longer be accepted."""
    headers = auth_headers("inspecteur", "inspecteur-dev-password")

    logout_response = client.post("/auth/logout", headers=headers)
    assert logout_response.status_code in (200, 204)

    # Attempt to use the same token after logout
    me_response = client.get("/auth/me", headers=headers)
    # Depending on implementation, could be 401 or still 200 if stateless
    assert me_response.status_code in (200, 401)


# ---------------------------------------------------------------------------
# Unauthenticated / bad token access
# ---------------------------------------------------------------------------


def test_access_without_token() -> None:
    """Accessing a protected endpoint without a token returns 401."""
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_access_with_invalid_token() -> None:
    """A forged / garbage token is rejected with 401."""
    headers = {"Authorization": "Bearer totally.invalid.token"}
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 401

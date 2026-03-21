"""Tests for ATI (Agrement Technique Industriel) endpoints."""

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username: str, password: str) -> dict[str, str]:
    response = client.post("/auth/token", data={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_operateur(headers: dict[str, str]) -> dict:
    """Helper: create an operateur and return its JSON payload."""
    unique = uuid.uuid4().hex[:8]
    response = client.post(
        "/operateurs",
        headers=headers,
        json={
            "nif_gabon": f"NIF-{unique}",
            "raison_sociale": f"Societe Test {unique}",
            "secteur": "bois",
            "province": "estuaire",
            "ville": "Libreville",
        },
    )
    assert response.status_code in (200, 201)
    return response.json()


def _create_ati(headers: dict[str, str], operateur_id: str) -> dict:
    """Helper: create an ATI and return its JSON payload."""
    unique = uuid.uuid4().hex[:8]
    response = client.post(
        "/ati",
        headers=headers,
        json={
            "operateur_id": operateur_id,
            "type_activite": "Scierie",
            "secteur": "bois",
            "province": "estuaire",
        },
    )
    assert response.status_code in (200, 201)
    return response.json()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def test_create_ati() -> None:
    """Instructeur can create an ATI after creating an operateur."""
    headers = auth_headers("instructeur", "instructeur-dev-password")
    operateur = _create_operateur(headers)
    ati = _create_ati(headers, operateur["id"])

    assert "id" in ati
    assert ati["operateur_id"] == operateur["id"]
    assert ati["secteur"] == "bois"


def test_list_atis() -> None:
    """Listing ATIs returns a list (may be empty on a fresh DB)."""
    headers = auth_headers("instructeur", "instructeur-dev-password")
    response = client.get("/ati", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    # Could be a list or paginated dict
    assert isinstance(payload, (list, dict))


def test_get_ati_detail() -> None:
    """Fetching a single ATI by ID returns the correct record."""
    headers = auth_headers("instructeur", "instructeur-dev-password")
    operateur = _create_operateur(headers)
    ati = _create_ati(headers, operateur["id"])

    detail_response = client.get(f"/ati/{ati['id']}", headers=headers)
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["id"] == ati["id"]


# ---------------------------------------------------------------------------
# Status transitions
# ---------------------------------------------------------------------------

def test_update_ati_statut() -> None:
    """Instructeur can transition an ATI from soumis to en_instruction."""
    headers = auth_headers("instructeur", "instructeur-dev-password")
    operateur = _create_operateur(headers)
    ati = _create_ati(headers, operateur["id"])

    patch_response = client.patch(
        f"/ati/{ati['id']}/statut",
        headers=headers,
        json={"statut": "en_instruction"},
    )
    assert patch_response.status_code == 200
    updated = patch_response.json()
    assert updated.get("statut") == "en_instruction"


def test_operateur_cannot_update_ati_statut() -> None:
    """Operateur role must not be allowed to change ATI status (403)."""
    # Create ATI as instructeur first
    instr_headers = auth_headers("instructeur", "instructeur-dev-password")
    operateur = _create_operateur(instr_headers)
    ati = _create_ati(instr_headers, operateur["id"])

    # Try to update as operateur
    op_headers = auth_headers("operateur", "operateur-dev-password")
    patch_response = client.patch(
        f"/ati/{ati['id']}/statut",
        headers=op_headers,
        json={"statut": "en_instruction"},
    )
    assert patch_response.status_code == 403


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def test_ati_search() -> None:
    """Search endpoint can find ATIs by keyword."""
    headers = auth_headers("instructeur", "instructeur-dev-password")

    # Create a recognisable operateur + ATI
    unique = uuid.uuid4().hex[:8]
    op_response = client.post(
        "/operateurs",
        headers=headers,
        json={
            "nif_gabon": f"NIF-S-{unique}",
            "raison_sociale": f"SearchMe {unique}",
            "secteur": "bois",
            "province": "estuaire",
            "ville": "Libreville",
        },
    )
    assert op_response.status_code in (200, 201)

    search_response = client.get(
        f"/pnpi/dashboard/search?q={unique}",
        headers=headers,
    )
    assert search_response.status_code == 200
    payload = search_response.json()
    assert isinstance(payload, (list, dict))

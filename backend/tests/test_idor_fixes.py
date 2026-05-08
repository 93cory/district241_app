"""Tests for IDOR fixes (lot 80) on doc_versions, checklists, favorites, calendar.

Verifies that an operateur cannot read/write resources tied to an ATI created
by another user (operateur or instructeur).
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _auth(username: str, password: str) -> dict[str, str]:
    response = client.post("/auth/token", data={"username": username, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _create_operateur(headers: dict[str, str]) -> dict:
    unique = uuid.uuid4().hex[:8]
    r = client.post(
        "/pnpi/operateurs",
        headers=headers,
        json={
            "nif_gabon": f"NIF-{unique}",
            "raison_sociale": f"Societe IDOR {unique}",
            "secteur": "bois",
            "province": "estuaire",
            "ville": "Libreville",
        },
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


def _create_ati_as_instructeur() -> str:
    instr = _auth("instructeur", "instructeur-dev-password")
    op = _create_operateur(instr)
    r = client.post(
        "/pnpi/ati",
        headers=instr,
        json={
            "operateur_id": op["id"],
            "type_activite": "Scierie",
            "secteur": "bois",
            "province": "estuaire",
        },
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def test_operateur_cannot_read_other_doc_versions() -> None:
    """Operateur ne doit pas pouvoir lire les versions de documents d'un ATI tiers."""
    ati_id = _create_ati_as_instructeur()
    op_headers = _auth("operateur", "operateur-dev-password")

    r = client.get(f"/documents/ati/{ati_id}/versions", headers=op_headers)
    assert r.status_code == 403, r.text


def test_operateur_cannot_upload_other_doc_version() -> None:
    """Operateur ne doit pas pouvoir uploader une version sur un ATI tiers."""
    ati_id = _create_ati_as_instructeur()
    op_headers = _auth("operateur", "operateur-dev-password")

    r = client.post(
        f"/documents/ati/{ati_id}/upload-version",
        headers=op_headers,
        json={"filename": "rogue.pdf", "comment": "evil"},
    )
    assert r.status_code == 403, r.text


def test_operateur_cannot_read_other_checklist() -> None:
    """Operateur ne doit pas pouvoir lire la checklist d'un ATI tiers."""
    ati_id = _create_ati_as_instructeur()
    op_headers = _auth("operateur", "operateur-dev-password")

    r = client.get(f"/checklists/ati/{ati_id}", headers=op_headers)
    assert r.status_code == 403, r.text


def test_operateur_cannot_favorite_other_ati() -> None:
    """Operateur ne doit pas pouvoir favoriter un ATI tiers."""
    ati_id = _create_ati_as_instructeur()
    op_headers = _auth("operateur", "operateur-dev-password")

    r = client.post(f"/pnpi/ati/{ati_id}/favorite", headers=op_headers)
    assert r.status_code == 403, r.text


def test_operateur_calendar_filtered() -> None:
    """Le calendrier d'un opérateur ne doit pas remonter d'ATI d'un autre user."""
    ati_id = _create_ati_as_instructeur()
    op_headers = _auth("operateur", "operateur-dev-password")

    # plage large autour de la date de soumission
    r = client.get(
        "/calendar/events",
        headers=op_headers,
        params={"start": "2020-01-01", "end": "2099-12-31"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    # L'ATI créé par l'instructeur ne doit pas apparaître
    foreign_ids = [e["id"] for e in data.get("events", []) if ati_id in e.get("id", "")]
    assert not foreign_ids, f"Operateur voit un ATI tiers: {foreign_ids}"


def test_signature_required_before_approval(monkeypatch, tmp_path) -> None:
    """En production (flag = 1), une approbation sans signature doit etre refusee 422."""
    from pathlib import Path as _Path

    # 1. Activer le flag (par defaut desactive en tests via conftest).
    monkeypatch.setenv("PNPI_FF_REQUIRE_SIGNATURE_APPROVAL", "1")

    # 2. Creer un ATI et le pousser jusqu'en en_validation via un instructeur.
    instr = _auth("instructeur", "instructeur-dev-password")
    op = _create_operateur(instr)
    r = client.post(
        "/pnpi/ati",
        headers=instr,
        json={
            "operateur_id": op["id"],
            "type_activite": "Scierie",
            "secteur": "bois",
            "province": "estuaire",
        },
    )
    assert r.status_code in (200, 201), r.text
    ati_id = r.json()["id"]
    for new_statut in ("en_instruction", "en_validation"):
        r = client.patch(f"/pnpi/ati/{ati_id}/statut", headers=instr, json={"new_statut": new_statut})
        assert r.status_code == 200, r.text

    # 3. Approuver SANS signature -> doit echouer en 422.
    ministre = _auth("ministre", "ministre-dev-password")
    r = client.patch(f"/pnpi/ati/{ati_id}/statut", headers=ministre, json={"new_statut": "approuve"})
    assert r.status_code == 422, r.text
    assert "signature" in r.json().get("detail", "").lower()

    # 4. Apposer une signature factice (helper backend lit uploads/signatures/{ati_id}).
    sig_dir = _Path("uploads/signatures") / ati_id
    sig_dir.mkdir(parents=True, exist_ok=True)
    (sig_dir / "test.png").write_bytes(b"\x89PNG\r\n\x1a\n")

    # 5. Reessayer -> 200.
    r = client.patch(f"/pnpi/ati/{ati_id}/statut", headers=ministre, json={"new_statut": "approuve"})
    assert r.status_code == 200, r.text
    assert r.json()["statut"] == "approuve"


def test_document_upload_blocked_on_terminal_ati(monkeypatch) -> None:
    """Upload de document sur un ATI en statut terminal (approuve/rejete/expire) doit echouer 422."""
    monkeypatch.setenv("PNPI_FF_REQUIRE_SIGNATURE_APPROVAL", "0")  # focus sur le terminal-check
    instr = _auth("instructeur", "instructeur-dev-password")
    op = _create_operateur(instr)
    r = client.post(
        "/pnpi/ati",
        headers=instr,
        json={"operateur_id": op["id"], "type_activite": "Scierie", "secteur": "bois", "province": "estuaire"},
    )
    ati_id = r.json()["id"]
    for s in ("en_instruction", "en_validation", "approuve"):
        body = {"new_statut": s}
        if s == "approuve":
            body["numero_reference_decision"] = "REF-TERMINAL-TEST"
        r = client.patch(f"/pnpi/ati/{ati_id}/statut", headers=instr, json=body)
        assert r.status_code == 200, r.text

    # Upload sur ATI approuve -> 422
    r = client.post(
        f"/pnpi/ati/{ati_id}/documents",
        headers=instr,
        files={"file": ("polluant.pdf", b"%PDF-1.4 fake", "application/pdf")},
        data={"type_document": "autre"},
    )
    assert r.status_code == 422, r.text
    assert "terminal" in r.json().get("detail", "").lower()


def test_document_upload_rejects_blocked_extension(monkeypatch) -> None:
    """Upload d'un .exe renomme .pdf doit etre bloque par BLOCKED_EXTENSIONS."""
    monkeypatch.setenv("PNPI_FF_REQUIRE_SIGNATURE_APPROVAL", "0")
    instr = _auth("instructeur", "instructeur-dev-password")
    op = _create_operateur(instr)
    r = client.post(
        "/pnpi/ati",
        headers=instr,
        json={"operateur_id": op["id"], "type_activite": "Scierie", "secteur": "bois", "province": "estuaire"},
    )
    ati_id = r.json()["id"]
    r = client.post(
        f"/pnpi/ati/{ati_id}/documents",
        headers=instr,
        files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
        data={"type_document": "autre"},
    )
    assert r.status_code == 400, r.text
    assert ".exe" in r.json().get("detail", "")

"""Tests pour routers/scheduled_reports.py (dette D-006 — router non couvert).

Note : le stockage est en memoire (`_schedules`, module-level list — pas de
table DB, cf docstring du router). Les tests nettoient ce qu'ils creent
pour ne pas polluer les tests suivants dans le meme process pytest.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username="ministre", password="ministre-dev-password"):
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_list_requires_privileged_role():
    op_headers = auth_headers("operateur", "operateur-dev-password")
    resp = client.get("/scheduled-reports/list", headers=op_headers)
    assert resp.status_code == 403


def test_create_requires_privileged_role():
    op_headers = auth_headers("operateur", "operateur-dev-password")
    resp = client.post(
        "/scheduled-reports/create",
        headers=op_headers,
        json={"report_type": "executive"},
    )
    assert resp.status_code == 403


def test_create_rejects_invalid_report_type():
    headers = auth_headers()
    resp = client.post(
        "/scheduled-reports/create",
        headers=headers,
        json={"report_type": "type-invente"},
    )
    assert resp.status_code == 400


def test_create_list_toggle_delete_roundtrip():
    headers = auth_headers()  # ministre : suffisant pour list/create
    admin_headers = auth_headers("admin", "admin-dev-password")  # requis pour toggle/delete

    create_resp = client.post(
        "/scheduled-reports/create",
        headers=headers,
        json={
            "report_type": "ati_summary",
            "frequency": "weekly",
            "recipients": ["ministre"],
            "format": "pdf",
        },
    )
    assert create_resp.status_code == 200
    schedule_id = create_resp.json()["id"]

    try:
        list_resp = client.get("/scheduled-reports/list", headers=headers)
        assert list_resp.status_code == 200
        ids = [s["id"] for s in list_resp.json()["schedules"]]
        assert schedule_id in ids

        toggle_resp = client.patch(f"/scheduled-reports/{schedule_id}/toggle", headers=admin_headers)
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["is_active"] is False

        toggle_back = client.patch(f"/scheduled-reports/{schedule_id}/toggle", headers=admin_headers)
        assert toggle_back.json()["is_active"] is True
    finally:
        del_resp = client.delete(f"/scheduled-reports/{schedule_id}", headers=admin_headers)
        assert del_resp.status_code == 200

    list_after = client.get("/scheduled-reports/list", headers=headers)
    ids_after = [s["id"] for s in list_after.json()["schedules"]]
    assert schedule_id not in ids_after


def test_toggle_nonexistent_returns_404():
    admin_headers = auth_headers("admin", "admin-dev-password")  # toggle exige Role.admin
    resp = client.patch("/scheduled-reports/does-not-exist/toggle", headers=admin_headers)
    assert resp.status_code == 404


def test_toggle_requires_admin_specifically():
    """toggle est restreint a Role.admin (pas ministre/directeur, contrairement
    a list/create) — verifie que le role le plus large teste ici (ministre)
    est bien refuse."""
    headers = auth_headers("ministre", "ministre-dev-password")
    resp = client.patch("/scheduled-reports/whatever-id/toggle", headers=headers)
    assert resp.status_code == 403


def test_delete_requires_admin_specifically():
    headers = auth_headers("ministre", "ministre-dev-password")
    resp = client.delete("/scheduled-reports/whatever-id", headers=headers)
    assert resp.status_code == 403


def test_create_defaults_recipient_to_creator_when_omitted():
    headers = auth_headers()
    resp = client.post(
        "/scheduled-reports/create",
        headers=headers,
        json={"report_type": "performance"},
    )
    assert resp.status_code == 200
    schedule_id = resp.json()["id"]
    schedules = client.get("/scheduled-reports/list", headers=headers).json()["schedules"]
    created = next(s for s in schedules if s["id"] == schedule_id)
    assert created["recipients"] == ["ministre"]
    assert created["frequency"] == "weekly"  # defaut
    assert created["next_run"] is not None

    admin_headers = auth_headers("admin", "admin-dev-password")
    client.delete(f"/scheduled-reports/{schedule_id}", headers=admin_headers)

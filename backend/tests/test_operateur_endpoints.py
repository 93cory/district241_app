"""Tests for operateur-specific endpoints (risk profile, SLA, timeline)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username="ministre", password="ministre-dev-password"):
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_list_operateurs():
    headers = auth_headers()
    resp = client.get("/pnpi/operateurs", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_risk_profile_not_found():
    headers = auth_headers()
    resp = client.get("/pnpi/operateurs/nonexistent/risk-profile", headers=headers)
    assert resp.status_code == 404


def test_risk_profile_format():
    headers = auth_headers()
    # First get an existing operateur
    ops = client.get("/pnpi/operateurs", headers=headers).json()
    if not ops:
        return  # Skip if no operators in test DB

    op_id = ops[0]["id"]
    resp = client.get(f"/pnpi/operateurs/{op_id}/risk-profile", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data
    assert "risk_level" in data
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_level"] in ("faible", "modere", "eleve", "critique")
    assert "facteurs" in data


def test_timeline_format():
    headers = auth_headers()
    ops = client.get("/pnpi/operateurs", headers=headers).json()
    if not ops:
        return

    op_id = ops[0]["id"]
    resp = client.get(f"/pnpi/operateurs/{op_id}/timeline", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "operateur_id" in data
    assert "events" in data
    assert isinstance(data["events"], list)


def test_sla_status_not_found():
    headers = auth_headers()
    resp = client.get("/pnpi/ati/nonexistent/sla-status", headers=headers)
    assert resp.status_code == 404


def test_sla_status_format():
    headers = auth_headers()
    atis = client.get("/pnpi/ati", headers=headers).json()
    if not atis:
        return

    ati_id = atis[0]["id"]
    resp = client.get(f"/pnpi/ati/{ati_id}/sla-status", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "sla_jours" in data
    assert "jours_ecoules" in data
    assert "pct_utilise" in data
    assert "alerte" in data
    assert data["alerte"] in ("ok", "warning", "critical", "overdue", "none")


def test_period_comparison():
    headers = auth_headers()
    resp = client.get("/pnpi/dashboard/period-comparison", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "periode_courante" in data
    assert "periode_precedente" in data
    assert "metriques" in data
    assert len(data["metriques"]) == 3
    for m in data["metriques"]:
        assert "label" in m
        assert "courant" in m
        assert "variation_pct" in m

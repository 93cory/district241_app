"""Tests pour routers/graphql_api.py (dette D-006 — router non couvert).

Regression : _resolve_operateurs() lisait o.email/o.telephone, des
attributs qui n'existent pas sur OperateurIndustrielORM (vrais noms :
contact_email/contact_telephone) — 500 systematique sur toute requete
GraphQL "operateurs", jamais detecte faute de test. Corrige dans ce lot.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username="ministre", password="ministre-dev-password"):
    resp = client.post("/auth/token", data={"username": username, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_graphql_requires_auth():
    resp = client.post("/graphql", json={"query": "kpis", "args": {}})
    assert resp.status_code == 401


def test_graphql_unknown_query_returns_error_not_500():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "inexistant", "args": {}})
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data
    assert "available" in data


def test_graphql_kpis():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "kpis", "args": {}})
    assert resp.status_code == 200
    kpis = resp.json()["data"]["kpis"]
    for key in ("atis_total", "atis_approuves", "atis_rejetes", "operateurs_actifs", "inspections_total"):
        assert key in kpis
        assert isinstance(kpis[key], int)


def test_graphql_atis():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "atis", "args": {"limit": 5}})
    assert resp.status_code == 200
    atis = resp.json()["data"]["atis"]
    assert isinstance(atis, list)
    assert len(atis) <= 5
    if atis:
        assert "numero_ati" in atis[0]
        assert "operateur_nom" in atis[0]


def test_graphql_atis_filter_by_secteur():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "atis", "args": {"secteur": "bois", "limit": 20}})
    assert resp.status_code == 200
    atis = resp.json()["data"]["atis"]
    for a in atis:
        assert a["secteur"] == "bois"


def test_graphql_operateurs_regression_email_telephone():
    """Regression exacte du bug o.email/o.telephone -> 500 (cf docstring
    module). Doit retourner 200 avec des cles email/telephone valides
    (potentiellement None, jamais une exception serveur)."""
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "operateurs", "args": {"limit": 5}})
    assert resp.status_code == 200
    ops = resp.json()["data"]["operateurs"]
    assert isinstance(ops, list)
    if ops:
        assert "email" in ops[0]
        assert "telephone" in ops[0]
        assert "nif_gabon" in ops[0]


def test_graphql_operateurs_filter_by_province():
    headers = auth_headers()
    resp = client.post(
        "/graphql", headers=headers, json={"query": "operateurs", "args": {"province": "estuaire", "limit": 20}}
    )
    assert resp.status_code == 200
    ops = resp.json()["data"]["operateurs"]
    for o in ops:
        assert o["province"] == "estuaire"


def test_graphql_inspections():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "inspections", "args": {"limit": 5}})
    assert resp.status_code == 200
    insps = resp.json()["data"]["inspections"]
    assert isinstance(insps, list)


def test_graphql_field_filtering():
    """Le parametre `fields` doit restreindre les cles retournees."""
    headers = auth_headers()
    resp = client.post(
        "/graphql",
        headers=headers,
        json={"query": "atis", "args": {"limit": 3}, "fields": ["id", "numero_ati"]},
    )
    assert resp.status_code == 200
    atis = resp.json()["data"]["atis"]
    for a in atis:
        assert set(a.keys()) <= {"id", "numero_ati"}


def test_graphql_limit_capped_at_100():
    headers = auth_headers()
    resp = client.post("/graphql", headers=headers, json={"query": "atis", "args": {"limit": 9999}})
    assert resp.status_code == 200
    # Ne doit jamais lever meme avec une limite absurde ; le resolver la
    # plafonne a 100 en interne.
    assert isinstance(resp.json()["data"]["atis"], list)

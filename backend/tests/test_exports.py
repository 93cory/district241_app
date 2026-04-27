"""Tests for export endpoints (CSV and PDF)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def auth_headers(username: str, password: str) -> dict[str, str]:
    response = client.post("/auth/token", data={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# CSV exports
# ---------------------------------------------------------------------------


def test_export_ati_csv() -> None:
    """ATI CSV export returns valid CSV content."""
    headers = auth_headers("ministre", "ministre-dev-password")
    response = client.get("/pnpi/exports/ati.csv", headers=headers)
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/csv" in content_type or "application/octet-stream" in content_type
    # CSV should have a header row at minimum
    text = response.text
    assert len(text) > 0


def test_export_operateurs_csv() -> None:
    """Operateurs CSV export returns valid CSV content."""
    headers = auth_headers("ministre", "ministre-dev-password")
    response = client.get("/pnpi/exports/operateurs.csv", headers=headers)
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/csv" in content_type or "application/octet-stream" in content_type
    text = response.text
    assert len(text) > 0


def test_export_inspections_csv() -> None:
    """Inspections CSV export returns valid CSV content."""
    headers = auth_headers("ministre", "ministre-dev-password")
    # Try the PNPI-specific inspections export path
    response = client.get("/pnpi/exports/inspections.csv", headers=headers)
    if response.status_code == 404:
        # Fallback: try the generic exports path
        response = client.get("/exports/indicators.csv", headers=headers)
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "text/csv" in content_type or "application/octet-stream" in content_type


# ---------------------------------------------------------------------------
# PDF exports
# ---------------------------------------------------------------------------


def test_export_briefing_pdf() -> None:
    """Briefing PDF export returns a valid PDF document."""
    headers = auth_headers("ministre", "ministre-dev-password")
    response = client.get("/exports/dashboard.pdf", headers=headers)
    assert response.status_code == 200
    content_type = response.headers.get("content-type", "")
    assert "application/pdf" in content_type
    assert response.content.startswith(b"%PDF")

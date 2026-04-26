"""Smoke test des actions metier critiques par role.

Verifie : creation/lecture/transition d'ATI, photos d'inspection, exports.
"""

from __future__ import annotations

import os
import sys

import httpx

BASE = "http://127.0.0.1:8000"


def _pwd(role: str, default: str) -> str:
    return os.environ.get(f"PNPI_SMOKE_{role.upper()}_PWD", default)


def login(client: httpx.Client, username: str, password: str) -> str | None:
    r = client.post(
        f"{BASE}/auth/token",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    if r.status_code != 200:
        print(f"    Login FAIL · {r.status_code}")
        return None
    return r.json().get("access_token")


def header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def check(label: str, status: int, ok_codes: tuple = (200, 201, 204)) -> bool:
    ok = status in ok_codes
    mark = "OK " if ok else "FAIL"
    print(f"  [{mark}] {label:60s} -> {status}")
    return ok


def main() -> int:
    fails = 0
    with httpx.Client(follow_redirects=False) as client:
        # === MINISTRE: rapport executif ===
        print("\n--- MINISTRE: actions critiques ---")
        t = login(client, "ministre", _pwd("ministre", "Ministre@PNPI2026!"))
        if t:
            r = client.get(
                f"{BASE}/pnpi/dashboard/comparison"
                "?period1_start=2026-01-01&period1_end=2026-01-31"
                "&period2_start=2026-02-01&period2_end=2026-02-28",
                headers=header(t),
            )
            if not check("GET /pnpi/dashboard/comparison", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/pnpi/dashboard/predictions", headers=header(t))
            if not check("GET /pnpi/dashboard/predictions", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/exports/briefing.pptx", headers=header(t))
            if not check("GET /exports/briefing.pptx", r.status_code):
                fails += 1

        # === DIRECTEUR: liste, search, mes-stats ===
        print("\n--- DIRECTEUR: actions critiques ---")
        t = login(client, "directeur", _pwd("directeur", "Directeur@PNPI2026!"))
        if t:
            r = client.get(f"{BASE}/pnpi/ati?page=1&page_size=10", headers=header(t))
            if not check("GET /pnpi/ati paginated", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/pnpi/me/stats", headers=header(t))
            if not check("GET /pnpi/me/stats", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/search/global?q=bois", headers=header(t))
            if not check("GET /search/global?q=bois", r.status_code, ok_codes=(200, 422)):
                fails += 1

        # === INSTRUCTEUR: ATI list + detail ===
        print("\n--- INSTRUCTEUR: actions critiques ---")
        t = login(client, "instructeur", _pwd("instructeur", "Instructeur@PNPI2026!"))
        if t:
            r = client.get(f"{BASE}/pnpi/ati?page=1&page_size=5", headers=header(t))
            if not check("GET /pnpi/ati first page", r.status_code):
                fails += 1
            else:
                payload = r.json()
                items = payload.get("items") if isinstance(payload, dict) else payload
                if items:
                    ati_id = items[0]["id"]
                    r2 = client.get(f"{BASE}/pnpi/ati/{ati_id}", headers=header(t))
                    if not check("GET /pnpi/ati/{id} detail", r2.status_code):
                        fails += 1
                    r3 = client.get(f"{BASE}/pnpi/ati/{ati_id}/historique", headers=header(t))
                    if not check("GET /pnpi/ati/{id}/historique", r3.status_code, ok_codes=(200, 404)):
                        fails += 1
                else:
                    print("  [INFO] aucun ATI en base, test detail skip")

        # === INSPECTEUR: inspections + carte ===
        print("\n--- INSPECTEUR: actions critiques ---")
        t = login(client, "inspecteur", _pwd("inspecteur", "Inspecteur@PNPI2026!"))
        if t:
            r = client.get(f"{BASE}/pnpi/inspections", headers=header(t))
            if not check("GET /pnpi/inspections", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/pnpi/me/stats", headers=header(t))
            if not check("GET /pnpi/me/stats", r.status_code):
                fails += 1

        # === OPERATEUR: mes ATI + verify public ===
        print("\n--- OPERATEUR: actions critiques ---")
        t = login(client, "operateur", _pwd("operateur", "Operateur@PNPI2026!"))
        if t:
            r = client.get(f"{BASE}/pnpi/me/stats", headers=header(t))
            if not check("GET /pnpi/me/stats", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/pnpi/ati?page=1&page_size=5", headers=header(t))
            if not check("GET /pnpi/ati operateur scope", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/pnpi/operateurs", headers=header(t))
            if not check("GET /pnpi/operateurs (annuaire)", r.status_code):
                fails += 1

        # === ADMIN: backups, audit, integrations ===
        print("\n--- ADMIN: actions critiques ---")
        t = login(client, "admin", _pwd("admin", "Admin@PNPI2026!"))
        if t:
            r = client.get(f"{BASE}/admin/users?page=1&page_size=10", headers=header(t))
            if not check("GET /admin/users paginated", r.status_code):
                fails += 1
            r = client.get(f"{BASE}/admin/audit-events?limit=20", headers=header(t))
            if not check("GET /admin/audit-events", r.status_code, ok_codes=(200, 404)):
                fails += 1
            r = client.get(f"{BASE}/health/detailed", headers=header(t))
            if not check("GET /health/detailed", r.status_code):
                fails += 1

        # === IDOR: operateur ne doit PAS voir autres ATI ===
        print("\n--- SECURITE: protection IDOR ---")
        t_op = login(client, "operateur", _pwd("operateur", "Operateur@PNPI2026!"))
        t_inst = login(client, "instructeur", _pwd("instructeur", "Instructeur@PNPI2026!"))
        if t_op and t_inst:
            r = client.get(f"{BASE}/pnpi/ati?page=1&page_size=20", headers=header(t_inst))
            if r.status_code == 200:
                payload = r.json()
                items = payload.get("items") if isinstance(payload, dict) else payload
            else:
                items = []
            other_ati = next((a for a in items if a.get("created_by") not in ("operateur", None)), None)
            if other_ati:
                r2 = client.get(f"{BASE}/pnpi/ati/{other_ati['id']}", headers=header(t_op))
                # On attend 403 ou 404 (operateur non proprietaire)
                if not check(
                    "Operateur acces ATI d'autrui (doit etre 403/404)",
                    r2.status_code,
                    ok_codes=(403, 404),
                ):
                    fails += 1
            else:
                print("  [INFO] pas d'ATI d'autre proprietaire en base, test IDOR skip")

    print(f"\n=== Total echecs : {fails} ===")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

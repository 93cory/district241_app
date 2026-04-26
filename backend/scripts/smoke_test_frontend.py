"""Smoke test des pages frontend par role · login + landing page + routes critiques."""

from __future__ import annotations

import os
import sys

import httpx

BACKEND = "http://127.0.0.1:8000"
FRONTEND = "http://localhost:3000"


def _pwd(role: str, default: str) -> str:
    return os.environ.get(f"PNPI_SMOKE_{role.upper()}_PWD", default)


# Routes par role · doivent toutes repondre 200 (ou 307 redirect intentionnel)
PER_ROLE_ROUTES = {
    "admin": {
        "creds": ("admin", _pwd("admin", "Admin@PNPI2026!")),
        "landing": "/admin",
        "routes": [
            "/admin",
            "/admin/users",
            "/admin/audit-log",
            "/admin/raci",
            "/admin/announcements",
            "/admin/security",
            "/pnpi",
            "/api-docs",
            "/aide",
            "/profil",
        ],
    },
    "ministre": {
        "creds": ("ministre", _pwd("ministre", "Ministre@PNPI2026!")),
        "landing": "/pnpi",
        "routes": [
            "/pnpi",
            "/pnpi/executive",
            "/pnpi/live",
            "/pnpi/predictions",
            "/pnpi/ati",
            "/pnpi/operateurs",
            "/pnpi/reports",
            "/pnpi/comparison",
            "/profil",
        ],
    },
    "directeur": {
        "creds": ("directeur", _pwd("directeur", "Directeur@PNPI2026!")),
        "landing": "/pnpi",
        "routes": [
            "/pnpi",
            "/pnpi/ati",
            "/pnpi/operateurs",
            "/pnpi/equipe",
            "/pnpi/mes-dossiers",
            "/pnpi/triage",
            "/pnpi/reports",
            "/profil",
        ],
    },
    "instructeur": {
        "creds": ("instructeur", _pwd("instructeur", "Instructeur@PNPI2026!")),
        "landing": "/pnpi",
        "routes": [
            "/pnpi",
            "/pnpi/ati",
            "/pnpi/operateurs",
            "/pnpi/mes-dossiers",
            "/pnpi/mes-stats",
            "/pnpi/kanban",
            "/profil",
        ],
    },
    "inspecteur": {
        "creds": ("inspecteur", _pwd("inspecteur", "Inspecteur@PNPI2026!")),
        "landing": "/inspecteur",
        "routes": [
            "/inspecteur",
            "/pnpi/inspections",
            "/pnpi/operateurs",
            "/pnpi/map",
            "/pnpi/calendar",
            "/pnpi/mes-stats",
            "/profil",
        ],
    },
    "operateur": {
        "creds": ("operateur", _pwd("operateur", "Operateur@PNPI2026!")),
        "landing": "/pnpi/guichet",
        "routes": [
            "/pnpi/guichet",
            "/pnpi/operateurs",
            "/pnpi/renewals",
            "/pnpi/marketplace",
            "/pnpi/messages",
            "/aide",
            "/profil",
        ],
    },
}


def login_and_get_cookie(client: httpx.Client, username: str, password: str) -> bool:
    """Login via le proxy Next.js qui pose le cookie httpOnly pnpi_access_token."""
    r = client.post(
        f"{FRONTEND}/api/auth/login",
        json={"username": username, "password": password},
        timeout=10.0,
    )
    if r.status_code != 200:
        # Fallback : login direct sur le backend, puis injecter le cookie manuellement
        backend_login = httpx.post(
            f"{BACKEND}/auth/token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
        if backend_login.status_code != 200:
            print(f"    Backend login FAIL · {backend_login.status_code}")
            return False
        token = backend_login.json().get("access_token")
        if not token:
            return False
        client.cookies.set("pnpi_access_token", token, domain="localhost")
        return True
    return True


def main() -> int:
    fails = 0
    total = 0

    for role, cfg in PER_ROLE_ROUTES.items():
        username, password = cfg["creds"]
        print(f"\n--- {role.upper()} ({username}) ---")
        with httpx.Client(follow_redirects=False) as client:
            if not login_and_get_cookie(client, username, password):
                print("  [FAIL] login")
                fails += 1
                continue
            print("  [OK ] login")

            for path in cfg["routes"]:
                total += 1
                try:
                    r = client.get(f"{FRONTEND}{path}", timeout=15.0)
                    status = r.status_code
                except Exception as e:
                    status = 0
                    print(f"  [FAIL] {path:34s} -> EXC {e}")
                    fails += 1
                    continue
                # 200 OK ; 307/308 = redirect, mais vers /connexion = auth perdue.
                ok = status in (200, 307, 308)
                if status in (307, 308):
                    loc = r.headers.get("location", "")
                    if "/connexion" in loc:
                        ok = False
                        print(f"  [FAIL] {path:34s} -> {status} -> {loc} (auth perdue)")
                    else:
                        print(f"  [OK ] {path:34s} -> {status} -> {loc}")
                else:
                    mark = "OK " if ok else "FAIL"
                    print(f"  [{mark}] {path:34s} -> {status}")
                if not ok:
                    fails += 1

    print(f"\n=== Routes testees : {total} · Echecs : {fails} ===")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

"""Smoke test des 6 roles PNPI · verifie login + endpoints critiques.

Usage:
  python scripts/smoke_test_roles.py
  python scripts/smoke_test_roles.py --base http://127.0.0.1:8000
"""

from __future__ import annotations

import argparse
import os
import sys
from typing import Any

import httpx


def _pwd(role: str, default: str) -> str:
    """Lit le mot de passe smoke depuis l'env, fallback sur le default seed."""
    role_name = role.upper()
    return os.environ.get(
        f"PNPI_SMOKE_{role_name}_PWD",
        os.environ.get(f"PNPI_{role_name}_PASSWORD", default),
    )


ROLES: list[dict[str, Any]] = [
    {
        "role": "admin",
        "username": "admin",
        "password": _pwd("admin", "Admin@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/health/status"),
            ("GET", "/admin/users"),
            ("GET", "/admin/notifications"),
            ("GET", "/pnpi/dashboard/kpis"),
        ],
    },
    {
        "role": "ministre",
        "username": "ministre",
        "password": _pwd("ministre", "Ministre@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/pnpi/dashboard/kpis"),
            ("GET", "/pnpi/dashboard/secteurs"),
            ("GET", "/pnpi/dashboard/provinces"),
            ("GET", "/admin/notifications"),
            ("GET", "/admin/users"),
        ],
    },
    {
        "role": "directeur",
        "username": "directeur",
        "password": _pwd("directeur", "Directeur@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/pnpi/dashboard/kpis"),
            ("GET", "/pnpi/ati"),
            ("GET", "/pnpi/operateurs"),
            ("GET", "/admin/notifications"),
        ],
    },
    {
        "role": "instructeur",
        "username": "instructeur",
        "password": _pwd("instructeur", "Instructeur@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/pnpi/dashboard/kpis"),
            ("GET", "/pnpi/ati"),
            ("GET", "/pnpi/operateurs"),
            ("GET", "/admin/notifications"),
        ],
    },
    {
        "role": "inspecteur",
        "username": "inspecteur",
        "password": _pwd("inspecteur", "Inspecteur@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/pnpi/inspections"),
            ("GET", "/pnpi/operateurs"),
            ("GET", "/admin/notifications"),
        ],
    },
    {
        "role": "operateur",
        "username": "operateur",
        "password": _pwd("operateur", "Operateur@PNPI2026!"),
        "landing_endpoints": [
            ("GET", "/pnpi/me/stats"),
            ("GET", "/pnpi/ati"),
            ("GET", "/pnpi/operateurs"),
            ("GET", "/admin/notifications"),
        ],
    },
]


PUBLIC_ENDPOINTS = [
    ("GET", "/health"),
    ("GET", "/health/status"),
    ("GET", "/open-data/stats"),
    ("GET", "/open-data/sectors"),
    ("GET", "/open-data/provinces"),
]


def login(client: httpx.Client, base: str, username: str, password: str) -> str | None:
    try:
        r = client.post(
            f"{base}/auth/token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
        if r.status_code != 200:
            print(f"    LOGIN FAIL · {r.status_code} · {r.text[:200]}")
            return None
        data = r.json()
        if data.get("requires_2fa"):
            print("    LOGIN 2FA · skip (compte avec TOTP active)")
            return None
        return data.get("access_token") or data.get("token")
    except Exception as e:
        print(f"    LOGIN EXC · {e}")
        return None


def call(client: httpx.Client, base: str, method: str, path: str, token: str | None) -> tuple[int, str]:
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        r = client.request(method, f"{base}{path}", headers=headers, timeout=15.0)
        return r.status_code, r.text[:160]
    except Exception as e:
        return 0, str(e)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    base = args.base.rstrip("/")

    print(f"=== PNPI Smoke Test · base = {base} ===\n")

    total_ok = 0
    total_fail = 0

    with httpx.Client(follow_redirects=False) as client:
        # 1. Public endpoints
        print("--- Endpoints publics (sans auth) ---")
        for method, path in PUBLIC_ENDPOINTS:
            status, body = call(client, base, method, path, None)
            ok = 200 <= status < 300
            mark = "OK " if ok else "FAIL"
            print(f"  [{mark}] {method:5s} {path:36s} -> {status}")
            if ok:
                total_ok += 1
            else:
                total_fail += 1
                print(f"         body: {body}")

        # 2. Per-role login + landing endpoints
        for role_cfg in ROLES:
            role = role_cfg["role"]
            print(f"\n--- {role.upper()} ({role_cfg['username']}) ---")
            token = login(client, base, role_cfg["username"], role_cfg["password"])
            if not token:
                print(f"  Login impossible, skip {role}.")
                total_fail += 1
                continue
            print(f"  Login OK · token len {len(token)}")

            for method, path in role_cfg["landing_endpoints"]:
                status, body = call(client, base, method, path, token)
                # 404 toleree (donnee absente) ; 500/401/403 = echec.
                acceptable = 200 <= status < 300 or status in (204, 304, 404)
                mark = "OK " if acceptable else "FAIL"
                print(f"  [{mark}] {method:5s} {path:36s} -> {status}")
                if acceptable:
                    total_ok += 1
                else:
                    total_fail += 1
                    print(f"         body: {body}")

    print("\n=== Resultat ===")
    print(f"  OK   : {total_ok}")
    print(f"  FAIL : {total_fail}")
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

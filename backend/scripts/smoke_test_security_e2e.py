"""Smoke test des controles de securite e2e (RBAC, IDOR, Open Data, Captcha).

Sous-ensemble dedie « securite » du smoke principal `smoke_test_ati_flow.py`.

Lancement :
  cd backend && python scripts/smoke_test_security_e2e.py
"""

from __future__ import annotations

import os
import sys
import uuid

import httpx

BASE = os.environ.get("PNPI_SMOKE_BASE_URL", "http://127.0.0.1:8000")


def _pwd(role: str) -> str:
    role_name = role.upper()
    return os.environ.get(
        f"PNPI_SMOKE_{role_name}_PWD",
        os.environ.get(f"PNPI_{role_name}_PASSWORD", f"{role.title()}@PNPI2026!"),
    )


def login(client: httpx.Client, username: str) -> str | None:
    r = client.post(
        f"{BASE}/auth/token",
        data={"username": username, "password": _pwd(username)},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    return r.json().get("access_token") if r.status_code == 200 else None


def H(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class Audit:
    def __init__(self) -> None:
        self.fails = 0
        self.checks = 0

    def expect(self, label: str, cond: bool, detail: str = "") -> bool:
        self.checks += 1
        if cond:
            print(f"  [OK ] {label}")
            return True
        self.fails += 1
        print(f"  [FAIL] {label}{(' -- ' + detail) if detail else ''}")
        return False


def run(client: httpx.Client, audit: Audit) -> None:
    # --- RBAC operateur sur endpoints prives ------------------------------
    print("\n--- RBAC operateur sur endpoints admin ---")
    t_op = login(client, "operateur")
    audit.expect("login operateur", t_op is not None)
    if t_op:
        for path in ("/admin/users", "/admin/audit-logs"):
            r = client.get(f"{BASE}{path}", headers=H(t_op), timeout=10.0)
            audit.expect(
                f"GET {path} (operateur) -> 401/403",
                r.status_code in (401, 403),
                f"status={r.status_code}",
            )

    # --- IDOR : operateur sur ATI d'autrui --------------------------------
    print("\n--- IDOR sur /pnpi/ati/{id}/* ---")
    t_inst = login(client, "instructeur")
    audit.expect("login instructeur", t_inst is not None)
    if t_op and t_inst:
        r = client.get(f"{BASE}/pnpi/ati?limit=200", headers=H(t_inst), timeout=10.0)
        items = r.json() if (r.status_code == 200 and isinstance(r.json(), list)) else []
        other = next(
            (a for a in items if a.get("created_by") and a.get("created_by") not in ("operateur", None)),
            None,
        )
        if other:
            for sub in ("", "/historique", "/comments", "/tags", "/risk", "/field-history"):
                rr = client.get(f"{BASE}/pnpi/ati/{other['id']}{sub}", headers=H(t_op), timeout=10.0)
                audit.expect(
                    f"GET /pnpi/ati/{{other_id}}{sub} (operateur) -> 403/404",
                    rr.status_code in (403, 404),
                    f"status={rr.status_code}",
                )
        else:
            print("  [INFO] pas d'ATI d'autrui en base, IDOR scenario skip")

    # --- Open Data publique : sans auth, anonymise -----------------------
    print("\n--- Open Data publique ---")
    for path in ("/open-data/stats", "/open-data/sectors", "/open-data/provinces"):
        r = client.get(f"{BASE}{path}", timeout=10.0)
        audit.expect(f"GET {path} (no auth) -> 200", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            text = r.text.lower()
            audit.expect(f"{path} ne contient pas 'nif'", '"nif"' not in text and "'nif'" not in text)

    # rate limit (30 req / 60s) : 35 requetes -> au moins un 429
    statuses = [client.get(f"{BASE}/open-data/sectors", timeout=10.0).status_code for _ in range(35)]
    audit.expect(
        "rate-limit /open-data effectif (>=1 429 sur 35 req)",
        429 in statuses,
        f"distinct={sorted(set(statuses))}",
    )

    # --- Captcha login ----------------------------------------------------
    print("\n--- Captcha login ---")
    bogus = f"smoke_bogus_{uuid.uuid4().hex[:6]}"
    for _ in range(4):
        client.post(
            f"{BASE}/auth/token",
            data={"username": bogus, "password": "x"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )
    r = client.post(
        f"{BASE}/auth/token",
        data={"username": bogus, "password": "x"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    audit.expect(
        "/auth/token sans captcha apres 3 echecs -> 403",
        r.status_code == 403,
        f"status={r.status_code}",
    )
    r = client.get(f"{BASE}/auth/captcha", timeout=10.0)
    audit.expect("GET /auth/captcha -> 200", r.status_code == 200)
    if r.status_code == 200:
        body = r.json()
        audit.expect(
            "/auth/captcha required=True + token + question",
            body.get("required") is True and body.get("token") and body.get("question"),
            f"body={body}",
        )

    # --- ATI verify public sans auth -------------------------------------
    print("\n--- Verification publique /pnpi/ati/verify ---")
    r = client.get(f"{BASE}/pnpi/ati/verify/INEXISTANT-XYZ", timeout=10.0)
    audit.expect(
        "verify d'un numero inconnu -> 404 (pas 401)",
        r.status_code == 404,
        f"status={r.status_code}",
    )


def main() -> int:
    audit = Audit()
    print(f"# Security smoke contre {BASE}")
    try:
        with httpx.Client(follow_redirects=False) as client:
            try:
                rh = client.get(f"{BASE}/health", timeout=5.0)
                if rh.status_code != 200:
                    print(f"!! Backend ne repond pas (HTTP {rh.status_code}).")
                    return 2
            except Exception as exc:
                print(f"!! Backend injoignable: {exc}")
                return 2
            run(client, audit)
    finally:
        print(f"\n=== Resume securite : {audit.checks - audit.fails}/{audit.checks} OK, {audit.fails} echec(s) ===")
    return 0 if audit.fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

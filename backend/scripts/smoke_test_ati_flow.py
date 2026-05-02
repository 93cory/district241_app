"""Smoke test du flux complet ATI end-to-end.

Audite le pipeline metier nominal :
  operateur -> instructeur -> directeur -> ministre + recours apres rejet.

Verifie a chaque etape :
  - HTTP status attendu
  - Cohérence statut/etape ATI
  - Generation QR + certificat PDF
  - Verification publique (scan QR)
  - Historique transitions
  - Recours apres rejet

Lancement :
  python -m backend.scripts.smoke_test_ati_flow
ou :
  cd backend && python scripts/smoke_test_ati_flow.py

Variables d'environnement supportees :
  PNPI_SMOKE_BASE_URL          (default http://127.0.0.1:8000)
  PNPI_SMOKE_<ROLE>_PWD        ex. PNPI_SMOKE_ADMIN_PWD
"""

from __future__ import annotations

import os
import sys
import uuid

import httpx

BASE = os.environ.get("PNPI_SMOKE_BASE_URL", "http://127.0.0.1:8000")
ROLE_PASSWORDS_DEFAULT = {
    "admin": "Admin@PNPI2026!",
    "ministre": "Ministre@PNPI2026!",
    "directeur": "Directeur@PNPI2026!",
    "instructeur": "Instructeur@PNPI2026!",
    "inspecteur": "Inspecteur@PNPI2026!",
    "operateur": "Operateur@PNPI2026!",
}


# ── infra helpers ──────────────────────────────────────────────────────────


def _pwd(role: str) -> str:
    return os.environ.get(
        f"PNPI_SMOKE_{role.upper()}_PWD",
        ROLE_PASSWORDS_DEFAULT.get(role, f"{role.title()}@PNPI2026!"),
    )


def login(client: httpx.Client, username: str) -> str | None:
    r = client.post(
        f"{BASE}/auth/token",
        data={"username": username, "password": _pwd(username)},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=15.0,
    )
    if r.status_code != 200:
        print(f"  [LOGIN-FAIL] {username:12s} -> {r.status_code} ({r.text[:120]})")
        return None
    return r.json().get("access_token")


def H(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class Audit:
    def __init__(self) -> None:
        self.fails = 0
        self.checks = 0

    def assert_(self, label: str, cond: bool, detail: str = "") -> bool:
        self.checks += 1
        if cond:
            print(f"  [OK ] {label}")
            return True
        self.fails += 1
        suffix = f" -- {detail}" if detail else ""
        print(f"  [FAIL] {label}{suffix}")
        return False

    def status(self, label: str, status: int, ok_codes: tuple[int, ...] = (200, 201, 204)) -> bool:
        return self.assert_(f"{label:60s} -> {status}", status in ok_codes)


# ── fixtures de donnees ───────────────────────────────────────────────────


def fetch_or_create_operateur(client: httpx.Client, token: str) -> str | None:
    """Renvoie l'id d'un operateur existant, ou en cree un si l'admin est connecte."""
    r = client.get(f"{BASE}/pnpi/operateurs?limit=5", headers=H(token), timeout=15.0)
    if r.status_code == 200:
        items = r.json() if isinstance(r.json(), list) else []
        if items:
            return items[0].get("id")
    # fallback : tenter une creation via admin
    nif = f"GA-SMOKE-{uuid.uuid4().hex[:6].upper()}"
    payload = {
        "raison_sociale": f"Smoke Test SARL {nif}",
        "nif_gabon": nif,
        "secteur": "bois",
        "province": "Estuaire",
        "ville": "Libreville",
        "adresse": "Test address",
        "contact_email": "smoke@test.ga",
        "contact_telephone": "+24177000000",
        "effectif_declare": 12,
    }
    r2 = client.post(f"{BASE}/pnpi/operateurs", json=payload, headers=H(token), timeout=15.0)
    if r2.status_code in (200, 201):
        return r2.json().get("id")
    print(f"  [WARN] impossible de creer un operateur (HTTP {r2.status_code}: {r2.text[:120]})")
    return None


# ── flux principal ATI ───────────────────────────────────────────────────


def run_ati_full_flow(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 1. Flux ATI complet (operateur -> instructeur -> directeur -> ministre) ===")
    t_admin = login(client, "admin")
    t_op = login(client, "operateur")
    t_inst = login(client, "instructeur")
    t_dir = login(client, "directeur")
    t_min = login(client, "ministre")

    if not all([t_admin, t_op, t_inst, t_dir, t_min]):
        audit.assert_("login des 5 roles cles", False, "au moins un login a echoue")
        return

    op_id = fetch_or_create_operateur(client, t_admin)
    if not op_id:
        audit.assert_("operateur disponible pour le test", False)
        return

    # 1.1  Creation par OPERATEUR
    payload = {
        "operateur_id": op_id,
        "type_activite": f"Smoke {uuid.uuid4().hex[:6]}",
        "secteur": "bois",
        "priorite": "normale",
        "sla_jours": 30,
        "observations": "ATI smoke test",
    }
    r = client.post(f"{BASE}/pnpi/ati", json=payload, headers=H(t_op), timeout=15.0)
    if not audit.status("POST /pnpi/ati (operateur)", r.status_code, (200, 201)):
        return
    ati = r.json()
    ati_id = ati["id"]
    numero = ati["numero_ati"]
    audit.assert_(
        f"ATI cree avec statut=soumis et etape=reception (numero={numero})",
        ati.get("statut") == "soumis" and ati.get("etape") == "reception",
        f"actual={ati.get('statut')}/{ati.get('etape')}",
    )

    # 1.2  Liste filtree pour INSTRUCTEUR (statut=soumis)
    r = client.get(f"{BASE}/pnpi/ati?statut=soumis&limit=200", headers=H(t_inst), timeout=15.0)
    if audit.status("GET /pnpi/ati?statut=soumis (instructeur)", r.status_code):
        items = r.json() if isinstance(r.json(), list) else []
        audit.assert_(
            "ATI nouvellement cree visible dans la file instructeur",
            any(a.get("id") == ati_id for a in items),
            f"items={len(items)}",
        )

    # 1.3  Transition soumis -> en_instruction (par INSTRUCTEUR)
    r = client.patch(
        f"{BASE}/pnpi/ati/{ati_id}/statut",
        json={"new_statut": "en_instruction", "note": "prise en charge"},
        headers=H(t_inst),
        timeout=15.0,
    )
    audit.status("PATCH soumis -> en_instruction (instructeur)", r.status_code)

    # 1.4  Transition en_instruction -> en_validation (par INSTRUCTEUR)
    r = client.patch(
        f"{BASE}/pnpi/ati/{ati_id}/statut",
        json={"new_statut": "en_validation", "note": "instruction OK"},
        headers=H(t_inst),
        timeout=15.0,
    )
    audit.status("PATCH en_instruction -> en_validation (instructeur)", r.status_code)

    # 1.5  Transition en_validation -> approuve (par DIRECTEUR ou MINISTRE)
    r = client.patch(
        f"{BASE}/pnpi/ati/{ati_id}/statut",
        json={
            "new_statut": "approuve",
            "note": "approuve par le ministre",
            "numero_reference_decision": "REF-SMOKE-001",
        },
        headers=H(t_min),
        timeout=15.0,
    )
    if audit.status("PATCH en_validation -> approuve (ministre)", r.status_code):
        approved = r.json()
        audit.assert_(
            "QR code data renseigne apres approbation",
            bool(approved.get("qr_code_data")),
            f"qr_code_data={approved.get('qr_code_data')}",
        )
        audit.assert_(
            "date_decision et date_expiration renseignees",
            approved.get("date_decision") and approved.get("date_expiration"),
        )

    # 1.6  Certificat PDF (deux variantes)
    r = client.get(f"{BASE}/pnpi/ati/{ati_id}/certificate.pdf", headers=H(t_min), timeout=20.0)
    audit.status("GET /pnpi/ati/{id}/certificate.pdf", r.status_code)
    if r.status_code == 200:
        audit.assert_(
            "certificate.pdf retourne du PDF (>1KB)",
            len(r.content) > 1024 and r.content[:4] == b"%PDF",
            f"size={len(r.content)} head={r.content[:4]!r}",
        )
    r = client.get(f"{BASE}/pnpi/ati/{ati_id}/pdf", headers=H(t_min), timeout=20.0)
    audit.status("GET /pnpi/ati/{id}/pdf (alias)", r.status_code)

    # 1.7  Historique
    r = client.get(f"{BASE}/pnpi/ati/{ati_id}/historique", headers=H(t_inst), timeout=15.0)
    if audit.status("GET /pnpi/ati/{id}/historique", r.status_code):
        hist = r.json() if isinstance(r.json(), list) else []
        audit.assert_(
            "historique contient au moins 4 transitions (creation + 3 changements)",
            len(hist) >= 4,
            f"transitions={len(hist)}",
        )

    # 1.8  Verification publique sans authentification
    r = client.get(f"{BASE}/pnpi/ati/verify/{numero}", timeout=15.0)
    if audit.status("GET /pnpi/ati/verify/{numero} (public, no auth)", r.status_code):
        body = r.json()
        audit.assert_(
            "verify retourne valid=True pour un ATI approuve non expire",
            body.get("valid") is True,
            f"body={body}",
        )

    # 1.9  Scope operateur : il peut lire son propre ATI
    r = client.get(f"{BASE}/pnpi/ati/{ati_id}", headers=H(t_op), timeout=15.0)
    audit.status("GET /pnpi/ati/{id} en tant qu'operateur proprietaire", r.status_code)


# ── flux inspection ──────────────────────────────────────────────────────


def run_inspection_flow(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 2. Flux inspection ===")
    t_insp = login(client, "inspecteur")
    t_admin = login(client, "admin")
    if not (t_insp and t_admin):
        audit.assert_("login inspecteur+admin", False)
        return

    op_id = fetch_or_create_operateur(client, t_admin)
    if not op_id:
        audit.assert_("operateur disponible pour inspection", False)
        return

    # Creation
    payload = {
        "operateur_id": op_id,
        "ati_id": None,
        "date_inspection": "2026-04-29T10:00:00",
        "statut_conformite": "conforme",
        "observations": "Smoke test inspection",
        "latitude": 0.4162,
        "longitude": 9.4673,
    }
    r = client.post(f"{BASE}/pnpi/inspections", json=payload, headers=H(t_insp), timeout=15.0)
    if not audit.status("POST /pnpi/inspections (inspecteur)", r.status_code, (200, 201)):
        return
    insp_id = r.json().get("id")

    # Photo upload (PNG minuscule synthese 1x1)
    png_1x1 = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d49444154789c63f8ffff3f0005fe02fea3a4adf30000000049454e44ae426082"
    )
    files = {"file": ("photo.png", png_1x1, "image/png")}
    data = {"latitude": "0.4162", "longitude": "9.4673", "description": "test"}
    r = client.post(
        f"{BASE}/pnpi/inspections/{insp_id}/photos",
        files=files,
        data=data,
        headers=H(t_insp),
        timeout=20.0,
    )
    audit.status("POST /pnpi/inspections/{id}/photos (avec GPS)", r.status_code, (200, 201))

    # GET liste inspection visible operateur (s'il existe + ati lie ?). On s'assure juste que
    # l'inspecteur peut relire la sienne.
    r = client.get(f"{BASE}/pnpi/inspections", headers=H(t_insp), timeout=15.0)
    audit.status("GET /pnpi/inspections (inspecteur)", r.status_code)


# ── flux recours ─────────────────────────────────────────────────────────


def run_appeals_flow(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 3. Flux recours apres rejet ===")
    t_admin = login(client, "admin")
    t_op = login(client, "operateur")
    t_inst = login(client, "instructeur")
    t_dir = login(client, "directeur")
    if not all([t_admin, t_op, t_inst, t_dir]):
        audit.assert_("login admin+operateur+instructeur+directeur", False)
        return

    op_id = fetch_or_create_operateur(client, t_admin)
    if not op_id:
        return

    # 1. Creer un nouvel ATI
    r = client.post(
        f"{BASE}/pnpi/ati",
        json={
            "operateur_id": op_id,
            "type_activite": f"Recours-{uuid.uuid4().hex[:5]}",
            "secteur": "bois",
            "priorite": "normale",
            "sla_jours": 30,
        },
        headers=H(t_op),
        timeout=15.0,
    )
    if not audit.status("POST /pnpi/ati (pour recours)", r.status_code, (200, 201)):
        return
    ati_id = r.json()["id"]

    # 2. Pousser jusqu'a rejet : soumis -> en_instruction -> rejete
    client.patch(
        f"{BASE}/pnpi/ati/{ati_id}/statut",
        json={"new_statut": "en_instruction"},
        headers=H(t_inst),
        timeout=15.0,
    )
    r = client.patch(
        f"{BASE}/pnpi/ati/{ati_id}/statut",
        json={"new_statut": "rejete", "motif_rejet": "Pieces incompletes (smoke)"},
        headers=H(t_inst),
        timeout=15.0,
    )
    if not audit.status("PATCH en_instruction -> rejete", r.status_code):
        return

    # 3. Operateur depose un recours
    motif = "Demande de reconsideration: les pieces complementaires sont fournies en annexe (smoke test)."
    r = client.post(
        f"{BASE}/pnpi/ati/{ati_id}/appeals",
        json={"motif": motif, "pieces_complementaires": ["doc1.pdf"]},
        headers=H(t_op),
        timeout=15.0,
    )
    if not audit.status("POST /pnpi/ati/{id}/appeals (operateur)", r.status_code, (200, 201)):
        # Bug d'audit dans appeals.py ? signaler.
        if r.status_code == 500:
            print(f"  [HINT] erreur 500: {r.text[:240]}")
        return
    appeal_id = r.json()["id"]

    # 4. Directeur decide (accepte) -> ATI doit revenir en en_instruction
    r = client.post(
        f"{BASE}/pnpi/ati/{ati_id}/appeals/{appeal_id}/decide",
        json={"decision": "accepte", "motif": "Recours fonde, reouverture de l'instruction."},
        headers=H(t_dir),
        timeout=15.0,
    )
    if not audit.status("POST .../appeals/{appeal_id}/decide (directeur)", r.status_code, (200, 201)):
        if r.status_code == 500:
            print(f"  [HINT] erreur 500: {r.text[:240]}")
        return

    # 5. Verifier que l'ATI est de nouveau en_instruction
    r = client.get(f"{BASE}/pnpi/ati/{ati_id}", headers=H(t_dir), timeout=15.0)
    if audit.status("GET ATI apres recours accepte", r.status_code):
        statut = r.json().get("statut")
        audit.assert_(
            "ATI repasse en 'en_instruction' apres recours accepte",
            statut == "en_instruction",
            f"actual={statut}",
        )


# ── RBAC cross-cutting ───────────────────────────────────────────────────


def run_rbac_checks(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 4. RBAC cross-cutting ===")
    t_op = login(client, "operateur")
    t_inst = login(client, "instructeur")
    if not (t_op and t_inst):
        audit.assert_("login operateur+instructeur", False)
        return

    # Operateur n'a PAS le droit d'appeler /admin/users
    r = client.get(f"{BASE}/admin/users", headers=H(t_op), timeout=10.0)
    audit.assert_(
        "Operateur sur /admin/users -> 401/403",
        r.status_code in (401, 403),
        f"status={r.status_code}",
    )

    # Instructeur peut lister TOUS les ATI (pas restreint au scope operateur)
    r = client.get(f"{BASE}/pnpi/ati?limit=100", headers=H(t_inst), timeout=10.0)
    audit.status("GET /pnpi/ati (instructeur, doit etre 200)", r.status_code)

    # IDOR: Operateur ne doit pas voir un ATI d'un autre operateur
    r = client.get(f"{BASE}/pnpi/ati?limit=200", headers=H(t_inst), timeout=10.0)
    if r.status_code == 200:
        items = r.json() if isinstance(r.json(), list) else []
        other = next(
            (a for a in items if a.get("created_by") and a.get("created_by") not in ("operateur", None)),
            None,
        )
        if other:
            r2 = client.get(f"{BASE}/pnpi/ati/{other['id']}", headers=H(t_op), timeout=10.0)
            audit.assert_(
                "Operateur sur ATI d'autrui -> 403/404",
                r2.status_code in (403, 404),
                f"status={r2.status_code}",
            )
            r3 = client.get(f"{BASE}/pnpi/ati/{other['id']}/historique", headers=H(t_op), timeout=10.0)
            audit.assert_(
                "Operateur sur historique ATI d'autrui -> 403/404",
                r3.status_code in (403, 404),
                f"status={r3.status_code}",
            )
        else:
            print("  [INFO] pas d'ATI d'autrui dans la base, IDOR test skip")


# ── Open Data publique ──────────────────────────────────────────────────


def run_open_data_checks(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 5. Open Data publique ===")
    for path in ("/open-data/stats", "/open-data/sectors", "/open-data/provinces"):
        r = client.get(f"{BASE}{path}", timeout=15.0)
        audit.status(f"GET {path} (no auth)", r.status_code)
        if r.status_code == 200:
            text = r.text.lower()
            audit.assert_(
                f"{path} ne contient pas le champ 'nif'",
                '"nif"' not in text and "'nif'" not in text,
            )

    # Rate-limit: 35 requetes (limite=30/60s) -> on doit voir au moins un 429
    print("  -> stress test rate-limit (35 req)")
    statuses = []
    for _ in range(35):
        rr = client.get(f"{BASE}/open-data/sectors", timeout=10.0)
        statuses.append(rr.status_code)
    audit.assert_(
        "rate-limit /open-data effectif (>= un 429 sur 35 requetes)",
        429 in statuses,
        f"statuses_distinct={sorted(set(statuses))}",
    )

    # k-anonymity: champ 'autres (groupes <5)' parfois present si donnees petites
    r = client.get(f"{BASE}/open-data/sectors", timeout=15.0)
    if r.status_code == 200 and isinstance(r.json(), list):
        labels = [str(x.get("secteur", "")) for x in r.json()]
        if any("autres" in label for label in labels):
            audit.assert_("k-anonymity: bucket 'autres' detecte (k=5)", True)
        else:
            print("  [INFO] pas de groupe <5, bucket k-anonymity non visible (normal si donnees nombreuses)")


# ── Captcha login ───────────────────────────────────────────────────────


def run_captcha_checks(client: httpx.Client, audit: Audit) -> None:
    print("\n=== 6. Captcha login (3 echecs -> captcha requis) ===")
    bogus_user = f"smoke_bogus_{uuid.uuid4().hex[:6]}"
    # 4 echecs deliberes (depasser le seuil = 3)
    for _i in range(4):
        client.post(
            f"{BASE}/auth/token",
            data={"username": bogus_user, "password": "wrong-password"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10.0,
        )

    # Apres 3+ echecs : /auth/token sans captcha doit retourner 403
    r = client.post(
        f"{BASE}/auth/token",
        data={"username": bogus_user, "password": "wrong-password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    audit.assert_(
        "/auth/token sans captcha apres seuil -> 403",
        r.status_code == 403,
        f"status={r.status_code} body={r.text[:160]}",
    )

    # /auth/captcha doit annoncer required=True + token + question
    r = client.get(f"{BASE}/auth/captcha", timeout=10.0)
    if audit.status("GET /auth/captcha", r.status_code):
        body = r.json()
        ok = body.get("required") is True and body.get("token") and body.get("question")
        audit.assert_(
            "/auth/captcha renvoie required=True + token + question",
            bool(ok),
            f"body={body}",
        )
        # Captcha incorrect -> 400
        if body.get("required"):
            tk = body["token"]
            r2 = client.post(
                f"{BASE}/auth/token",
                data={
                    "username": bogus_user,
                    "password": "wrong-password",
                    "captcha_token": tk,
                    "captcha_answer": "999",  # presque sur d'etre faux
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=10.0,
            )
            audit.assert_(
                "/auth/token avec captcha errone -> 400",
                r2.status_code == 400,
                f"status={r2.status_code}",
            )


# ── main ────────────────────────────────────────────────────────────────


def main() -> int:
    audit = Audit()
    print(f"# Smoke ATI flow contre {BASE}")
    try:
        with httpx.Client(follow_redirects=False) as client:
            # ping
            try:
                r = client.get(f"{BASE}/health", timeout=5.0)
                if r.status_code != 200:
                    print(f"!! Backend ne repond pas (HTTP {r.status_code}). Demarrer FastAPI avant.")
                    return 2
            except Exception as exc:
                print(f"!! Backend injoignable a {BASE} : {exc}")
                return 2

            run_ati_full_flow(client, audit)
            run_inspection_flow(client, audit)
            run_appeals_flow(client, audit)
            run_rbac_checks(client, audit)
            run_open_data_checks(client, audit)
            run_captcha_checks(client, audit)

    finally:
        print(f"\n=== Resume : {audit.checks - audit.fails}/{audit.checks} OK, {audit.fails} echec(s) ===")
    return 0 if audit.fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

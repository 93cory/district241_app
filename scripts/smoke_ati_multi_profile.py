from __future__ import annotations

import base64
import json
import mimetypes
import os
import tempfile
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_URL = os.getenv("PNPI_SMOKE_BASE_URL", "http://localhost:8000")


def load_env_password(username: str) -> str:
    env_key = f"PNPI_{username.upper()}_PASSWORD"
    if env_key in os.environ:
        return os.environ[env_key]

    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if not line or line.strip().startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == env_key:
                return value.strip()
    raise RuntimeError(f"Mot de passe manquant: {env_key}")


def request(
    method: str,
    path: str,
    *,
    token: str | None = None,
    json_body: dict | None = None,
    form_body: dict | None = None,
    headers: dict[str, str] | None = None,
) -> dict | list:
    body: bytes | None = None
    final_headers = dict(headers or {})
    if token:
        final_headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        final_headers["Content-Type"] = "application/json"
    elif form_body is not None:
        body = urllib.parse.urlencode(form_body).encode("utf-8")
        final_headers["Content-Type"] = "application/x-www-form-urlencoded"

    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers=final_headers,
        method=method,
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))


def upload_pdf(token: str, ati_id: str, doc_type: str) -> None:
    boundary = f"----pnpi-{uuid.uuid4().hex}"
    content = f"%PDF-1.4\n% PNPI smoke {doc_type}\n".encode("ascii")
    filename = f"{doc_type}.pdf"
    parts = [
        (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="type_document"\r\n\r\n'
            f"{doc_type}\r\n"
        ).encode("utf-8"),
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: {mimetypes.guess_type(filename)[0] or 'application/pdf'}\r\n\r\n"
        ).encode("utf-8"),
        content,
        b"\r\n",
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    body = b"".join(parts)
    req = urllib.request.Request(
        f"{BASE_URL}/pnpi/ati/{urllib.parse.quote(ati_id)}/documents",
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(body)),
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as response:
        if response.status != 201:
            raise RuntimeError(f"Upload {doc_type} HTTP {response.status}")


def main() -> None:
    def login(username: str) -> str:
        token = request(
            "POST",
            "/auth/token",
            form_body={"username": username, "password": load_env_password(username)},
        )
        return str(token["access_token"])

    tokens = {role: login(role) for role in ["operateur", "instructeur", "directeur", "ministre"]}

    operateurs = request("GET", "/pnpi/operateurs?limit=1", token=tokens["operateur"])
    first_operateur = operateurs["items"][0] if isinstance(operateurs, dict) else operateurs[0]
    activity = f"Suivi complet ATI multi-profils {int(time.time())}"
    ati = request(
        "POST",
        "/pnpi/ati",
        token=tokens["operateur"],
        json_body={
            "operateur_id": first_operateur["id"],
            "type_activite": activity,
            "secteur": "bois",
            "priorite": "normale",
            "observations": "Smoke test suivi complet multi-profils",
        },
    )
    ati_id = ati["id"]
    print(f"CREATE {ati_id} {ati['numero_ati']} {ati['statut']}")

    for role in ["operateur", "instructeur"]:
        detail = request("GET", f"/pnpi/ati/{ati_id}", token=tokens[role])
        print(f"READ_{role.upper()} {detail['statut']}")

    ati = request(
        "PATCH",
        f"/pnpi/ati/{ati_id}/statut",
        token=tokens["instructeur"],
        json_body={"new_statut": "en_instruction", "note": "Prise en charge smoke test"},
    )
    print(f"TRANSITION_1 {ati['statut']}")

    for doc_type in ["statuts", "bilan", "plan_site", "certification"]:
        upload_pdf(tokens["operateur"], ati_id, doc_type)
        print(f"UPLOAD_{doc_type} 201")

    summary = request("GET", f"/pnpi/ati/{ati_id}/documents/summary", token=tokens["instructeur"])
    print(f"DOCS_COMPLETE {summary['dossier_complet']} missing={','.join(summary['types_manquants'])}")

    ati = request(
        "PATCH",
        f"/pnpi/ati/{ati_id}/statut",
        token=tokens["instructeur"],
        json_body={"new_statut": "en_validation", "note": "Dossier complet soumis validation smoke test"},
    )
    print(f"TRANSITION_2 {ati['statut']}")

    png = base64.b64encode(
        base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII="
        )
    ).decode("ascii")
    signature = request(
        "POST",
        f"/pnpi/ati/{ati_id}/sign-decision",
        token=tokens["directeur"],
        json_body={"signature_dataurl": f"data:image/png;base64,{png}"},
    )
    print(f"SIGN {signature['status']} {signature['signed_by']}")

    ati = request(
        "PATCH",
        f"/pnpi/ati/{ati_id}/statut",
        token=tokens["directeur"],
        json_body={"new_statut": "approuve", "note": "Approbation smoke test", "numero_reference_decision": "DEC-SMOKE"},
    )
    print(f"TRANSITION_3 {ati['statut']} qr={bool(ati.get('qr_code_data'))}")

    for role in ["ministre", "operateur"]:
        detail = request("GET", f"/pnpi/ati/{ati_id}", token=tokens[role])
        print(f"READ_{role.upper()}_FINAL {detail['statut']}")

    history = request("GET", f"/pnpi/ati/{ati_id}/historique", token=tokens["ministre"])
    print(f"HISTORIQUE_COUNT {len(history)}")


if __name__ == "__main__":
    with tempfile.TemporaryDirectory():
        main()

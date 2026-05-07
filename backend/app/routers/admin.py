"""PNPI / PNPI · Endpoints d'administration (utilisateurs, notifications)."""

from __future__ import annotations

from datetime import UTC
from datetime import datetime as dt

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import (
    Role,
    User,
    csv_to_roles,
    get_password_hash,
    require_roles,
    roles_to_csv,
    validate_password_policy,
)
from ..core.sms import SMS_ENABLED, send_sms
from ..database import get_db, now_utc
from ..models.core import AuditEventORM, NotificationORM, UserAccountORM

router = APIRouter(tags=["Administration"])


def _to_user_account_read(row: UserAccountORM) -> dict:
    return {
        "username": row.username,
        "full_name": row.full_name,
        "roles": csv_to_roles(row.roles_csv),
        "is_active": row.is_active,
        "created_at": row.created_at,
        "province": row.province,
    }


def _to_notification_read(row: NotificationORM) -> dict:
    target_role = row.target_role if row.target_role in Role._value2member_map_ else None
    return {
        "id": row.id,
        "target_role": target_role,
        "title": row.title,
        "message": row.message,
        "severity": row.severity,
        "created_at": row.created_at,
        "is_read": row.is_read,
    }


@router.get("/admin/users")
async def list_user_accounts(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(UserAccountORM).order_by(UserAccountORM.created_at.desc())).scalars().all()
    return [_to_user_account_read(row) for row in rows]


@router.post("/admin/users", status_code=status.HTTP_201_CREATED)
async def create_user_account(
    payload: dict,
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    # Validation manuelle (payload: dict ne fait pas la validation pydantic)
    required = {"username", "password", "full_name"}
    missing = required - set(payload.keys() if isinstance(payload, dict) else [])
    if missing:
        raise HTTPException(status_code=422, detail=f"Champs requis manquants: {sorted(missing)}")

    existing = db.get(UserAccountORM, payload["username"])
    if existing:
        raise HTTPException(status_code=409, detail="Utilisateur deja existant.")
    policy_error = validate_password_policy(payload["password"])
    if policy_error:
        raise HTTPException(status_code=400, detail=policy_error)

    roles = payload.get("roles", [])
    if roles and isinstance(roles[0], str):
        roles = [Role(r) for r in roles if r in Role._value2member_map_]

    row = UserAccountORM(
        username=payload["username"],
        full_name=payload["full_name"],
        roles_csv=roles_to_csv(roles),
        hashed_password=get_password_hash(payload["password"]),
        is_active=payload.get("is_active", True),
        created_at=now_utc(),
        failed_login_attempts=0,
        locked_until=None,
        password_updated_at=now_utc(),
        province=payload.get("province"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_user_account_read(row)


@router.patch("/admin/users/{username}")
async def update_user_account(
    username: str,
    payload: dict,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    row = db.get(UserAccountORM, username)
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if "full_name" in payload:
        row.full_name = payload["full_name"]

    if "roles" in payload:
        roles = payload["roles"]
        if roles and isinstance(roles[0], str):
            roles = [Role(r) for r in roles if r in Role._value2member_map_]
        row.roles_csv = roles_to_csv(roles)

    if "is_active" in payload:
        row.is_active = bool(payload["is_active"])

    if "province" in payload:
        row.province = payload["province"] or None

    if payload.get("password"):
        policy_error = validate_password_policy(payload["password"])
        if policy_error:
            raise HTTPException(status_code=400, detail=policy_error)
        row.hashed_password = get_password_hash(payload["password"])
        row.password_updated_at = now_utc()

    write_audit_event(
        db,
        actor=current_user.username,
        action="admin.update_user",
        target=username,
        details=f"fields={list(payload.keys())}",
    )
    db.commit()
    db.refresh(row)
    return _to_user_account_read(row)


@router.delete("/admin/users/{username}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    username: str,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Impossible de supprimer votre propre compte.")
    row = db.get(UserAccountORM, username)
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    db.delete(row)
    write_audit_event(db, actor=current_user.username, action="admin.delete_user", target=username, details="")
    db.commit()


@router.get("/admin/notifications")
async def list_notifications(
    current_user: User = Depends(
        require_roles(
            Role.admin,
            Role.ministre,
            Role.directeur,
            Role.instructeur,
            Role.inspecteur,
            Role.operateur,
        )
    ),
    db: Session = Depends(get_db),
):
    role_values = [role.value for role in current_user.roles]
    rows = db.execute(select(NotificationORM).order_by(NotificationORM.created_at.desc())).scalars().all()
    filtered = [
        row
        for row in rows
        if row.target_role is None
        or row.target_role in role_values
        or Role.ministre.value in role_values
        or Role.admin.value in role_values
    ]
    return [_to_notification_read(row) for row in filtered]


@router.post("/admin/notifications", status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    import uuid

    target_role_raw = payload.get("target_role")
    target_role_value = None
    if target_role_raw:
        if isinstance(target_role_raw, Role):
            target_role_value = target_role_raw.value
        elif isinstance(target_role_raw, str) and target_role_raw in Role._value2member_map_:
            target_role_value = target_role_raw

    row = NotificationORM(
        id=f"N-{uuid.uuid4().hex[:8].upper()}",
        target_role=target_role_value,
        title=payload["title"],
        message=payload["message"],
        severity=payload.get("severity", "info"),
        created_at=now_utc(),
        is_read=False,
    )
    db.add(row)
    write_audit_event(
        db,
        actor=current_user.username,
        action="admin.create_notification",
        target=row.id,
        details=f"severity={row.severity}; target_role={row.target_role or 'all'}",
    )
    db.commit()
    db.refresh(row)
    return _to_notification_read(row)


@router.patch("/admin/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    payload: dict,
    current_user: User = Depends(
        require_roles(
            Role.admin,
            Role.ministre,
            Role.directeur,
            Role.instructeur,
            Role.inspecteur,
            Role.operateur,
        )
    ),
    db: Session = Depends(get_db),
):
    row = db.get(NotificationORM, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notification introuvable.")

    role_values = {role.value for role in current_user.roles}
    is_ministere_or_admin = Role.ministre.value in role_values or Role.admin.value in role_values
    if not is_ministere_or_admin and row.target_role is not None and row.target_role not in role_values:
        raise HTTPException(status_code=403, detail="Acces refuse pour cette notification.")

    row.is_read = payload.get("is_read", True)
    write_audit_event(
        db,
        actor=current_user.username,
        action="admin.mark_notification_read",
        target=row.id,
        details=f"is_read={row.is_read}; target_role={row.target_role or 'all'}",
    )
    db.commit()
    db.refresh(row)
    return _to_notification_read(row)


@router.post("/admin/users/bulk-import")
async def bulk_import_users(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    """Import users from CSV. Columns: username,full_name,roles,password"""
    import csv
    import io

    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    created = []
    errors = []

    for i, row in enumerate(reader, start=2):
        username = (row.get("username") or "").strip()
        full_name = (row.get("full_name") or "").strip()
        roles_raw = (row.get("roles") or "").strip()
        password = (row.get("password") or "").strip()

        if not username or not full_name or not roles_raw or not password:
            errors.append({"line": i, "username": username, "error": "Champs obligatoires manquants"})
            continue

        # Validate roles
        valid_roles = {"admin", "ministre", "directeur", "instructeur", "inspecteur", "operateur"}
        user_roles = [r.strip() for r in roles_raw.split(",") if r.strip() in valid_roles]
        if not user_roles:
            errors.append({"line": i, "username": username, "error": f"Roles invalides: {roles_raw}"})
            continue

        # Validate password
        policy_error = validate_password_policy(password)
        if policy_error:
            errors.append({"line": i, "username": username, "error": policy_error})
            continue

        # Check duplicate
        existing = db.get(UserAccountORM, username)
        if existing:
            errors.append({"line": i, "username": username, "error": "Utilisateur existe deja"})
            continue

        # Create
        row_obj = UserAccountORM(
            username=username,
            full_name=full_name,
            roles_csv=",".join(sorted(user_roles)),
            hashed_password=get_password_hash(password),
            is_active=True,
            created_at=now_utc(),
        )
        db.add(row_obj)
        created.append(username)

    if created:
        write_audit_event(
            db,
            actor=current_user.username,
            action="admin.bulk_import",
            target=f"{len(created)} users",
            details=f"Imported: {', '.join(created[:10])}",
        )
        db.commit()

    return {
        "created": len(created),
        "errors": len(errors),
        "created_users": created,
        "error_details": errors,
    }


@router.get("/admin/audit-logs")
async def search_audit_logs(
    actor: str | None = Query(None),
    action: str | None = Query(None),
    target: str | None = Query(None),
    date_start: str | None = Query(None),
    date_end: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Search and filter audit log events."""
    query = select(AuditEventORM)

    if actor:
        query = query.where(AuditEventORM.actor.ilike(f"%{actor}%"))
    if action:
        query = query.where(AuditEventORM.action.ilike(f"%{action}%"))
    if target:
        query = query.where(AuditEventORM.target.ilike(f"%{target}%"))
    if date_start:
        start = dt.fromisoformat(date_start).replace(tzinfo=UTC)
        query = query.where(AuditEventORM.timestamp >= start)
    if date_end:
        end = dt.fromisoformat(date_end).replace(tzinfo=UTC)
        query = query.where(AuditEventORM.timestamp <= end)

    total = db.execute(select(func.count()).select_from(query.subquery())).scalar() or 0

    events = db.execute(query.order_by(AuditEventORM.timestamp.desc()).offset(skip).limit(limit)).scalars().all()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "events": [
            {
                "id": e.id,
                "actor": e.actor,
                "action": e.action,
                "target": e.target,
                "details": e.details,
                "created_at": e.timestamp.isoformat(),
            }
            for e in events
        ],
    }


@router.post("/admin/send-sms")
async def admin_send_sms(
    data: dict,
    _: User = Depends(require_roles(Role.admin)),
):
    """Send a test SMS (admin only)."""
    to = data.get("to", "")
    message = data.get("message", "")
    if not to or not message:
        raise HTTPException(400, "Numero et message requis.")
    result = send_sms(to, message)
    return {"sms_enabled": SMS_ENABLED, **result}


# ---------------------------------------------------------------------------
# Simulateur de role (impersonation)
# ---------------------------------------------------------------------------

RACI_DEFAULT = {
    "roles": ["Operateur", "Instructeur", "Directeur", "Ministre", "Inspecteur", "Admin"],
    "stages": [
        {
            "stage": "Soumission ATI",
            "raci": {
                "Operateur": "R",
                "Instructeur": "I",
                "Directeur": "I",
                "Ministre": "",
                "Inspecteur": "",
                "Admin": "I",
            },
        },
        {
            "stage": "Instruction dossier",
            "raci": {
                "Operateur": "I",
                "Instructeur": "R",
                "Directeur": "C",
                "Ministre": "",
                "Inspecteur": "",
                "Admin": "",
            },
        },
        {
            "stage": "Validation technique",
            "raci": {
                "Operateur": "I",
                "Instructeur": "A",
                "Directeur": "R",
                "Ministre": "I",
                "Inspecteur": "C",
                "Admin": "",
            },
        },
        {
            "stage": "Decision finale",
            "raci": {
                "Operateur": "I",
                "Instructeur": "I",
                "Directeur": "A",
                "Ministre": "R",
                "Inspecteur": "",
                "Admin": "I",
            },
        },
        {
            "stage": "Emission certificat",
            "raci": {
                "Operateur": "I",
                "Instructeur": "R",
                "Directeur": "A",
                "Ministre": "",
                "Inspecteur": "",
                "Admin": "",
            },
        },
        {
            "stage": "Inspection conformite",
            "raci": {
                "Operateur": "I",
                "Instructeur": "C",
                "Directeur": "A",
                "Ministre": "I",
                "Inspecteur": "R",
                "Admin": "",
            },
        },
        {
            "stage": "Rapport inspection",
            "raci": {
                "Operateur": "I",
                "Instructeur": "I",
                "Directeur": "A",
                "Ministre": "I",
                "Inspecteur": "R",
                "Admin": "",
            },
        },
    ],
}


def _raci_path():
    from pathlib import Path

    return Path(__file__).resolve().parents[1] / "data" / "raci.json"


@router.get("/admin/raci", summary="Charger la matrice RACI (persistance fichier)")
async def get_raci(_: User = Depends(require_roles(Role.admin, Role.directeur, Role.ministre))):
    import json

    p = _raci_path()
    if not p.exists():
        return RACI_DEFAULT
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return RACI_DEFAULT


@router.put("/admin/raci", summary="Mettre a jour la matrice RACI (admin uniquement)")
async def update_raci(
    data: dict,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    import json

    if "roles" not in data or "stages" not in data:
        raise HTTPException(400, "Format invalide : roles + stages requis.")

    p = _raci_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    write_audit_event(
        db,
        actor=current_user.username,
        action="admin.raci.update",
        target="raci_matrix",
        details=f"{len(data.get('stages', []))} etapes",
    )
    db.commit()
    return {"status": "ok"}


@router.get("/admin/backups", summary="Lister les sauvegardes DB disponibles")
async def list_backups(
    _: User = Depends(require_roles(Role.admin)),
):
    """Liste les fichiers de sauvegarde sur le disque local (backups/)."""
    import os
    from pathlib import Path

    backup_dir = Path(os.getenv("PNPI_BACKUP_DIR", "backups"))
    if not backup_dir.exists():
        return {"backups": [], "dir": str(backup_dir), "s3_enabled": False}
    files = []
    for f in sorted(backup_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if f.is_file():
            files.append(
                {
                    "name": f.name,
                    "size_bytes": f.stat().st_size,
                    "modified_at": dt.fromtimestamp(f.stat().st_mtime, tz=UTC).isoformat(),
                }
            )
    return {
        "backups": files[:50],
        "dir": str(backup_dir),
        "s3_enabled": bool(os.getenv("PNPI_S3_ENDPOINT")),
    }


@router.post("/admin/backups/create", summary="Declencher une sauvegarde")
async def create_backup(
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Lance une sauvegarde via le script backup_s3.py (si configure S3) ou locale."""
    import os
    import subprocess
    from pathlib import Path

    backup_dir = Path(os.getenv("PNPI_BACKUP_DIR", "backups"))
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = now_utc().strftime("%Y%m%d_%H%M%S")

    db_url = os.getenv("PNPI_DATABASE_URL", "sqlite:///./pnpi.db")
    # SQLite : copie simple du fichier
    if db_url.startswith("sqlite:///"):
        src = db_url.replace("sqlite:///", "").replace("./", "")
        dest = backup_dir / f"pnpi_{timestamp}.db"
        try:
            import shutil

            shutil.copy2(src, dest)
            write_audit_event(
                db,
                actor=current_user.username,
                action="admin.backup.create",
                target=dest.name,
                details=f"Sauvegarde locale : {dest.name}",
            )
            db.commit()
            return {
                "status": "ok",
                "filename": dest.name,
                "size_bytes": dest.stat().st_size,
                "path": str(dest),
            }
        except Exception as exc:
            raise HTTPException(500, f"Erreur sauvegarde : {exc}")

    # PostgreSQL : delegue au script backup_s3
    if os.getenv("PNPI_S3_ENDPOINT"):
        try:
            import sys as _sys

            result = subprocess.run(
                [_sys.executable, "scripts/backup_s3.py", "backup"],
                capture_output=True,
                text=True,
                timeout=300,
            )
            write_audit_event(
                db,
                actor=current_user.username,
                action="admin.backup.create",
                target="s3",
                details=f"Sauvegarde S3 : {result.returncode}",
            )
            db.commit()
            return {
                "status": "ok" if result.returncode == 0 else "error",
                "output": result.stdout[-500:],
                "error": result.stderr[-500:] if result.returncode != 0 else None,
            }
        except Exception as exc:
            raise HTTPException(500, f"Erreur backup S3 : {exc}")

    raise HTTPException(400, "Aucun backend de sauvegarde configure (ni SQLite local, ni S3).")


@router.post("/admin/impersonate/{username}", summary="Simuler un autre utilisateur (admin uniquement)")
async def impersonate_user(
    username: str,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Genere un access_token temporaire (30 min) pour se connecter comme {username}.
    Action integralement tracee dans l'audit pour conformite.
    """
    from datetime import timedelta

    from ..core.auth import create_access_token, user_from_row

    target = db.get(UserAccountORM, username)
    if not target:
        raise HTTPException(status_code=404, detail=f"Utilisateur {username} introuvable.")
    if not target.is_active:
        raise HTTPException(status_code=400, detail=f"Utilisateur {username} inactif.")
    if username == current_user.username:
        raise HTTPException(status_code=400, detail="Impossible de se simuler soi-meme.")

    write_audit_event(
        db,
        actor=current_user.username,
        action="admin.impersonate.start",
        target=username,
        details=f"Admin {current_user.username} commence une simulation du compte {username}",
    )
    db.commit()

    target_user = user_from_row(target)
    token = create_access_token(
        data={
            "sub": target_user.username,
            "roles": [r.value for r in target_user.roles],
            "impersonated_by": current_user.username,
        },
        expires_delta=timedelta(minutes=30),
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 30 * 60,
        "impersonated_by": current_user.username,
        "impersonated_user": {
            "username": target_user.username,
            "full_name": target_user.full_name,
            "roles": [r.value for r in target_user.roles],
        },
    }

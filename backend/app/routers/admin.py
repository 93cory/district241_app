"""PNPI / PNPI — Endpoints d'administration (utilisateurs, notifications)."""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles, get_password_hash, validate_password_policy, roles_to_csv, csv_to_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import NotificationORM, UserAccountORM


router = APIRouter(tags=["Administration"])


def _to_user_account_read(row: UserAccountORM) -> dict:
    return {
        "username": row.username,
        "full_name": row.full_name,
        "roles": csv_to_roles(row.roles_csv),
        "is_active": row.is_active,
        "created_at": row.created_at,
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
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
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

    if "password" in payload and payload["password"]:
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
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.operateur, Role.inspecteur)),
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
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    row = db.get(NotificationORM, notification_id)
    if not row:
        raise HTTPException(status_code=404, detail="Notification introuvable.")

    role_values = {role.value for role in current_user.roles}
    is_ministere_or_admin = Role.ministre.value in role_values or Role.admin.value in role_values
    if not is_ministere_or_admin:
        if row.target_role is not None and row.target_role not in role_values:
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

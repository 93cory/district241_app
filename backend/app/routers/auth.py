"""PNPI / PNPI — Endpoints d'authentification."""
from __future__ import annotations

import uuid
from typing import Dict

from fastapi import APIRouter, Depends, Form, HTTPException, Query, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select
import pyotp

from ..core.auth import (
    User,
    Token,
    RefreshTokenRequest,
    authenticate_user,
    create_access_token,
    issue_refresh_token,
    get_current_user,
    token_digest,
    fake_users_db,
    user_from_row,
    verify_password,
    get_password_hash,
    validate_password_policy,
)
from ..core.audit import write_audit_event
from ..core.digest import generate_daily_digest
from ..core.badges import compute_badges
from ..database import get_db, now_utc, as_utc
from ..config import settings
from ..models.core import LoginHistoryORM, RefreshTokenORM, UserAccountORM


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first = forwarded_for.split(",")[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


router = APIRouter(tags=["Authentification"])


@router.post("/auth/token")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    from ..main import enforce_rate_limit, log_action, AUTH_RATE_LIMIT_MAX_REQUESTS

    client_ip = get_client_ip(request)
    enforce_rate_limit(key=f"auth:token:{client_ip}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)
    user, error_detail = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        failed_record = LoginHistoryORM(
            id=str(uuid.uuid4()),
            username=form_data.username,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent", "")[:500],
            method="password",
            success=False,
            failure_reason="Invalid credentials",
        )
        db.add(failed_record)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail or "Identifiants invalides.",
        )

    # Check if user has 2FA enabled — if so, require TOTP verification
    row = db.get(UserAccountORM, user.username)
    if row and row.totp_enabled:
        return {"requires_2fa": True, "username": user.username, "message": "Code 2FA requis."}

    access_token = create_access_token(
        {"sub": user.username, "roles": [role.value for role in user.roles]}
    )
    refresh_token = issue_refresh_token(db, username=user.username, client_ip=client_ip)
    login_record = LoginHistoryORM(
        id=str(uuid.uuid4()),
        username=user.username,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
        method="password",
        success=True,
    )
    db.add(login_record)
    write_audit_event(
        db,
        actor=user.username,
        action="auth.login",
        target=user.username,
        details=f"Connexion reussie (ip={client_ip})",
    )
    db.commit()
    log_action(user.username, "connexion", "Authentification reussie")
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/token/2fa", response_model=Token)
async def login_with_2fa(
    request: Request,
    username: str = Form(...),
    totp_code: str = Form(...),
    db: Session = Depends(get_db),
) -> Token:
    from ..main import enforce_rate_limit, log_action, AUTH_RATE_LIMIT_MAX_REQUESTS

    client_ip = get_client_ip(request)
    enforce_rate_limit(key=f"auth:token2fa:{client_ip}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)

    row = db.get(UserAccountORM, username)
    if not row or not row.totp_enabled or not row.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur invalide ou 2FA non activee.",
        )

    totp = pyotp.TOTP(row.totp_secret)
    if not totp.verify(totp_code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code 2FA invalide.",
        )

    user = user_from_row(row)
    access_token = create_access_token(
        {"sub": user.username, "roles": [role.value for role in user.roles]}
    )
    refresh_token = issue_refresh_token(db, username=user.username, client_ip=client_ip)
    write_audit_event(
        db,
        actor=user.username,
        action="auth.login_2fa",
        target=user.username,
        details=f"Connexion 2FA reussie (ip={client_ip})",
    )
    db.commit()
    log_action(user.username, "connexion_2fa", "Authentification 2FA reussie")
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/auth/me")
async def read_current_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    row = db.get(UserAccountORM, current_user.username)
    totp_enabled = bool(row and row.totp_enabled)
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "roles": [r.value for r in current_user.roles],
        "totp_enabled": totp_enabled,
    }


@router.post("/auth/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> Token:
    from ..main import enforce_rate_limit, AUTH_RATE_LIMIT_MAX_REQUESTS

    client_ip = get_client_ip(request)
    enforce_rate_limit(key=f"auth:refresh:{client_ip}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)
    raw_token = payload.refresh_token.strip()
    if not raw_token:
        raise HTTPException(status_code=400, detail="refresh_token manquant.")

    token_hash = token_digest(raw_token)
    row = db.execute(
        select(RefreshTokenORM).where(RefreshTokenORM.token_hash == token_hash)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=401, detail="Refresh token invalide.")
    if row.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Refresh token revoque.")
    expires_at = as_utc(row.expires_at)
    if expires_at and expires_at <= now_utc():
        row.revoked_at = now_utc()
        db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expire.")

    row.revoked_at = now_utc()
    user_row = db.get(UserAccountORM, row.username)
    if user_row and not user_row.is_active:
        db.commit()
        raise HTTPException(status_code=403, detail="Compte desactive.")
    from ..core.auth import get_fake_users_db
    user = user_from_row(user_row) if user_row else get_fake_users_db().get(row.username)
    if not user:
        db.commit()
        raise HTTPException(status_code=401, detail="Utilisateur introuvable.")

    access_token = create_access_token(
        {"sub": user.username, "roles": [role.value for role in user.roles]}
    )
    new_refresh_token = issue_refresh_token(db, username=user.username, client_ip=client_ip)
    write_audit_event(
        db,
        actor=user.username,
        action="auth.refresh",
        target=user.username,
        details=f"Nouveau token emis (ip={client_ip})",
    )
    db.commit()
    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/auth/logout")
async def logout(
    payload: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    raw_token = payload.refresh_token.strip()
    if raw_token:
        token_hash = token_digest(raw_token)
        row = db.execute(
            select(RefreshTokenORM).where(RefreshTokenORM.token_hash == token_hash)
        ).scalar_one_or_none()
        if row and row.username == current_user.username and row.revoked_at is None:
            row.revoked_at = now_utc()
    write_audit_event(
        db,
        actor=current_user.username,
        action="auth.logout",
        target=current_user.username,
        details="Session deconnectee",
    )
    db.commit()
    return {"status": "ok"}


@router.post("/auth/change-password")
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(UserAccountORM, current_user.username)
    if not row:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    if not verify_password(current_password, row.hashed_password):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect.")

    policy_error = validate_password_policy(new_password)
    if policy_error:
        raise HTTPException(status_code=400, detail=policy_error)

    row.hashed_password = get_password_hash(new_password)
    row.password_updated_at = now_utc()

    write_audit_event(
        db,
        actor=current_user.username,
        action="password_change",
        target=current_user.username,
        details="Password changed successfully",
    )
    db.commit()

    return {"message": "Mot de passe modifie avec succes."}


@router.get("/auth/me/login-history")
async def get_login_history(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.execute(
        select(LoginHistoryORM)
        .where(LoginHistoryORM.username == current_user.username)
        .order_by(LoginHistoryORM.created_at.desc())
        .limit(limit)
    ).scalars().all()

    return {
        "history": [
            {
                "id": r.id,
                "ip_address": r.ip_address,
                "user_agent": r.user_agent,
                "method": r.method,
                "success": r.success,
                "failure_reason": r.failure_reason,
                "created_at": r.created_at.isoformat(),
            }
            for r in records
        ]
    }


@router.get("/auth/me/preferences")
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models.core import NotificationPreferenceORM
    prefs = db.get(NotificationPreferenceORM, current_user.username)
    if not prefs:
        return {
            "email_ati_approved": True,
            "email_ati_rejected": True,
            "email_sla_alert": True,
            "email_inspection": True,
            "email_weekly_briefing": True,
            "push_enabled": True,
        }
    return {
        "email_ati_approved": prefs.email_ati_approved,
        "email_ati_rejected": prefs.email_ati_rejected,
        "email_sla_alert": prefs.email_sla_alert,
        "email_inspection": prefs.email_inspection,
        "email_weekly_briefing": prefs.email_weekly_briefing,
        "push_enabled": prefs.push_enabled,
    }


@router.patch("/auth/me/preferences")
async def update_preferences(
    prefs_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models.core import NotificationPreferenceORM
    prefs = db.get(NotificationPreferenceORM, current_user.username)
    if not prefs:
        prefs = NotificationPreferenceORM(username=current_user.username)
        db.add(prefs)

    allowed = {"email_ati_approved", "email_ati_rejected", "email_sla_alert", "email_inspection", "email_weekly_briefing", "push_enabled"}
    for key, value in prefs_data.items():
        if key in allowed and isinstance(value, bool):
            setattr(prefs, key, value)

    db.commit()
    return {"status": "ok", "message": "Preferences mises a jour."}


@router.get("/auth/me/digest")
async def get_my_digest(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return generate_daily_digest(db, current_user.username, [r.value for r in current_user.roles])


@router.get("/auth/me/badges")
async def get_my_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badges = compute_badges(db, current_user.username)
    earned_count = sum(1 for b in badges if b["earned"])
    return {"badges": badges, "earned": earned_count, "total": len(badges)}

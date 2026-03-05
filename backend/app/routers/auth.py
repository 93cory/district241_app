"""PNPI / PNPI — Endpoints d'authentification."""
from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

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
)
from ..core.audit import write_audit_event
from ..database import get_db, now_utc, as_utc
from ..config import settings
from ..models.core import RefreshTokenORM, UserAccountORM


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


@router.post("/auth/token", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> Token:
    from ..main import enforce_rate_limit, log_action, AUTH_RATE_LIMIT_MAX_REQUESTS

    client_ip = get_client_ip(request)
    enforce_rate_limit(key=f"auth:token:{client_ip}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)
    user, error_detail = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail or "Identifiants invalides.",
        )
    access_token = create_access_token(
        {"sub": user.username, "roles": [role.value for role in user.roles]}
    )
    refresh_token = issue_refresh_token(db, username=user.username, client_ip=client_ip)
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


@router.get("/auth/me", response_model=User)
async def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


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

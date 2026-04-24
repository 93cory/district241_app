"""PNPI / PNPI · Endpoints de gestion 2FA (TOTP)."""
from __future__ import annotations

import hashlib
import io
import json
import secrets
from typing import List, Optional

import pyotp
import qrcode
import qrcode.image.svg
from fastapi import APIRouter, Depends, Form, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.auth import Role, User, get_current_user, create_access_token, issue_refresh_token, user_from_row
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import UserAccountORM

router = APIRouter(prefix="/auth/2fa", tags=["2FA"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class TOTPSetupResponse(BaseModel):
    secret: str
    provisioning_uri: str
    qr_svg: str


class TOTPConfirmRequest(BaseModel):
    code: str


class TOTPConfirmResponse(BaseModel):
    enabled: bool
    backup_codes: Optional[List[str]] = None


class TOTPVerifyRequest(BaseModel):
    username: str
    code: str


class TOTPVerifyResponse(BaseModel):
    valid: bool


class TOTPDisableRequest(BaseModel):
    code: Optional[str] = None


class TOTPDisableResponse(BaseModel):
    disabled: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_qr_svg(provisioning_uri: str) -> str:
    """Generate a QR code as an SVG string from a provisioning URI."""
    factory = qrcode.image.svg.SvgPathImage
    img = qrcode.make(provisioning_uri, image_factory=factory)
    buffer = io.BytesIO()
    img.save(buffer)
    return buffer.getvalue().decode("utf-8")


def _get_user_row(db: Session, username: str) -> UserAccountORM:
    """Fetch user row from DB or raise 404."""
    row = db.get(UserAccountORM, username)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable.",
        )
    return row


# ---------------------------------------------------------------------------
# POST /auth/2fa/setup · Generate TOTP secret for current user
# ---------------------------------------------------------------------------

@router.post("/setup", response_model=TOTPSetupResponse)
async def totp_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TOTPSetupResponse:
    row = _get_user_row(db, current_user.username)

    if row.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La 2FA est deja activee. Desactivez-la d'abord pour reconfigurer.",
        )

    # Generate a new TOTP secret
    secret = pyotp.random_base32()
    row.totp_secret = secret
    db.commit()

    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=current_user.username,
        issuer_name="PNPI",
    )
    qr_svg = _generate_qr_svg(provisioning_uri)

    write_audit_event(
        db,
        actor=current_user.username,
        action="2fa.setup_initiated",
        target=current_user.username,
        details="Configuration 2FA initiee",
    )
    db.commit()

    return TOTPSetupResponse(
        secret=secret,
        provisioning_uri=provisioning_uri,
        qr_svg=qr_svg,
    )


# ---------------------------------------------------------------------------
# POST /auth/2fa/confirm · Confirm TOTP setup with a valid code
# ---------------------------------------------------------------------------

@router.post("/confirm", response_model=TOTPConfirmResponse)
async def totp_confirm(
    payload: TOTPConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TOTPConfirmResponse:
    row = _get_user_row(db, current_user.username)

    if row.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La 2FA est deja activee.",
        )

    if not row.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun secret TOTP configure. Appelez /auth/2fa/setup d'abord.",
        )

    totp = pyotp.TOTP(row.totp_secret)
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Code TOTP invalide.",
        )

    row.totp_enabled = True
    row.totp_confirmed_at = now_utc()

    # Generate 8 backup codes
    codes = [secrets.token_hex(4).upper() for _ in range(8)]
    hashed = [hashlib.sha256(c.encode()).hexdigest() for c in codes]
    row.backup_codes_hash = json.dumps(hashed)

    write_audit_event(
        db,
        actor=current_user.username,
        action="2fa.enabled",
        target=current_user.username,
        details="Authentification 2FA activee",
    )
    db.commit()

    return TOTPConfirmResponse(enabled=True, backup_codes=codes)


# ---------------------------------------------------------------------------
# POST /auth/2fa/verify · Verify TOTP code during login
# ---------------------------------------------------------------------------

@router.post("/verify", response_model=TOTPVerifyResponse)
async def totp_verify(
    payload: TOTPVerifyRequest,
    db: Session = Depends(get_db),
) -> TOTPVerifyResponse:
    from ..main import enforce_rate_limit, AUTH_RATE_LIMIT_MAX_REQUESTS

    await enforce_rate_limit(key=f"auth:2fa_verify:{payload.username}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)

    row = _get_user_row(db, payload.username)

    if not row.totp_enabled or not row.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La 2FA n'est pas activee pour cet utilisateur.",
        )

    totp = pyotp.TOTP(row.totp_secret)
    is_valid = totp.verify(payload.code, valid_window=1)

    if not is_valid:
        write_audit_event(
            db,
            actor=payload.username,
            action="2fa.verify_failed",
            target=payload.username,
            details="Tentative de verification 2FA echouee",
        )
        db.commit()

    return TOTPVerifyResponse(valid=is_valid)


# ---------------------------------------------------------------------------
# DELETE /auth/2fa/disable · Disable 2FA for current user (admin or self)
# ---------------------------------------------------------------------------

@router.delete("/disable", response_model=TOTPDisableResponse)
async def totp_disable(
    payload: TOTPDisableRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TOTPDisableResponse:
    row = _get_user_row(db, current_user.username)

    if not row.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La 2FA n'est pas activee.",
        )

    is_admin = Role.admin in current_user.roles

    # Non-admin users must provide a valid TOTP code
    if not is_admin:
        if not payload.code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un code TOTP valide est requis pour desactiver la 2FA.",
            )
        totp = pyotp.TOTP(row.totp_secret)
        if not totp.verify(payload.code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Code TOTP invalide.",
            )

    row.totp_secret = None
    row.totp_enabled = False
    row.totp_confirmed_at = None

    write_audit_event(
        db,
        actor=current_user.username,
        action="2fa.disabled",
        target=current_user.username,
        details=f"2FA desactivee (par {'admin' if is_admin else 'utilisateur'})",
    )
    db.commit()

    return TOTPDisableResponse(disabled=True)


# ---------------------------------------------------------------------------
# POST /auth/2fa/verify-backup · Verify a backup code during login
# ---------------------------------------------------------------------------

@router.post("/verify-backup")
async def verify_backup_code(
    code: str = Form(...),
    username: str = Form(...),
    db: Session = Depends(get_db),
):
    from ..main import enforce_rate_limit, AUTH_RATE_LIMIT_MAX_REQUESTS

    await enforce_rate_limit(key=f"auth:2fa_backup:{username}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)

    row = db.get(UserAccountORM, username)
    if not row or not row.totp_enabled or not row.backup_codes_hash:
        raise HTTPException(status_code=401, detail="Codes de secours non disponibles.")

    hashed_input = hashlib.sha256(code.strip().upper().encode()).hexdigest()
    stored = json.loads(row.backup_codes_hash)

    if hashed_input not in stored:
        write_audit_event(
            db,
            actor=username,
            action="2fa.backup_verify_failed",
            target=username,
            details="Tentative de code de secours echouee",
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Code de secours invalide.")

    # Remove used code
    stored.remove(hashed_input)
    row.backup_codes_hash = json.dumps(stored)

    # Issue tokens
    user = user_from_row(row)
    access_token = create_access_token(
        data={"sub": user.username, "roles": [r.value for r in user.roles]}
    )
    refresh_token = issue_refresh_token(db, username=user.username)

    write_audit_event(
        db,
        actor=username,
        action="2fa.backup_verify_ok",
        target=username,
        details=f"Connexion via code de secours ({len(stored)} restants)",
    )
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "remaining_codes": len(stored),
    }

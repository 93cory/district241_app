"""PNPI / PNPI — Authentification, autorisation et gestion des tokens."""
from __future__ import annotations

import hashlib
import os
import re
import secrets
import uuid
from datetime import timedelta
from enum import Enum
from typing import Dict, List, Optional, Sequence, Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..config import settings
from ..database import SessionLocal, as_utc, get_db, now_utc


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


class Role(str, Enum):
    admin = "admin"
    ministre = "ministre"
    directeur = "directeur"
    instructeur = "instructeur"
    inspecteur = "inspecteur"
    operateur = "operateur"


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    roles: List[Role] = []
    token_id: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class User(BaseModel):
    username: str
    full_name: str
    roles: List[Role]
    province: Optional[str] = None


class UserInDB(User):
    hashed_password: str


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def validate_password_policy(password: str) -> Optional[str]:
    if len(password) < 12:
        return "Le mot de passe doit contenir au moins 12 caracteres."
    if not re.search(r"[A-Z]", password):
        return "Le mot de passe doit contenir au moins une majuscule."
    if not re.search(r"[a-z]", password):
        return "Le mot de passe doit contenir au moins une minuscule."
    if not re.search(r"[0-9]", password):
        return "Le mot de passe doit contenir au moins un chiffre."
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Le mot de passe doit contenir au moins un caractere special."
    return None


def token_digest(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Role / CSV helpers
# ---------------------------------------------------------------------------

def roles_to_csv(roles: Sequence[Role]) -> str:
    return ",".join(sorted({role.value for role in roles}))


def csv_to_roles(roles_csv: str) -> List[Role]:
    roles: List[Role] = []
    for raw in [item.strip() for item in roles_csv.split(",") if item.strip()]:
        if raw in Role._value2member_map_:
            roles.append(Role(raw))
    return roles


# ---------------------------------------------------------------------------
# Fake in-memory users (seed fallback)
# ---------------------------------------------------------------------------

def build_user(username: str, password: str, full_name: str, roles: Sequence[Role]) -> UserInDB:
    return UserInDB(
        username=username,
        full_name=full_name,
        roles=list(roles),
        hashed_password=get_password_hash(password),
    )


_fake_users_db: Optional[Dict[str, UserInDB]] = None


def get_fake_users_db() -> Dict[str, UserInDB]:
    """Lazy initialization to avoid bcrypt at import time."""
    global _fake_users_db
    if _fake_users_db is None:
        _fake_users_db = {
            "admin": build_user(
                "admin",
                os.getenv("PNPI_ADMIN_PASSWORD", "admin-dev-password"),
                "Administrateur PNPI",
                [Role.admin, Role.ministre],
            ),
            "ministre": build_user(
                "ministre",
                os.getenv("PNPI_MINISTRE_PASSWORD", "ministre-dev-password"),
                "Ministre de l'Industrie",
                [Role.ministre],
            ),
            "directeur": build_user(
                "directeur",
                os.getenv("PNPI_DIRECTEUR_PASSWORD", "directeur-dev-password"),
                "Directeur Général de l'Industrie",
                [Role.directeur],
            ),
            "instructeur": build_user(
                "instructeur",
                os.getenv("PNPI_INSTRUCTEUR_PASSWORD", "instructeur-dev-password"),
                "Agent Instructeur ATI",
                [Role.instructeur],
            ),
            "inspecteur": build_user(
                "inspecteur",
                os.getenv("PNPI_INSPECTEUR_PASSWORD", "inspecteur-dev-password"),
                "Inspecteur terrain",
                [Role.inspecteur],
            ),
            "operateur": build_user(
                "operateur",
                os.getenv("PNPI_OPERATEUR_PASSWORD", "operateur-dev-password"),
                "Opérateur Industriel Demo",
                [Role.operateur],
            ),
        }
    return _fake_users_db


# backward compat alias
fake_users_db: Dict[str, UserInDB] = {}  # populated lazily via get_fake_users_db()


# ---------------------------------------------------------------------------
# Token issuance
# ---------------------------------------------------------------------------

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = now_utc() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "token_type": "access", "jti": uuid.uuid4().hex})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def issue_refresh_token(
    db: Session,
    *,
    username: str,
    client_ip: Optional[str] = None,
) -> str:
    # Import here to avoid circular imports at module level
    from ..models.core import RefreshTokenORM

    raw_token = secrets.token_urlsafe(48)
    now = now_utc()
    row = RefreshTokenORM(
        id=f"RT-{uuid.uuid4().hex[:10].upper()}",
        username=username,
        token_hash=token_digest(raw_token),
        issued_at=now,
        expires_at=now + timedelta(days=settings.refresh_token_expire_days),
        revoked_at=None,
        client_ip=client_ip,
    )
    db.add(row)
    return raw_token


# ---------------------------------------------------------------------------
# User resolution helpers
# ---------------------------------------------------------------------------

def user_from_row(row) -> UserInDB:
    return UserInDB(
        username=row.username,
        full_name=row.full_name,
        roles=csv_to_roles(row.roles_csv),
        hashed_password=row.hashed_password,
        province=getattr(row, "province", None),
    )


def authenticate_user(db: Session, username: str, password: str) -> Tuple[Optional[UserInDB], Optional[str]]:
    from ..models.core import UserAccountORM

    now = now_utc()
    row = db.get(UserAccountORM, username)
    if row and row.is_active:
        locked_until = as_utc(row.locked_until)
        if locked_until and locked_until > now:
            return None, "Compte temporairement verrouille. Reessayez plus tard."
        user = user_from_row(row)
        if verify_password(password, user.hashed_password):
            if row.failed_login_attempts != 0 or row.locked_until is not None:
                row.failed_login_attempts = 0
                row.locked_until = None
                db.commit()
            return user, None
        row.failed_login_attempts = (row.failed_login_attempts or 0) + 1
        if row.failed_login_attempts >= 5:
            row.locked_until = now + timedelta(minutes=15)
            row.failed_login_attempts = 0
        db.commit()
        return None, "Identifiants invalides."

    user = get_fake_users_db().get(username)
    if not user or not verify_password(password, user.hashed_password):
        return None, "Identifiants invalides."
    return user, None


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    from ..models.core import UserAccountORM

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Jeton invalide ou expire.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        token_type = payload.get("token_type")
        if token_type not in {None, "access"}:
            raise credentials_exception
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        roles_raw = payload.get("roles", [])
        roles = [Role(role) for role in roles_raw if role in Role._value2member_map_]
        if not roles:
            raise credentials_exception
        token_data = TokenData(username=username, roles=roles, token_id=payload.get("jti"))
    except JWTError:
        raise credentials_exception

    row = db.get(UserAccountORM, token_data.username)
    if row and row.is_active:
        user = user_from_row(row)
        return User(username=user.username, full_name=user.full_name, roles=user.roles, province=user.province)

    user = get_fake_users_db().get(token_data.username)
    if user is None:
        raise credentials_exception
    return User(username=user.username, full_name=user.full_name, roles=user.roles, province=getattr(user, "province", None))


def require_roles(*allowed: Role):
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if not any(role in current_user.roles for role in allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas le droit d'acceder a cette ressource.",
            )
        return current_user

    return dependency


# ---------------------------------------------------------------------------
# Security prerequisites check (production)
# ---------------------------------------------------------------------------

def enforce_security_prerequisites() -> None:
    import logging
    _logger = logging.getLogger("pnpi.security")

    is_prod = settings.env == "production"

    defaults = {
        "PNPI_SECRET_KEY": "change-me-in-production",
        "PNPI_ADMIN_PASSWORD": "admin-dev-password",
        "PNPI_MINISTRE_PASSWORD": "ministre-dev-password",
        "PNPI_DIRECTEUR_PASSWORD": "directeur-dev-password",
        "PNPI_INSTRUCTEUR_PASSWORD": "instructeur-dev-password",
        "PNPI_OPERATEUR_PASSWORD": "operateur-dev-password",
        "PNPI_INSPECTEUR_PASSWORD": "inspecteur-dev-password",
    }

    insecure: list[str] = []
    for env_name, fallback in defaults.items():
        value = os.getenv(env_name, fallback)
        if value == fallback:
            insecure.append(env_name)

    if insecure:
        msg = (
            f"SECURITE: {len(insecure)} variable(s) utilisent les valeurs par defaut: "
            + ", ".join(insecure)
            + ". Changez-les avant toute mise en production."
        )
        if is_prod:
            raise RuntimeError(msg)
        _logger.warning(f"[PNPI] {msg}")

    if is_prod:
        for env_name, fallback in defaults.items():
            if env_name == "PNPI_SECRET_KEY":
                continue
            value = os.getenv(env_name, fallback)
            policy_error = validate_password_policy(value)
            if policy_error:
                raise RuntimeError(f"{env_name} non conforme a la politique mot de passe: {policy_error}")

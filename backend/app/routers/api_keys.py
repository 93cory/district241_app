"""PNPI · Gestion des cles API pour les integrations externes."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc

router = APIRouter(prefix="/admin/api-keys", tags=["API Keys"])


# ---------------------------------------------------------------------------
# In-memory store (production should use a DB table)
# ---------------------------------------------------------------------------
_api_keys_store: list[dict] = []


class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Douanes Gabon"])
    system_id: str = Field(..., min_length=2, max_length=50, examples=["douanes"])
    permissions: List[str] = Field(default=["read"], examples=[["read", "write"]])
    expires_days: Optional[int] = Field(None, examples=[365])


class APIKeyResponse(BaseModel):
    id: str
    name: str
    system_id: str
    key_prefix: str
    permissions: List[str]
    created_at: str
    expires_at: Optional[str]
    is_active: bool
    last_used_at: Optional[str] = None


@router.get("", response_model=List[APIKeyResponse], summary="Lister les cles API")
async def list_api_keys(
    _: User = Depends(require_roles(Role.admin)),
):
    return [
        APIKeyResponse(
            id=k["id"],
            name=k["name"],
            system_id=k["system_id"],
            key_prefix=k["key_prefix"],
            permissions=k["permissions"],
            created_at=k["created_at"],
            expires_at=k.get("expires_at"),
            is_active=k["is_active"],
            last_used_at=k.get("last_used_at"),
        )
        for k in _api_keys_store
    ]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Creer une cle API")
async def create_api_key(
    payload: APIKeyCreate,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Create a new API key. The full key is returned only once."""
    raw_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    now = now_utc()

    entry = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "system_id": payload.system_id,
        "key_hash": key_hash,
        "key_prefix": raw_key[:8] + "...",
        "permissions": payload.permissions,
        "created_at": now.isoformat(),
        "expires_at": (now.replace(year=now.year + 1)).isoformat() if payload.expires_days else None,
        "is_active": True,
        "last_used_at": None,
    }
    _api_keys_store.append(entry)

    write_audit_event(
        db, actor=current_user.username, action="api_key.create",
        target=payload.system_id, details=f"Cle API creee: {payload.name}",
    )
    db.commit()

    return {
        "id": entry["id"],
        "name": entry["name"],
        "system_id": entry["system_id"],
        "api_key": raw_key,  # Only returned once!
        "key_prefix": entry["key_prefix"],
        "message": "Conservez cette cle en lieu sur. Elle ne sera plus affichee.",
    }


@router.delete("/{key_id}", summary="Revoquer une cle API")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    for k in _api_keys_store:
        if k["id"] == key_id:
            k["is_active"] = False
            write_audit_event(
                db, actor=current_user.username, action="api_key.revoke",
                target=k["system_id"], details=f"Cle API revoquee: {k['name']}",
            )
            db.commit()
            return {"message": f"Cle API '{k['name']}' revoquee."}

    raise HTTPException(status_code=404, detail="Cle API introuvable.")

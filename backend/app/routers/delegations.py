"""PNPI · Systeme de delegation de dossiers."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import DelegationORM
from ..models.core import UserAccountORM

router = APIRouter(prefix="/delegations", tags=["Delegations"])


class CreateDelegationBody(BaseModel):
    to_username: str
    reason: str | None = None
    start_date: str
    end_date: str


@router.get("/my")
async def my_delegations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List delegations I've created or received."""
    given = db.execute(
        select(DelegationORM).where(DelegationORM.from_username == current_user.username)
        .order_by(DelegationORM.created_at.desc())
    ).scalars().all()

    received = db.execute(
        select(DelegationORM).where(DelegationORM.to_username == current_user.username)
        .order_by(DelegationORM.created_at.desc())
    ).scalars().all()

    def serialize(d):
        return {
            "id": d.id,
            "from": d.from_username,
            "to": d.to_username,
            "reason": d.reason,
            "start_date": d.start_date.isoformat(),
            "end_date": d.end_date.isoformat(),
            "is_active": d.is_active,
            "created_at": d.created_at.isoformat(),
        }

    return {
        "given": [serialize(d) for d in given],
        "received": [serialize(d) for d in received],
    }


@router.post("/create")
async def create_delegation(
    data: CreateDelegationBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.to_username == current_user.username:
        raise HTTPException(400, "Impossible de deleguer a soi-meme.")

    recipient = db.execute(
        select(UserAccountORM).where(UserAccountORM.username == data.to_username)
    ).scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, "Utilisateur destinataire introuvable.")

    deleg = DelegationORM(
        id=str(uuid.uuid4()),
        from_username=current_user.username,
        to_username=data.to_username,
        reason=data.reason,
        start_date=datetime.fromisoformat(data.start_date).replace(tzinfo=timezone.utc),
        end_date=datetime.fromisoformat(data.end_date).replace(tzinfo=timezone.utc),
        is_active=True,
    )
    db.add(deleg)
    db.commit()

    return {"status": "ok", "id": deleg.id}


@router.patch("/{delegation_id}/cancel")
async def cancel_delegation(
    delegation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleg = db.get(DelegationORM, delegation_id)
    if not deleg:
        raise HTTPException(404, "Delegation introuvable.")
    if deleg.from_username != current_user.username and "admin" not in current_user.roles:
        raise HTTPException(403, "Seul le delegant ou un admin peut annuler.")

    deleg.is_active = False
    db.commit()
    return {"status": "ok"}

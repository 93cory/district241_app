"""PNPI — Annonces broadcast pour tous les utilisateurs."""
from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, now_utc
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import AnnouncementORM

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("/active")
async def get_active_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get active announcements visible to the current user."""
    now = now_utc()
    query = select(AnnouncementORM).where(
        AnnouncementORM.is_active.is_(True),
    ).order_by(AnnouncementORM.created_at.desc())

    all_ann = db.execute(query).scalars().all()

    # Filter by expiration and role
    user_roles = set(current_user.roles)
    result = []
    for ann in all_ann:
        if ann.expires_at and ann.expires_at < now:
            continue
        if ann.target_roles:
            allowed = set(ann.target_roles.split(","))
            if not (user_roles & allowed):
                continue
        result.append({
            "id": ann.id,
            "title": ann.title,
            "body": ann.body,
            "severity": ann.severity,
            "created_by": ann.created_by,
            "created_at": ann.created_at.isoformat(),
        })

    return {"announcements": result}


@router.get("/all")
async def list_all_announcements(
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    all_ann = db.execute(
        select(AnnouncementORM).order_by(AnnouncementORM.created_at.desc())
    ).scalars().all()
    return {"announcements": [{
        "id": a.id, "title": a.title, "body": a.body,
        "severity": a.severity, "target_roles": a.target_roles,
        "is_active": a.is_active, "created_by": a.created_by,
        "created_at": a.created_at.isoformat(),
        "expires_at": a.expires_at.isoformat() if a.expires_at else None,
    } for a in all_ann]}


@router.post("/create")
async def create_announcement(
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone

    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip()
    if not title or not body:
        raise HTTPException(400, "Titre et contenu requis.")

    expires_at = None
    if data.get("expires_at"):
        expires_at = datetime.fromisoformat(data["expires_at"]).replace(tzinfo=timezone.utc)

    ann = AnnouncementORM(
        id=str(uuid.uuid4()),
        title=title,
        body=body,
        severity=data.get("severity", "info"),
        target_roles=data.get("target_roles"),
        created_by=current_user.username,
        expires_at=expires_at,
    )
    db.add(ann)
    db.commit()
    return {"status": "ok", "id": ann.id}


@router.patch("/{ann_id}/deactivate")
async def deactivate_announcement(
    ann_id: str,
    _: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    ann = db.get(AnnouncementORM, ann_id)
    if not ann:
        raise HTTPException(404, "Annonce introuvable.")
    ann.is_active = False
    db.commit()
    return {"status": "ok"}

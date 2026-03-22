"""PNPI — Notes epinglees sur le dashboard."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, get_current_user
from ..models.pnpi import StickyNoteORM

router = APIRouter(prefix="/notes", tags=["Notes"])


@router.get("/my")
async def get_my_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notes = db.execute(
        select(StickyNoteORM).where(StickyNoteORM.username == current_user.username)
        .order_by(StickyNoteORM.created_at.desc())
    ).scalars().all()
    return {"notes": [{
        "id": n.id, "content": n.content, "color": n.color,
        "position_x": n.position_x, "position_y": n.position_y,
        "is_pinned": n.is_pinned, "updated_at": n.updated_at.isoformat(),
    } for n in notes]}


@router.post("/create")
async def create_note(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = StickyNoteORM(
        id=str(uuid.uuid4()),
        username=current_user.username,
        content=data.get("content", ""),
        color=data.get("color", "#f2b800"),
        position_x=data.get("position_x", 0),
        position_y=data.get("position_y", 0),
    )
    db.add(note)
    db.commit()
    return {"status": "ok", "id": note.id}


@router.patch("/{note_id}")
async def update_note(
    note_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.get(StickyNoteORM, note_id)
    if not note or note.username != current_user.username:
        raise HTTPException(404, "Note introuvable.")

    if "content" in data: note.content = data["content"]
    if "color" in data: note.color = data["color"]
    if "position_x" in data: note.position_x = data["position_x"]
    if "position_y" in data: note.position_y = data["position_y"]
    if "is_pinned" in data: note.is_pinned = data["is_pinned"]
    note.updated_at = datetime.now(timezone.utc)

    db.commit()
    return {"status": "ok"}


@router.delete("/{note_id}")
async def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = db.get(StickyNoteORM, note_id)
    if not note or note.username != current_user.username:
        raise HTTPException(404, "Note introuvable.")
    db.delete(note)
    db.commit()
    return {"status": "ok"}

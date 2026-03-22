"""PNPI — Messagerie interne entre utilisateurs."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, get_current_user
from ..models.pnpi import MessageORM

router = APIRouter(prefix="/messages", tags=["Messages"])


class SendMessageBody(BaseModel):
    recipient: str
    subject: str
    body: str
    ati_id: str | None = None
    thread_id: str | None = None


@router.get("/inbox")
async def get_inbox(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(MessageORM)
        .where(MessageORM.recipient_username == current_user.username)
        .order_by(MessageORM.created_at.desc())
        .offset(skip).limit(limit)
    )
    messages = db.execute(query).scalars().all()

    unread = db.execute(
        select(func.count()).select_from(MessageORM).where(
            MessageORM.recipient_username == current_user.username,
            MessageORM.is_read.is_(False),
        )
    ).scalar() or 0

    return {
        "unread_count": unread,
        "messages": [
            {
                "id": m.id,
                "thread_id": m.thread_id,
                "sender": m.sender_username,
                "subject": m.subject,
                "body": m.body[:200],
                "ati_id": m.ati_id,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.get("/sent")
async def get_sent(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(MessageORM)
        .where(MessageORM.sender_username == current_user.username)
        .order_by(MessageORM.created_at.desc())
        .offset(skip).limit(limit)
    )
    messages = db.execute(query).scalars().all()
    return {
        "messages": [
            {
                "id": m.id,
                "thread_id": m.thread_id,
                "recipient": m.recipient_username,
                "subject": m.subject,
                "body": m.body[:200],
                "ati_id": m.ati_id,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.get("/thread/{thread_id}")
async def get_thread(
    thread_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(MessageORM)
        .where(
            MessageORM.thread_id == thread_id,
            or_(
                MessageORM.sender_username == current_user.username,
                MessageORM.recipient_username == current_user.username,
            ),
        )
        .order_by(MessageORM.created_at.asc())
    )
    messages = db.execute(query).scalars().all()

    # Mark received messages as read
    for m in messages:
        if m.recipient_username == current_user.username and not m.is_read:
            m.is_read = True
    db.commit()

    return {
        "thread_id": thread_id,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender_username,
                "recipient": m.recipient_username,
                "subject": m.subject,
                "body": m.body,
                "ati_id": m.ati_id,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.post("/send")
async def send_message(
    data: SendMessageBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.recipient == current_user.username:
        raise HTTPException(400, "Impossible de s'envoyer un message a soi-meme.")

    # Verify recipient exists
    from ..models.core import UserAccountORM
    recipient = db.execute(
        select(UserAccountORM).where(UserAccountORM.username == data.recipient)
    ).scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, "Destinataire introuvable.")

    thread_id = data.thread_id or str(uuid.uuid4())

    msg = MessageORM(
        id=str(uuid.uuid4()),
        thread_id=thread_id,
        sender_username=current_user.username,
        recipient_username=data.recipient,
        subject=data.subject,
        body=data.body,
        ati_id=data.ati_id,
        is_read=False,
    )
    db.add(msg)
    db.commit()

    return {
        "status": "ok",
        "message_id": msg.id,
        "thread_id": thread_id,
    }


@router.patch("/{message_id}/read")
async def mark_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = db.get(MessageORM, message_id)
    if not msg or msg.recipient_username != current_user.username:
        raise HTTPException(404, "Message introuvable.")
    msg.is_read = True
    db.commit()
    return {"status": "ok"}

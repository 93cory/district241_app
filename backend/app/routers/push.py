"""Web Push notifications · Endpoints VAPID + abonnements + envoi."""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..core.auth import get_current_user
from ..database import get_db, now_utc
from ..models.core import PushSubscriptionORM, UserAccountORM

logger = logging.getLogger("pnpi.push")

router = APIRouter(prefix="/push", tags=["Push notifications"])


VAPID_PUBLIC_KEY = os.environ.get("PNPI_VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("PNPI_VAPID_PRIVATE_KEY", "")
VAPID_SUBJECT = os.environ.get("PNPI_VAPID_SUBJECT", "mailto:contact@pnpi-gabon.ga")

PUSH_ENABLED = bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)

# Allowlist des hosts push services connus. Empeche un endpoint malicieux
# de transformer le serveur en proxy SSRF.
_ALLOWED_PUSH_HOST = re.compile(
    r"^https://("
    r"fcm\.googleapis\.com|"
    r"updates\.push\.services\.mozilla\.com|"
    r"web\.push\.apple\.com|"
    r".*\.notify\.windows\.com"
    r")/"
)

_MAX_SUBS_PER_USER = 20


class _PushKeys(BaseModel):
    p256dh: str = Field(..., min_length=20, max_length=200)
    auth: str = Field(..., min_length=10, max_length=100)


class SubscribePayload(BaseModel):
    endpoint: str = Field(..., min_length=10, max_length=2000)
    keys: _PushKeys
    user_agent: str | None = Field(None, max_length=300)

    @field_validator("endpoint")
    @classmethod
    def _validate_endpoint(cls, v: str) -> str:
        if not _ALLOWED_PUSH_HOST.match(v):
            raise ValueError("endpoint push non autorise (host hors allowlist)")
        return v


class UnsubscribePayload(BaseModel):
    endpoint: str = Field(..., min_length=10, max_length=2000)


class TestPushPayload(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    body: str = Field(..., min_length=1, max_length=400)
    url: str | None = Field(None, max_length=300)


@router.get("/vapid-key", summary="Cle publique VAPID pour s'abonner aux push")
def get_vapid_public_key() -> dict[str, Any]:
    """Retourne la cle publique VAPID a utiliser cote navigateur.

    Si PUSH_ENABLED=false, renvoie une cle vide : le client doit alors
    se rabattre sur les notifications locales du navigateur.
    """
    return {"public_key": VAPID_PUBLIC_KEY, "enabled": PUSH_ENABLED}


@router.post("/subscribe", summary="Enregistre un abonnement push pour l'utilisateur courant")
def subscribe(
    payload: SubscribePayload,
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> dict[str, Any]:
    existing = db.execute(
        select(PushSubscriptionORM).where(PushSubscriptionORM.endpoint == payload.endpoint)
    ).scalar_one_or_none()

    if existing:
        # Empeche le vol d'abonnement : si l'endpoint est deja enregistre par
        # un autre utilisateur, on refuse plutot que d'ecraser silencieusement.
        if existing.username != current_user.username:
            raise HTTPException(status_code=409, detail="Endpoint deja enregistre.")
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent
        existing.last_used_at = now_utc()
        db.commit()
        return {"status": "updated", "id": existing.id}

    # Cap par utilisateur pour eviter le DoS interne (1 user qui spamme).
    user_count = db.execute(
        select(func.count())
        .select_from(PushSubscriptionORM)
        .where(PushSubscriptionORM.username == current_user.username)
    ).scalar_one()
    if user_count >= _MAX_SUBS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {_MAX_SUBS_PER_USER} abonnements push atteinte.",
        )

    sub = PushSubscriptionORM(
        id=str(uuid.uuid4()),
        username=current_user.username,
        endpoint=payload.endpoint,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    db.add(sub)
    try:
        db.commit()
    except IntegrityError:
        # Race entre deux POST concurrents : l'autre a gagne, on remonte 409.
        db.rollback()
        raise HTTPException(status_code=409, detail="Endpoint deja enregistre.")
    return {"status": "created", "id": sub.id}


@router.post("/unsubscribe", summary="Supprime un abonnement push")
def unsubscribe(
    payload: UnsubscribePayload,
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> dict[str, Any]:
    sub = db.execute(
        select(PushSubscriptionORM).where(
            PushSubscriptionORM.endpoint == payload.endpoint,
            PushSubscriptionORM.username == current_user.username,
        )
    ).scalar_one_or_none()
    if sub:
        db.delete(sub)
        db.commit()
        return {"status": "deleted"}
    return {"status": "not_found"}


@router.get("/subscriptions", summary="Liste les abonnements push de l'utilisateur courant")
def list_subscriptions(
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> list[dict[str, Any]]:
    subs = (
        db.execute(select(PushSubscriptionORM).where(PushSubscriptionORM.username == current_user.username))
        .scalars()
        .all()
    )
    return [
        {
            "id": s.id,
            "user_agent": s.user_agent,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_used_at": s.last_used_at.isoformat() if s.last_used_at else None,
        }
        for s in subs
    ]


@router.post("/test", summary="Envoie une notification push de test a l'utilisateur courant")
def send_test_push(
    payload: TestPushPayload,
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> dict[str, Any]:
    if not PUSH_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Push non configure : definir PNPI_VAPID_PUBLIC_KEY et PNPI_VAPID_PRIVATE_KEY.",
        )
    sent, failed = send_push_to_user(
        db,
        current_user.username,
        title=payload.title,
        body=payload.body,
        url=payload.url,
    )
    return {"sent": sent, "failed": failed}


def send_push_to_user(
    db: Session,
    username: str,
    *,
    title: str,
    body: str,
    url: str | None = None,
    icon: str = "/icons/pnpi-192.png",
    tag: str | None = None,
) -> tuple[int, int]:
    """Envoie une notification push a tous les abonnements d'un utilisateur.

    Retourne (sent, failed). Les abonnements expires (410 Gone) sont nettoyes.
    """
    if not PUSH_ENABLED:
        logger.info("Push not enabled, skipping notification for %s.", username)
        return (0, 0)

    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush not installed, push notifications disabled.")
        return (0, 0)

    subs = db.execute(select(PushSubscriptionORM).where(PushSubscriptionORM.username == username)).scalars().all()

    if not subs:
        return (0, 0)

    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "url": url or "/",
            "icon": icon,
            "tag": tag or "pnpi-notification",
        }
    )

    sent = 0
    failed = 0
    expired_ids: list[str] = []

    for s in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": s.endpoint,
                    "keys": {"p256dh": s.p256dh, "auth": s.auth},
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT},
            )
            s.last_used_at = now_utc()
            sent += 1
        except WebPushException as exc:
            failed += 1
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                expired_ids.append(s.id)
            else:
                logger.warning("Push failed for %s (%s): %s", username, status, exc)

    if expired_ids:
        db.execute(PushSubscriptionORM.__table__.delete().where(PushSubscriptionORM.id.in_(expired_ids)))
        logger.info("Cleaned %d expired push subscriptions for %s.", len(expired_ids), username)

    db.commit()
    return (sent, failed)

"""PNPI — Systeme de rappels/relances automatiques."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, now_utc
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import ATIReminderORM, AgrementTechniqueIndustrielORM

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/ati/{ati_id}")
async def get_reminders(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminders = db.execute(
        select(ATIReminderORM).where(ATIReminderORM.ati_id == ati_id)
        .order_by(ATIReminderORM.scheduled_at.asc())
    ).scalars().all()
    return {"reminders": [{
        "id": r.id, "type": r.type, "recipient": r.recipient_username,
        "message": r.message, "scheduled_at": r.scheduled_at.isoformat(),
        "sent_at": r.sent_at.isoformat() if r.sent_at else None,
    } for r in reminders]}


@router.post("/ati/{ati_id}")
async def create_reminder(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")

    reminder = ATIReminderORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        type=data.get("type", "manual"),
        recipient_username=data.get("recipient", current_user.username),
        message=data.get("message", f"Rappel: dossier ATI {ati.numero_ati} en attente de traitement."),
        scheduled_at=datetime.fromisoformat(data["scheduled_at"]).replace(tzinfo=timezone.utc) if "scheduled_at" in data else now_utc() + timedelta(days=1),
    )
    db.add(reminder)
    db.commit()
    return {"status": "ok", "id": reminder.id}


@router.post("/generate-auto")
async def generate_auto_reminders(
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Generate automatic reminders for ATIs approaching SLA deadlines."""
    now = now_utc()
    terminal = {"approuve", "rejete", "expire"}

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    created = 0

    for ati in all_atis:
        if ati.statut in terminal:
            continue

        age = (now.date() - ati.date_soumission.date()).days
        sla_pct = age / ati.sla_jours * 100

        # Check if reminder already exists for this ATI today
        existing = db.execute(
            select(ATIReminderORM).where(
                ATIReminderORM.ati_id == ati.id,
                ATIReminderORM.scheduled_at >= now.replace(hour=0, minute=0, second=0),
            )
        ).scalar_one_or_none()

        if existing:
            continue

        recipient = getattr(ati, 'instructeur_username', None) or "admin"

        if sla_pct >= 100:
            msg = f"URGENT: ATI {ati.numero_ati} a depasse le SLA ({age}j / {ati.sla_jours}j). Action immediate requise."
            rtype = "sla_breach"
        elif sla_pct >= 80:
            msg = f"Rappel: ATI {ati.numero_ati} approche de l'echeance SLA ({age}j / {ati.sla_jours}j). Veuillez traiter rapidement."
            rtype = "sla_warning"
        elif sla_pct >= 50:
            msg = f"Info: ATI {ati.numero_ati} en cours de traitement ({age}j / {ati.sla_jours}j)."
            rtype = "sla_info"
        else:
            continue

        reminder = ATIReminderORM(
            id=str(uuid.uuid4()),
            ati_id=ati.id,
            type=rtype,
            recipient_username=recipient,
            message=msg,
            scheduled_at=now,
        )
        db.add(reminder)
        created += 1

    db.commit()
    return {"status": "ok", "created": created}


@router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    reminder = db.get(ATIReminderORM, reminder_id)
    if not reminder:
        raise HTTPException(404, "Rappel introuvable.")
    db.delete(reminder)
    db.commit()
    return {"status": "ok"}

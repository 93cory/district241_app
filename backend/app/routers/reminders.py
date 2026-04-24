"""PNPI · Systeme de rappels/relances automatiques."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, get_current_user, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, ATIReminderORM

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.get("/ati/{ati_id}")
async def get_reminders(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminders = (
        db.execute(
            select(ATIReminderORM).where(ATIReminderORM.ati_id == ati_id).order_by(ATIReminderORM.scheduled_at.asc())
        )
        .scalars()
        .all()
    )
    return {
        "reminders": [
            {
                "id": r.id,
                "type": r.type,
                "recipient": r.recipient_username,
                "message": r.message,
                "scheduled_at": r.scheduled_at.isoformat(),
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            }
            for r in reminders
        ]
    }


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
        scheduled_at=datetime.fromisoformat(data["scheduled_at"]).replace(tzinfo=UTC)
        if "scheduled_at" in data
        else now_utc() + timedelta(days=1),
    )
    db.add(reminder)
    db.commit()
    return {"status": "ok", "id": reminder.id}


@router.post("/generate-auto")
async def generate_auto_reminders(
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Generate automatic reminders :
    - SLA deadlines for in-progress ATIs (50%, 80%, 100%+)
    - Renewal reminders for approved ATIs (90j, 60j, 30j, expired)
    Idempotent : ne cree pas de doublon si un reminder meme type existe deja pour l'ATI aujourd'hui.
    """
    now = now_utc()
    terminal_active = {"approuve", "rejete", "expire"}
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    created = 0

    for ati in all_atis:
        # --- 1. Rappels SLA (ATI en cours) ---
        if ati.statut not in terminal_active:
            age = (now.date() - ati.date_soumission.date()).days
            sla_pct = (age / ati.sla_jours * 100) if ati.sla_jours else 0

            rtype = None
            msg = None
            if sla_pct >= 100:
                rtype = "sla_breach"
                msg = f"URGENT : ATI {ati.numero_ati} a depasse le SLA ({age}j / {ati.sla_jours}j). Action immediate requise."
            elif sla_pct >= 80:
                rtype = "sla_warning"
                msg = f"Rappel : ATI {ati.numero_ati} approche de l'echeance SLA ({age}j / {ati.sla_jours}j). Veuillez traiter rapidement."
            elif sla_pct >= 50:
                rtype = "sla_info"
                msg = f"Info : ATI {ati.numero_ati} en cours de traitement ({age}j / {ati.sla_jours}j)."

            if rtype:
                existing = db.execute(
                    select(ATIReminderORM).where(
                        ATIReminderORM.ati_id == ati.id,
                        ATIReminderORM.type == rtype,
                        ATIReminderORM.scheduled_at >= today_start,
                    )
                ).scalar_one_or_none()
                if not existing:
                    recipient = getattr(ati, "instructeur_username", None) or "admin"
                    db.add(
                        ATIReminderORM(
                            id=str(uuid.uuid4()),
                            ati_id=ati.id,
                            type=rtype,
                            recipient_username=recipient,
                            message=msg,
                            scheduled_at=now,
                        )
                    )
                    created += 1

        # --- 2. Rappels renouvellement (ATI approuve, expiration proche) ---
        if ati.statut == "approuve" and ati.date_expiration:
            days_left = (ati.date_expiration.date() - now.date()).days

            # Seuils : 90j, 60j, 30j, expired
            rtype = None
            msg = None
            if days_left < 0:
                rtype = "renewal_expired"
                msg = f"EXPIRE : l'ATI {ati.numero_ati} est expire depuis {abs(days_left)}j. Demandez le renouvellement immediatement."
            elif days_left <= 30:
                rtype = "renewal_30"
                msg = f"A renouveler : l'ATI {ati.numero_ati} expire dans {days_left}j. Engagez la demande de renouvellement."
            elif days_left <= 60:
                rtype = "renewal_60"
                msg = f"Preparation renouvellement : l'ATI {ati.numero_ati} expire dans {days_left}j (dans 2 mois)."
            elif days_left <= 90:
                rtype = "renewal_90"
                msg = f"A anticiper : l'ATI {ati.numero_ati} expire dans {days_left}j (dans 3 mois)."

            if rtype:
                existing = db.execute(
                    select(ATIReminderORM).where(
                        ATIReminderORM.ati_id == ati.id,
                        ATIReminderORM.type == rtype,
                    )
                ).scalar_one_or_none()
                if not existing:
                    # Destinataires : instructeur + operateur (via created_by)
                    recipients = set()
                    if ati.instructeur_username:
                        recipients.add(ati.instructeur_username)
                    if ati.created_by:
                        recipients.add(ati.created_by)
                    if not recipients:
                        recipients.add("admin")
                    for r in recipients:
                        db.add(
                            ATIReminderORM(
                                id=str(uuid.uuid4()),
                                ati_id=ati.id,
                                type=rtype,
                                recipient_username=r,
                                message=msg,
                                scheduled_at=now,
                            )
                        )
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

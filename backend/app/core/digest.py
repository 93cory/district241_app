"""PNPI — Generation du digest email quotidien."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM
from ..models.core import AuditEventORM


def generate_daily_digest(db: Session, username: str, roles: list[str]) -> dict:
    """Generate a daily activity digest for a user."""
    now = now_utc()
    yesterday = now - timedelta(hours=24)

    # Recent ATI activity
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    new_atis = [a for a in all_atis if a.date_soumission >= yesterday]
    decided_today = [a for a in all_atis if a.date_decision and a.date_decision >= yesterday]

    # Pending for user (if instructeur)
    pending = []
    if "instructeur" in roles:
        pending = [a for a in all_atis
                   if a.statut not in ("approuve", "rejete", "expire")
                   and getattr(a, 'instructeur_username', None) == username]

    # SLA alerts
    overdue = [a for a in all_atis
               if a.statut not in ("approuve", "rejete", "expire")
               and (now.date() - a.date_soumission.date()).days > a.sla_jours]

    # Recent inspections
    recent_insp = db.execute(
        select(InspectionConformiteORM).where(
            InspectionConformiteORM.date_inspection >= yesterday
        )
    ).scalars().all()

    # Audit events count
    events_count = db.execute(
        select(AuditEventORM).where(AuditEventORM.timestamp >= yesterday)
    ).scalars().all()

    # Build digest
    sections = []

    if new_atis:
        sections.append({
            "title": f"{len(new_atis)} nouveau(x) ATI soumis",
            "icon": "\U0001f4cb",
            "items": [f"{a.numero_ati} — {a.operateur.raison_sociale if a.operateur else '?'}" for a in new_atis[:5]],
        })

    if decided_today:
        approved = sum(1 for a in decided_today if a.statut == "approuve")
        rejected = sum(1 for a in decided_today if a.statut == "rejete")
        sections.append({
            "title": f"{len(decided_today)} decision(s) : {approved} approuve(s), {rejected} rejete(s)",
            "icon": "\u2705",
            "items": [f"{a.numero_ati} \u2192 {a.statut}" for a in decided_today[:5]],
        })

    if pending:
        sections.append({
            "title": f"{len(pending)} dossier(s) en attente de votre traitement",
            "icon": "\u23f3",
            "items": [f"{a.numero_ati} ({(now.date() - a.date_soumission.date()).days}j)" for a in pending[:5]],
        })

    if overdue:
        sections.append({
            "title": f"\u26a0\ufe0f {len(overdue)} ATI en depassement SLA",
            "icon": "\U0001f6a8",
            "items": [f"{a.numero_ati} — {(now.date() - a.date_soumission.date()).days}j / {a.sla_jours}j SLA" for a in overdue[:5]],
        })

    if recent_insp:
        sections.append({
            "title": f"{len(recent_insp)} inspection(s) realisee(s)",
            "icon": "\U0001f50d",
            "items": [f"{i.statut_conformite} — {i.inspecteur_username}" for i in recent_insp[:3]],
        })

    return {
        "username": username,
        "date": now.strftime("%d/%m/%Y"),
        "period": "24 dernieres heures",
        "sections": sections,
        "total_events": len(events_count),
        "summary": f"{len(new_atis)} soumissions, {len(decided_today)} decisions, {len(overdue)} SLA depasses",
    }

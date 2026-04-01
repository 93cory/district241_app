"""PNPI — Endpoints for calendar view."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, get_current_user
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
)

router = APIRouter(prefix="/calendar", tags=["Calendar"])


@router.get("/events")
async def get_calendar_events(
    start: str = Query(..., description="ISO date YYYY-MM-DD"),
    end: str = Query(..., description="ISO date YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get calendar events (ATI deadlines + inspections) for a date range."""
    try:
        start_dt = datetime.fromisoformat(start).replace(tzinfo=timezone.utc)
        end_dt = datetime.fromisoformat(end).replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return {"count": 0, "events": [], "error": "Invalid date format. Use YYYY-MM-DD."}

    try:
        events = []

        # ATI submissions
        atis = db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.date_soumission.between(start_dt, end_dt)
            )
        ).scalars().all()

        for ati in atis:
            events.append({
                "id": f"ati-sub-{ati.id}",
                "type": "ati_submission",
                "title": f"ATI {ati.numero_ati} soumis",
                "date": ati.date_soumission.isoformat(),
                "color": "#0c7eb4",
                "link": f"/pnpi/ati/{ati.id}",
                "meta": {"statut": ati.statut, "secteur": ati.secteur},
            })

        # ATI decisions
        decided = db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.date_decision.isnot(None),
                AgrementTechniqueIndustrielORM.date_decision.between(start_dt, end_dt),
            )
        ).scalars().all()

        for ati in decided:
            color = "#006233" if ati.statut == "approuve" else "#b42318"
            events.append({
                "id": f"ati-dec-{ati.id}",
                "type": "ati_decision",
                "title": f"ATI {ati.numero_ati} {ati.statut}",
                "date": ati.date_decision.isoformat(),
                "color": color,
                "link": f"/pnpi/ati/{ati.id}",
                "meta": {"statut": ati.statut},
            })

        # ATI expirations
        expiring = db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
                AgrementTechniqueIndustrielORM.date_expiration.between(start_dt, end_dt),
                AgrementTechniqueIndustrielORM.statut == "approuve",
            )
        ).scalars().all()

        for ati in expiring:
            op = getattr(ati, 'operateur', None)
            events.append({
                "id": f"ati-exp-{ati.id}",
                "type": "ati_expiration",
                "title": f"ATI {ati.numero_ati} expire",
                "date": ati.date_expiration.isoformat(),
                "color": "#d97706",
                "link": f"/pnpi/ati/{ati.id}",
                "meta": {"operateur": op.raison_sociale if op else None},
            })

        # Inspections
        inspections = db.execute(
            select(InspectionConformiteORM).where(
                InspectionConformiteORM.date_inspection.between(start_dt, end_dt)
            )
        ).scalars().all()

        for insp in inspections:
            conf_color = {"conforme": "#006233", "non_conforme": "#b42318", "partiel": "#d97706"}.get(insp.statut_conformite, "#526175")
            events.append({
                "id": f"insp-{insp.id}",
                "type": "inspection",
                "title": f"Inspection — {insp.statut_conformite}",
                "date": insp.date_inspection.isoformat(),
                "color": conf_color,
                "link": f"/pnpi/inspections/{insp.id}",
                "meta": {"inspecteur": getattr(insp, 'inspecteur_username', None), "conformite": insp.statut_conformite},
            })

        # SLA deadlines (ATIs in progress approaching deadline)
        now = datetime.now(timezone.utc)
        in_progress = db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut.notin_(["approuve", "rejete", "expire"])
            )
        ).scalars().all()

        for ati in in_progress:
            sla = ati.sla_jours or 30
            deadline = ati.date_soumission + timedelta(days=sla)
            if start_dt <= deadline <= end_dt:
                overdue = deadline < now
                events.append({
                    "id": f"sla-{ati.id}",
                    "type": "sla_deadline",
                    "title": f"SLA ATI {ati.numero_ati} {'depasse' if overdue else 'echeance'}",
                    "date": deadline.isoformat(),
                    "color": "#b42318" if overdue else "#f2b800",
                    "link": f"/pnpi/ati/{ati.id}",
                    "meta": {"jours_sla": sla, "overdue": overdue},
                })

        events.sort(key=lambda e: e["date"])
        return {"count": len(events), "events": events}
    except Exception:
        return {"count": 0, "events": []}

"""PNPI · Endpoints for calendar view."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import User, get_current_user
from ..database import as_utc, get_db
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
)

router = APIRouter(prefix="/calendar", tags=["Calendar"])

_PRIVILEGED_ROLES = {"admin", "ministre", "directeur", "instructeur", "inspecteur"}


def _is_operateur_only(current_user: User) -> bool:
    roles = {r.value if hasattr(r, "value") else str(r) for r in current_user.roles}
    return bool(roles) and not (roles & _PRIVILEGED_ROLES) and "operateur" in roles


@router.get("/events")
async def get_calendar_events(
    start: str = Query(..., description="ISO date YYYY-MM-DD"),
    end: str = Query(..., description="ISO date YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get calendar events (ATI deadlines + inspections) for a date range."""
    try:
        start_dt = datetime.fromisoformat(start).replace(tzinfo=UTC)
        end_dt = datetime.fromisoformat(end).replace(tzinfo=UTC)
    except (ValueError, TypeError):
        return {"count": 0, "events": [], "error": "Invalid date format. Use YYYY-MM-DD."}

    operateur_only = _is_operateur_only(current_user)

    try:
        events = []

        # ATI submissions
        ati_query = select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.date_soumission.between(start_dt, end_dt)
        )
        if operateur_only:
            ati_query = ati_query.where(AgrementTechniqueIndustrielORM.created_by == current_user.username)
        atis = db.execute(ati_query).scalars().all()

        for ati in atis:
            events.append(
                {
                    "id": f"ati-sub-{ati.id}",
                    "type": "ati_submission",
                    "title": f"ATI {ati.numero_ati} soumis",
                    "date": ati.date_soumission.isoformat(),
                    "color": "#0c7eb4",
                    "link": f"/pnpi/ati/{ati.id}",
                    "meta": {"statut": ati.statut, "secteur": ati.secteur},
                }
            )

        # ATI decisions
        decided_query = select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.date_decision.isnot(None),
            AgrementTechniqueIndustrielORM.date_decision.between(start_dt, end_dt),
        )
        if operateur_only:
            decided_query = decided_query.where(
                AgrementTechniqueIndustrielORM.created_by == current_user.username
            )
        decided = db.execute(decided_query).scalars().all()

        for ati in decided:
            color = "#006233" if ati.statut == "approuve" else "#b42318"
            events.append(
                {
                    "id": f"ati-dec-{ati.id}",
                    "type": "ati_decision",
                    "title": f"ATI {ati.numero_ati} {ati.statut}",
                    "date": ati.date_decision.isoformat(),
                    "color": color,
                    "link": f"/pnpi/ati/{ati.id}",
                    "meta": {"statut": ati.statut},
                }
            )

        # ATI expirations
        expiring_query = select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
            AgrementTechniqueIndustrielORM.date_expiration.between(start_dt, end_dt),
            AgrementTechniqueIndustrielORM.statut == "approuve",
        )
        if operateur_only:
            expiring_query = expiring_query.where(
                AgrementTechniqueIndustrielORM.created_by == current_user.username
            )
        expiring = db.execute(expiring_query).scalars().all()

        for ati in expiring:
            op = getattr(ati, "operateur", None)
            events.append(
                {
                    "id": f"ati-exp-{ati.id}",
                    "type": "ati_expiration",
                    "title": f"ATI {ati.numero_ati} expire",
                    "date": ati.date_expiration.isoformat(),
                    "color": "#d97706",
                    "link": f"/pnpi/ati/{ati.id}",
                    "meta": {"operateur": op.raison_sociale if op else None},
                }
            )

        # Inspections : opérateur ne voit pas le calendrier d'inspections globales
        if operateur_only:
            inspections = []
        else:
            inspections = (
                db.execute(
                    select(InspectionConformiteORM).where(
                        InspectionConformiteORM.date_inspection.between(start_dt, end_dt)
                    )
                )
                .scalars()
                .all()
            )

        for insp in inspections:
            conf_color = {"conforme": "#006233", "non_conforme": "#b42318", "partiel": "#d97706"}.get(
                insp.statut_conformite, "#526175"
            )
            events.append(
                {
                    "id": f"insp-{insp.id}",
                    "type": "inspection",
                    "title": f"Inspection · {insp.statut_conformite}",
                    "date": insp.date_inspection.isoformat(),
                    "color": conf_color,
                    "link": f"/pnpi/inspections/{insp.id}",
                    "meta": {
                        "inspecteur": getattr(insp, "inspecteur_username", None),
                        "conformite": insp.statut_conformite,
                    },
                }
            )

        # SLA deadlines (ATIs in progress approaching deadline)
        now = datetime.now(UTC)
        in_progress_query = select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.statut.notin_(["approuve", "rejete", "expire"])
        )
        if operateur_only:
            in_progress_query = in_progress_query.where(
                AgrementTechniqueIndustrielORM.created_by == current_user.username
            )
        in_progress = db.execute(in_progress_query).scalars().all()

        for ati in in_progress:
            sla = ati.sla_jours or 30
            # Wrap naive datetimes (SQLite) before timedelta + tz-aware comparison
            soumission_aware = as_utc(ati.date_soumission) or ati.date_soumission
            deadline = soumission_aware + timedelta(days=sla)
            if start_dt <= deadline <= end_dt:
                overdue = deadline < now
                events.append(
                    {
                        "id": f"sla-{ati.id}",
                        "type": "sla_deadline",
                        "title": f"SLA ATI {ati.numero_ati} {'depasse' if overdue else 'echeance'}",
                        "date": deadline.isoformat(),
                        "color": "#b42318" if overdue else "#f2b800",
                        "link": f"/pnpi/ati/{ati.id}",
                        "meta": {"jours_sla": sla, "overdue": overdue},
                    }
                )

        events.sort(key=lambda e: e["date"])
        return {"count": len(events), "events": events}
    except Exception:
        return {"count": 0, "events": []}

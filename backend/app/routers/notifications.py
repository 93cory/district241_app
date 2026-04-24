"""PNPI · Endpoint pour declencher les notifications SLA manuellement."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..core.notifications import notify_sla_overdue
from ..database import get_db, now_utc
from ..models.pnpi import AgrementTechniqueIndustrielORM

router = APIRouter(prefix="/pnpi/admin", tags=["Notifications"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}


@router.post("/notify-sla")
async def trigger_sla_notifications(
    emails: list[str],
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict:
    """Declenche l'envoi des alertes SLA pour les ATIs en retard."""
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut.notin_(_TERMINAL_STATUTS)
            )
        )
        .scalars()
        .all()
    )

    overdue = []
    for a in atis:
        age = max((now_utc().date() - a.date_soumission.date()).days, 0)
        if age > a.sla_jours:
            overdue.append(
                {
                    "numero_ati": a.numero_ati,
                    "type_activite": a.type_activite,
                    "age_jours": age,
                    "sla_jours": a.sla_jours,
                    "instructeur": a.instructeur_username,
                }
            )

    sent = notify_sla_overdue(overdue, emails)
    return {
        "overdue_count": len(overdue),
        "emails_sent": sent,
        "smtp_configured": bool(sent),
    }

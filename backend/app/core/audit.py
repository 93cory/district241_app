"""PNPI / PNPI — Audit, notifications systeme et alertes SLA."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import now_utc
from ..core.auth import Role


def write_audit_event(
    db: Session,
    *,
    actor: str,
    action: str,
    target: Optional[str] = None,
    details: str = "",
) -> None:
    from ..models.core import AuditEventORM

    row = AuditEventORM(
        id=f"AE-{uuid.uuid4().hex[:10].upper()}",
        timestamp=now_utc(),
        actor=actor,
        action=action.strip(),
        target=target.strip() if target else None,
        details=details.strip(),
    )
    db.add(row)


def create_system_notification(
    db: Session,
    *,
    title: str,
    message: str,
    severity: str = "info",
    target_role: Optional[Role] = None,
    notification_key: Optional[str] = None,
):
    from ..models.core import NotificationORM

    normalized_key = notification_key.strip() if notification_key else None
    if normalized_key:
        existing = db.execute(
            select(NotificationORM).where(NotificationORM.notification_key == normalized_key)
        ).scalar_one_or_none()
        if existing:
            return None
    row = NotificationORM(
        id=f"N-{uuid.uuid4().hex[:8].upper()}",
        target_role=target_role.value if target_role else None,
        title=title.strip(),
        message=message.strip(),
        severity=severity.strip().lower(),
        notification_key=normalized_key,
        created_at=now_utc(),
        is_read=False,
    )
    db.add(row)
    return row


def _emit_sla_notifications(db: Session) -> None:
    from ..models.pilotage import ProjectDossierORM
    from ..database import now_utc

    dossiers = db.execute(select(ProjectDossierORM)).scalars().unique().all()
    for dossier in dossiers:
        if dossier.status in {"approved", "rejected"}:
            continue
        age_days = max((now_utc().date() - dossier.submitted_at.date()).days, 0)
        if age_days > dossier.sla_days:
            create_system_notification(
                db,
                title="Dossier hors SLA",
                message=f"{dossier.id} depasse le delai SLA ({dossier.sla_days} jours).",
                severity="critical",
                target_role=Role.ministre,
                notification_key=f"sla-overdue:{dossier.id}:{now_utc().date().isoformat()}",
            )


def _emit_system_notification(
    db: Session,
    *,
    title: str,
    message: str,
    severity: str = "info",
    target_role: Optional[Role] = None,
    notification_key: Optional[str] = None,
) -> None:
    create_system_notification(
        db,
        title=title,
        message=message,
        severity=severity,
        target_role=target_role,
        notification_key=notification_key,
    )


# Re-export write_audit_event as _emit_audit_event for legacy compatibility
_emit_audit_event = write_audit_event

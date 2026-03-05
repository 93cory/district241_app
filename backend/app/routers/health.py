"""PNPI / PNPI — Endpoints de sante, metriques et alertes operationnelles."""
from __future__ import annotations

from typing import Dict

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..config import settings
from ..models.core import NotificationORM, UnitORM
from ..models.pilotage import ProjectDossierORM


router = APIRouter(tags=["Health & Ops"])


def _compute_dossier_age_days(row) -> int:
    return max((now_utc().date() - row.submitted_at.date()).days, 0)


@router.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok", "service": "PNPI/PNPI Backend", "database": settings.database_url}


@router.get("/health/detailed")
async def health_detailed(
    _: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    try:
        db.execute(select(func.count(UnitORM.id))).scalar_one()
        database_state = "ok"
    except Exception:
        database_state = "error"
    overdue_dossiers = db.execute(
        select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"]))
    ).scalars().unique().all()
    overdue_count = sum(
        1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days
    )
    unread_critical = db.execute(
        select(func.count(NotificationORM.id)).where(
            NotificationORM.is_read.is_(False),
            NotificationORM.severity.in_(["high", "critical"]),
        )
    ).scalar_one()
    from ..main import _request_metrics
    return {
        "status": "ok" if database_state == "ok" else "degraded",
        "service": "PNPI/PNPI Backend",
        "database": database_state,
        "timestamp": now_utc().isoformat(),
        "overdue_dossiers": overdue_count,
        "unread_high_critical_notifications": unread_critical,
        "request_metric_keys": len(_request_metrics),
    }


@router.get("/metrics")
async def metrics(
    _: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    from ..main import _request_metrics, _request_duration_ms, _compute_error_rate, _rate_limit_store

    overdue_dossiers = db.execute(
        select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"]))
    ).scalars().unique().all()
    overdue_count = sum(
        1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days
    )
    unread_critical = db.execute(
        select(func.count(NotificationORM.id)).where(
            NotificationORM.is_read.is_(False),
            NotificationORM.severity.in_(["high", "critical"]),
        )
    ).scalar_one()
    average_duration_ms: Dict[str, float] = {}
    for key, total in _request_duration_ms.items():
        calls = sum(count for metric_key, count in _request_metrics.items() if metric_key.startswith(key))
        average_duration_ms[key] = round(total / calls, 2) if calls > 0 else 0.0

    return {
        "timestamp": now_utc().isoformat(),
        "technical": {
            "request_counters": dict(_request_metrics),
            "average_duration_ms": average_duration_ms,
            "error_rate": round(_compute_error_rate(), 4),
            "rate_limit_bucket_count": len(_rate_limit_store),
        },
        "business": {
            "overdue_dossiers": overdue_count,
            "unread_high_critical_notifications": unread_critical,
        },
    }


@router.post("/ops/alerts/check")
async def ops_alerts_check(
    current_user: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    from ..main import _build_ops_alerts_payload, _send_ops_alert_webhook, _compute_error_rate

    overdue_dossiers = db.execute(
        select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"]))
    ).scalars().unique().all()
    overdue_count = sum(
        1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days
    )
    unread_critical = db.execute(
        select(func.count(NotificationORM.id)).where(
            NotificationORM.is_read.is_(False),
            NotificationORM.severity.in_(["high", "critical"]),
        )
    ).scalar_one()
    error_rate = _compute_error_rate()
    payload = _build_ops_alerts_payload(
        overdue_dossiers=overdue_count,
        unread_high_critical_notifications=unread_critical,
        error_rate=error_rate,
    )
    webhook_result = _send_ops_alert_webhook(payload) if payload["alerts"] else {"status": "noop"}
    write_audit_event(
        db,
        actor=current_user.username,
        action="ops.alerts.check",
        target="ops-alerts",
        details=f"alerts={len(payload['alerts'])}; webhook={webhook_result.get('status')}",
    )
    db.commit()
    return {"payload": payload, "webhook": webhook_result}

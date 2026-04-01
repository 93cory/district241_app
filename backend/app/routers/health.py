"""PNPI / PNPI — Endpoints de sante, metriques et alertes operationnelles."""
from __future__ import annotations

import os
import time
from typing import Dict

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select, text

from ..core.analytics import get_usage_stats
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
    return {"status": "ok", "service": "PNPI/PNPI Backend"}


@router.get("/health/status")
async def system_status(db: Session = Depends(get_db)):
    """Public system status page — no auth required."""
    checks = []
    overall = "operational"

    # Database
    try:
        start = time.perf_counter()
        db.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - start) * 1000, 1)
        checks.append({"name": "Base de donnees", "status": "operational", "latency_ms": latency})
    except Exception:
        checks.append({"name": "Base de donnees", "status": "down", "latency_ms": None})
        overall = "degraded"

    # Backend API
    checks.append({"name": "API Backend", "status": "operational", "latency_ms": 0})

    # Check table counts as health proxy
    try:
        from ..models.pnpi import AgrementTechniqueIndustrielORM, OperateurIndustrielORM
        ati_count = db.execute(select(func.count()).select_from(AgrementTechniqueIndustrielORM)).scalar() or 0
        op_count = db.execute(select(func.count()).select_from(OperateurIndustrielORM)).scalar() or 0
        checks.append({"name": "Donnees ATI", "status": "operational", "detail": f"{ati_count} enregistrements"})
        checks.append({"name": "Donnees Operateurs", "status": "operational", "detail": f"{op_count} enregistrements"})
    except Exception:
        checks.append({"name": "Donnees", "status": "degraded", "detail": "Erreur de lecture"})
        overall = "degraded"

    from ..core.metrics import metrics as _metrics_singleton
    uptime_hours = round((time.time() - _metrics_singleton._start_time) / 3600, 1)

    return {
        "status": overall,
        "uptime_hours": uptime_hours,
        "checks": checks,
        "version": "1.26.0",
        "timestamp": now_utc().isoformat(),
    }


@router.get("/health/detailed")
async def health_detailed(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
) -> Dict[str, object]:
    now = now_utc()
    components: Dict[str, object] = {}

    # Database check with latency measurement
    try:
        t0 = time.perf_counter()
        db.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - t0) * 1000, 2)
        components["database"] = {"status": "ok", "latency_ms": latency_ms}
    except Exception as e:
        components["database"] = {"status": "down", "error": str(e)[:200]}

    # Count active sessions (refresh tokens)
    try:
        from ..models.core import RefreshTokenORM
        active_sessions = db.execute(
            select(func.count(RefreshTokenORM.id)).where(
                RefreshTokenORM.revoked_at.is_(None),
                RefreshTokenORM.expires_at > now,
            )
        ).scalar_one()
        components["active_sessions"] = active_sessions
    except Exception:
        components["active_sessions"] = "unknown"

    # Table counts
    try:
        from ..models.pnpi import AgrementTechniqueIndustrielORM, OperateurIndustrielORM, InspectionConformiteORM
        from ..models.core import UserAccountORM, AuditEventORM
        components["counts"] = {
            "users": db.execute(select(func.count(UserAccountORM.username))).scalar_one(),
            "operateurs": db.execute(select(func.count(OperateurIndustrielORM.id))).scalar_one(),
            "atis": db.execute(select(func.count(AgrementTechniqueIndustrielORM.id))).scalar_one(),
            "inspections": db.execute(select(func.count(InspectionConformiteORM.id))).scalar_one(),
            "audit_events": db.execute(select(func.count(AuditEventORM.id))).scalar_one(),
        }
    except Exception:
        components["counts"] = "unavailable"

    # Check disk space for uploads
    import shutil
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
    try:
        usage = shutil.disk_usage(uploads_dir if os.path.exists(uploads_dir) else "/")
        components["disk"] = {
            "total_gb": round(usage.total / (1024**3), 2),
            "free_gb": round(usage.free / (1024**3), 2),
            "used_pct": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        components["disk"] = "unavailable"

    # Overdue dossiers (preserved from original)
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

    # Overall status
    db_ok = isinstance(components.get("database"), dict) and components["database"].get("status") == "ok"
    overall = "ok" if db_ok else "degraded"

    from ..main import _request_metrics
    return {
        "status": overall,
        "timestamp": now.isoformat(),
        "version": "1.0.0",
        "environment": settings.env,
        "service": "PNPI/PNPI Backend",
        "overdue_dossiers": overdue_count,
        "unread_high_critical_notifications": unread_critical,
        "request_metric_keys": len(_request_metrics),
        "components": components,
    }


@router.get("/metrics")
async def metrics(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
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

    # Uptime and connection pool info
    import time as _time
    uptime_info: Dict[str, object] = {}
    try:
        from ..database import engine as _db_engine
        pool = _db_engine.pool
        uptime_info["pool_size"] = pool.size() if callable(getattr(pool, "size", None)) else "n/a"
        uptime_info["pool_checkedin"] = pool.checkedin() if callable(getattr(pool, "checkedin", None)) else "n/a"
        uptime_info["pool_checkedout"] = pool.checkedout() if callable(getattr(pool, "checkedout", None)) else "n/a"
        uptime_info["pool_overflow"] = pool.overflow() if callable(getattr(pool, "overflow", None)) else "n/a"
    except Exception:
        uptime_info["pool"] = "unavailable"

    return {
        "timestamp": now_utc().isoformat(),
        "technical": {
            "request_counters": dict(_request_metrics),
            "average_duration_ms": average_duration_ms,
            "error_rate": round(_compute_error_rate(), 4),
            "rate_limit_bucket_count": len(_rate_limit_store),
            "connection_pool": uptime_info,
        },
        "business": {
            "overdue_dossiers": overdue_count,
            "unread_high_critical_notifications": unread_critical,
        },
    }


@router.post("/ops/alerts/check")
async def ops_alerts_check(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
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


@router.get("/analytics/usage")
async def usage_analytics(
    days: int = Query(default=30, ge=1, le=365),
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
) -> dict:
    return get_usage_stats(db, days=days)

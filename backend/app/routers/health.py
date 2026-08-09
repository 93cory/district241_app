"""PNPI / PNPI · Endpoints de sante, metriques et alertes operationnelles."""

from __future__ import annotations

import os
import time
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from ..config import settings
from ..core.analytics import get_usage_stats
from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..core.feature_flags import flags
from ..database import get_db, now_utc
from ..models.core import AuditEventORM, LoginHistoryORM, NotificationORM, RefreshTokenORM, UserAccountORM
from ..models.pilotage import ProjectDossierORM

router = APIRouter(tags=["Health & Ops"])


def _compute_dossier_age_days(row) -> int:
    return max((now_utc().date() - row.submitted_at.date()).days, 0)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "PNPI/PNPI Backend"}


@router.get("/health/score", summary="Score de sante global (0-100)")
async def health_score(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    """Score composite: DB, cache, disque, erreurs, retards, utilisateurs actifs."""
    from ..core.health_score import compute_health_score

    return await compute_health_score(db)


@router.get("/health/live")
async def liveness() -> dict[str, str]:
    """Liveness probe · always returns 200 if the process is running."""
    return {"status": "alive"}


@router.get("/health/ready")
async def readiness(db: Session = Depends(get_db)) -> dict[str, object]:
    """Readiness probe · checks that DB and cache are reachable."""
    checks = {}
    ready = True

    # Database
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "down"
        ready = False

    # Redis/Cache
    try:
        from ..core.cache import cache

        await cache.set("ready:ping", "1", ttl=5)
        checks["cache"] = "ok"
    except Exception:
        checks["cache"] = "down"
        ready = False

    status_code = 200 if ready else 503
    from starlette.responses import JSONResponse

    return JSONResponse(
        status_code=status_code,
        content={"ready": ready, "checks": checks},
    )


@router.get("/health/flags")
async def feature_flags_status(
    _: User = Depends(require_roles(Role.admin)),
) -> dict[str, object]:
    """List all feature flags and their current status (admin only)."""
    return {"flags": flags.all_flags()}


@router.get("/health/status")
async def system_status(db: Session = Depends(get_db)):
    """Public system status page · no auth required."""
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

    # Connection pool
    try:
        from ..database import get_pool_status

        pool = get_pool_status()
        checks.append(
            {
                "name": "Connection Pool",
                "status": "operational",
                "detail": f"{pool['checked_out']}/{pool['pool_size']} actives",
            }
        )
    except Exception:
        checks.append({"name": "Connection Pool", "status": "unknown"})

    # Redis
    try:
        from ..core.cache import cache

        await cache.set("health:ping", "pong", ttl=10)
        val = await cache.get("health:ping")
        if val == "pong":
            checks.append({"name": "Cache Redis", "status": "operational"})
        else:
            checks.append({"name": "Cache Redis", "status": "degraded", "detail": "Lecture echouee"})
            overall = "degraded"
    except Exception:
        checks.append({"name": "Cache Redis", "status": "down"})
        overall = "degraded"

    # Disk space
    try:
        import shutil

        usage = shutil.disk_usage("/")
        free_gb = round(usage.free / (1024**3), 1)
        used_pct = round(usage.used / usage.total * 100, 1)
        disk_status = "operational" if used_pct < 90 else "degraded"
        if disk_status == "degraded":
            overall = "degraded"
        checks.append(
            {"name": "Espace disque", "status": disk_status, "detail": f"{free_gb} Go libres ({used_pct}% utilise)"}
        )
    except Exception:
        checks.append({"name": "Espace disque", "status": "unknown"})

    from ..core.metrics import metrics as _metrics_singleton

    uptime_hours = round((time.time() - _metrics_singleton._start_time) / 3600, 1)

    return {
        "status": overall,
        "uptime_hours": uptime_hours,
        "checks": checks,
        "version": "1.27.0",
        "timestamp": now_utc().isoformat(),
    }


@router.get("/health/detailed")
async def health_detailed(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    now = now_utc()
    components: dict[str, object] = {}

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
        from ..models.core import AuditEventORM, UserAccountORM
        from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM, OperateurIndustrielORM

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
    overdue_dossiers = (
        db.execute(select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"])))
        .scalars()
        .unique()
        .all()
    )
    overdue_count = sum(1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days)
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
) -> dict[str, object]:
    from ..main import _compute_error_rate, _rate_limit_store, _request_duration_ms, _request_metrics

    overdue_dossiers = (
        db.execute(select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"])))
        .scalars()
        .unique()
        .all()
    )
    overdue_count = sum(1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days)
    unread_critical = db.execute(
        select(func.count(NotificationORM.id)).where(
            NotificationORM.is_read.is_(False),
            NotificationORM.severity.in_(["high", "critical"]),
        )
    ).scalar_one()
    average_duration_ms: dict[str, float] = {}
    for key, total in _request_duration_ms.items():
        calls = sum(count for metric_key, count in _request_metrics.items() if metric_key.startswith(key))
        average_duration_ms[key] = round(total / calls, 2) if calls > 0 else 0.0

    # Uptime and connection pool info
    uptime_info: dict[str, object] = {}
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


@router.get("/admin/operations/cockpit", summary="Cockpit d'exploitation administrative PNPI")
async def operations_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Synthese exploitation : services, securite, sauvegardes, audit, changements.

    Ce cockpit donne une lecture non technique pour les responsables :
    l'application est-elle exploitable, surveillee, sauvegardee et gouvernee ?
    """

    now = now_utc()

    def score_status(score: int) -> str:
        if score >= 80:
            return "ok"
        if score >= 55:
            return "warning"
        return "critical"

    components: list[dict[str, object]] = []
    alerts: list[dict[str, object]] = []

    # Database
    db_latency_ms: float | None = None
    db_score = 0
    try:
        start = time.perf_counter()
        db.execute(text("SELECT 1"))
        db_latency_ms = round((time.perf_counter() - start) * 1000, 2)
        db_score = 100 if db_latency_ms < 100 else 85 if db_latency_ms < 300 else 60
    except Exception as exc:
        alerts.append(
            {
                "severity": "critical",
                "title": "Base de données indisponible",
                "detail": str(exc)[:220],
                "action": "Vérifier PostgreSQL, migrations et connectivité réseau.",
            }
        )
    components.append(
        {
            "key": "database",
            "label": "Base de données",
            "score": db_score,
            "status": score_status(db_score),
            "detail": f"Latence {db_latency_ms} ms" if db_latency_ms is not None else "Connexion impossible",
        }
    )

    # Cache
    cache_score = 0
    try:
        from ..core.cache import cache

        await cache.set("ops:ping", "ok", ttl=10)
        cache_score = 100 if await cache.get("ops:ping") == "ok" else 55
    except Exception as exc:
        alerts.append(
            {
                "severity": "warning",
                "title": "Cache dégradé",
                "detail": str(exc)[:220],
                "action": "Vérifier Redis ou accepter le fallback mémoire en démonstration.",
            }
        )
    components.append(
        {
            "key": "cache",
            "label": "Cache / sessions techniques",
            "score": cache_score,
            "status": score_status(cache_score),
            "detail": "Redis opérationnel" if cache_score >= 80 else "Cache indisponible ou fallback",
        }
    )

    # Disk / uploads
    disk_score = 70
    disk_detail = "Non mesuré"
    try:
        import shutil

        upload_root = Path(os.getenv("PNPI_UPLOAD_DIR", "uploads/ati"))
        usage = shutil.disk_usage(upload_root if upload_root.exists() else Path("/"))
        used_pct = round(usage.used / usage.total * 100, 1)
        free_gb = round(usage.free / (1024**3), 2)
        disk_score = 100 if used_pct < 75 else 75 if used_pct < 90 else 35
        disk_detail = f"{free_gb} Go libres · {used_pct}% utilisé"
        if disk_score < 60:
            alerts.append(
                {
                    "severity": "critical",
                    "title": "Espace disque faible",
                    "detail": disk_detail,
                    "action": "Purger les fichiers temporaires ou augmenter le volume de stockage.",
                }
            )
    except Exception as exc:
        disk_detail = str(exc)[:220]
    components.append(
        {
            "key": "disk",
            "label": "Stockage fichiers",
            "score": disk_score,
            "status": score_status(disk_score),
            "detail": disk_detail,
        }
    )

    # Business operations
    overdue_dossiers = (
        db.execute(select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"])))
        .scalars()
        .unique()
        .all()
    )
    overdue_count = sum(1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days)
    unread_critical = int(
        db.execute(
            select(func.count(NotificationORM.id)).where(
                NotificationORM.is_read.is_(False),
                NotificationORM.severity.in_(["high", "critical"]),
            )
        ).scalar()
        or 0
    )
    business_score = max(20, 100 - min(60, overdue_count * 8) - min(25, unread_critical * 5))
    components.append(
        {
            "key": "business_ops",
            "label": "Opérations métier",
            "score": business_score,
            "status": score_status(business_score),
            "detail": f"{overdue_count} dossier(s) en retard · {unread_critical} alerte(s) critique(s) non lue(s)",
        }
    )

    # Security / identity
    users_total = int(db.execute(select(func.count(UserAccountORM.username))).scalar() or 0)
    users_active = int(
        db.execute(select(func.count(UserAccountORM.username)).where(UserAccountORM.is_active.is_(True))).scalar() or 0
    )
    totp_enabled = int(
        db.execute(select(func.count(UserAccountORM.username)).where(UserAccountORM.totp_enabled.is_(True))).scalar()
        or 0
    )
    failed_24h = int(
        db.execute(
            select(func.count(LoginHistoryORM.id)).where(
                LoginHistoryORM.success.is_(False),
                LoginHistoryORM.created_at >= now.replace(hour=0, minute=0, second=0, microsecond=0),
            )
        ).scalar()
        or 0
    )
    security_score = min(
        100, round((users_active / max(users_total, 1)) * 55 + (totp_enabled / max(users_total, 1)) * 35)
    )
    security_score = max(20, security_score - min(25, failed_24h * 2))
    components.append(
        {
            "key": "identity",
            "label": "Identités & habilitations",
            "score": security_score,
            "status": score_status(security_score),
            "detail": f"{users_active}/{users_total} comptes actifs · MFA {totp_enabled}/{users_total} · {failed_24h} échec(s) aujourd'hui",
        }
    )

    # Backups
    backup_dir = Path(os.getenv("PNPI_BACKUP_DIR", "backups"))
    backups = sorted(backup_dir.glob("*"), key=lambda p: p.stat().st_mtime, reverse=True) if backup_dir.exists() else []
    latest_backup = backups[0] if backups else None
    backup_score = 30
    backup_detail = "Aucune sauvegarde locale détectée"
    if latest_backup:
        age_hours = round((time.time() - latest_backup.stat().st_mtime) / 3600, 1)
        backup_score = 100 if age_hours <= 24 else 80 if age_hours <= 72 else 45
        backup_detail = f"Dernière sauvegarde : {latest_backup.name} · {age_hours} h"
    components.append(
        {
            "key": "backups",
            "label": "Sauvegardes",
            "score": backup_score,
            "status": score_status(backup_score),
            "detail": backup_detail,
        }
    )

    audit_events_7d = int(
        db.execute(
            select(func.count(AuditEventORM.id)).where(
                AuditEventORM.timestamp >= now.replace(hour=0, minute=0, second=0, microsecond=0)
            )
        ).scalar()
        or 0
    )
    active_sessions = int(
        db.execute(
            select(func.count(RefreshTokenORM.id)).where(
                RefreshTokenORM.revoked_at.is_(None),
                RefreshTokenORM.expires_at > now,
            )
        ).scalar()
        or 0
    )

    from ..main import _compute_error_rate, _request_metrics

    error_rate = _compute_error_rate()
    api_score = max(30, 100 - round(error_rate * 1000))
    components.append(
        {
            "key": "api",
            "label": "API & supervision",
            "score": api_score,
            "status": score_status(api_score),
            "detail": f"Taux erreur {round(error_rate * 100, 2)}% · {len(_request_metrics)} métrique(s)",
        }
    )

    global_score = round(sum(int(item["score"]) for item in components) / max(len(components), 1))
    if unread_critical:
        alerts.append(
            {
                "severity": "warning",
                "title": "Notifications critiques non lues",
                "detail": f"{unread_critical} notification(s) doivent être traitées.",
                "action": "Ouvrir le centre de notifications et assigner une action.",
            }
        )
    if overdue_count:
        alerts.append(
            {
                "severity": "warning",
                "title": "Retards opérationnels",
                "detail": f"{overdue_count} dossier(s) dépassent leur SLA.",
                "action": "Arbitrer les dossiers en retard dans le centre de pilotage.",
            }
        )

    return {
        "generated_at": now.isoformat(),
        "score_exploitation": global_score,
        "grade": "A" if global_score >= 90 else "B" if global_score >= 75 else "C" if global_score >= 60 else "D",
        "environment": settings.env,
        "version": "1.27.0",
        "stats": {
            "users_total": users_total,
            "users_active": users_active,
            "totp_enabled": totp_enabled,
            "active_sessions": active_sessions,
            "failed_logins_today": failed_24h,
            "audit_events_today": audit_events_7d,
            "backups": len(backups),
            "overdue_dossiers": overdue_count,
            "unread_critical": unread_critical,
        },
        "components": components,
        "alerts": alerts[:8],
        "runbooks": [
            {
                "title": "Incident API",
                "steps": [
                    "Qualifier l'impact",
                    "Lire les logs",
                    "Notifier le responsable",
                    "Corriger",
                    "Rédiger le REX",
                ],
            },
            {
                "title": "Sauvegarde",
                "steps": [
                    "Vérifier dernier backup",
                    "Déclencher une sauvegarde",
                    "Contrôler l'archive",
                    "Journaliser l'opération",
                ],
            },
            {
                "title": "Changement applicatif",
                "steps": ["Décrire le changement", "Tester", "Valider", "Déployer", "Surveiller 24h"],
            },
        ],
        "change_pipeline": [
            {"stage": "Demande", "owner": "Métier / DSI", "status": "cible"},
            {"stage": "Analyse d'impact", "owner": "Admin PNPI", "status": "cible"},
            {"stage": "Tests", "owner": "Équipe technique", "status": "partiel"},
            {"stage": "Déploiement", "owner": "Exploitation", "status": "partiel"},
            {"stage": "Surveillance post-déploiement", "owner": "SOC / Ops", "status": "partiel"},
        ],
        "principes": [
            "Toute action sensible doit être auditée.",
            "La sauvegarde doit être vérifiable, pas seulement déclenchée.",
            "Un changement applicatif suit un cycle : demande, test, validation, déploiement, surveillance.",
            "Les indicateurs techniques doivent être reliés aux risques métier : dossiers en retard, notifications critiques, disponibilité.",
        ],
        "lecture_executive": (
            "Le cockpit d'exploitation donne une vue opérationnelle du PNPI : services, données, sécurité, "
            "sauvegardes, supervision et procédures de changement sont suivis dans une même lecture."
        ),
    }


@router.post("/ops/alerts/check")
async def ops_alerts_check(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    from ..main import _build_ops_alerts_payload, _compute_error_rate, _send_ops_alert_webhook

    overdue_dossiers = (
        db.execute(select(ProjectDossierORM).where(ProjectDossierORM.status.notin_(["approved", "rejected"])))
        .scalars()
        .unique()
        .all()
    )
    overdue_count = sum(1 for dossier in overdue_dossiers if _compute_dossier_age_days(dossier) > dossier.sla_days)
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

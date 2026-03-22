"""PNPI / PNPI — Application FastAPI principale (architecture modulaire)."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import csv
import hashlib
import io
import logging
import os
import re
import secrets
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from statistics import median
from typing import AsyncIterator, Dict, List, Optional, Sequence, Tuple

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String, create_engine, func, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

# ---------------------------------------------------------------------------
# Re-export from modular packages for backward compatibility
# ---------------------------------------------------------------------------
from .config import settings
from .database import Base, SessionLocal, as_utc, engine, get_db, now_utc
from .core.auth import (
    Role,
    Token,
    TokenData,
    RefreshTokenRequest,
    User,
    UserInDB,
    authenticate_user,
    build_user,
    create_access_token,
    csv_to_roles,
    enforce_security_prerequisites,
    fake_users_db,
    get_current_user,
    get_password_hash,
    issue_refresh_token,
    oauth2_scheme,
    pwd_context,
    require_roles,
    roles_to_csv,
    token_digest,
    user_from_row,
    validate_password_policy,
    verify_password,
)
from .core.metrics import MetricsMiddleware, metrics
from .core.audit import (
    _emit_audit_event,
    _emit_sla_notifications,
    _emit_system_notification,
    create_system_notification,
    write_audit_event,
)
from .models import (
    AuditEventORM,
    DeclarationORM,
    FieldReportORM,
    NotificationORM,
    ProjectDossierORM,
    ProjectDossierTransitionORM,
    RefreshTokenORM,
    TraceBatchORM,
    UnitORM,
    UserAccountORM,
    # PNPI models
    AgrementTechniqueIndustrielORM,
    ATITransitionORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)

# ---------------------------------------------------------------------------
# Legacy constants (kept for backward compatibility with existing code)
# ---------------------------------------------------------------------------
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
DATABASE_URL = settings.database_url
PNPI_ENV = settings.env
RATE_LIMIT_WINDOW_SECONDS = settings.rate_limit_window_seconds
AUTH_RATE_LIMIT_MAX_REQUESTS = settings.auth_rate_limit_max
SENSITIVE_RATE_LIMIT_MAX_REQUESTS = settings.sensitive_rate_limit_max
ALERT_WEBHOOK_URL = settings.alert_webhook_url
ALERT_OVERDUE_THRESHOLD = settings.alert_overdue_threshold
ALERT_UNREAD_CRITICAL_THRESHOLD = settings.alert_unread_critical_threshold
ALERT_ERROR_RATE_THRESHOLD = settings.alert_error_rate_threshold
CORS_ALLOW_ORIGINS_RAW = settings.cors_origins

logger = logging.getLogger("pnpi")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(message)s")

_rate_limit_store: Dict[str, List[datetime]] = defaultdict(list)
_request_metrics: Dict[str, int] = defaultdict(int)
_request_duration_ms: Dict[str, float] = defaultdict(float)
_sla_policy_days: Dict[str, int] = {
    "low": settings.sla_low_days,
    "medium": settings.sla_medium_days,
    "high": settings.sla_high_days,
}

SECTOR_IMPORT_BASELINES: Dict[str, float] = {
    "Bois": 880,
    "Agroalimentaire": 640,
    "Peche": 500,
    "Cacao": 250,
    "Manioc": 190,
}

log_entries: List[dict] = []


def log_action(actor: str, action: str, details: str) -> None:
    log_entries.insert(
        0,
        {
            "timestamp": now_utc(),
            "actor": actor,
            "action": action,
            "details": details,
        },
    )


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        first = forwarded_for.split(",")[0].strip()
        if first:
            return first
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def enforce_rate_limit(
    *,
    key: str,
    limit: int,
    window_seconds: int = RATE_LIMIT_WINDOW_SECONDS,
) -> None:
    if os.getenv("PNPI_DISABLE_RATE_LIMIT", "0") == "1":
        return
    if "PYTEST_CURRENT_TEST" in os.environ:
        return
    now = now_utc()
    window_start = now - timedelta(seconds=window_seconds)
    bucket = _rate_limit_store[key]
    bucket[:] = [item for item in bucket if item >= window_start]
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Trop de requetes. Reessayez dans {window_seconds} secondes.",
        )
    bucket.append(now)


def _compute_error_rate() -> float:
    total = 0
    errors = 0
    for key, count in _request_metrics.items():
        if "status:" not in key:
            continue
        total += count
        try:
            status_code = int(key.split("status:")[-1])
            if status_code >= 500:
                errors += count
        except ValueError:
            continue
    if total == 0:
        return 0.0
    return errors / total


def _build_ops_alerts_payload(
    *,
    overdue_dossiers: int,
    unread_high_critical_notifications: int,
    error_rate: float,
) -> Dict[str, object]:
    alerts: List[str] = []
    if overdue_dossiers > ALERT_OVERDUE_THRESHOLD:
        alerts.append(
            f"Overdue dossiers eleves: {overdue_dossiers} > {ALERT_OVERDUE_THRESHOLD}"
        )
    if unread_high_critical_notifications > ALERT_UNREAD_CRITICAL_THRESHOLD:
        alerts.append(
            "Notifications critiques non lues elevees: "
            f"{unread_high_critical_notifications} > {ALERT_UNREAD_CRITICAL_THRESHOLD}"
        )
    if error_rate > ALERT_ERROR_RATE_THRESHOLD:
        alerts.append(
            f"Taux d'erreur HTTP eleve: {round(error_rate * 100, 2)}% > {round(ALERT_ERROR_RATE_THRESHOLD * 100, 2)}%"
        )
    return {
        "service": "PNPI/PNPI Backend",
        "timestamp": now_utc().isoformat(),
        "overdue_dossiers": overdue_dossiers,
        "unread_high_critical_notifications": unread_high_critical_notifications,
        "error_rate": round(error_rate, 4),
        "alerts": alerts,
    }


def _send_ops_alert_webhook(payload: Dict[str, object]) -> Dict[str, object]:
    if not ALERT_WEBHOOK_URL:
        return {"status": "skipped", "reason": "PNPI_ALERT_WEBHOOK_URL non configure"}
    try:
        response = httpx.post(ALERT_WEBHOOK_URL, json=payload, timeout=8.0)
        return {"status": "sent", "http_status": response.status_code}
    except Exception as error:
        return {"status": "failed", "error": str(error)}


# ---------------------------------------------------------------------------
# Pydantic schemas (legacy, kept for backward compat)
# ---------------------------------------------------------------------------

class UnitStatus(str, Enum):
    active = "active"
    inactive = "inactive"


class ProductionDeclarationCreate(BaseModel):
    month: date
    volume_tons: float
    jobs: int
    validated: bool = Field(..., description="Validation par les inspecteurs")


class ProductionDeclarationRead(ProductionDeclarationCreate):
    id: str
    submitted_at: datetime
    submitted_by: str


class IndustrialUnitBase(BaseModel):
    name: str
    sector: str
    capacity: float
    equipment: str
    location: str
    status: UnitStatus = UnitStatus.active


class IndustrialUnitCreate(IndustrialUnitBase):
    pass


class IndustrialUnitRead(IndustrialUnitBase):
    id: str
    declarations: List[ProductionDeclarationRead] = Field(default_factory=list)


class SectorIndicator(BaseModel):
    sector: str
    local_volume_tons: float
    import_volume_tons: float
    jobs: int


class ForecastPoint(BaseModel):
    month: str
    volume_tons: float


class TraceBatchBase(BaseModel):
    product: str
    origin: str
    factory: str
    certification: str
    quantity_tons: float
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    factory_lat: Optional[float] = None
    factory_lng: Optional[float] = None


class TraceBatchCreate(TraceBatchBase):
    pass


class TraceBatchRead(TraceBatchBase):
    batch_id: str
    timestamp: datetime
    qr_code: str


class LogEntry(BaseModel):
    timestamp: datetime
    actor: str
    action: str
    details: str


class DashboardSnapshot(BaseModel):
    created_at: datetime
    indicators: Sequence[SectorIndicator]
    national_index: float
    jobs_created: int
    import_gap_tons: float
    active_units: int
    active_zones: int
    traced_batches: int


class DashboardAlert(BaseModel):
    id: str
    severity: str
    title: str
    detail: str
    source: str
    created_at: datetime


class UserAccountCreate(BaseModel):
    username: str
    full_name: str
    password: str
    roles: List[Role]
    is_active: bool = True


class UserAccountRead(BaseModel):
    username: str
    full_name: str
    roles: List[Role]
    is_active: bool
    created_at: datetime


class NotificationCreate(BaseModel):
    target_role: Optional[Role] = None
    title: str
    message: str
    severity: str = "info"


class NotificationRead(BaseModel):
    id: str
    target_role: Optional[Role] = None
    title: str
    message: str
    severity: str
    created_at: datetime
    is_read: bool


class NotificationReadUpdate(BaseModel):
    is_read: bool = True


class DeclarationValidationUpdate(BaseModel):
    validated: bool = True


class FieldReportCreate(BaseModel):
    unit_id: Optional[str] = None
    title: str
    comment: str
    severity: str = "medium"
    location: Optional[str] = None


class FieldReportRead(BaseModel):
    id: str
    unit_id: Optional[str] = None
    title: str
    comment: str
    severity: str
    location: Optional[str] = None
    status: str
    created_at: datetime
    created_by: str


class FieldReportStatusUpdate(BaseModel):
    status: str


class ProjectDossierRead(BaseModel):
    id: str
    company_name: str
    project_title: str
    sector: str
    location: str
    status: str
    stage: str
    priority: str
    sla_days: int
    submitted_at: datetime
    updated_at: datetime
    decision_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[Role] = None
    decision_reason: Optional[str] = None
    decision_reference: Optional[str] = None
    age_days: int
    is_overdue: bool


class ProjectDossierCreate(BaseModel):
    company_name: str
    project_title: str
    sector: str
    location: str
    priority: str = "medium"
    sla_days: Optional[int] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[Role] = None


class ProjectDossierUpdate(BaseModel):
    status: Optional[str] = None
    stage: Optional[str] = None
    priority: Optional[str] = None
    sla_days: Optional[int] = None
    assigned_to: Optional[str] = None
    assigned_role: Optional[Role] = None
    decision_reason: Optional[str] = None
    decision_reference: Optional[str] = None


class ProjectDossierTransitionRead(BaseModel):
    id: str
    dossier_id: str
    changed_by: str
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    previous_stage: Optional[str] = None
    new_stage: Optional[str] = None
    note: str
    changed_at: datetime


class PilotageStatusCount(BaseModel):
    key: str
    count: int


class PilotageKpiSnapshot(BaseModel):
    generated_at: datetime
    total_dossiers: int
    in_progress_dossiers: int
    overdue_dossiers: int
    approval_rate: float
    median_processing_days: float
    sla_compliance_rate: float
    status_breakdown: List[PilotageStatusCount]
    stage_breakdown: List[PilotageStatusCount]


class ExecutiveBreakdownItem(BaseModel):
    key: str
    total: int
    overdue: int


class ExecutiveStageDelay(BaseModel):
    stage: str
    average_age_days: float
    dossiers: int


class ExecutiveMonthlyPoint(BaseModel):
    month: str
    created: int
    decided: int


class PilotageExecutiveDashboard(BaseModel):
    generated_at: datetime
    total_dossiers: int
    overdue_backlog: int
    approval_rate: float
    by_sector: List[ExecutiveBreakdownItem]
    by_location: List[ExecutiveBreakdownItem]
    by_direction: List[ExecutiveBreakdownItem]
    stage_delays: List[ExecutiveStageDelay]
    monthly_trend: List[ExecutiveMonthlyPoint]


class AuditEventRead(BaseModel):
    id: str
    timestamp: datetime
    actor: str
    action: str
    target: Optional[str] = None
    details: str


class SlaPolicyUpdate(BaseModel):
    low: int = 45
    medium: int = 30
    high: int = 21


# ---------------------------------------------------------------------------
# Helper functions (legacy)
# ---------------------------------------------------------------------------

def to_declaration_read(row: DeclarationORM) -> ProductionDeclarationRead:
    return ProductionDeclarationRead(
        id=row.id,
        month=row.month,
        volume_tons=row.volume_tons,
        jobs=row.jobs,
        validated=row.validated,
        submitted_at=row.submitted_at,
        submitted_by=row.submitted_by,
    )


def to_unit_read(row: UnitORM) -> IndustrialUnitRead:
    declarations = sorted(row.declarations, key=lambda d: d.month, reverse=True)
    return IndustrialUnitRead(
        id=row.id,
        name=row.name,
        sector=row.sector,
        capacity=row.capacity,
        equipment=row.equipment,
        location=row.location,
        status=UnitStatus(row.status),
        declarations=[to_declaration_read(decl) for decl in declarations],
    )


def to_batch_read(row: TraceBatchORM) -> TraceBatchRead:
    return TraceBatchRead(
        batch_id=row.batch_id,
        product=row.product,
        origin=row.origin,
        factory=row.factory,
        certification=row.certification,
        quantity_tons=row.quantity_tons,
        origin_lat=row.origin_lat,
        origin_lng=row.origin_lng,
        factory_lat=row.factory_lat,
        factory_lng=row.factory_lng,
        timestamp=row.timestamp,
        qr_code=row.qr_code,
    )


def to_user_account_read(row: UserAccountORM) -> UserAccountRead:
    return UserAccountRead(
        username=row.username,
        full_name=row.full_name,
        roles=csv_to_roles(row.roles_csv),
        is_active=row.is_active,
        created_at=row.created_at,
    )


def to_notification_read(row: NotificationORM) -> NotificationRead:
    target_role = Role(row.target_role) if row.target_role in Role._value2member_map_ else None
    return NotificationRead(
        id=row.id,
        target_role=target_role,
        title=row.title,
        message=row.message,
        severity=row.severity,
        created_at=row.created_at,
        is_read=row.is_read,
    )


def to_field_report_read(row: FieldReportORM) -> FieldReportRead:
    return FieldReportRead(
        id=row.id,
        unit_id=row.unit_id,
        title=row.title,
        comment=row.comment,
        severity=row.severity,
        location=row.location,
        status=row.status,
        created_at=row.created_at,
        created_by=row.created_by,
    )


def _compute_dossier_age_days(row: ProjectDossierORM) -> int:
    return max((now_utc().date() - row.submitted_at.date()).days, 0)


def _normalize_dossier_status(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"submitted", "under_review", "interministerial", "approved", "rejected"}
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail="Statut dossier invalide.")
    return normalized


def _normalize_dossier_stage(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"reception", "instruction", "validation", "decision"}
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail="Etape dossier invalide.")
    return normalized


def _normalize_dossier_priority(value: str) -> str:
    normalized = value.strip().lower()
    allowed = {"low", "medium", "high"}
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail="Priorite dossier invalide.")
    return normalized


def _resolve_sla_days(priority: str, explicit_sla_days: Optional[int]) -> int:
    if explicit_sla_days is not None:
        if explicit_sla_days < 1 or explicit_sla_days > 365:
            raise HTTPException(status_code=400, detail="SLA invalide (1-365 jours).")
        return explicit_sla_days
    return _sla_policy_days.get(priority, 30)


def _allowed_stage_progression(stage: str) -> List[str]:
    order = ["reception", "instruction", "validation", "decision"]
    if stage not in order:
        return order
    index = order.index(stage)
    allowed = [stage]
    if index + 1 < len(order):
        allowed.append(order[index + 1])
    return allowed


def _allowed_status_progression(status: str) -> List[str]:
    mapping = {
        "submitted": ["submitted", "under_review"],
        "under_review": ["under_review", "interministerial"],
        "interministerial": ["interministerial", "approved", "rejected"],
        "approved": ["approved"],
        "rejected": ["rejected"],
    }
    return mapping.get(status, [status])


def _validate_workflow_transition(
    *,
    previous_stage: str,
    next_stage: str,
    previous_status: str,
    next_status: str,
) -> None:
    if next_stage not in _allowed_stage_progression(previous_stage):
        raise HTTPException(
            status_code=400,
            detail=f"Transition etape invalide: {previous_stage} -> {next_stage}",
        )
    if next_status not in _allowed_status_progression(previous_status):
        raise HTTPException(
            status_code=400,
            detail=f"Transition statut invalide: {previous_status} -> {next_status}",
        )

    expected = {
        "reception": "submitted",
        "instruction": "under_review",
        "validation": "interministerial",
        "decision": None,
    }
    expected_status = expected.get(next_stage)
    if expected_status and next_status != expected_status:
        raise HTTPException(
            status_code=400,
            detail=f"Le statut {next_status} ne correspond pas a l'etape {next_stage}.",
        )
    if next_stage == "decision" and next_status not in {"approved", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="L'etape decision exige le statut approved ou rejected.",
        )


def to_project_dossier_read(row: ProjectDossierORM) -> ProjectDossierRead:
    age_days = _compute_dossier_age_days(row)
    is_overdue = age_days > row.sla_days and row.status not in {"approved", "rejected"}
    return ProjectDossierRead(
        id=row.id,
        company_name=row.company_name,
        project_title=row.project_title,
        sector=row.sector,
        location=row.location,
        status=row.status,
        stage=row.stage,
        priority=row.priority,
        sla_days=row.sla_days,
        submitted_at=row.submitted_at,
        updated_at=row.updated_at,
        decision_at=row.decision_at,
        assigned_to=row.assigned_to,
        assigned_role=Role(row.assigned_role)
        if row.assigned_role in Role._value2member_map_
        else None,
        decision_reason=row.decision_reason,
        decision_reference=row.decision_reference,
        age_days=age_days,
        is_overdue=is_overdue,
    )


def to_project_dossier_transition_read(row: ProjectDossierTransitionORM) -> ProjectDossierTransitionRead:
    return ProjectDossierTransitionRead(
        id=row.id,
        dossier_id=row.dossier_id,
        changed_by=row.changed_by,
        previous_status=row.previous_status,
        new_status=row.new_status,
        previous_stage=row.previous_stage,
        new_stage=row.new_stage,
        note=row.note,
        changed_at=row.changed_at,
    )


def to_audit_event_read(row: AuditEventORM) -> AuditEventRead:
    return AuditEventRead(
        id=row.id,
        timestamp=row.timestamp,
        actor=row.actor,
        action=row.action,
        target=row.target,
        details=row.details,
    )


def record_dossier_transition(
    db: Session,
    *,
    dossier_id: str,
    changed_by: str,
    previous_status: Optional[str],
    new_status: Optional[str],
    previous_stage: Optional[str],
    new_stage: Optional[str],
    note: str,
    changed_at: Optional[datetime] = None,
) -> None:
    row = ProjectDossierTransitionORM(
        id=f"DTR-{uuid.uuid4().hex[:8].upper()}",
        dossier_id=dossier_id,
        changed_by=changed_by,
        previous_status=previous_status,
        new_status=new_status,
        previous_stage=previous_stage,
        new_stage=new_stage,
        note=note.strip(),
        changed_at=changed_at or now_utc(),
    )
    db.add(row)


def _normalize_sector_name(raw_sector: str) -> str:
    normalized = raw_sector.strip().lower()
    aliases = {
        "peche": "Peche",
        "p\u00eache": "Peche",
        "agroalimentaire": "Agroalimentaire",
        "bois": "Bois",
        "cacao": "Cacao",
        "manioc": "Manioc",
    }
    return aliases.get(normalized, raw_sector.strip().title())


def _compute_sector_indicators(db: Session) -> List[SectorIndicator]:
    rows = db.execute(select(UnitORM)).scalars().unique().all()
    aggregates: Dict[str, Dict[str, float]] = defaultdict(lambda: {"local": 0.0, "jobs": 0.0})

    for unit in rows:
        latest = None
        for declaration in unit.declarations:
            if latest is None or (declaration.month, declaration.submitted_at) > (
                latest.month,
                latest.submitted_at,
            ):
                latest = declaration
        if latest is None:
            continue

        sector_key = _normalize_sector_name(unit.sector)
        aggregates[sector_key]["local"] += latest.volume_tons
        aggregates[sector_key]["jobs"] += latest.jobs

    indicators: List[SectorIndicator] = []
    for sector, import_baseline in SECTOR_IMPORT_BASELINES.items():
        payload = aggregates.get(sector, {"local": 0.0, "jobs": 0.0})
        indicators.append(
            SectorIndicator(
                sector=sector,
                local_volume_tons=round(payload["local"], 2),
                import_volume_tons=import_baseline,
                jobs=int(payload["jobs"]),
            )
        )
    return indicators


forecast_points: List[ForecastPoint] = [
    ForecastPoint(month="Mars", volume_tons=760),
    ForecastPoint(month="Avril", volume_tons=820),
    ForecastPoint(month="Mai", volume_tons=910),
    ForecastPoint(month="Juin", volume_tons=980),
]


def _compute_forecast_from_db(db: Session) -> List[ForecastPoint]:
    declarations = db.execute(select(DeclarationORM)).scalars().all()
    if not declarations:
        return forecast_points

    by_month: Dict[date, float] = defaultdict(float)
    for declaration in declarations:
        by_month[declaration.month] += declaration.volume_tons

    ordered_months = sorted(by_month.keys())
    if not ordered_months:
        return forecast_points

    historical = [by_month[month] for month in ordered_months][-4:]
    if len(historical) < 2:
        growth = 0.0
    else:
        diffs = [historical[i] - historical[i - 1] for i in range(1, len(historical))]
        growth = sum(diffs) / len(diffs)

    last_month = ordered_months[-1]
    last_value = historical[-1]
    labels = [
        "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
    ]
    points: List[ForecastPoint] = []
    for step in range(1, 5):
        month_index = (last_month.month - 1 + step) % 12
        projected = max(last_value + (growth * step), 0)
        points.append(ForecastPoint(month=labels[month_index], volume_tons=round(projected, 2)))
    return points


def _compute_dashboard_alerts(db: Session) -> List[DashboardAlert]:
    alerts: List[DashboardAlert] = []
    declarations = db.execute(select(DeclarationORM)).scalars().all()
    pending_declarations = [entry for entry in declarations if not entry.validated]
    if pending_declarations:
        alerts.append(
            DashboardAlert(
                id=f"DECL-{len(pending_declarations)}",
                severity="high",
                title="Declarations en attente de validation",
                detail=f"{len(pending_declarations)} declarations non validees par les inspecteurs.",
                source="declarations",
                created_at=now_utc(),
            )
        )

    notifications = db.execute(select(NotificationORM)).scalars().all()
    unread_high = [
        entry
        for entry in notifications
        if not entry.is_read and entry.severity.lower() in {"high", "critical"}
    ]
    if unread_high:
        alerts.append(
            DashboardAlert(
                id=f"NOTIF-{len(unread_high)}",
                severity="critical",
                title="Notifications prioritaires non lues",
                detail=f"{len(unread_high)} alertes critiques attendent un traitement.",
                source="notifications",
                created_at=now_utc(),
            )
        )

    indicators = _compute_sector_indicators(db)
    total_local = sum(metric.local_volume_tons for metric in indicators)
    total_import = sum(metric.import_volume_tons for metric in indicators)
    import_gap = max(total_import - total_local, 0)
    if import_gap > 0:
        alerts.append(
            DashboardAlert(
                id="IMPORT-GAP",
                severity="medium",
                title="Ecart importation a resorber",
                detail=f"Ecart actuel: {round(import_gap, 2)} T entre import et local.",
                source="indicators",
                created_at=now_utc(),
            )
        )

    open_field_reports = (
        db.execute(select(FieldReportORM).where(FieldReportORM.status != "closed"))
        .scalars()
        .unique()
        .all()
    )
    critical_field_reports = [
        report for report in open_field_reports if report.severity.lower() in {"high", "critical"}
    ]
    if critical_field_reports:
        alerts.append(
            DashboardAlert(
                id=f"FIELD-{len(critical_field_reports)}",
                severity="high",
                title="Signalements terrain prioritaires",
                detail=f"{len(critical_field_reports)} rapports terrain critiques restent ouverts.",
                source="field-reports",
                created_at=now_utc(),
            )
        )

    return alerts


# ---------------------------------------------------------------------------
# Database seeding
# ---------------------------------------------------------------------------

def seed_if_empty(db: Session) -> None:
    has_units = db.execute(select(UnitORM.id).limit(1)).scalar_one_or_none()
    if has_units:
        return

    seeded_units = [
        UnitORM(id="UI001", name="Societe Bois Gabonais", sector="Bois", capacity=1200,
                equipment="Lignes 4 & 5, scierie automatisee", location="Port-Gentil", status="active"),
        UnitORM(id="UI002", name="AgroDomaine Libreville", sector="Agroalimentaire", capacity=860,
                equipment="Atelier de conditionnement, laboratoire qualite", location="Libreville", status="active"),
        UnitORM(id="UI003", name="Manioc et cereales Nyanga", sector="Manioc", capacity=420,
                equipment="Sechoir solaire, presse hydraulique", location="Tchibanga", status="inactive"),
        UnitORM(id="UI004", name="Pole de Transformation Peche Estuaire", sector="Peche", capacity=970,
                equipment="Lignes de congelation IQF, laboratoire HACCP", location="Port-Gentil", status="active"),
    ]
    db.add_all(seeded_units)

    seeded_declarations = [
        DeclarationORM(id="PD-UI001-202512", unit_id="UI001", month=date(2025, 12, 1), volume_tons=380, jobs=220,
                       validated=True, submitted_at=datetime(2026, 1, 5, tzinfo=timezone.utc), submitted_by="operateur"),
        DeclarationORM(id="PD-UI001-202601", unit_id="UI001", month=date(2026, 1, 1), volume_tons=410, jobs=230,
                       validated=True, submitted_at=datetime(2026, 2, 2, tzinfo=timezone.utc), submitted_by="operateur"),
        DeclarationORM(id="PD-UI002-202601", unit_id="UI002", month=date(2026, 1, 1), volume_tons=265, jobs=145,
                       validated=True, submitted_at=datetime(2026, 2, 3, tzinfo=timezone.utc), submitted_by="operateur"),
        DeclarationORM(id="PD-UI003-202512", unit_id="UI003", month=date(2025, 12, 1), volume_tons=120, jobs=65,
                       validated=False, submitted_at=datetime(2026, 1, 12, tzinfo=timezone.utc), submitted_by="inspecteur"),
        DeclarationORM(id="PD-UI004-202602", unit_id="UI004", month=date(2026, 2, 1), volume_tons=325, jobs=190,
                       validated=True, submitted_at=datetime(2026, 2, 12, tzinfo=timezone.utc), submitted_by="operateur"),
    ]
    db.add_all(seeded_declarations)

    seeded_batches = [
        TraceBatchORM(batch_id="B202601-001", product="Huile de palme locale", origin="Plateau d'Ogooue-Ivindo",
                      factory="AgroDomaine Libreville", origin_lat=0.8080, origin_lng=12.6180,
                      factory_lat=0.3901, factory_lng=9.4544,
                      timestamp=datetime(2026, 1, 27, tzinfo=timezone.utc),
                      certification="ISO 22000", qr_code="https://pnpi-gabon/qr/B202601-001", quantity_tons=38),
        TraceBatchORM(batch_id="B202601-015", product="Pulpe de cacao", origin="Moussavou, Ngounie",
                      factory="Manioc et cereales Nyanga", origin_lat=-1.2500, origin_lng=10.5000,
                      factory_lat=-2.9332, factory_lng=10.9818,
                      timestamp=datetime(2026, 1, 22, tzinfo=timezone.utc),
                      certification="Origine Controlee", qr_code="https://pnpi-gabon/qr/B202601-015", quantity_tons=18.5),
        TraceBatchORM(batch_id="B202602-003", product="Filets de poisson IQF", origin="Estuaire maritime",
                      factory="Pole de Transformation Peche Estuaire", origin_lat=0.5200, origin_lng=9.5800,
                      factory_lat=-0.7193, factory_lng=8.7815,
                      timestamp=datetime(2026, 2, 5, tzinfo=timezone.utc),
                      certification="HACCP", qr_code="https://pnpi-gabon/qr/B202602-003", quantity_tons=42),
    ]
    db.add_all(seeded_batches)
    db.commit()


def seed_user_accounts(db: Session) -> None:
    has_accounts = db.execute(select(UserAccountORM.username).limit(1)).scalar_one_or_none()
    if has_accounts:
        return

    seeded_accounts = [
        UserAccountORM(
            username=user.username,
            full_name=user.full_name,
            roles_csv=roles_to_csv(user.roles),
            hashed_password=user.hashed_password,
            is_active=True,
            created_at=now_utc(),
            failed_login_attempts=0,
            locked_until=None,
            password_updated_at=now_utc(),
        )
        for user in fake_users_db.values()
    ]
    db.add_all(seeded_accounts)
    db.commit()


def seed_project_dossiers(db: Session) -> None:
    has_dossiers = db.execute(select(ProjectDossierORM.id).limit(1)).scalar_one_or_none()
    if has_dossiers:
        return

    seeded_dossiers = [
        ProjectDossierORM(id="DOS-2026-0001", company_name="Gabon Bois Industrie",
                          project_title="Extension de scierie industrielle Owendo", sector="Bois", location="Estuaire",
                          status="under_review", stage="instruction", priority="high", sla_days=30,
                          submitted_at=datetime(2026, 1, 18, tzinfo=timezone.utc),
                          updated_at=datetime(2026, 2, 21, tzinfo=timezone.utc),
                          assigned_to="Direction de l'Industrialisation", assigned_role=Role.inspecteur.value),
        ProjectDossierORM(id="DOS-2026-0002", company_name="Agro Delta Gabon",
                          project_title="Unite de transformation manioc et farines locales", sector="Manioc", location="Ngounie",
                          status="submitted", stage="reception", priority="medium", sla_days=21,
                          submitted_at=datetime(2026, 2, 12, tzinfo=timezone.utc),
                          updated_at=datetime(2026, 2, 12, tzinfo=timezone.utc),
                          assigned_to="Guichet unique", assigned_role=Role.inspecteur.value),
        ProjectDossierORM(id="DOS-2026-0003", company_name="Fisheries Gabon Group",
                          project_title="Ligne IQF et export regional produits halieutiques", sector="Peche", location="Ogooue-Maritime",
                          status="interministerial", stage="validation", priority="high", sla_days=45,
                          submitted_at=datetime(2026, 1, 7, tzinfo=timezone.utc),
                          updated_at=datetime(2026, 2, 17, tzinfo=timezone.utc),
                          assigned_to="Cellule interministerielle", assigned_role=Role.ministre.value),
        ProjectDossierORM(id="DOS-2026-0004", company_name="Cacao Excellence SA",
                          project_title="Atelier de fermentation et conditionnement cacao", sector="Cacao", location="Woleu-Ntem",
                          status="approved", stage="decision", priority="medium", sla_days=30,
                          submitted_at=datetime(2026, 1, 4, tzinfo=timezone.utc),
                          updated_at=datetime(2026, 1, 30, tzinfo=timezone.utc),
                          decision_at=datetime(2026, 1, 30, tzinfo=timezone.utc),
                          assigned_to="Cabinet technique", assigned_role=Role.ministre.value,
                          decision_reason="Conformite reglementaire et capacite technique validees.",
                          decision_reference="ARR-2026-APP-001"),
        ProjectDossierORM(id="DOS-2026-0005", company_name="Libreville Packaging",
                          project_title="Usine de packaging alimentaire recyclable", sector="Agroalimentaire", location="Estuaire",
                          status="rejected", stage="decision", priority="low", sla_days=30,
                          submitted_at=datetime(2025, 12, 28, tzinfo=timezone.utc),
                          updated_at=datetime(2026, 1, 29, tzinfo=timezone.utc),
                          decision_at=datetime(2026, 1, 29, tzinfo=timezone.utc),
                          assigned_to="Direction juridique", assigned_role=Role.ministre.value,
                          decision_reason="Pieces obligatoires manquantes et non-conformites juridiques.",
                          decision_reference="ARR-2026-REJ-001"),
    ]
    db.add_all(seeded_dossiers)
    for dossier in seeded_dossiers:
        record_dossier_transition(
            db, dossier_id=dossier.id, changed_by="system",
            previous_status=None, new_status=dossier.status,
            previous_stage=None, new_stage=dossier.stage,
            note="Initialisation dossier", changed_at=dossier.submitted_at,
        )
    db.commit()


def seed_pnpi_data(db: Session) -> None:
    """Seed PNPI demo data: operateurs, ATIs, transitions, inspections."""
    has_pnpi = db.execute(select(OperateurIndustrielORM.id).limit(1)).scalar_one_or_none()
    if has_pnpi:
        return

    now = now_utc()

    # ── Opérateurs industriels (20, couvrant les 9 provinces et 6 secteurs) ──
    operateurs_data = [
        ("OPI-001", "NIF-001234", "Gabon Bois Industries SA",       "bois",          "estuaire",          "Owendo",       0.3050, 9.5100,  320, "gabonboisind@gmail.com",    "+241074001001"),
        ("OPI-002", "NIF-002345", "Sylvicole du Haut-Ogooué",       "bois",          "haut_ogoue",        "Franceville",  -1.6350, 13.5800,  90, "sylvico@hautog.ga",         "+241074002002"),
        ("OPI-003", "NIF-003456", "Agro-Delta Gabon SARL",          "agroalimentaire","estuaire",         "Libreville",   0.3901, 9.4544,  145, "agrodelta@gabontrans.ga",   "+241074003003"),
        ("OPI-004", "NIF-004567", "Fermier du Moyen-Ogooué",        "agroalimentaire","moyen_ogoue",      "Lambaréné",   -0.7037, 10.2297,  78, "fermiermog@gmail.com",      "+241074004004"),
        ("OPI-005", "NIF-005678", "Mines d'Or du Haut-Ogooué",      "mines",         "haut_ogoue",        "Franceville",  -1.6200, 13.5900, 510, "minesordho@gabmines.ga",    "+241074005005"),
        ("OPI-006", "NIF-006789", "Compagnie Minière de l'Ivindo",  "mines",         "ogoue_ivindo",      "Makokou",      0.5657, 12.8639, 280, "cmiivindo@mines.ga",        "+241074006006"),
        ("OPI-007", "NIF-007890", "BTP Gabon Construction",         "btp",           "estuaire",          "Libreville",   0.3860, 9.4340,  230, "btpgabon@construct.ga",     "+241074007007"),
        ("OPI-008", "NIF-008901", "Travaux Publics Ngounie",        "btp",           "ngounie",           "Mouila",      -1.8630, 11.0197,  95, "tpngounie@btp.ga",          "+241074008008"),
        ("OPI-009", "NIF-009012", "Pétrole Services Gabon",         "petrole",       "ogoue_maritime",    "Port-Gentil",  -0.7193, 8.7815,  450, "psgportg@petrole.ga",       "+241074009009"),
        ("OPI-010", "NIF-010123", "Offshore Gabonaise SA",          "petrole",       "ogoue_maritime",    "Port-Gentil",  -0.7350, 8.8100,  620, "offshore.ga@petrole.ga",    "+241074010010"),
        ("OPI-011", "NIF-011234", "Services Logistiques Libreville","services",      "estuaire",          "Libreville",   0.4100, 9.4700,  110, "sll@services.ga",           "+241074011011"),
        ("OPI-012", "NIF-012345", "Consultants Industriels Gabon",  "services",      "estuaire",          "Libreville",   0.3750, 9.4450,   62, "cig@consultants.ga",        "+241074012012"),
        ("OPI-013", "NIF-013456", "Bois Precieux de la Ngounié",    "bois",          "ngounie",           "Mouila",      -1.8700, 11.0300,  175, "boisprec@ngounie.ga",       "+241074013013"),
        ("OPI-014", "NIF-014567", "Agri-Prod Woleu-Ntem",           "agroalimentaire","woleu_ntem",       "Oyem",         1.6000, 11.5800,  120, "agriprod@woleuntem.ga",     "+241074014014"),
        ("OPI-015", "NIF-015678", "Extraction Minière Nyanga",      "mines",         "nyanga",            "Tchibanga",   -2.9332, 10.9818,  200, "emn@nyanga.ga",             "+241074015015"),
        ("OPI-016", "NIF-016789", "Cimenterie de l'Ogooué-Lolo",   "btp",           "ogoue_lolo",        "Koulamoutou", -1.1400, 12.4700,  160, "cimentol@btp.ga",           "+241074016016"),
        ("OPI-017", "NIF-017890", "Industries Pétrolières Ivindo",  "petrole",       "ogoue_ivindo",      "Makokou",      0.5700, 12.8700,  300, "ipivindo@petrole.ga",       "+241074017017"),
        ("OPI-018", "NIF-018901", "Tech Services Haut-Ogooué",      "services",      "haut_ogoue",        "Franceville",  -1.6500, 13.5700,   55, "techserv@hautog.ga",        "+241074018018"),
        ("OPI-019", "NIF-019012", "Agroalimentaire Estuaire Plus",  "agroalimentaire","estuaire",         "Owendo",       0.3100, 9.5200,  185, "aestuaire@agro.ga",         "+241074019019"),
        ("OPI-020", "NIF-020123", "Construction Maritime Port-G",   "btp",           "ogoue_maritime",    "Port-Gentil",  -0.7100, 8.7900,  140, "cmpg@btp.ga",               "+241074020020"),
    ]
    operateurs = []
    for op_id, nif, raison, secteur, province, ville, lat, lng, effectif, email, tel in operateurs_data:
        op = OperateurIndustrielORM(
            id=op_id, nif_gabon=nif, raison_sociale=raison, secteur=secteur,
            province=province, ville=ville, latitude=lat, longitude=lng,
            effectif_declare=effectif, contact_email=email, contact_telephone=tel,
            is_active=True, created_at=now, created_by="system",
        )
        operateurs.append(op)
    db.add_all(operateurs)
    db.flush()

    # ── ATIs (30, répartis sur tous les états) ──
    _d = lambda y, m, d_: datetime(y, m, d_, tzinfo=timezone.utc)
    atis_data = [
        # (id, op_id, type_activite, secteur, statut, etape, priorite, instructeur, date_soumission, sla, date_decision, qr, motif, ref_dec)
        ("ATI-2026-0001","OPI-001","Scierie automatisée grande capacité","bois","approuve","decision","normale","instructeur",_d(2025,11,10),30,_d(2025,12,15),"QR-001",None,"DEC-2025-ATI-001"),
        ("ATI-2026-0002","OPI-001","Extension ligne transformation bois","bois","approuve","decision","elevee","instructeur",_d(2026,1,5),30,_d(2026,2,3),"QR-002",None,"DEC-2026-ATI-002"),
        ("ATI-2026-0003","OPI-002","Exploitation forêt certifiée FSC","bois","approuve","decision","normale","instructeur",_d(2026,1,12),25,_d(2026,2,5),"QR-003",None,"DEC-2026-ATI-003"),
        ("ATI-2026-0004","OPI-003","Unité de conditionnement fruits tropicaux","agroalimentaire","approuve","decision","normale","instructeur",_d(2025,12,1),30,_d(2025,12,28),"QR-004",None,"DEC-2025-ATI-004"),
        ("ATI-2026-0005","OPI-004","Moulin à manioc industriel","agroalimentaire","approuve","decision","elevee","instructeur",_d(2026,1,20),20,_d(2026,2,8),"QR-005",None,"DEC-2026-ATI-005"),
        ("ATI-2026-0006","OPI-005","Extraction or alluvionnaire Zone Nord","mines","approuve","decision","urgente","instructeur",_d(2025,12,5),45,_d(2026,1,15),"QR-006",None,"DEC-2026-ATI-006"),
        ("ATI-2026-0007","OPI-009","Station de traitement pétrole brut","petrole","approuve","decision","urgente","instructeur",_d(2025,11,20),60,_d(2026,1,25),"QR-007",None,"DEC-2026-ATI-007"),
        ("ATI-2026-0008","OPI-007","Construction résidence étudiante 200 logements","btp","approuve","decision","normale","instructeur",_d(2026,1,8),30,_d(2026,2,6),"QR-008",None,"DEC-2026-ATI-008"),
        ("ATI-2026-0009","OPI-011","Centre logistique multimodal","services","en_validation","validation","elevee","instructeur",_d(2026,2,1),30,None,None,None,None),
        ("ATI-2026-0010","OPI-012","Plateforme conseil transformation industrielle","services","en_validation","validation","normale","instructeur",_d(2026,2,10),30,None,None,None,None),
        ("ATI-2026-0011","OPI-013","Scierie mobile zones enclavées Ngounie","bois","en_validation","validation","elevee","instructeur",_d(2026,2,5),25,None,None,None,None),
        ("ATI-2026-0012","OPI-006","Mine de manganèse Ivindo Est","mines","en_validation","validation","urgente","instructeur",_d(2026,1,28),45,None,None,None,None),
        ("ATI-2026-0013","OPI-010","Maintenance offshore plateforme Gamba","petrole","en_instruction","instruction","urgente","instructeur",_d(2026,2,12),60,None,None,None,None),
        ("ATI-2026-0014","OPI-014","Séchoir solaire cacao Woleu-Ntem","agroalimentaire","en_instruction","instruction","normale","instructeur",_d(2026,2,15),30,None,None,None,None),
        ("ATI-2026-0015","OPI-015","Mine de fer Nyanga Sud","mines","en_instruction","instruction","elevee","instructeur",_d(2026,2,18),45,None,None,None,None),
        ("ATI-2026-0016","OPI-016","Cimenterie modernisation four 2","btp","en_instruction","instruction","normale","instructeur",_d(2026,2,20),30,None,None,None,None),
        ("ATI-2026-0017","OPI-017","Raffinage pétrole brut Ivindo","petrole","en_instruction","instruction","urgente","instructeur",_d(2026,2,22),60,None,None,None,None),
        ("ATI-2026-0018","OPI-019","Conditionnement jus de fruits locaux","agroalimentaire","en_instruction","instruction","normale",None,_d(2026,2,25),30,None,None,None,None),
        ("ATI-2026-0019","OPI-020","Quai maritime extension Port-Gentil","btp","soumis","reception","elevee",None,_d(2026,3,1),30,None,None,None,None),
        ("ATI-2026-0020","OPI-018","Maintenance industrielle équipements pétroliers","services","soumis","reception","normale",None,_d(2026,3,2),30,None,None,None,None),
        ("ATI-2026-0021","OPI-001","Sechoir a bois haute temperature","bois","soumis","reception","normale",None,_d(2026,3,3),30,None,None,None,None),
        ("ATI-2026-0022","OPI-003","Conserverie légumes tropicaux","agroalimentaire","soumis","reception","elevee",None,_d(2026,3,4),20,None,None,None,None),
        ("ATI-2026-0023","OPI-008","Route industrielle Mouila-Ndendé","btp","soumis","reception","normale",None,_d(2026,3,4),30,None,None,None,None),
        ("ATI-2026-0024","OPI-005","Extraction or Zone Sud Bateke","mines","soumis","reception","urgente",None,_d(2026,3,5),45,None,None,None,None),
        ("ATI-2026-0025","OPI-002","Reboisement industriel Ogooué","bois","rejete","decision","normale","instructeur",_d(2026,1,3),25,_d(2026,2,1),None,"Dossier incomplet - étude impact manquante","DEC-2026-REJ-001"),
        ("ATI-2026-0026","OPI-015","Mine diamant Nyanga illicite","mines","rejete","decision","urgente","instructeur",_d(2025,12,15),45,_d(2026,1,20),None,"Non-conformité réglementaire grave - site protégé","DEC-2026-REJ-002"),
        ("ATI-2026-0027","OPI-012","Consulting minier sans agrément","services","rejete","decision","normale","instructeur",_d(2026,1,25),30,_d(2026,2,20),None,"Absence de qualification professionnelle requise","DEC-2026-REJ-003"),
        ("ATI-2026-0028","OPI-004","Distillerie artisanale non conforme","agroalimentaire","expire","decision","normale","instructeur",_d(2025,6,1),90,_d(2025,9,5),"QR-EXP-001",None,"DEC-2025-EXP-001"),
        ("ATI-2026-0029","OPI-007","Bitumage voirie Owendo phase 1","btp","expire","decision","elevee","instructeur",_d(2025,7,10),60,_d(2025,9,15),"QR-EXP-002",None,"DEC-2025-EXP-002"),
        ("ATI-2026-0030","OPI-011","Service de transport industriel","services","expire","decision","normale","instructeur",_d(2025,8,1),30,_d(2025,9,1),"QR-EXP-003",None,"DEC-2025-EXP-003"),
    ]

    atis = []
    for (ati_id, op_id, type_act, sect, statut, etape, priorite,
         instr, date_soum, sla, date_dec, qr, motif, ref_dec) in atis_data:
        date_exp = None
        if date_dec and statut == "approuve":
            date_exp = datetime(date_dec.year + 1, date_dec.month, date_dec.day, tzinfo=timezone.utc)
        ati = AgrementTechniqueIndustrielORM(
            id=ati_id,
            numero_ati=ati_id,
            operateur_id=op_id,
            type_activite=type_act,
            secteur=sect,
            statut=statut,
            etape=etape,
            priorite=priorite,
            instructeur_username=instr,
            date_soumission=date_soum,
            sla_jours=sla,
            date_decision=date_dec,
            date_expiration=date_exp,
            qr_code_data=qr,
            motif_rejet=motif,
            numero_reference_decision=ref_dec,
            observations=None,
            updated_at=date_dec or date_soum,
            created_by="system",
        )
        atis.append(ati)
    db.add_all(atis)
    db.flush()

    # ── Transitions ATI (historique workflow) ──
    transitions = []
    _tid = 0
    def _trans(ati_id, prev_s, new_s, prev_e, new_e, by, at, note=""):
        nonlocal _tid
        _tid += 1
        return ATITransitionORM(
            id=f"TRN-{_tid:04d}", ati_id=ati_id,
            previous_statut=prev_s, new_statut=new_s,
            previous_etape=prev_e, new_etape=new_e,
            changed_by=by, changed_at=at, note=note,
        )

    # ATIs approuvés : soumis → en_instruction → en_validation → approuve
    for ati_id, _, _, _, _, _, _, instr, date_soum, _, date_dec, qr, _, _ in atis_data[:8]:
        if qr and date_dec:
            t1 = date_soum + (date_dec - date_soum) * 0.2
            t2 = date_soum + (date_dec - date_soum) * 0.55
            t3 = date_soum + (date_dec - date_soum) * 0.85
            transitions += [
                _trans(ati_id, None, "soumis", None, "reception", "system", date_soum, "Dossier soumis"),
                _trans(ati_id, "soumis", "en_instruction", "reception", "instruction", instr or "instructeur", t1, "Dossier pris en charge"),
                _trans(ati_id, "en_instruction", "en_validation", "instruction", "validation", instr or "instructeur", t2, "Instruction terminée"),
                _trans(ati_id, "en_validation", "approuve", "validation", "decision", instr or "instructeur", date_dec, "Agrément accordé"),
            ]
    # ATIs en validation
    for ati_id, _, _, _, _, _, _, instr, date_soum, _, _, _, _, _ in atis_data[8:12]:
        t1 = date_soum + (now - date_soum) * 0.3
        transitions += [
            _trans(ati_id, None, "soumis", None, "reception", "system", date_soum, "Dossier soumis"),
            _trans(ati_id, "soumis", "en_instruction", "reception", "instruction", instr or "instructeur", t1, "Pris en charge"),
        ]
    # ATIs en instruction
    for ati_id, _, _, _, _, _, _, _, date_soum, _, _, _, _, _ in atis_data[12:18]:
        transitions.append(_trans(ati_id, None, "soumis", None, "reception", "system", date_soum, "Dossier soumis"))
    # Soumis : juste la création
    for ati_id, _, _, _, _, _, _, _, date_soum, _, _, _, _, _ in atis_data[18:24]:
        transitions.append(_trans(ati_id, None, "soumis", None, "reception", "system", date_soum, "Dossier soumis"))
    # Rejetés
    for ati_id, _, _, _, _, _, _, instr, date_soum, _, date_dec, _, _, _ in atis_data[24:27]:
        if date_dec:
            t1 = date_soum + (date_dec - date_soum) * 0.4
            transitions += [
                _trans(ati_id, None, "soumis", None, "reception", "system", date_soum, "Dossier soumis"),
                _trans(ati_id, "soumis", "en_instruction", "reception", "instruction", instr or "instructeur", t1, "Dossier examiné"),
                _trans(ati_id, "en_instruction", "rejete", "instruction", "decision", instr or "instructeur", date_dec, "Rejet motivé"),
            ]
    # Expirés
    for ati_id, _, _, _, _, _, _, instr, date_soum, _, date_dec, _, _, _ in atis_data[27:]:
        if date_dec:
            transitions.append(_trans(ati_id, "approuve", "expire", "decision", "decision", "system", date_dec, "Expiration agrément"))

    db.add_all(transitions)
    db.flush()

    # ── Inspections de conformité (10) ──
    inspections = [
        InspectionConformiteORM(
            id="INS-001", operateur_id="OPI-001", ati_id="ATI-2026-0001",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,10), statut_conformite="conforme",
            observations="Ligne de scierie en parfait état. Normes OHSAS respectées. EPI fournis à tous les agents.",
            mesures_correctives=None, latitude=0.3050, longitude=9.5100, created_at=_d(2026,2,10),
        ),
        InspectionConformiteORM(
            id="INS-002", operateur_id="OPI-005", ati_id="ATI-2026-0006",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,5), statut_conformite="non_conforme",
            observations="Absence de système de ventilation dans les galeries. Risques chimiques non évalués. 3 agents sans EPI.",
            mesures_correctives="Installation ventilation obligatoire sous 30j. Formation EPI. Audit sécurité externe requis.",
            latitude=-1.6200, longitude=13.5900, created_at=_d(2026,2,5),
        ),
        InspectionConformiteORM(
            id="INS-003", operateur_id="OPI-009", ati_id="ATI-2026-0007",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,1,28), statut_conformite="conforme",
            observations="Station pétrolière conforme aux normes ISO 14001. Registre ICPE à jour. Bacs de rétention opérationnels.",
            mesures_correctives=None, latitude=-0.7193, longitude=8.7815, created_at=_d(2026,1,28),
        ),
        InspectionConformiteORM(
            id="INS-004", operateur_id="OPI-003", ati_id="ATI-2026-0004",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,14), statut_conformite="partiel",
            observations="Unité de conditionnement opérationnelle. Manque de traçabilité sur 2 chaînes. Registre HACCP incomplet.",
            mesures_correctives="Mise à jour HACCP sous 15 jours. Étiquetage traçabilité obligatoire sur chaîne B et C.",
            latitude=0.3901, longitude=9.4544, created_at=_d(2026,2,14),
        ),
        InspectionConformiteORM(
            id="INS-005", operateur_id="OPI-007", ati_id="ATI-2026-0008",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,20), statut_conformite="conforme",
            observations="Chantier résidentiel respectant les normes de sécurité BTP. Casques et harnais portés. Filets anti-chute installés.",
            mesures_correctives=None, latitude=0.3860, longitude=9.4340, created_at=_d(2026,2,20),
        ),
        InspectionConformiteORM(
            id="INS-006", operateur_id="OPI-006", ati_id="ATI-2026-0012",
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,25), statut_conformite="non_conforme",
            observations="Déversement non contrôlé résidus miniers dans cours d'eau adjacent. Absence de décanteur agréé.",
            mesures_correctives="Arrêt immédiat extraction. Installation décanteur agréé. Rapport environnemental sous 10j.",
            latitude=0.5657, longitude=12.8639, created_at=_d(2026,2,25),
        ),
        InspectionConformiteORM(
            id="INS-007", operateur_id="OPI-010", ati_id=None,
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,2,18), statut_conformite="partiel",
            observations="Plateforme offshore en maintenance. Systèmes de sécurité actifs mais journal d'entretien incomplet depuis 3 mois.",
            mesures_correctives="Mise à jour journal maintenance. Contrôle capteurs pression sous 7 jours.",
            latitude=-0.7350, longitude=8.8100, created_at=_d(2026,2,18),
        ),
        InspectionConformiteORM(
            id="INS-008", operateur_id="OPI-013", ati_id=None,
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,3,2), statut_conformite="conforme",
            observations="Scierie mobile conforme. Personnel formé. Registres d'exploitation complets et à jour.",
            mesures_correctives=None, latitude=-1.8700, longitude=11.0300, created_at=_d(2026,3,2),
        ),
        InspectionConformiteORM(
            id="INS-009", operateur_id="OPI-014", ati_id=None,
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,3,3), statut_conformite="partiel",
            observations="Séchoir cacao opérationnel à 70%. Humidité résiduelle hors normes sur lot B. Températures non monitorées.",
            mesures_correctives="Installation sondes température. Re-séchage lot B obligatoire avant export.",
            latitude=1.6000, longitude=11.5800, created_at=_d(2026,3,3),
        ),
        InspectionConformiteORM(
            id="INS-010", operateur_id="OPI-015", ati_id=None,
            inspecteur_username="inspecteur",
            date_inspection=_d(2026,3,4), statut_conformite="non_conforme",
            observations="Mine illicite active malgré rejet ATI. Zone d'extraction en site protégé. Intervention gendarmerie requise.",
            mesures_correctives="Arrêt total activités. Réhabilitation site. Transmission parquet compétent.",
            latitude=-2.9332, longitude=10.9818, created_at=_d(2026,3,4),
        ),
    ]
    db.add_all(inspections)
    db.commit()


def ensure_project_dossier_transitions(db: Session) -> None:
    has_transitions = db.execute(select(ProjectDossierTransitionORM.id).limit(1)).scalar_one_or_none()
    if has_transitions:
        return
    dossiers = db.execute(select(ProjectDossierORM)).scalars().unique().all()
    if not dossiers:
        return
    for dossier in dossiers:
        record_dossier_transition(
            db, dossier_id=dossier.id, changed_by="system",
            previous_status=None, new_status=dossier.status,
            previous_stage=None, new_stage=dossier.stage,
            note="Initialisation historique", changed_at=dossier.submitted_at,
        )
    db.commit()


def ensure_trace_batch_geo_columns(db: Session) -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    rows = db.execute(text("PRAGMA table_info(trace_batches)")).all()
    existing = {row[1] for row in rows}
    statements = []
    if "origin_lat" not in existing:
        statements.append("ALTER TABLE trace_batches ADD COLUMN origin_lat FLOAT")
    if "origin_lng" not in existing:
        statements.append("ALTER TABLE trace_batches ADD COLUMN origin_lng FLOAT")
    if "factory_lat" not in existing:
        statements.append("ALTER TABLE trace_batches ADD COLUMN factory_lat FLOAT")
    if "factory_lng" not in existing:
        statements.append("ALTER TABLE trace_batches ADD COLUMN factory_lng FLOAT")
    for statement in statements:
        db.execute(text(statement))
    if statements:
        db.commit()


def ensure_notification_columns(db: Session) -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    rows = db.execute(text("PRAGMA table_info(notifications)")).all()
    existing = {row[1] for row in rows}
    statements = []
    if "notification_key" not in existing:
        statements.append("ALTER TABLE notifications ADD COLUMN notification_key VARCHAR(120)")
    for statement in statements:
        db.execute(text(statement))
    if statements:
        db.commit()


def ensure_project_dossier_columns(db: Session) -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    rows = db.execute(text("PRAGMA table_info(project_dossiers)")).all()
    existing = {row[1] for row in rows}
    statements = []
    if "assigned_role" not in existing:
        statements.append("ALTER TABLE project_dossiers ADD COLUMN assigned_role VARCHAR(40)")
    if "decision_reason" not in existing:
        statements.append("ALTER TABLE project_dossiers ADD COLUMN decision_reason VARCHAR(800)")
    if "decision_reference" not in existing:
        statements.append("ALTER TABLE project_dossiers ADD COLUMN decision_reference VARCHAR(120)")
    for statement in statements:
        db.execute(text(statement))
    if statements:
        db.commit()


def ensure_user_account_security_columns(db: Session) -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return
    rows = db.execute(text("PRAGMA table_info(user_accounts)")).all()
    existing = {row[1] for row in rows}
    statements = []
    if "failed_login_attempts" not in existing:
        statements.append(
            "ALTER TABLE user_accounts ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"
        )
    if "locked_until" not in existing:
        statements.append("ALTER TABLE user_accounts ADD COLUMN locked_until DATETIME")
    if "password_updated_at" not in existing:
        statements.append("ALTER TABLE user_accounts ADD COLUMN password_updated_at DATETIME")
    for statement in statements:
        db.execute(text(statement))
    if statements:
        db.commit()


def initialize_database() -> None:
    from .validate_env import validate_environment
    if not validate_environment():
        import sys
        sys.exit(1)
    enforce_security_prerequisites()
    # Import all models to ensure they're registered with Base metadata
    from .models import (  # noqa: F401
        UnitORM, DeclarationORM, TraceBatchORM, UserAccountORM,
        NotificationORM, FieldReportORM, AuditEventORM, RefreshTokenORM,
        ProjectDossierORM, ProjectDossierTransitionORM,
        OperateurIndustrielORM, AgrementTechniqueIndustrielORM,
        ATITransitionORM, InspectionConformiteORM,
    )
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        ensure_trace_batch_geo_columns(db)
        ensure_notification_columns(db)
        ensure_project_dossier_columns(db)
        ensure_user_account_security_columns(db)
        seed_if_empty(db)
        seed_user_accounts(db)
        seed_project_dossiers(db)
        seed_pnpi_data(db)
        ensure_project_dossier_transitions(db)


_sla_logger = logging.getLogger("pnpi.sla")


async def _sla_background_loop() -> None:
    """Verifie les ATIs en retard SLA toutes les heures et log les alertes.

    Escalation levels:
    - >1x SLA: standard overdue warning (logged)
    - >1.5x SLA: escalation notification targeting directeur role
    - >2x SLA: CRITICAL notification targeting ministre role
    """
    await asyncio.sleep(60)  # attendre 1 minute au demarrage
    while True:
        try:
            from .database import SessionLocal, now_utc
            from .models.pnpi import AgrementTechniqueIndustrielORM
            from .core.audit import create_system_notification
            from .core.auth import Role
            from sqlalchemy import select
            _TERMINAL = {"approuve", "rejete", "expire"}
            with SessionLocal() as db:
                atis = db.execute(
                    select(AgrementTechniqueIndustrielORM).where(
                        AgrementTechniqueIndustrielORM.statut.notin_(_TERMINAL)
                    )
                ).scalars().all()
                overdue = []
                for a in atis:
                    age = max((now_utc().date() - a.date_soumission.date()).days, 0)
                    if age <= a.sla_jours:
                        continue
                    overdue.append(a)
                    ratio = age / a.sla_jours if a.sla_jours > 0 else 999
                    today_iso = now_utc().date().isoformat()

                    # Level 3: CRITICAL escalation to ministre (>2x SLA)
                    if ratio > 2:
                        create_system_notification(
                            db,
                            title=f"CRITIQUE — ATI {a.numero_ati} depasse 2x le SLA",
                            message=(
                                f"L'ATI {a.numero_ati} ({a.type_activite[:60]}) est en retard "
                                f"de {age}j pour un SLA de {a.sla_jours}j (ratio {ratio:.1f}x). "
                                f"Instructeur: {a.instructeur_username or 'non assigne'}. "
                                f"Action ministerielle requise."
                            ),
                            severity="critical",
                            target_role=Role.ministre,
                            notification_key=f"sla-critical-ministre:{a.id}:{today_iso}",
                        )
                        _sla_logger.warning(
                            f"[SLA CRITICAL] {a.numero_ati} — {age}j/{a.sla_jours}j "
                            f"(ratio {ratio:.1f}x) -> escalade ministre"
                        )

                    # Level 2: Escalation to directeur (>1.5x SLA)
                    elif ratio > 1.5:
                        create_system_notification(
                            db,
                            title=f"Escalade — ATI {a.numero_ati} depasse 1.5x le SLA",
                            message=(
                                f"L'ATI {a.numero_ati} ({a.type_activite[:60]}) est en retard "
                                f"de {age}j pour un SLA de {a.sla_jours}j (ratio {ratio:.1f}x). "
                                f"Instructeur: {a.instructeur_username or 'non assigne'}. "
                                f"Intervention directeur requise."
                            ),
                            severity="high",
                            target_role=Role.directeur,
                            notification_key=f"sla-escalade-directeur:{a.id}:{today_iso}",
                        )
                        _sla_logger.warning(
                            f"[SLA ESCALADE] {a.numero_ati} — {age}j/{a.sla_jours}j "
                            f"(ratio {ratio:.1f}x) -> escalade directeur"
                        )

                if overdue:
                    db.commit()
                    _sla_logger.warning(
                        f"[SLA ALERT] {len(overdue)} ATI(s) en retard: "
                        + ", ".join(a.numero_ati for a in overdue[:10])
                    )
                else:
                    _sla_logger.info(f"[SLA CHECK] OK — {len(atis)} ATIs actifs, aucun retard")
        except Exception as exc:
            _sla_logger.error(f"[SLA CHECK ERROR] {exc}")
        await asyncio.sleep(3600)  # toutes les heures


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    log_action("system", "startup", "Backend PNPI/PNPI pret a servir.")
    task = asyncio.create_task(_sla_background_loop())
    _sla_logger.info("[PNPI] SLA background checker demarre.")
    yield
    task.cancel()
    _sla_logger.info("[PNPI] SLA background checker arrete.")


if os.getenv("PNPI_SKIP_DB_INIT") != "1":
    initialize_database()


# ---------------------------------------------------------------------------
# FastAPI application factory
# ---------------------------------------------------------------------------

_openapi_tags = [
    {"name": "Authentification", "description": "Connexion, tokens JWT et gestion de session."},
    {"name": "Administration", "description": "Gestion des comptes utilisateurs et des roles RBAC."},
    {"name": "PNPI Dashboard", "description": "Tableau de bord ministeriel : KPI, pipeline ATI, statistiques."},
    {"name": "ATI", "description": "Agrements Techniques Industriels : soumission, instruction, validation, decision."},
    {"name": "Operateurs", "description": "Registre national des operateurs industriels (CRUD + conformite)."},
    {"name": "Inspections", "description": "Inspections de conformite terrain (CRUD + rapport)."},
    {"name": "Documents", "description": "Upload et telechargement de pieces justificatives ATI."},
    {"name": "Pilotage", "description": "Dossiers de projet industriel et workflow de pilotage."},
    {"name": "Exports", "description": "Export CSV/JSON des donnees ATI, operateurs, inspections, audit."},
    {"name": "Notifications", "description": "Notifications systeme et alertes SLA."},
    {"name": "Unites & Tracabilite", "description": "Unites industrielles, declarations de production et tracabilite des lots."},
    {"name": "Health & Ops", "description": "Sante de l'application, metriques et alertes ops."},
]

app = FastAPI(
    title="PNPI — Plateforme Nationale de la Politique Industrielle",
    description="API du Ministere de l'Industrie et de la Transformation Locale du Gabon. "
                "Gestion des Agrements Techniques Industriels, inspections de conformite, "
                "pilotage ministeriel et tracabilite des lots.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=_openapi_tags,
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,
        "docExpansion": "none",
        "filter": True,
        "persistAuthorization": True,
        "syntaxHighlight.theme": "monokai",
    },
    license_info={
        "name": "Ministere de l'Industrie — Gabon",
    },
    contact={
        "name": "PNPI Support",
        "email": "support@pnpi-gabon.ga",
    },
)

if CORS_ALLOW_ORIGINS_RAW == "*":
    cors_allow_origins = ["*"]
else:
    cors_allow_origins = [
        origin.strip()
        for origin in CORS_ALLOW_ORIGINS_RAW.split(",")
        if origin.strip()
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(MetricsMiddleware)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or f"req-{uuid.uuid4().hex[:12]}"
    started_at = now_utc()
    path = request.url.path
    client_ip = get_client_ip(request)
    try:
        if path.startswith("/auth/") and path != "/auth/me":
            enforce_rate_limit(key=f"path:{path}:{client_ip}", limit=AUTH_RATE_LIMIT_MAX_REQUESTS)
        elif path.startswith("/admin/") or path.startswith("/pilotage/") or path.startswith("/pnpi/"):
            enforce_rate_limit(
                key=f"path:{path}:{client_ip}",
                limit=SENSITIVE_RATE_LIMIT_MAX_REQUESTS,
            )
        response = await call_next(request)
    except HTTPException:
        _request_metrics[f"{request.method} {path} status:429"] += 1
        raise
    duration_ms = (now_utc() - started_at).total_seconds() * 1000
    status_code = response.status_code
    _request_metrics[f"{request.method} {path} status:{status_code}"] += 1
    _request_duration_ms[f"{request.method} {path}"] += duration_ms
    response.headers["x-request-id"] = request_id
    logger.info(
        f'{{"request_id":"{request_id}","method":"{request.method}","path":"{path}",'
        f'"status":{status_code},"duration_ms":{round(duration_ms, 2)},"client_ip":"{client_ip}"}}'
    )
    return response


# ---------------------------------------------------------------------------
# Include modular routers
# ---------------------------------------------------------------------------

from .routers.auth import router as auth_router
from .routers.units import router as units_router
from .routers.pilotage import router as pilotage_router
from .routers.admin import router as admin_router
from .routers.health import router as health_router
from .routers.exports import router as exports_router
from .routers.pnpi_dashboard import router as pnpi_dashboard_router
from .routers.ati import router as ati_router
from .routers.operateurs import router as operateurs_router
from .routers.inspections import router as inspections_router
from .routers.notifications import router as notifications_router
from .routers.documents import router as documents_router
from .routers.geo import router as geo_router
from .routers.totp import router as totp_router
from .routers.ws import router as ws_router
from .routers.integration import router as integration_router
from .routers.messages import router as messages_router
from .routers.calendar import router as calendar_router
from .routers.reports import router as reports_router
from .routers.templates import router as templates_router
from .routers.workflows import router as workflows_router
from .routers.heatmap import router as heatmap_router
from .routers.delegations import router as delegations_router
from .routers.reminders import router as reminders_router
from .routers.notes import router as notes_router
from .routers.feedback import router as feedback_router
from .routers.doc_versions import router as doc_versions_router

app.include_router(auth_router)
app.include_router(units_router)
app.include_router(pilotage_router)
app.include_router(admin_router)
app.include_router(health_router)
app.include_router(exports_router)
app.include_router(pnpi_dashboard_router)
app.include_router(ati_router)
app.include_router(operateurs_router)
app.include_router(inspections_router)
app.include_router(notifications_router)
app.include_router(documents_router)
app.include_router(geo_router)
app.include_router(totp_router)
app.include_router(ws_router)
app.include_router(integration_router)
app.include_router(messages_router)
app.include_router(calendar_router)
app.include_router(reports_router)
app.include_router(templates_router)
app.include_router(workflows_router)
app.include_router(heatmap_router)
app.include_router(delegations_router)
app.include_router(reminders_router)
app.include_router(notes_router)
app.include_router(feedback_router)
app.include_router(doc_versions_router)

@app.get("/metrics", include_in_schema=False)
async def prometheus_metrics():
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(metrics.to_prometheus(), media_type="text/plain; version=0.0.4; charset=utf-8")

# ── Fichiers statiques (logo, assets) ────────────────────────────────────────
_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(_static_dir):
    app.mount("/static", StaticFiles(directory=_static_dir), name="static")

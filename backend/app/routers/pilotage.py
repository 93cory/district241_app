"""PNPI / PNPI · Endpoints de pilotage des dossiers industriels."""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date
from statistics import median
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event, _emit_sla_notifications, create_system_notification
from ..database import get_db, now_utc
from ..models.pilotage import ProjectDossierORM, ProjectDossierTransitionORM


router = APIRouter(tags=["Pilotage"])

# ---------------------------------------------------------------------------
# SLA policy (shared mutable state · in production should be DB-backed)
# ---------------------------------------------------------------------------
_sla_policy_days: Dict[str, int] = {
    "low": 45,
    "medium": 30,
    "high": 21,
}


def get_sla_policy() -> Dict[str, int]:
    return _sla_policy_days


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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
    changed_at=None,
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


def to_project_dossier_read(row: ProjectDossierORM) -> dict:
    age_days = _compute_dossier_age_days(row)
    is_overdue = age_days > row.sla_days and row.status not in {"approved", "rejected"}
    return {
        "id": row.id,
        "company_name": row.company_name,
        "project_title": row.project_title,
        "sector": row.sector,
        "location": row.location,
        "status": row.status,
        "stage": row.stage,
        "priority": row.priority,
        "sla_days": row.sla_days,
        "submitted_at": row.submitted_at,
        "updated_at": row.updated_at,
        "decision_at": row.decision_at,
        "assigned_to": row.assigned_to,
        "assigned_role": row.assigned_role,
        "decision_reason": row.decision_reason,
        "decision_reference": row.decision_reference,
        "age_days": age_days,
        "is_overdue": is_overdue,
    }


def to_project_dossier_transition_read(row: ProjectDossierTransitionORM) -> dict:
    return {
        "id": row.id,
        "dossier_id": row.dossier_id,
        "changed_by": row.changed_by,
        "previous_status": row.previous_status,
        "new_status": row.new_status,
        "previous_stage": row.previous_stage,
        "new_stage": row.new_stage,
        "note": row.note,
        "changed_at": row.changed_at,
    }


def _compute_pilotage_kpis(db: Session) -> dict:
    dossiers = (
        db.execute(select(ProjectDossierORM).order_by(ProjectDossierORM.updated_at.desc()))
        .scalars()
        .unique()
        .all()
    )
    if not dossiers:
        return {
            "generated_at": now_utc(),
            "total_dossiers": 0,
            "in_progress_dossiers": 0,
            "overdue_dossiers": 0,
            "approval_rate": 0,
            "median_processing_days": 0,
            "sla_compliance_rate": 0,
            "status_breakdown": [],
            "stage_breakdown": [],
        }

    in_progress_statuses = {"submitted", "under_review", "interministerial"}
    decision_statuses = {"approved", "rejected"}
    in_progress_count = sum(1 for d in dossiers if d.status in in_progress_statuses)
    overdue_count = sum(
        1
        for d in dossiers
        if _compute_dossier_age_days(d) > d.sla_days and d.status not in decision_statuses
    )

    decided = [d for d in dossiers if d.status in decision_statuses]
    approved_count = sum(1 for d in decided if d.status == "approved")
    approval_rate = (approved_count / len(decided)) if decided else 0

    durations: List[int] = []
    for d in decided:
        if d.decision_at:
            duration = (d.decision_at.date() - d.submitted_at.date()).days
            durations.append(max(duration, 0))
    median_processing_days = float(median(durations)) if durations else 0
    compliant_count = sum(
        1
        for d in decided
        if d.decision_at
        and (d.decision_at.date() - d.submitted_at.date()).days <= d.sla_days
    )
    sla_compliance_rate = (compliant_count / len(durations)) if durations else 0

    status_counter: Dict[str, int] = defaultdict(int)
    stage_counter: Dict[str, int] = defaultdict(int)
    for d in dossiers:
        status_counter[d.status] += 1
        stage_counter[d.stage] += 1

    return {
        "generated_at": now_utc(),
        "total_dossiers": len(dossiers),
        "in_progress_dossiers": in_progress_count,
        "overdue_dossiers": overdue_count,
        "approval_rate": round(approval_rate, 4),
        "median_processing_days": round(median_processing_days, 1),
        "sla_compliance_rate": round(sla_compliance_rate, 4),
        "status_breakdown": [
            {"key": key, "count": count}
            for key, count in sorted(status_counter.items())
        ],
        "stage_breakdown": [
            {"key": key, "count": count}
            for key, count in sorted(stage_counter.items())
        ],
    }


def _compute_pilotage_executive_dashboard(db: Session) -> dict:
    dossiers = db.execute(select(ProjectDossierORM)).scalars().unique().all()
    if not dossiers:
        return {
            "generated_at": now_utc(),
            "total_dossiers": 0,
            "overdue_backlog": 0,
            "approval_rate": 0,
            "by_sector": [],
            "by_location": [],
            "by_direction": [],
            "stage_delays": [],
            "monthly_trend": [],
        }

    decision_statuses = {"approved", "rejected"}
    overdue_backlog = sum(
        1
        for d in dossiers
        if d.status not in decision_statuses and _compute_dossier_age_days(d) > d.sla_days
    )
    decided = [d for d in dossiers if d.status in decision_statuses]
    approved = sum(1 for d in decided if d.status == "approved")
    approval_rate = (approved / len(decided)) if decided else 0

    def build_breakdown(values: Dict[str, list]) -> List[dict]:
        result = []
        for key, entries in sorted(values.items()):
            overdue = sum(
                1
                for d in entries
                if d.status not in decision_statuses and _compute_dossier_age_days(d) > d.sla_days
            )
            result.append({"key": key, "total": len(entries), "overdue": overdue})
        return result

    by_sector_map: Dict[str, list] = defaultdict(list)
    by_location_map: Dict[str, list] = defaultdict(list)
    by_direction_map: Dict[str, list] = defaultdict(list)
    by_stage_map: Dict[str, List[int]] = defaultdict(list)
    month_created: Dict[str, int] = defaultdict(int)
    month_decided: Dict[str, int] = defaultdict(int)

    for d in dossiers:
        by_sector_map[d.sector or "Non renseigne"].append(d)
        by_location_map[d.location or "Non renseigne"].append(d)
        by_direction_map[d.assigned_to or "Non assigne"].append(d)
        by_stage_map[d.stage or "Non renseigne"].append(_compute_dossier_age_days(d))
        created_key = d.submitted_at.strftime("%Y-%m")
        month_created[created_key] += 1
        if d.decision_at:
            month_decided[d.decision_at.strftime("%Y-%m")] += 1

    stage_delays = [
        {
            "stage": stage,
            "average_age_days": round(sum(ages) / len(ages), 1) if ages else 0.0,
            "dossiers": len(ages),
        }
        for stage, ages in sorted(by_stage_map.items())
    ]
    all_months = sorted(set(month_created.keys()) | set(month_decided.keys()))
    monthly_trend = [
        {
            "month": month,
            "created": month_created.get(month, 0),
            "decided": month_decided.get(month, 0),
        }
        for month in all_months
    ][-6:]

    return {
        "generated_at": now_utc(),
        "total_dossiers": len(dossiers),
        "overdue_backlog": overdue_backlog,
        "approval_rate": round(approval_rate, 4),
        "by_sector": build_breakdown(by_sector_map),
        "by_location": build_breakdown(by_location_map),
        "by_direction": build_breakdown(by_direction_map),
        "stage_delays": stage_delays,
        "monthly_trend": monthly_trend,
    }


def _filter_pilotage_transitions(rows, *, dossier_id, changed_by, date_from, date_to):
    filtered = list(rows)
    if dossier_id:
        normalized = dossier_id.strip().upper()
        filtered = [row for row in filtered if row.dossier_id.upper() == normalized]
    if changed_by:
        normalized_actor = changed_by.strip().lower()
        filtered = [row for row in filtered if row.changed_by.lower() == normalized_actor]
    if date_from:
        filtered = [row for row in filtered if row.changed_at.date() >= date_from]
    if date_to:
        filtered = [row for row in filtered if row.changed_at.date() <= date_to]
    return filtered


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/pilotage/dossiers")
async def list_project_dossiers(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(select(ProjectDossierORM).order_by(ProjectDossierORM.updated_at.desc()))
        .scalars()
        .unique()
        .all()
    )
    return [to_project_dossier_read(row) for row in rows]


@router.get("/pilotage/sla-policy")
async def get_pilotage_sla_policy(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
):
    return {
        "low": _sla_policy_days["low"],
        "medium": _sla_policy_days["medium"],
        "high": _sla_policy_days["high"],
    }


@router.patch("/pilotage/sla-policy")
async def update_pilotage_sla_policy(
    payload: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    values = {
        "low": payload.get("low", _sla_policy_days["low"]),
        "medium": payload.get("medium", _sla_policy_days["medium"]),
        "high": payload.get("high", _sla_policy_days["high"]),
    }
    for key, value in values.items():
        if value < 1 or value > 365:
            raise HTTPException(status_code=400, detail=f"SLA {key} invalide (1-365 jours).")
        _sla_policy_days[key] = value
    write_audit_event(
        db,
        actor=current_user.username,
        action="pilotage.update_sla_policy",
        target="sla-policy",
        details=f"low={values['low']}; medium={values['medium']}; high={values['high']}",
    )
    db.commit()
    return _sla_policy_days.copy()


@router.post("/pilotage/dossiers", status_code=status.HTTP_201_CREATED)
async def create_project_dossier(
    payload: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    submitted_at = now_utc()
    year = submitted_at.year
    prefix = f"DOS-{year}-"
    existing = (
        db.execute(select(ProjectDossierORM.id).where(ProjectDossierORM.id.like(f"{prefix}%")))
        .scalars()
        .all()
    )
    next_index = len(existing) + 1

    priority = _normalize_dossier_priority(payload.get("priority", "medium"))
    sla_days = _resolve_sla_days(priority, payload.get("sla_days"))

    assigned_role = payload.get("assigned_role")
    if isinstance(assigned_role, Role):
        assigned_role = assigned_role.value
    if not assigned_role:
        assigned_role = Role.inspecteur.value

    row = ProjectDossierORM(
        id=f"{prefix}{next_index:04d}",
        company_name=payload["company_name"].strip(),
        project_title=payload["project_title"].strip(),
        sector=payload["sector"].strip(),
        location=payload["location"].strip(),
        status="submitted",
        stage="reception",
        priority=priority,
        sla_days=sla_days,
        submitted_at=submitted_at,
        updated_at=submitted_at,
        assigned_to=payload.get("assigned_to", "").strip() if payload.get("assigned_to") else None,
        assigned_role=assigned_role,
    )
    db.add(row)
    record_dossier_transition(
        db,
        dossier_id=row.id,
        changed_by=current_user.username,
        previous_status=None,
        new_status=row.status,
        previous_stage=None,
        new_stage=row.stage,
        note="Creation dossier",
        changed_at=submitted_at,
    )
    create_system_notification(
        db,
        title="Nouveau dossier industriel",
        message=f"{row.id} a ete soumis par {current_user.username}.",
        severity="high",
        target_role=Role.ministre,
        notification_key=f"dossier-created:{row.id}",
    )
    if row.assigned_role and row.assigned_role in Role._value2member_map_:
        create_system_notification(
            db,
            title="Dossier assigne",
            message=f"{row.id} assigne au role {row.assigned_role}.",
            severity="info",
            target_role=Role(row.assigned_role),
            notification_key=f"dossier-assigned:{row.id}:{row.assigned_role}",
        )
    write_audit_event(
        db,
        actor=current_user.username,
        action="pilotage.create_dossier",
        target=row.id,
        details=f"statut={row.status}; etape={row.stage}; role={row.assigned_role}",
    )
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "creation dossier", f"{row.id} - {row.project_title}")
    return to_project_dossier_read(row)


@router.patch("/pilotage/dossiers/{dossier_id}")
async def update_project_dossier(
    dossier_id: str,
    payload: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    row = db.get(ProjectDossierORM, dossier_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")

    previous_status = row.status
    previous_stage = row.stage
    previous_priority = row.priority
    previous_sla_days = row.sla_days
    previous_assigned_to = row.assigned_to
    previous_assigned_role = row.assigned_role
    previous_decision_reason = row.decision_reason
    previous_decision_reference = row.decision_reference

    if payload.get("status") is not None:
        row.status = _normalize_dossier_status(payload["status"])
    if payload.get("stage") is not None:
        row.stage = _normalize_dossier_stage(payload["stage"])
    if payload.get("priority") is not None:
        row.priority = _normalize_dossier_priority(payload["priority"])
    if payload.get("sla_days") is not None:
        if payload["sla_days"] <= 0:
            raise HTTPException(status_code=400, detail="sla_days doit etre > 0.")
        row.sla_days = payload["sla_days"]
    if payload.get("assigned_to") is not None:
        assigned = payload["assigned_to"].strip()
        row.assigned_to = assigned if assigned else None
    if payload.get("assigned_role") is not None:
        ar = payload["assigned_role"]
        row.assigned_role = ar.value if isinstance(ar, Role) else ar
    if payload.get("decision_reason") is not None:
        reason = payload["decision_reason"].strip()
        row.decision_reason = reason if reason else None
    if payload.get("decision_reference") is not None:
        reference = payload["decision_reference"].strip()
        row.decision_reference = reference if reference else None

    _validate_workflow_transition(
        previous_stage=previous_stage,
        next_stage=row.stage,
        previous_status=previous_status,
        next_status=row.status,
    )

    if row.status in {"approved", "rejected"}:
        row.stage = "decision"
        if not row.decision_reason:
            raise HTTPException(
                status_code=400,
                detail="decision_reason est requis pour une decision finale.",
            )
        row.decision_at = now_utc()
    elif row.decision_at is not None:
        row.decision_at = None

    has_changes = (
        row.status != previous_status
        or row.stage != previous_stage
        or row.priority != previous_priority
        or row.sla_days != previous_sla_days
        or row.assigned_to != previous_assigned_to
        or row.assigned_role != previous_assigned_role
        or row.decision_reason != previous_decision_reason
        or row.decision_reference != previous_decision_reference
    )
    if not has_changes:
        raise HTTPException(status_code=400, detail="Aucun changement detecte.")

    row.updated_at = now_utc()
    notes: List[str] = []
    if row.priority != previous_priority:
        notes.append(f"priorite: {previous_priority} -> {row.priority}")
    if row.sla_days != previous_sla_days:
        notes.append(f"sla: {previous_sla_days} -> {row.sla_days}")
    if row.assigned_to != previous_assigned_to:
        notes.append(
            f"assignation: {(previous_assigned_to or 'Non renseigne')} -> {(row.assigned_to or 'Non renseigne')}"
        )
    if row.assigned_role != previous_assigned_role:
        notes.append(
            f"role: {(previous_assigned_role or 'Non renseigne')} -> {(row.assigned_role or 'Non renseigne')}"
        )
    if row.decision_reason != previous_decision_reason and row.decision_reason:
        notes.append("motif de decision renseigne")
    if row.decision_reference != previous_decision_reference and row.decision_reference:
        notes.append(f"reference decision: {row.decision_reference}")
    if not notes:
        notes.append("Mise a jour workflow")

    record_dossier_transition(
        db,
        dossier_id=row.id,
        changed_by=current_user.username,
        previous_status=previous_status,
        new_status=row.status,
        previous_stage=previous_stage,
        new_stage=row.stage,
        note="; ".join(notes),
        changed_at=row.updated_at,
    )
    if row.status != previous_status:
        create_system_notification(
            db,
            title="Changement de statut dossier",
            message=f"{row.id}: {previous_status} -> {row.status}",
            severity="high" if row.status in {"approved", "rejected"} else "info",
            target_role=Role.ministre,
            notification_key=f"dossier-status:{row.id}:{row.status}:{row.updated_at.date().isoformat()}",
        )
    if row.assigned_role and row.assigned_role != previous_assigned_role and row.assigned_role in Role._value2member_map_:
        create_system_notification(
            db,
            title="Reaffectation dossier",
            message=f"{row.id} est assigne au role {row.assigned_role}.",
            severity="medium",
            target_role=Role(row.assigned_role),
            notification_key=f"dossier-reassigned:{row.id}:{row.assigned_role}:{row.updated_at.date().isoformat()}",
        )

    _emit_sla_notifications(db)
    write_audit_event(
        db,
        actor=current_user.username,
        action="pilotage.update_dossier",
        target=row.id,
        details=(
            f"status:{previous_status}->{row.status}; stage:{previous_stage}->{row.stage}; "
            f"priority:{previous_priority}->{row.priority}; sla:{previous_sla_days}->{row.sla_days}; "
            f"assigned_to:{previous_assigned_to or 'Non renseigne'}->{row.assigned_to or 'Non renseigne'}; "
            f"assigned_role:{previous_assigned_role or 'Non renseigne'}->{row.assigned_role or 'Non renseigne'}; "
            f"decision_reference:{previous_decision_reference or 'Non renseigne'}->{row.decision_reference or 'Non renseigne'}"
        ),
    )
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "mise a jour dossier", f"{row.id} - statut={row.status}, etape={row.stage}")
    return to_project_dossier_read(row)


@router.get("/pilotage/kpis")
async def pilotage_kpis(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    return _compute_pilotage_kpis(db)


@router.get("/pilotage/dossiers/{dossier_id}/history")
async def dossier_history(
    dossier_id: str,
    _: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    dossier = db.get(ProjectDossierORM, dossier_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")

    rows = (
        db.execute(
            select(ProjectDossierTransitionORM)
            .where(ProjectDossierTransitionORM.dossier_id == dossier_id)
            .order_by(ProjectDossierTransitionORM.changed_at.desc())
        )
        .scalars()
        .all()
    )
    return [to_project_dossier_transition_read(row) for row in rows]


@router.get("/pilotage/queue")
async def pilotage_queue(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    roles = {role.value for role in current_user.roles}
    rows = (
        db.execute(select(ProjectDossierORM).order_by(ProjectDossierORM.updated_at.desc()))
        .scalars()
        .unique()
        .all()
    )
    filtered = [
        row
        for row in rows
        if row.assigned_role is None
        or row.assigned_role in roles
        or Role.ministre.value in roles
        or Role.admin.value in roles
    ]
    return [to_project_dossier_read(row) for row in filtered]


@router.get("/pilotage/executive-dashboard")
async def pilotage_executive_dashboard(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    _emit_sla_notifications(db)
    db.commit()
    return _compute_pilotage_executive_dashboard(db)


@router.get("/pilotage/dossiers/{dossier_id}/decision-document.pdf")
async def export_dossier_decision_document(
    dossier_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
) -> Response:
    row = db.get(ProjectDossierORM, dossier_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dossier introuvable.")
    if row.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Aucune decision finale disponible.")
    write_audit_event(
        db,
        actor=current_user.username,
        action="pilotage.export_decision_document",
        target=row.id,
        details=f"status={row.status}; decision_reference={row.decision_reference or 'Non renseigne'}",
    )
    db.commit()

    lines = [
        "PNPI - Decision administrative dossier",
        f"Dossier: {row.id}",
        f"Entreprise: {row.company_name}",
        f"Projet: {row.project_title}",
        f"Date decision: {(row.decision_at.isoformat() if row.decision_at else 'Non renseigne')}",
        f"Statut final: {row.status}",
        f"Reference: {row.decision_reference or 'Non renseigne'}",
        f"Motif: {row.decision_reason or 'Non renseigne'}",
    ]
    escaped_lines = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    text_commands = ["BT /F1 10 Tf 40 760 Td"]
    for index, line in enumerate(escaped_lines):
        if index > 0:
            text_commands.append("0 -14 Td")
        text_commands.append(f"({line}) Tj")
    text_commands.append("ET")
    content_stream = "\n".join(text_commands).encode("latin-1", errors="replace")
    objects_list = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(content_stream)} >>\nstream\n".encode("latin-1")
        + content_stream
        + b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]
    pdf_body = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects_list:
        offsets.append(len(pdf_body))
        pdf_body.extend(obj)
    xref_offset = len(pdf_body)
    pdf_body.extend(f"xref\n0 {len(offsets)}\n".encode("latin-1"))
    pdf_body.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf_body.extend(f"{offset:010d} 00000 n \n".encode("latin-1"))
    pdf_body.extend(
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode("latin-1")
    )
    return Response(
        content=bytes(pdf_body),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={row.id}-decision.pdf"},
    )


@router.get("/dashboard/indicators")
async def dashboard_metrics(
    _: User = Depends(require_roles(Role.ministre, Role.operateur)),
    db: Session = Depends(get_db),
):
    from ..main import _compute_sector_indicators, _compute_forecast_from_db
    from ..models.core import UnitORM, TraceBatchORM
    from sqlalchemy import func

    indicators = _compute_sector_indicators(db)
    all_units = db.execute(select(UnitORM)).scalars().unique().all()
    active_units = [unit for unit in all_units if unit.status == "active"]
    active_zones = len({unit.location for unit in active_units})
    traced_batches = db.execute(select(func.count(TraceBatchORM.batch_id))).scalar_one()
    total_local = sum(metric.local_volume_tons for metric in indicators)
    total_import = sum(metric.import_volume_tons for metric in indicators)
    denominator = total_local + total_import
    national_index = (total_local / denominator) if denominator > 0 else 0.0
    return {
        "created_at": now_utc(),
        "indicators": [{"sector": i.sector, "local_volume_tons": i.local_volume_tons, "import_volume_tons": i.import_volume_tons, "jobs": i.jobs} for i in indicators],
        "national_index": round(national_index, 4),
        "jobs_created": sum(metric.jobs for metric in indicators),
        "import_gap_tons": max(total_import - total_local, 0),
        "active_units": len(active_units),
        "active_zones": active_zones,
        "traced_batches": traced_batches,
    }


@router.get("/dashboard/forecast")
async def dashboard_forecast(
    _: User = Depends(require_roles(Role.ministre, Role.operateur)),
    db: Session = Depends(get_db),
):
    from ..main import _compute_forecast_from_db
    return _compute_forecast_from_db(db)


@router.get("/dashboard/alerts")
async def dashboard_alerts(
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import _compute_dashboard_alerts
    _emit_sla_notifications(db)
    db.commit()
    return _compute_dashboard_alerts(db)

"""PNPI / PNPI · Endpoints pour unites industrielles, declarations, lots et logs."""
from __future__ import annotations

import uuid
from typing import List

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.core import DeclarationORM, FieldReportORM, TraceBatchORM, UnitORM, AuditEventORM
from ..core.audit import write_audit_event


router = APIRouter(tags=["Unites & Tracabilite"])


# ---------------------------------------------------------------------------
# Serialisation helpers (inline to avoid circular import with main.py helpers)
# ---------------------------------------------------------------------------

def _to_declaration_read(row: DeclarationORM) -> dict:
    return {
        "id": row.id,
        "month": row.month,
        "volume_tons": row.volume_tons,
        "jobs": row.jobs,
        "validated": row.validated,
        "submitted_at": row.submitted_at,
        "submitted_by": row.submitted_by,
    }


def _to_unit_read(row: UnitORM) -> dict:
    declarations = sorted(row.declarations, key=lambda d: d.month, reverse=True)
    return {
        "id": row.id,
        "name": row.name,
        "sector": row.sector,
        "capacity": row.capacity,
        "equipment": row.equipment,
        "location": row.location,
        "status": row.status,
        "declarations": [_to_declaration_read(decl) for decl in declarations],
    }


def _to_batch_read(row: TraceBatchORM) -> dict:
    return {
        "batch_id": row.batch_id,
        "product": row.product,
        "origin": row.origin,
        "factory": row.factory,
        "certification": row.certification,
        "quantity_tons": row.quantity_tons,
        "origin_lat": row.origin_lat,
        "origin_lng": row.origin_lng,
        "factory_lat": row.factory_lat,
        "factory_lng": row.factory_lng,
        "timestamp": row.timestamp,
        "qr_code": row.qr_code,
    }


def _to_field_report_read(row: FieldReportORM) -> dict:
    return {
        "id": row.id,
        "unit_id": row.unit_id,
        "title": row.title,
        "comment": row.comment,
        "severity": row.severity,
        "location": row.location,
        "status": row.status,
        "created_at": row.created_at,
        "created_by": row.created_by,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "photo_path": row.photo_path,
    }


# ---------------------------------------------------------------------------
# Units endpoints
# ---------------------------------------------------------------------------

@router.get("/units")
async def list_units(
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(UnitORM)).scalars().unique().all()
    return [_to_unit_read(row) for row in rows]


@router.get("/units/{unit_id}")
async def get_unit(
    unit_id: str,
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    unit = db.get(UnitORM, unit_id.upper())
    if not unit:
        raise HTTPException(status_code=404, detail="Unite industrielle introuvable.")
    return _to_unit_read(unit)


@router.post("/units", status_code=status.HTTP_201_CREATED)
async def create_unit(
    payload: dict,
    current_user: User = Depends(require_roles(Role.ministre)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    unit_id = f"UI{uuid.uuid4().hex[:4].upper()}"
    row = UnitORM(
        id=unit_id,
        name=payload["name"],
        sector=payload["sector"],
        capacity=payload["capacity"],
        equipment=payload["equipment"],
        location=payload["location"],
        status=payload.get("status", "active"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "creation unite", f"Unite {row.name} enregistree ({row.id}).")
    return _to_unit_read(row)


@router.post("/units/{unit_id}/declarations", status_code=status.HTTP_201_CREATED)
async def add_declaration(
    unit_id: str,
    payload: dict,
    current_user: User = Depends(require_roles(Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    unit = db.get(UnitORM, unit_id.upper())
    if not unit:
        raise HTTPException(status_code=404, detail="Unite introuvable.")
    declaration_id = f"PD-{unit_id.upper()}-{uuid.uuid4().hex[:6].upper()}"
    month_value = payload["month"]
    if isinstance(month_value, str):
        from datetime import date as _date
        month_value = _date.fromisoformat(month_value)
    row = DeclarationORM(
        id=declaration_id,
        unit_id=unit.id,
        month=month_value,
        volume_tons=payload["volume_tons"],
        jobs=payload["jobs"],
        validated=payload.get("validated", False),
        submitted_at=now_utc(),
        submitted_by=current_user.username,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "declaration mensuelle", f"{row.id} pour {unit.name}.")
    return _to_declaration_read(row)


@router.get("/declarations")
async def list_declarations(
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(DeclarationORM)).scalars().all()
    return [_to_declaration_read(row) for row in rows]


@router.patch("/declarations/{declaration_id}/validate")
async def validate_declaration(
    declaration_id: str,
    payload: dict,
    current_user: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    row = db.get(DeclarationORM, declaration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Declaration introuvable.")
    row.validated = payload.get("validated", True)
    db.commit()
    db.refresh(row)
    log_action(
        current_user.username,
        "validation declaration",
        f"{row.id} statut valide={row.validated}",
    )
    return _to_declaration_read(row)


# ---------------------------------------------------------------------------
# Batch endpoints
# ---------------------------------------------------------------------------

@router.get("/batches")
async def list_batches(
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(TraceBatchORM).order_by(TraceBatchORM.timestamp.desc())).scalars().all()
    return [_to_batch_read(row) for row in rows]


@router.post("/batches", status_code=status.HTTP_201_CREATED)
async def create_batch(
    payload: dict,
    current_user: User = Depends(require_roles(Role.ministre)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    batch_id = f"B{now_utc().strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
    row = TraceBatchORM(
        batch_id=batch_id,
        timestamp=now_utc(),
        qr_code=f"https://pnpi-gabon/qr/{batch_id}",
        product=payload["product"],
        origin=payload["origin"],
        factory=payload["factory"],
        certification=payload["certification"],
        quantity_tons=payload["quantity_tons"],
        origin_lat=payload.get("origin_lat"),
        origin_lng=payload.get("origin_lng"),
        factory_lat=payload.get("factory_lat"),
        factory_lng=payload.get("factory_lng"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "lancement lot", f"Lot {row.batch_id} pour {row.product}.")
    return _to_batch_read(row)


@router.get("/batches/{batch_id}")
async def get_batch(
    batch_id: str,
    _: User = Depends(require_roles(Role.ministre, Role.operateur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    row = db.get(TraceBatchORM, batch_id)
    if not row:
        raise HTTPException(status_code=404, detail="Lot pas trouve.")
    return _to_batch_read(row)


# ---------------------------------------------------------------------------
# Logs endpoint
# ---------------------------------------------------------------------------

@router.get("/logs")
async def read_logs(_: User = Depends(require_roles(Role.admin, Role.ministre))):
    from ..main import log_entries
    return log_entries


# ---------------------------------------------------------------------------
# Field reports endpoints
# ---------------------------------------------------------------------------

@router.get("/field-reports")
async def list_field_reports(
    _: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(select(FieldReportORM).order_by(FieldReportORM.created_at.desc()))
        .scalars()
        .unique()
        .all()
    )
    return [_to_field_report_read(row) for row in rows]


UPLOAD_DIR = Path("uploads/field-reports")


@router.post("/field-reports", status_code=status.HTTP_201_CREATED)
async def create_field_report(
    payload: dict,
    current_user: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    normalized_unit_id = payload.get("unit_id", "").upper() if payload.get("unit_id") else None
    if normalized_unit_id:
        unit = db.get(UnitORM, normalized_unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Unite introuvable.")

    # GPS coordinates (optional)
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    if latitude is not None:
        latitude = float(latitude)
    if longitude is not None:
        longitude = float(longitude)

    row = FieldReportORM(
        id=f"FR-{uuid.uuid4().hex[:8].upper()}",
        unit_id=normalized_unit_id,
        title=payload["title"].strip(),
        comment=payload["comment"].strip(),
        severity=payload.get("severity", "medium").strip().lower(),
        location=payload.get("location", "").strip() if payload.get("location") else None,
        status="open",
        created_at=now_utc(),
        created_by=current_user.username,
        latitude=latitude,
        longitude=longitude,
    )
    db.add(row)
    write_audit_event(
        db,
        actor=current_user.username,
        action="field_reports.create",
        target=row.id,
        details=f"severity={row.severity}; status={row.status}; unit_id={row.unit_id or 'Non renseigne'}; lat={latitude}; lng={longitude}",
    )
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "declaration terrain", f"{row.id} enregistree ({row.severity}).")
    return _to_field_report_read(row)


@router.post("/field-reports/{report_id}/photo", status_code=status.HTTP_200_OK)
async def upload_field_report_photo(
    report_id: str,
    photo: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    """Upload a photo attachment for an existing field report."""
    row = db.get(FieldReportORM, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Rapport terrain introuvable.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(photo.filename).suffix if photo.filename else ".jpg"
    filename = f"{report_id}{ext}"
    filepath = UPLOAD_DIR / filename

    content = await photo.read()
    filepath.write_bytes(content)

    row.photo_path = str(filepath)
    db.commit()
    db.refresh(row)
    return _to_field_report_read(row)


@router.patch("/field-reports/{report_id}/status")
async def update_field_report_status(
    report_id: str,
    payload: dict,
    current_user: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    normalized = payload.get("status", "").strip().lower()
    allowed = {"open", "in_progress", "closed"}
    if normalized not in allowed:
        raise HTTPException(status_code=400, detail="Statut invalide.")

    row = db.get(FieldReportORM, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Rapport terrain introuvable.")

    if Role.ministre not in current_user.roles and row.created_by != current_user.username:
        raise HTTPException(status_code=403, detail="Acces refuse pour ce rapport.")

    previous_status = row.status
    row.status = normalized
    write_audit_event(
        db,
        actor=current_user.username,
        action="field_reports.update_status",
        target=row.id,
        details=f"status={previous_status}->{row.status}",
    )
    db.commit()
    db.refresh(row)
    log_action(current_user.username, "statut rapport terrain", f"{row.id} -> {row.status}")
    return _to_field_report_read(row)


@router.delete("/field-reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field_report(
    report_id: str,
    current_user: User = Depends(require_roles(Role.ministre, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    from ..main import log_action
    from fastapi.responses import Response
    row = db.get(FieldReportORM, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="Rapport terrain introuvable.")

    if Role.ministre not in current_user.roles and row.created_by != current_user.username:
        raise HTTPException(status_code=403, detail="Acces refuse pour ce rapport.")

    write_audit_event(
        db,
        actor=current_user.username,
        action="field_reports.delete",
        target=row.id,
        details=f"severity={row.severity}; status={row.status}; unit_id={row.unit_id or 'Non renseigne'}",
    )
    db.delete(row)
    db.commit()
    log_action(current_user.username, "suppression rapport terrain", report_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Audit events
# ---------------------------------------------------------------------------

@router.get("/audit/events")
async def list_audit_events(
    _: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(AuditEventORM).order_by(AuditEventORM.timestamp.desc())).scalars().all()
    return [
        {
            "id": row.id,
            "timestamp": row.timestamp,
            "actor": row.actor,
            "action": row.action,
            "target": row.target,
            "details": row.details,
        }
        for row in rows
    ]

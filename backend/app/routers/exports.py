"""PNPI / PNPI — Endpoints d'exports (CSV, PDF)."""
from __future__ import annotations

import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import FieldReportORM, TraceBatchORM, UnitORM
from ..models.pilotage import ProjectDossierORM, ProjectDossierTransitionORM
from ..models.pnpi import AgrementTechniqueIndustrielORM, OperateurIndustrielORM


router = APIRouter(tags=["Exports"])


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


@router.get("/exports/indicators.csv")
async def export_indicators_csv(
    _: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Response:
    from ..main import _compute_sector_indicators
    indicators = _compute_sector_indicators(db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Secteur", "Volume local (T)", "Volume importe (T)", "Emplois"])
    for indicator in indicators:
        writer.writerow(
            [
                indicator.sector,
                indicator.local_volume_tons,
                indicator.import_volume_tons,
                indicator.jobs,
            ]
        )
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=indicateurs-pnpi.csv"},
    )


@router.get("/exports/dashboard.pdf")
async def export_dashboard_pdf(
    _: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Response:
    from ..main import _compute_sector_indicators

    indicators = _compute_sector_indicators(db)
    all_units = db.execute(select(UnitORM)).scalars().unique().all()
    active_units = [unit for unit in all_units if unit.status == "active"]
    active_zones = len({unit.location for unit in active_units})
    traced_batches = db.execute(select(func.count(TraceBatchORM.batch_id))).scalar_one()
    total_local = sum(metric.local_volume_tons for metric in indicators)
    total_import = sum(metric.import_volume_tons for metric in indicators)
    denominator = total_local + total_import
    national_index = (total_local / denominator) if denominator > 0 else 0.0

    lines = [
        "PNPI - Resume Strategique",
        f"Date: {now_utc().isoformat()}",
        f"Indice national: {round(national_index * 100, 2)} %",
        f"Emplois industriels traces: {sum(metric.jobs for metric in indicators)}",
        f"Ecart import (T): {round(max(total_import - total_local, 0), 2)}",
        f"Unites actives: {len(active_units)}",
        f"Zones actives: {active_zones}",
        f"Lots traces: {traced_batches}",
    ]
    for indicator in indicators:
        lines.append(
            f"- {indicator.sector}: local {indicator.local_volume_tons}T / import {indicator.import_volume_tons}T / emplois {indicator.jobs}"
        )

    return _build_pdf_response(lines, filename="pnpi-dashboard.pdf", font_size=10)


@router.get("/exports/inspectors-briefing.pdf")
async def export_inspectors_briefing_pdf(
    _: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Response:
    field_reports = (
        db.execute(select(FieldReportORM).order_by(FieldReportORM.created_at.desc()))
        .scalars()
        .unique()
        .all()
    )
    open_reports = [report for report in field_reports if report.status != "closed"]
    high_reports = [
        report for report in open_reports if report.severity.lower() in {"high", "critical"}
    ]
    units = db.execute(select(UnitORM)).scalars().unique().all()

    lines = [
        "PNPI - Briefing Inspecteurs",
        f"Date: {now_utc().isoformat()}",
        f"Rapports terrain: {len(field_reports)}",
        f"Rapports ouverts: {len(open_reports)}",
        f"Rapports critiques ouverts: {len(high_reports)}",
        f"Unites suivies: {len(units)}",
    ]
    for report in high_reports[:8]:
        location = report.location or "Non renseigne"
        lines.append(
            f"- {report.id} [{report.status}] {report.severity} / {location} / {report.title}"
        )

    return _build_pdf_response(lines, filename="pnpi-inspectors-briefing.pdf", font_size=10)


@router.get("/exports/pilotage-transitions.csv")
async def export_pilotage_transitions_csv(
    dossier_id: Optional[str] = Query(default=None),
    changed_by: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Response:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from doit etre <= date_to.")

    rows = (
        db.execute(
            select(ProjectDossierTransitionORM).order_by(
                ProjectDossierTransitionORM.changed_at.desc()
            )
        )
        .scalars()
        .all()
    )
    rows = _filter_pilotage_transitions(
        rows,
        dossier_id=dossier_id,
        changed_by=changed_by,
        date_from=date_from,
        date_to=date_to,
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Transition ID",
            "Dossier ID",
            "Acteur",
            "Date",
            "Statut precedent",
            "Statut nouveau",
            "Etape precedente",
            "Etape nouvelle",
            "Note",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.id,
                row.dossier_id,
                row.changed_by,
                row.changed_at.isoformat(),
                row.previous_status or "",
                row.new_status or "",
                row.previous_stage or "",
                row.new_stage or "",
                row.note,
            ]
        )
    write_audit_event(
        db,
        actor=current_user.username,
        action="exports.pilotage_transitions_csv",
        target=dossier_id.strip().upper() if dossier_id else None,
        details=(
            f"changed_by={changed_by or 'tous'}; date_from={date_from.isoformat() if date_from else 'Non renseigne'}; "
            f"date_to={date_to.isoformat() if date_to else 'Non renseigne'}; rows={len(rows)}"
        ),
    )
    db.commit()
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pilotage-transitions.csv"},
    )


@router.get("/exports/pilotage-transitions.pdf")
async def export_pilotage_transitions_pdf(
    dossier_id: Optional[str] = Query(default=None),
    changed_by: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministere)),
    db: Session = Depends(get_db),
) -> Response:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="date_from doit etre <= date_to.")

    rows = (
        db.execute(
            select(ProjectDossierTransitionORM).order_by(
                ProjectDossierTransitionORM.changed_at.desc()
            )
        )
        .scalars()
        .all()
    )
    rows = _filter_pilotage_transitions(
        rows,
        dossier_id=dossier_id,
        changed_by=changed_by,
        date_from=date_from,
        date_to=date_to,
    )

    lines = [
        "PNPI - Journal des transitions workflow",
        f"Date: {now_utc().isoformat()}",
        f"Nombre de transitions: {len(rows)}",
    ]
    for row in rows[:30]:
        lines.append(
            f"- {row.dossier_id} | {row.changed_by} | "
            f"{(row.previous_status or 'Non renseigne')}->{(row.new_status or 'Non renseigne')} | "
            f"{(row.previous_stage or 'Non renseigne')}->{(row.new_stage or 'Non renseigne')}"
        )
    write_audit_event(
        db,
        actor=current_user.username,
        action="exports.pilotage_transitions_pdf",
        target=dossier_id.strip().upper() if dossier_id else None,
        details=(
            f"changed_by={changed_by or 'tous'}; date_from={date_from.isoformat() if date_from else 'Non renseigne'}; "
            f"date_to={date_to.isoformat() if date_to else 'Non renseigne'}; rows={len(rows)}"
        ),
    )
    db.commit()

    return _build_pdf_response(lines, filename="pilotage-transitions.pdf", font_size=9, td_offset=12, start_y=770, start_x=36)


# ---------------------------------------------------------------------------
# PNPI CSV exports
# ---------------------------------------------------------------------------

@router.get("/pnpi/exports/ati.csv")
async def export_ati_csv(
    statut: Optional[str] = Query(default=None),
    secteur: Optional[str] = Query(default=None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> Response:
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM)
        .where(*([] if not statut else [AgrementTechniqueIndustrielORM.statut == statut]))
        .where(*([] if not secteur else [AgrementTechniqueIndustrielORM.secteur == secteur]))
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
    ).scalars().all()

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Numero ATI", "Operateur ID", "Type activite", "Secteur", "Statut", "Etape", "Priorite", "Instructeur", "Date soumission", "Date decision", "Age (j)", "SLA (j)", "En retard"])
    for a in atis:
        age = max((now_utc().date() - a.date_soumission.date()).days, 0)
        overdue = age > a.sla_jours and a.statut not in {"approuve", "rejete", "expire"}
        w.writerow([
            a.numero_ati, a.operateur_id, a.type_activite, a.secteur, a.statut,
            a.etape, a.priorite, a.instructeur_username or "",
            a.date_soumission.date().isoformat(),
            a.date_decision.date().isoformat() if a.date_decision else "",
            age, a.sla_jours, "Oui" if overdue else "Non",
        ])

    return Response(
        content=buf.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ati_export.csv"},
    )


@router.get("/pnpi/exports/operateurs.csv")
async def export_operateurs_csv(
    secteur: Optional[str] = Query(default=None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> Response:
    ops = db.execute(
        select(OperateurIndustrielORM)
        .where(*([] if not secteur else [OperateurIndustrielORM.secteur == secteur]))
        .order_by(OperateurIndustrielORM.raison_sociale)
    ).scalars().all()

    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["ID", "NIF Gabon", "Raison sociale", "Secteur", "Province", "Ville", "Effectif declare", "Statut", "Email", "Telephone", "Cree le"])
    for op in ops:
        w.writerow([
            op.id, op.nif_gabon, op.raison_sociale, op.secteur, op.province, op.ville,
            op.effectif_declare or 0,
            "Actif" if op.is_active else "Inactif",
            op.contact_email or "", op.contact_telephone or "",
            op.created_at.date().isoformat(),
        ])

    return Response(
        content=buf.getvalue().encode("utf-8-sig"),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=operateurs_export.csv"},
    )


# ---------------------------------------------------------------------------
# PDF builder helper
# ---------------------------------------------------------------------------

def _build_pdf_response(
    lines: list,
    *,
    filename: str,
    font_size: int = 10,
    td_offset: int = 14,
    start_y: int = 760,
    start_x: int = 40,
) -> Response:
    escaped_lines = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        for line in lines
    ]
    text_commands = [f"BT /F1 {font_size} Tf {start_x} {start_y} Td"]
    for index, line in enumerate(escaped_lines):
        if index > 0:
            text_commands.append(f"0 -{td_offset} Td")
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
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

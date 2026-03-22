"""PNPI / PNPI — Endpoints d'exports (CSV, PDF)."""
from __future__ import annotations

import csv
import io
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import FieldReportORM, TraceBatchORM, UnitORM, UserAccountORM
from ..models.pilotage import ProjectDossierORM, ProjectDossierTransitionORM
from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM, OperateurIndustrielORM


router = APIRouter(tags=["Exports"])


def _csv_generator(rows, header):
    """Stream CSV rows one at a time for large datasets."""
    yield ",".join(header) + "\n"
    for row in rows:
        yield ",".join(str(v) for v in row) + "\n"


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
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    from ..main import _compute_sector_indicators
    indicators = _compute_sector_indicators(db)
    header = ["Secteur", "Volume local (T)", "Volume importe (T)", "Emplois"]
    rows = [
        [indicator.sector, indicator.local_volume_tons, indicator.import_volume_tons, indicator.jobs]
        for indicator in indicators
    ]
    write_audit_event(db, actor=current_user.username, action="export.csv", target="indicators", details="Export CSV indicateurs genere")
    db.commit()
    return StreamingResponse(
        _csv_generator(rows, header),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="indicateurs-pnpi.csv"'},
    )


@router.get("/exports/dashboard.pdf")
async def export_dashboard_pdf(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
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
        "REPUBLIQUE GABONAISE",
        "Ministere de l'Industrie et de la Transformation Locale",
        "CONFIDENTIEL — Document officiel PNPI",
        "",
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

    write_audit_event(db, actor=current_user.username, action="export.pdf", target="dashboard", details="Export PDF dashboard genere")
    db.commit()

    return _build_pdf_response(lines, filename="pnpi-dashboard.pdf", font_size=10)


@router.get("/exports/inspectors-briefing.pdf")
async def export_inspectors_briefing_pdf(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
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
        "REPUBLIQUE GABONAISE",
        "Ministere de l'Industrie et de la Transformation Locale",
        "CONFIDENTIEL — Document officiel PNPI",
        "",
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

    write_audit_event(db, actor=current_user.username, action="export.pdf", target="inspectors-briefing", details="Export PDF briefing inspecteurs genere")
    db.commit()

    return _build_pdf_response(lines, filename="pnpi-inspectors-briefing.pdf", font_size=10)


@router.get("/exports/pilotage-transitions.csv")
async def export_pilotage_transitions_csv(
    dossier_id: Optional[str] = Query(default=None),
    changed_by: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
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
    header = [
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
    csv_rows = [
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
        for row in rows
    ]
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
    return StreamingResponse(
        _csv_generator(csv_rows, header),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="pilotage-transitions.csv"'},
    )


@router.get("/exports/pilotage-transitions.pdf")
async def export_pilotage_transitions_pdf(
    dossier_id: Optional[str] = Query(default=None),
    changed_by: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
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
        "REPUBLIQUE GABONAISE",
        "Ministere de l'Industrie et de la Transformation Locale",
        "CONFIDENTIEL — Document officiel PNPI",
        "",
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
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM)
        .where(*([] if not statut else [AgrementTechniqueIndustrielORM.statut == statut]))
        .where(*([] if not secteur else [AgrementTechniqueIndustrielORM.secteur == secteur]))
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
    ).scalars().all()

    header = ["Numero ATI", "Operateur ID", "Type activite", "Secteur", "Statut", "Etape", "Priorite", "Instructeur", "Date soumission", "Date decision", "Age (j)", "SLA (j)", "En retard"]
    rows = []
    for a in atis:
        age = max((now_utc().date() - a.date_soumission.date()).days, 0)
        overdue = age > a.sla_jours and a.statut not in {"approuve", "rejete", "expire"}
        rows.append([
            a.numero_ati, a.operateur_id, a.type_activite, a.secteur, a.statut,
            a.etape, a.priorite, a.instructeur_username or "",
            a.date_soumission.date().isoformat(),
            a.date_decision.date().isoformat() if a.date_decision else "",
            age, a.sla_jours, "Oui" if overdue else "Non",
        ])

    write_audit_event(db, actor=current_user.username, action="export.csv", target="ati", details=f"Export CSV ATI genere ({len(rows)} lignes)")
    db.commit()

    return StreamingResponse(
        _csv_generator(rows, header),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="ati_export.csv"'},
    )


@router.get("/pnpi/exports/operateurs.csv")
async def export_operateurs_csv(
    secteur: Optional[str] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    ops = db.execute(
        select(OperateurIndustrielORM)
        .where(*([] if not secteur else [OperateurIndustrielORM.secteur == secteur]))
        .order_by(OperateurIndustrielORM.raison_sociale)
    ).scalars().all()

    header = ["ID", "NIF Gabon", "Raison sociale", "Secteur", "Province", "Ville", "Effectif declare", "Statut", "Email", "Telephone", "Cree le"]
    rows = []
    for op in ops:
        rows.append([
            op.id, op.nif_gabon, op.raison_sociale, op.secteur, op.province, op.ville,
            op.effectif_declare or 0,
            "Actif" if op.is_active else "Inactif",
            op.contact_email or "", op.contact_telephone or "",
            op.created_at.date().isoformat(),
        ])

    write_audit_event(db, actor=current_user.username, action="export.csv", target="operateurs", details=f"Export CSV operateurs genere ({len(rows)} lignes)")
    db.commit()

    return StreamingResponse(
        _csv_generator(rows, header),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="operateurs_export.csv"'},
    )


@router.get("/pnpi/exports/inspections.csv", summary="Export CSV des inspections de conformite")
async def export_inspections_csv(
    statut_conformite: Optional[str] = Query(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    query = select(InspectionConformiteORM).order_by(InspectionConformiteORM.date_inspection.desc())
    if statut_conformite:
        query = query.where(InspectionConformiteORM.statut_conformite == statut_conformite)
    inspections = db.execute(query).scalars().all()

    header = ["ID", "Operateur ID", "ATI ID", "Inspecteur", "Date", "Statut conformite", "Observations", "Mesures correctives", "Latitude", "Longitude"]
    rows = []
    for insp in inspections:
        rows.append([
            insp.id, insp.operateur_id, insp.ati_id or "",
            insp.inspecteur_username,
            insp.date_inspection.date().isoformat(),
            insp.statut_conformite,
            insp.observations[:200] if insp.observations else "",
            (insp.mesures_correctives or "")[:200],
            insp.latitude or "", insp.longitude or "",
        ])

    write_audit_event(db, actor=current_user.username, action="export.csv", target="inspections", details=f"Export CSV inspections genere ({len(rows)} lignes)")
    db.commit()

    return StreamingResponse(
        _csv_generator(rows, header),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="inspections_export.csv"'},
    )


@router.get("/pnpi/exports/briefing.pdf", summary="Briefing ministeriel PNPI (PDF)")
async def export_pnpi_briefing_pdf(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> Response:
    """Genere un PDF de synthese ministerielle : KPIs, pipeline, repartition sectorielle."""
    from statistics import median as _median
    from collections import defaultdict as _defaultdict

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()

    _TERM = {"approuve", "rejete", "expire"}
    now = now_utc()
    first_of_month = now.date().replace(day=1)

    # KPIs
    atis_total = len(all_atis)
    atis_en_cours = sum(1 for a in all_atis if a.statut not in _TERM)
    atis_approuves_mois = sum(1 for a in all_atis if a.statut == "approuve" and a.date_decision and a.date_decision.date() >= first_of_month)
    atis_en_retard = sum(1 for a in all_atis if a.statut not in _TERM and (now.date() - a.date_soumission.date()).days > a.sla_jours)
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    durations = [max((a.date_decision.date() - a.date_soumission.date()).days, 0) for a in decided]
    delai_moyen = float(_median(durations)) if durations else 0.0
    compliant = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)
    taux_sla = round((compliant / len(durations) * 100) if durations else 0.0, 0)
    ops_actifs = sum(1 for op in all_ops if op.is_active)

    # Pipeline
    counts: dict[str, int] = _defaultdict(int)
    for a in all_atis:
        counts[a.statut] += 1

    # Secteurs
    sec_ops: dict[str, int] = _defaultdict(int)
    sec_atis: dict[str, int] = _defaultdict(int)
    sec_approuves: dict[str, int] = _defaultdict(int)
    sec_emplois: dict[str, int] = _defaultdict(int)
    for op in all_ops:
        sec_ops[op.secteur] += 1
        sec_emplois[op.secteur] += op.effectif_declare or 0
    for a in all_atis:
        sec_atis[a.secteur] += 1
        if a.statut == "approuve":
            sec_approuves[a.secteur] += 1
    all_secteurs = sorted(set(list(sec_ops.keys()) + list(sec_atis.keys())))

    # Provinces
    prov_ops: dict[str, int] = _defaultdict(int)
    prov_atis: dict[str, int] = _defaultdict(int)
    op_prov: dict[str, str] = {}
    for op in all_ops:
        prov_ops[op.province] += 1
        op_prov[op.id] = op.province
    for a in all_atis:
        if a.statut not in _TERM:
            prov_atis[op_prov.get(a.operateur_id, "inconnu")] += 1
    all_provinces = sorted(set(list(prov_ops.keys()) + list(prov_atis.keys())))

    ts = now_utc().strftime("%d/%m/%Y %H:%M")
    lines = [
        "REPUBLIQUE GABONAISE",
        "Ministere de l'Industrie et de la Transformation Locale",
        "CONFIDENTIEL — Document officiel PNPI",
        "",
        f"BRIEFING MINISTERIEL PNPI — {ts}",
        "=" * 60,
        "",
        "INDICATEURS CLES",
        f"  ATIs total .............. {atis_total}",
        f"  ATIs en cours ........... {atis_en_cours}",
        f"  ATIs approuves ce mois .. {atis_approuves_mois}",
        f"  ATIs en retard SLA ...... {atis_en_retard}",
        f"  Delai moyen (jours) ..... {delai_moyen:.1f}",
        f"  Taux conformite SLA ..... {taux_sla:.0f} %",
        f"  Operateurs actifs ....... {ops_actifs}",
        "",
        "PIPELINE DES STATUTS",
        f"  Soumis .................. {counts.get('soumis', 0)}",
        f"  En instruction .......... {counts.get('en_instruction', 0)}",
        f"  En validation ........... {counts.get('en_validation', 0)}",
        f"  Approuves ............... {counts.get('approuve', 0)}",
        f"  Rejetes ................. {counts.get('rejete', 0)}",
        f"  Expires ................. {counts.get('expire', 0)}",
        "",
        "REPARTITION PAR SECTEUR",
    ]
    for s in all_secteurs:
        nb = sec_atis.get(s, 0)
        taux = f"{round(sec_approuves.get(s, 0) / nb * 100):.0f}%" if nb > 0 else "N/A"
        lines.append(
            f"  {s:<18} {sec_ops.get(s, 0):>3} ops  {nb:>3} ATIs  {sec_emplois.get(s, 0):>5} emplois  taux {taux}"
        )
    lines.append("")
    lines.append("REPARTITION PAR PROVINCE")
    for p in all_provinces:
        lines.append(
            f"  {p.replace('_', ' ').title():<22} {prov_ops.get(p, 0):>3} ops  {prov_atis.get(p, 0):>3} ATIs actifs"
        )
    lines.append("")
    lines.append(f"Document genere le {ts} par {current_user.username}")

    write_audit_event(
        db,
        actor=current_user.username,
        action="exports.pnpi_briefing_pdf",
        target=None,
        details=f"atis_total={atis_total}; approuves={counts.get('approuve', 0)}",
    )
    db.commit()

    return _build_pdf_response(lines, filename="pnpi-briefing-ministeriel.pdf", font_size=9, td_offset=12, start_y=770, start_x=36)


@router.post("/admin/briefing/email")
async def email_briefing_to_roles(
    target_roles: List[str] = Body(default=["ministre", "directeur"]),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    """Envoie un email de briefing aux utilisateurs ayant les roles cibles."""
    from ..core.email import send_email

    # Find users with target roles
    all_users = db.execute(
        select(UserAccountORM).where(UserAccountORM.is_active.is_(True))
    ).scalars().all()
    recipients: List[str] = []
    for user in all_users:
        user_roles = set(user.roles_csv.split(","))
        if user_roles & set(target_roles):
            # Use username as email placeholder (format: username@pnpi-gabon.ga)
            recipients.append(f"{user.username}@pnpi-gabon.ga")

    # Generate briefing content
    now = now_utc()
    subject = f"Briefing PNPI \u2014 {now.strftime('%d/%m/%Y')}"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0d3f78; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">PNPI \u2014 Briefing Quotidien</h1>
      </div>
      <div style="padding: 24px; background: #f6f8fb; border-radius: 0 0 12px 12px;">
        <p>Le briefing du {now.strftime('%d/%m/%Y')} est disponible sur la plateforme.</p>
        <a href="https://pnpi-gabon.ga/briefing" style="display: inline-block; padding: 12px 24px; background: #006233; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Consulter le briefing
        </a>
      </div>
    </div>
    """

    sent = 0
    if recipients:
        for email_addr in recipients:
            if send_email([email_addr], subject, html):
                sent += 1

    write_audit_event(db, actor=current_user.username, action="briefing.email",
                     target=f"{len(target_roles)} roles",
                     details=f"Briefing envoye a {sent} destinataire(s)")
    db.commit()

    return {"sent": sent, "recipients_found": len(recipients), "target_roles": target_roles}


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

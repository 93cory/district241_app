"""PNPI — Endpoints de gestion des inspections de conformité."""
from __future__ import annotations

import uuid
from typing import List, Optional

import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.core import UserAccountORM
from ..models.pnpi import AgrementTechniqueIndustrielORM, InspectionConformiteORM, OperateurIndustrielORM
from ..schemas.pnpi import InspectionCreate, InspectionRead

router = APIRouter(prefix="/pnpi", tags=["Inspections"])


def _to_inspection_read(insp: InspectionConformiteORM, db: Session) -> InspectionRead:
    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None
    ati = db.get(AgrementTechniqueIndustrielORM, insp.ati_id) if insp.ati_id else None
    user = db.execute(
        select(UserAccountORM).where(UserAccountORM.username == insp.inspecteur_username)
    ).scalar_one_or_none()
    return InspectionRead(
        id=insp.id,
        operateur_id=insp.operateur_id,
        operateur_nom=op.raison_sociale if op else insp.operateur_id,
        ati_id=insp.ati_id,
        ati_numero=ati.numero_ati if ati else None,
        inspecteur_username=insp.inspecteur_username,
        inspecteur_nom=user.full_name if user else insp.inspecteur_username,
        date_inspection=insp.date_inspection,
        statut_conformite=insp.statut_conformite,
        observations=insp.observations,
        mesures_correctives=insp.mesures_correctives,
        latitude=insp.latitude,
        longitude=insp.longitude,
        province=op.province if op else "",
        secteur=op.secteur if op else "",
        created_at=insp.created_at,
    )


@router.get("/inspections", response_model=List[InspectionRead])
async def list_inspections(
    operateur_id: Optional[str] = Query(default=None),
    statut_conformite: Optional[str] = Query(default=None),
    inspecteur_username: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[InspectionRead]:
    query = select(InspectionConformiteORM)
    if operateur_id:
        query = query.where(InspectionConformiteORM.operateur_id == operateur_id)
    if statut_conformite:
        query = query.where(InspectionConformiteORM.statut_conformite == statut_conformite)
    if inspecteur_username:
        query = query.where(InspectionConformiteORM.inspecteur_username == inspecteur_username)
    query = query.order_by(InspectionConformiteORM.date_inspection.desc()).limit(limit)
    rows = db.execute(query).scalars().all()
    return [_to_inspection_read(r, db) for r in rows]


@router.post("/inspections", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    op = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")

    insp = InspectionConformiteORM(
        id=f"INS-{uuid.uuid4().hex[:12].upper()}",
        operateur_id=payload.operateur_id,
        ati_id=payload.ati_id,
        inspecteur_username=current_user.username,
        date_inspection=payload.date_inspection,
        statut_conformite=payload.statut_conformite,
        observations=payload.observations,
        mesures_correctives=payload.mesures_correctives,
        latitude=payload.latitude,
        longitude=payload.longitude,
        created_at=now_utc(),
    )
    db.add(insp)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.create",
        target=insp.id,
        details=f"operateur={payload.operateur_id}; statut={payload.statut_conformite}",
    )
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.get("/inspections/{inspection_id}", response_model=InspectionRead)
async def get_inspection(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    return _to_inspection_read(insp, db)


@router.patch("/inspections/{inspection_id}", response_model=InspectionRead)
async def update_inspection(
    inspection_id: str,
    payload: InspectionCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> InspectionRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    if insp.inspecteur_username != current_user.username and Role.admin.value not in (current_user.roles or []):
        raise HTTPException(status_code=403, detail="Vous n'etes pas l'inspecteur de ce rapport.")
    insp.statut_conformite = payload.statut_conformite
    insp.observations = payload.observations
    insp.mesures_correctives = payload.mesures_correctives
    write_audit_event(db, actor=current_user.username, action="inspection.update", target=insp.id, details=f"statut={payload.statut_conformite}")
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.get("/inspections/{inspection_id}/pdf")
async def download_inspection_pdf(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER

    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    bleu = colors.HexColor("#003F8F")
    CONF_COLORS_MAP = {"conforme": "#10b981", "non_conforme": "#ef4444", "partiel": "#f59e0b"}
    CONF_LABELS_MAP = {"conforme": "CONFORME", "non_conforme": "NON CONFORME", "partiel": "PARTIEL"}

    story = []
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)))
    story.append(Paragraph("Ministere de l'Industrie — PNPI", ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu)))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Rapport d'Inspection de Conformite", ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=15, spaceAfter=4)))
    story.append(Paragraph(f"Ref. {insp.id}", ParagraphStyle("ref", parent=styles["Normal"], textColor=colors.HexColor("#009440"), fontSize=10, spaceAfter=8)))
    story.append(Spacer(1, 0.4*cm))

    conf_color = colors.HexColor(CONF_COLORS_MAP.get(insp.statut_conformite, "#6b7280"))
    conf_label = CONF_LABELS_MAP.get(insp.statut_conformite, insp.statut_conformite.upper())
    data = [
        ["Resultat", conf_label, "Date inspection", insp.date_inspection.strftime("%d/%m/%Y")],
        ["Inspecteur", insp.inspecteur_username, "Operateur", op.raison_sociale if op else insp.operateur_id],
        ["ATI lie", insp.ati_id or "—", "Province", op.province.replace("_", " ").capitalize() if op else "—"],
    ]
    t = Table(data, colWidths=[4*cm, 5*cm, 4*cm, 4*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
        ("TEXTCOLOR", (1, 0), (1, 0), conf_color),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))
    story.append(Paragraph("Observations", ParagraphStyle("sec", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=6, spaceAfter=4)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph(insp.observations.replace("\n", "<br/>"), ParagraphStyle("obs", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16)))
    if insp.mesures_correctives:
        story.append(Paragraph("Mesures Correctives", ParagraphStyle("sec2", parent=styles["Heading2"], textColor=colors.HexColor("#d97706"), fontSize=12, spaceBefore=6, spaceAfter=4)))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Paragraph(insp.mesures_correctives.replace("\n", "<br/>"), ParagraphStyle("mes", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16)))
    if insp.latitude and insp.longitude:
        story.append(Paragraph(f"Localisation GPS : {insp.latitude:.5f}N, {insp.longitude:.5f}E", ParagraphStyle("gps", parent=styles["Normal"], fontSize=9, textColor=colors.gray)))
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    from ..database import now_utc as _now
    story.append(Paragraph(
        f"Document genere par la PNPI — {_now().strftime('%d/%m/%Y %H:%M')} UTC",
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray)
    ))
    doc.build(story)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="inspection_{insp.id}.pdf"'},
    )

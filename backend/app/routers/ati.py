"""PNPI — Endpoints de gestion des ATI (Agrements Techniques Industriels)."""
from __future__ import annotations

import io
import uuid
from datetime import timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    ATITransitionORM,
    OperateurIndustrielORM,
)
from ..schemas.pnpi import ATIBrief, ATICreate, ATIRead, ATIStatusUpdate, ATITransitionRead


router = APIRouter(prefix="/pnpi", tags=["ATI"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}

# Valid transition graph: statut -> allowed next statuts
_STATUT_TRANSITIONS = {
    "soumis": ["soumis", "en_instruction", "rejete"],
    "en_instruction": ["en_instruction", "en_validation", "rejete"],
    "en_validation": ["en_validation", "approuve", "rejete"],
    "approuve": ["approuve", "expire"],
    "rejete": ["rejete"],
    "expire": ["expire"],
}


def _ati_age_jours(ati: AgrementTechniqueIndustrielORM) -> int:
    return max((now_utc().date() - ati.date_soumission.date()).days, 0)


def _ati_is_overdue(ati: AgrementTechniqueIndustrielORM) -> bool:
    return _ati_age_jours(ati) > ati.sla_jours and ati.statut not in _TERMINAL_STATUTS


def _to_ati_read(ati: AgrementTechniqueIndustrielORM) -> ATIRead:
    age = _ati_age_jours(ati)
    return ATIRead(
        id=ati.id,
        numero_ati=ati.numero_ati,
        operateur_id=ati.operateur_id,
        type_activite=ati.type_activite,
        secteur=ati.secteur,
        statut=ati.statut,
        etape=ati.etape,
        priorite=ati.priorite,
        instructeur_username=ati.instructeur_username,
        date_soumission=ati.date_soumission,
        date_decision=ati.date_decision,
        date_expiration=ati.date_expiration,
        sla_jours=ati.sla_jours,
        qr_code_data=ati.qr_code_data,
        motif_rejet=ati.motif_rejet,
        numero_reference_decision=ati.numero_reference_decision,
        observations=ati.observations,
        created_by=ati.created_by,
        updated_at=ati.updated_at,
        age_jours=age,
        is_overdue=_ati_is_overdue(ati),
    )


def _to_ati_brief(ati: AgrementTechniqueIndustrielORM) -> ATIBrief:
    return ATIBrief(
        id=ati.id,
        numero_ati=ati.numero_ati,
        type_activite=ati.type_activite,
        secteur=ati.secteur,
        statut=ati.statut,
        etape=ati.etape,
        priorite=ati.priorite,
        instructeur_username=ati.instructeur_username,
        date_soumission=ati.date_soumission,
        age_jours=_ati_age_jours(ati),
        is_overdue=_ati_is_overdue(ati),
    )


def _generate_numero_ati(db: Session) -> str:
    year = now_utc().year
    prefix = f"ATI-{year}-"
    existing = db.execute(
        select(AgrementTechniqueIndustrielORM.numero_ati).where(
            AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%")
        )
    ).scalars().all()
    return f"{prefix}{len(existing) + 1:04d}"


@router.get("/ati", response_model=List[ATIRead])
async def list_atis(
    statut: Optional[str] = Query(default=None),
    secteur: Optional[str] = Query(default=None),
    province: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[ATIRead]:
    query = select(AgrementTechniqueIndustrielORM)
    if statut:
        query = query.where(AgrementTechniqueIndustrielORM.statut == statut)
    if secteur:
        query = query.where(AgrementTechniqueIndustrielORM.secteur == secteur)
    if province:
        # Filter via join on operateur province
        query = query.join(OperateurIndustrielORM).where(OperateurIndustrielORM.province == province)
    query = query.order_by(AgrementTechniqueIndustrielORM.date_soumission.desc()).offset(skip).limit(limit)
    atis = db.execute(query).scalars().all()
    return [_to_ati_read(a) for a in atis]


@router.post("/ati", response_model=ATIRead, status_code=status.HTTP_201_CREATED)
async def create_ati(
    payload: ATICreate,
    current_user: User = Depends(require_roles(Role.admin, Role.instructeur, Role.ministre, Role.ministere)),
    db: Session = Depends(get_db),
) -> ATIRead:
    operateur = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not operateur:
        raise HTTPException(status_code=404, detail="Operateur industriel introuvable.")

    numero_ati = _generate_numero_ati(db)
    now = now_utc()

    ati = AgrementTechniqueIndustrielORM(
        id=f"ATI-{uuid.uuid4().hex[:12].upper()}",
        numero_ati=numero_ati,
        operateur_id=payload.operateur_id,
        type_activite=payload.type_activite.strip(),
        secteur=payload.secteur.strip(),
        statut="soumis",
        etape="reception",
        priorite=payload.priorite,
        instructeur_username=payload.instructeur_username,
        date_soumission=now,
        sla_jours=payload.sla_jours,
        observations=payload.observations,
        created_by=current_user.username,
        updated_at=now,
    )
    db.add(ati)

    transition = ATITransitionORM(
        id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=None,
        new_statut="soumis",
        previous_etape=None,
        new_etape="reception",
        note="Creation ATI",
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.create",
        target=ati.id,
        details=f"numero={numero_ati}; operateur={payload.operateur_id}; secteur={payload.secteur}",
    )
    db.commit()
    db.refresh(ati)
    return _to_ati_read(ati)


@router.get("/ati/{ati_id}", response_model=ATIRead)
async def get_ati(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    return _to_ati_read(ati)


@router.patch("/ati/{ati_id}/statut", response_model=ATIRead)
async def update_ati_statut(
    ati_id: str,
    payload: ATIStatusUpdate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.ministere)),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    prev_statut = ati.statut
    prev_etape = ati.etape
    now = now_utc()

    if payload.new_statut is not None:
        allowed_next = _STATUT_TRANSITIONS.get(ati.statut, [])
        if payload.new_statut not in allowed_next:
            raise HTTPException(
                status_code=400,
                detail=f"Transition statut invalide: {ati.statut} -> {payload.new_statut}. Permis: {allowed_next}",
            )
        ati.statut = payload.new_statut

    if payload.new_etape is not None:
        ati.etape = payload.new_etape

    if payload.instructeur_username is not None:
        ati.instructeur_username = payload.instructeur_username

    if payload.motif_rejet is not None:
        ati.motif_rejet = payload.motif_rejet

    if payload.numero_reference_decision is not None:
        ati.numero_reference_decision = payload.numero_reference_decision

    # Handle approval: set decision dates, generate QR code
    if ati.statut == "approuve" and not ati.date_decision:
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )

    # Handle rejection
    if ati.statut == "rejete" and not ati.date_decision:
        ati.date_decision = now

    ati.updated_at = now

    transition = ATITransitionORM(
        id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=prev_statut,
        new_statut=ati.statut,
        previous_etape=prev_etape,
        new_etape=ati.etape,
        note=payload.note or "",
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.update_statut",
        target=ati_id,
        details=f"statut:{prev_statut}->{ati.statut}; etape:{prev_etape}->{ati.etape}",
    )
    db.commit()
    db.refresh(ati)

    # Notifications email asynchrones
    try:
        from ..core.notifications import notify_ati_approved, notify_ati_rejected
        op = db.get(OperateurIndustrielORM, ati.operateur_id)
        emails = [e for e in [op.contact_email if op else None] if e]
        raison = op.raison_sociale if op else ati.operateur_id
        if ati.statut == "approuve" and prev_statut != "approuve" and emails:
            notify_ati_approved(ati.numero_ati, raison, emails)
        elif ati.statut == "rejete" and prev_statut != "rejete" and emails:
            notify_ati_rejected(ati.numero_ati, raison, ati.motif_rejet or "", emails)
    except Exception:
        pass  # Ne bloque jamais le workflow si l'email echoue

    return _to_ati_read(ati)


@router.get("/ati/{ati_id}/historique", response_model=List[ATITransitionRead])
async def ati_historique(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[ATITransitionRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    transitions = db.execute(
        select(ATITransitionORM)
        .where(ATITransitionORM.ati_id == ati_id)
        .order_by(ATITransitionORM.changed_at.asc())
    ).scalars().all()

    return [
        ATITransitionRead(
            id=t.id,
            ati_id=t.ati_id,
            changed_by=t.changed_by,
            previous_statut=t.previous_statut,
            new_statut=t.new_statut,
            previous_etape=t.previous_etape,
            new_etape=t.new_etape,
            note=t.note,
            changed_at=t.changed_at,
        )
        for t in transitions
    ]


@router.get("/ati/{ati_id}/qrcode")
async def download_ati_qrcode(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    import qrcode  # type: ignore
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    if not ati.qr_code_data:
        raise HTTPException(status_code=404, detail="QR code non disponible. L'ATI doit etre approuve.")

    img = qrcode.make(ati.qr_code_data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{ati.numero_ati}.png"'},
    )


@router.get("/ati/{ati_id}/pdf")
async def download_ati_pdf(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministere, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    op = db.get(OperateurIndustrielORM, ati.operateur_id) if ati.operateur_id else None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()
    bleu = colors.HexColor("#003F8F")
    vert = colors.HexColor("#009440")

    title_style = ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=16, spaceAfter=6)
    sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=vert, fontSize=10, spaceAfter=4)
    label_style = ParagraphStyle("label", parent=styles["Normal"], textColor=colors.HexColor("#6b7280"), fontSize=8, spaceAfter=2)
    value_style = ParagraphStyle("value", parent=styles["Normal"], fontSize=10, spaceAfter=8)

    story = []

    # Header
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)))
    story.append(Paragraph("Ministere de l'Industrie", ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)))
    story.append(Paragraph("Plateforme Nationale de Pilotage Industriel (PNPI)", ParagraphStyle("pnpi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu)))
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3*cm))

    story.append(Paragraph(f"Agrement Technique Industriel", title_style))
    story.append(Paragraph(f"N° {ati.numero_ati}", sub_style))
    story.append(Spacer(1, 0.5*cm))

    # Infos ATI
    statut_colors_map = {"approuve": "#10b981", "rejete": "#ef4444", "soumis": "#f59e0b", "en_instruction": "#3b82f6", "en_validation": "#8b5cf6", "expire": "#9ca3af"}
    sc = statut_colors_map.get(ati.statut, "#6b7280")
    data = [
        ["Statut", ati.statut.upper().replace("_", " "), "Priorite", ati.priorite.capitalize()],
        ["Secteur", ati.secteur.capitalize(), "Etape", ati.etape.replace("_", " ").capitalize()],
        ["Date soumission", ati.date_soumission.strftime("%d/%m/%Y") if ati.date_soumission else "—", "SLA (jours)", str(ati.sla_jours)],
    ]
    if ati.date_decision:
        data.append(["Date decision", ati.date_decision.strftime("%d/%m/%Y"), "Ref. decision", ati.numero_reference_decision or "—"])

    t = Table(data, colWidths=[4*cm, 6*cm, 4*cm, 3*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    # Operateur
    if op:
        story.append(Paragraph("Operateur industriel", ParagraphStyle("section", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=8, spaceAfter=4)))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        op_data = [
            ["Raison sociale", op.raison_sociale, "NIF", op.nif_gabon],
            ["Province", op.province.replace("_", " ").capitalize(), "Ville", op.ville or "—"],
            ["Secteur", op.secteur.capitalize(), "Effectif", str(op.effectif_declare or "—")],
        ]
        ot = Table(op_data, colWidths=[4*cm, 6*cm, 4*cm, 3*cm])
        ot.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
            ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(ot)
        story.append(Spacer(1, 0.3*cm))

    # Activite
    story.append(Paragraph("Activite industrielle", ParagraphStyle("section", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=8, spaceAfter=4)))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph(ati.type_activite, value_style))

    if ati.observations:
        story.append(Paragraph("Observations", label_style))
        story.append(Paragraph(ati.observations, value_style))

    if ati.motif_rejet:
        story.append(Paragraph("Motif de rejet", ParagraphStyle("rej", parent=styles["Normal"], textColor=colors.red, fontSize=9, spaceAfter=4)))
        story.append(Paragraph(ati.motif_rejet, value_style))

    # Footer
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    story.append(Paragraph(
        f"Document genere par la PNPI — {now_utc().strftime('%d/%m/%Y %H:%M')} UTC",
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray)
    ))

    doc.build(story)
    buf.seek(0)
    filename = f"ATI_{ati.numero_ati.replace('-', '_')}.pdf"
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

"""PNPI — Endpoints de gestion des ATI (Agrements Techniques Industriels)."""
from __future__ import annotations

import io
import logging
import uuid
from datetime import date as date_type, datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, Form, HTTPException, Query, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, select

logger = logging.getLogger("pnpi")

from ..core.auth import Role, User, get_current_user, require_roles
from ..core.audit import write_audit_event
from ..core.field_tracker import get_field_history
from ..core.risk_assessment import assess_risk
from ..core.decision_engine import recommend_decision
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    ATICommentORM,
    ATITagORM,
    ATITransitionORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
    UserFavoriteORM,
)
from ..schemas.pnpi import ATIBrief, ATICreate, ATIRead, ATIStatusUpdate, ATITransitionRead

from pydantic import BaseModel as _BaseModel


class _BulkAssignPayload(_BaseModel):
    ati_ids: List[str]
    instructeur_username: str


router = APIRouter(prefix="/pnpi", tags=["ATI"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}

# Valid transition graph: statut -> allowed next statuts
_STATUT_TRANSITIONS = {
    "soumis": {"en_instruction"},
    "en_instruction": {"en_validation", "rejete"},
    "en_validation": {"approuve", "rejete"},
    "rejete": {"soumis"},  # resubmission
    "approuve": {"expire"},  # only by system
    "expire": set(),  # terminal
}

# Valid etape transitions
_ETAPE_TRANSITIONS = {
    "reception": {"analyse_technique"},
    "analyse_technique": {"verification_terrain", "decision"},
    "verification_terrain": {"decision"},
    "decision": {"notification"},
    "notification": set(),  # terminal
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
    max_num = db.execute(
        select(func.max(AgrementTechniqueIndustrielORM.numero_ati)).where(
            AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%")
        )
    ).scalar()
    if max_num:
        try:
            last_num = int(max_num.split("-")[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0
    return f"{prefix}{last_num + 1:04d}"


@router.get("/ati", response_model=List[ATIRead], summary="Lister les ATI",
             description="Retourne la liste des agrements techniques avec filtres optionnels sur statut, secteur et province.")
async def list_atis(
    statut: Optional[str] = Query(default=None),
    secteur: Optional[str] = Query(default=None),
    province: Optional[str] = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[ATIRead]:
    query = select(AgrementTechniqueIndustrielORM)
    if assigned_to_me:
        query = query.where(AgrementTechniqueIndustrielORM.instructeur_username == current_user.username)
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


@router.post("/ati", response_model=ATIRead, status_code=status.HTTP_201_CREATED,
             summary="Soumettre un nouvel ATI",
             description="Cree un agrement technique industriel et genere son numero unique.")
async def create_ati(
    payload: ATICreate,
    current_user: User = Depends(require_roles(Role.admin, Role.instructeur, Role.ministre)),
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


# ─── Static /ati/* routes MUST be registered BEFORE /ati/{ati_id} ──────────


@router.post("/ati/archive-expired")
async def archive_expired_atis(
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Archive all expired ATIs (set status to 'expire')."""
    now = now_utc()
    all_atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.statut == "approuve",
            AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
            AgrementTechniqueIndustrielORM.date_expiration < now,
        )
    ).scalars().all()

    archived = 0
    for ati in all_atis:
        ati.statut = "expire"
        archived += 1

    if archived:
        db.commit()
        write_audit_event(db, actor=current_user.username, action="ati.bulk_archive",
                         target="expired", details=f"{archived} ATI(s) archives automatiquement")
        db.commit()

    return {"status": "ok", "archived": archived}


@router.get("/ati/archived")
async def list_archived_atis(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List archived/expired ATIs."""
    query = (
        select(AgrementTechniqueIndustrielORM)
        .where(AgrementTechniqueIndustrielORM.statut == "expire")
        .order_by(AgrementTechniqueIndustrielORM.date_expiration.desc())
        .offset(skip).limit(limit)
    )
    atis = db.execute(query).scalars().all()

    return {"atis": [{
        "id": a.id,
        "numero_ati": a.numero_ati,
        "operateur": a.operateur.raison_sociale if a.operateur else None,
        "secteur": a.secteur,
        "date_expiration": a.date_expiration.isoformat() if a.date_expiration else None,
        "date_soumission": a.date_soumission.isoformat(),
    } for a in atis]}


@router.get("/ati/favorites", summary="Liste des ATI favoris de l'utilisateur")
async def get_favorites(
    current_user: User = Depends(require_roles(
        Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur, Role.inspecteur
    )),
    db: Session = Depends(get_db),
):
    favs = db.execute(
        select(UserFavoriteORM).where(UserFavoriteORM.username == current_user.username)
        .order_by(UserFavoriteORM.created_at.desc())
    ).scalars().all()

    result = []
    for f in favs:
        ati = db.get(AgrementTechniqueIndustrielORM, f.ati_id)
        result.append({
            "id": f.id,
            "ati_id": f.ati_id,
            "numero_ati": ati.numero_ati if ati else None,
            "statut": ati.statut if ati else None,
            "operateur": ati.operateur.raison_sociale if ati and ati.operateur else None,
            "note": f.note,
            "created_at": f.created_at.isoformat(),
        })
    return {"favorites": result}


@router.get("/ati/tags/all")
async def list_all_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all unique tag labels used across ATIs."""
    from sqlalchemy import distinct
    labels = db.execute(
        select(distinct(ATITagORM.label), ATITagORM.color)
        .order_by(ATITagORM.label)
    ).all()
    return {"tags": [{"label": l, "color": c} for l, c in labels]}


@router.get("/ati/expiring-soon")
async def expiring_soon(
    days: int = Query(60, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List ATIs expiring within N days."""
    now = now_utc()
    cutoff = now + timedelta(days=days)

    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.statut == "approuve",
            AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
            AgrementTechniqueIndustrielORM.date_expiration <= cutoff,
            AgrementTechniqueIndustrielORM.date_expiration >= now,
        ).order_by(AgrementTechniqueIndustrielORM.date_expiration.asc())
    ).scalars().all()

    return {"count": len(atis), "days_threshold": days, "atis": [{
        "id": a.id,
        "numero_ati": a.numero_ati,
        "operateur": a.operateur.raison_sociale if a.operateur else None,
        "secteur": a.secteur,
        "date_expiration": a.date_expiration.isoformat(),
        "days_remaining": (a.date_expiration.date() - now.date()).days,
    } for a in atis]}


@router.get("/ati/triage")
async def get_triage_queue(
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Get ATIs sorted by priority score for triage."""
    now = now_utc()
    pending = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.statut.notin_(["approuve", "rejete", "expire"])
        )
    ).scalars().all()

    scored = []
    for ati in pending:
        age = (now.date() - ati.date_soumission.date()).days
        sla_pct = age / max(ati.sla_jours, 1) * 100

        # Priority score (higher = more urgent)
        priority = 0
        priority += min(sla_pct, 150)  # SLA urgency (max 150)

        # Sector weight
        SECTOR_PRIORITY = {"mines": 20, "energie": 15, "chimie": 10, "btp": 8, "bois": 5, "agroalimentaire": 5}
        priority += SECTOR_PRIORITY.get(ati.secteur, 0)

        # Resubmission bonus
        if "REN" in ati.numero_ati or "RESUB" in ati.numero_ati:
            priority += 15

        level = "critique" if priority >= 120 else "urgent" if priority >= 80 else "normal" if priority >= 40 else "faible"
        color = "#b42318" if priority >= 120 else "#e65100" if priority >= 80 else "#d97706" if priority >= 40 else "#006233"

        scored.append({
            "id": ati.id,
            "numero_ati": ati.numero_ati,
            "operateur": ati.operateur.raison_sociale if ati.operateur else None,
            "secteur": ati.secteur,
            "statut": ati.statut,
            "age_jours": age,
            "sla_jours": ati.sla_jours,
            "sla_pct": round(sla_pct, 1),
            "priority_score": round(priority),
            "priority_level": level,
            "color": color,
            "instructeur": getattr(ati, 'instructeur_username', None),
        })

    scored.sort(key=lambda x: -x["priority_score"])
    return {"queue": scored, "total": len(scored)}


# ─── Parameterized /ati/{ati_id} routes below ─────────────────────────────


@router.get("/ati/{ati_id}", response_model=ATIRead, summary="Detail d'un ATI")
async def get_ati(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    return _to_ati_read(ati)


@router.patch("/ati/{ati_id}/statut", response_model=ATIRead,
              summary="Changer le statut d'un ATI",
              description="Effectue une transition de statut selon le graphe de workflow (soumis -> en_instruction -> en_validation -> approuve/rejete).")
async def update_ati_statut(
    ati_id: str,
    payload: ATIStatusUpdate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.ministre)),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    prev_statut = ati.statut
    prev_etape = ati.etape
    now = now_utc()

    if payload.new_statut is not None:
        allowed = _STATUT_TRANSITIONS.get(ati.statut, set())
        if payload.new_statut not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Transition invalide: {ati.statut} -> {payload.new_statut}. Transitions autorisees: {', '.join(allowed) or 'aucune'}",
            )
        ati.statut = payload.new_statut

    if payload.new_etape is not None:
        allowed_etapes = _ETAPE_TRANSITIONS.get(ati.etape, set())
        if payload.new_etape not in allowed_etapes:
            raise HTTPException(
                status_code=400,
                detail=f"Transition etape invalide: {ati.etape} -> {payload.new_etape}. Transitions autorisees: {', '.join(allowed_etapes) or 'aucune'}",
            )
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
    except Exception as e:
        logger.warning(f"Notification failed for ATI {ati.numero_ati}: {e}")

    return _to_ati_read(ati)


@router.post("/ati/{ati_id}/resubmit", summary="Resoumettre un ATI rejete",
             description="Permet a un operateur de resoumettre un ATI precedemment rejete apres corrections.")
async def resubmit_ati(
    ati_id: str,
    observations: str = Form(""),
    current_user: User = Depends(require_roles(Role.operateur, Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    if ati.statut != "rejete":
        raise HTTPException(status_code=400, detail="Seul un ATI rejete peut etre resoumis.")

    # Reset to soumis
    previous_statut = ati.statut
    ati.statut = "soumis"
    ati.etape = "reception"
    ati.motif_rejet = None
    ati.date_decision = None
    if observations.strip():
        ati.observations = observations.strip()
    ati.updated_at = now_utc()

    # Record transition
    transition = ATITransitionORM(
        id=f"TR-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=previous_statut,
        new_statut="soumis",
        previous_etape="decision",
        new_etape="reception",
        note=f"Resoumission par l'operateur. {observations.strip()}",
        changed_at=now_utc(),
    )
    db.add(transition)

    write_audit_event(db, actor=current_user.username, action="ati.resubmit", target=ati.id, details="ATI resoumis apres rejet")
    db.commit()

    return {"message": "ATI resoumis avec succes.", "id": ati.id, "statut": "soumis"}


@router.get("/ati/{ati_id}/historique", response_model=List[ATITransitionRead],
            summary="Historique des transitions ATI")
async def ati_historique(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
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


@router.get("/ati/{ati_id}/qrcode", summary="QR Code ATI",
            description="Genere un QR code PNG pour l'agrement technique.")
async def download_ati_qrcode(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
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


@router.get("/ati/{ati_id}/pdf", summary="Certificat PDF ATI",
            description="Genere le certificat PDF d'un agrement approuve.")
async def download_ati_pdf(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

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
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur generation PDF: {str(e)}")


@router.get("/ati/{ati_id}/certificate.pdf", summary="Certificat officiel ATI avec QR code",
            description="Genere un certificat officiel PDF avec QR code pour un ATI approuve.")
async def download_ati_certificate(
    ati_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from ..core.certificate import generate_ati_certificate

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    if ati.statut != "approuve":
        raise HTTPException(status_code=400, detail="Certificat disponible uniquement pour les ATI approuves.")

    try:
        op = ati.operateur
        op_name = op.raison_sociale if op else "Inconnu"
        pdf = generate_ati_certificate(
            numero_ati=ati.numero_ati,
            operateur=op_name,
            nif=op.nif_gabon if op else "",
            secteur=ati.secteur,
            province=op.province if op else "",
            type_activite=ati.type_activite,
            date_soumission=ati.date_soumission,
            date_decision=ati.date_decision,
            date_expiration=ati.date_expiration,
            reference_decision=ati.numero_reference_decision,
            sla_jours=ati.sla_jours,
        )

        write_audit_event(db, actor=current_user.username, action="ati.certificate",
                         target=ati.id, details=f"Certificat ATI {ati.numero_ati} telecharge")
        db.commit()

        return FastAPIResponse(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="certificat_ATI_{ati.numero_ati}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur generation certificat: {str(e)}")


@router.post("/ati/bulk-assign", summary="Assigner des ATI en lot a un instructeur",
             description="Permet a un directeur ou admin d'assigner plusieurs ATI a un instructeur en une seule operation.")
async def bulk_assign_ati(
    payload: _BulkAssignPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict:
    if not payload.ati_ids:
        raise HTTPException(status_code=400, detail="La liste ati_ids ne peut pas etre vide.")
    if len(payload.ati_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 ATI par operation.")

    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.id.in_(payload.ati_ids)
        )
    ).scalars().all()

    if len(atis) != len(payload.ati_ids):
        found_ids = {a.id for a in atis}
        missing = [aid for aid in payload.ati_ids if aid not in found_ids]
        raise HTTPException(status_code=404, detail=f"ATI introuvables: {missing}")

    assigned = 0
    for ati in atis:
        if ati.statut in _TERMINAL_STATUTS:
            continue
        prev_instructeur = ati.instructeur_username
        ati.instructeur_username = payload.instructeur_username
        ati.updated_at = now_utc()

        db.add(ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:16].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut=ati.statut,
            new_statut=ati.statut,
            note=f"Assignation instructeur: {prev_instructeur or 'aucun'} -> {payload.instructeur_username}",
            changed_at=now_utc(),
        ))
        assigned += 1

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.bulk_assign",
        target=payload.instructeur_username,
        details=f"ati_ids={len(payload.ati_ids)}; assigned={assigned}",
    )
    db.commit()

    return {"assigned": assigned, "skipped": len(atis) - assigned, "instructeur": payload.instructeur_username}


@router.get("/alerts", summary="Alertes PNPI auto-generees")
async def list_pnpi_alerts(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> list:
    """Genere dynamiquement des alertes a partir des donnees PNPI."""
    alerts = []
    now = now_utc()

    # 1. ATIs en retard SLA
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    for a in all_atis:
        if a.statut in _TERMINAL_STATUTS:
            continue
        age = max((now.date() - a.date_soumission.date()).days, 0)
        if age > a.sla_jours:
            alerts.append({
                "type": "sla_overdue",
                "severity": "high" if age > a.sla_jours * 1.5 else "medium",
                "title": f"ATI {a.numero_ati} en retard SLA",
                "message": f"Age: {age}j / SLA: {a.sla_jours}j — {a.type_activite}",
                "target_id": a.id,
                "created_at": now.isoformat(),
            })

    # 2. Inspections non conformes recentes (30 derniers jours)
    cutoff = now - timedelta(days=30)
    recent_inspections = db.execute(
        select(InspectionConformiteORM)
        .where(InspectionConformiteORM.statut_conformite == "non_conforme")
        .where(InspectionConformiteORM.date_inspection >= cutoff)
        .order_by(InspectionConformiteORM.date_inspection.desc())
    ).scalars().all()
    for insp in recent_inspections:
        alerts.append({
            "type": "non_conforme",
            "severity": "high",
            "title": f"Inspection non conforme — {insp.operateur_id}",
            "message": insp.observations[:120] if insp.observations else "",
            "target_id": insp.id,
            "created_at": insp.date_inspection.isoformat(),
        })

    # 3. ATIs expirant dans les 90 prochains jours
    horizon = now.date() + timedelta(days=90)
    for a in all_atis:
        if a.statut == "approuve" and a.date_expiration:
            days_left = (a.date_expiration.date() - now.date()).days
            if 0 < days_left <= 90:
                sev = "critical" if days_left <= 30 else "medium"
                alerts.append({
                    "type": "expiring_soon",
                    "severity": sev,
                    "title": f"ATI {a.numero_ati} expire dans {days_left}j",
                    "message": f"Expiration: {a.date_expiration.date().isoformat()} — {a.type_activite}",
                    "target_id": a.id,
                    "created_at": now.isoformat(),
                })

    # Sort by severity (critical > high > medium > info)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "info": 3}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 9))

    return alerts


@router.get("/historique", summary="Historique global des transitions ATI")
async def list_all_transitions(
    limit: int = Query(default=100, le=500),
    changed_by: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None, description="Date debut ISO (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(default=None, description="Date fin ISO (YYYY-MM-DD)"),
    actor: Optional[str] = Query(default=None, description="Nom d'utilisateur acteur"),
    ati_numero: Optional[str] = Query(default=None, description="Numero ATI (recherche partielle)"),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list:
    query = select(ATITransitionORM).order_by(ATITransitionORM.changed_at.desc())
    # Support both changed_by and actor params (actor is the new name)
    effective_actor = actor or changed_by
    if effective_actor:
        query = query.where(ATITransitionORM.changed_by == effective_actor)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            query = query.where(ATITransitionORM.changed_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            query = query.where(ATITransitionORM.changed_at <= dt_to)
        except ValueError:
            pass
    if ati_numero:
        # Join to ATI table and filter by numero_ati (partial match)
        query = query.join(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.numero_ati.ilike(f"%{ati_numero}%")
        )
    query = query.limit(limit)
    transitions = db.execute(query).scalars().all()

    return [
        {
            "id": t.id,
            "ati_id": t.ati_id,
            "changed_by": t.changed_by,
            "previous_statut": t.previous_statut,
            "new_statut": t.new_statut,
            "previous_etape": t.previous_etape,
            "new_etape": t.new_etape,
            "note": t.note,
            "changed_at": t.changed_at.isoformat(),
        }
        for t in transitions
    ]


class _BulkApprovePayload(_BaseModel):
    ati_ids: List[str]
    note: str = ""


class _BulkRejectPayload(_BaseModel):
    ati_ids: List[str]
    motif_rejet: str


@router.post("/ati/bulk-approve", summary="Approuver des ATI en lot",
             description="Permet a un directeur, admin ou ministre d'approuver plusieurs ATI en validation en une seule operation.")
async def bulk_approve(
    payload: _BulkApprovePayload,
    current_user: User = Depends(require_roles(Role.directeur, Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    results: dict = {"approved": [], "errors": []}
    for ati_id in payload.ati_ids:
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if not ati:
            results["errors"].append({"id": ati_id, "error": "ATI introuvable"})
            continue
        if ati.statut not in ("en_validation",):
            results["errors"].append({"id": ati_id, "error": f"Statut actuel: {ati.statut}, transition impossible"})
            continue
        now = now_utc()
        ati.statut = "approuve"
        ati.etape = "decision"
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )
        ati.updated_at = now
        # Record transition
        transition = ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut="en_validation",
            new_statut="approuve",
            note=payload.note or "Approbation groupee",
            changed_at=now,
        )
        db.add(transition)
        results["approved"].append(ati.id)

    if results["approved"]:
        write_audit_event(db, actor=current_user.username, action="ati.bulk_approve",
                         target=f"{len(results['approved'])} ATIs",
                         details=f"IDs: {', '.join(results['approved'][:10])}")
        db.commit()
    return results


@router.post("/ati/bulk-reject", summary="Rejeter des ATI en lot",
             description="Permet a un directeur, admin ou ministre de rejeter plusieurs ATI en validation en une seule operation.")
async def bulk_reject(
    payload: _BulkRejectPayload,
    current_user: User = Depends(require_roles(Role.directeur, Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    results: dict = {"rejected": [], "errors": []}
    for ati_id in payload.ati_ids:
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if not ati:
            results["errors"].append({"id": ati_id, "error": "ATI introuvable"})
            continue
        if ati.statut not in ("en_validation",):
            results["errors"].append({"id": ati_id, "error": f"Statut actuel: {ati.statut}, transition impossible"})
            continue
        now = now_utc()
        ati.statut = "rejete"
        ati.etape = "decision"
        ati.date_decision = now
        ati.motif_rejet = payload.motif_rejet
        ati.updated_at = now
        # Record transition
        transition = ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut="en_validation",
            new_statut="rejete",
            note=f"Rejet groupe: {payload.motif_rejet}",
            changed_at=now,
        )
        db.add(transition)
        results["rejected"].append(ati.id)

    if results["rejected"]:
        write_audit_event(db, actor=current_user.username, action="ati.bulk_reject",
                         target=f"{len(results['rejected'])} ATIs",
                         details=f"IDs: {', '.join(results['rejected'][:10])}")
        db.commit()
    return results


# ─── Public verification (no auth — used by QR code scanning) ─────────────


@router.get("/ati/verify/{numero_ati}", summary="Verification publique d'un ATI",
            description="Endpoint public sans authentification. Utilise par le scan du QR code sur le certificat ATI.")
async def verify_ati_public(numero_ati: str, db: Session = Depends(get_db)):
    """Public endpoint — no authentication required. Used by QR code scanning."""
    ati = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.numero_ati == numero_ati
        )
    ).scalar_one_or_none()

    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    op = ati.operateur
    now = now_utc()

    # Check expiration
    is_expired = False
    if ati.date_expiration and ati.date_expiration.date() < now.date():
        is_expired = True

    return {
        "valid": ati.statut == "approuve" and not is_expired,
        "numero_ati": ati.numero_ati,
        "statut": "expire" if is_expired else ati.statut,
        "operateur": op.raison_sociale if op else None,
        "nif": op.nif_gabon if op else None,
        "secteur": ati.secteur,
        "type_activite": ati.type_activite,
        "date_approbation": ati.date_decision.isoformat() if ati.date_decision else None,
        "date_expiration": ati.date_expiration.isoformat() if ati.date_expiration else None,
        "verified_at": now.isoformat(),
    }


@router.post("/ati/{ati_id}/favorite", summary="Epingler / desepingler un ATI")
async def toggle_favorite(
    ati_id: str,
    current_user: User = Depends(require_roles(
        Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur, Role.inspecteur
    )),
    db: Session = Depends(get_db),
):
    existing = db.execute(
        select(UserFavoriteORM).where(
            UserFavoriteORM.username == current_user.username,
            UserFavoriteORM.ati_id == ati_id,
        )
    ).scalar_one_or_none()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "ati_id": ati_id}

    fav = UserFavoriteORM(
        id=str(uuid.uuid4()),
        username=current_user.username,
        ati_id=ati_id,
    )
    db.add(fav)
    db.commit()
    return {"status": "added", "ati_id": ati_id, "id": fav.id}


# ─── ATI Comments / Annotations ─────────────────────────────────────────


@router.get("/ati/{ati_id}/comments", summary="Commentaires d'un ATI")
async def get_ati_comments(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(ATICommentORM).where(ATICommentORM.ati_id == ati_id)
    # Operators only see non-internal comments
    user_roles = set(current_user.roles)
    if user_roles == {"operateur"}:
        query = query.where(ATICommentORM.is_internal.is_(False))

    comments = db.execute(query.order_by(ATICommentORM.created_at.asc())).scalars().all()
    return {
        "comments": [
            {
                "id": c.id,
                "author": c.author_username,
                "body": c.body,
                "is_internal": c.is_internal,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments
        ]
    }


@router.post("/ati/{ati_id}/comments", summary="Ajouter un commentaire a un ATI")
async def add_ati_comment(
    ati_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    body = (data.get("body") or "").strip()
    if not body:
        raise HTTPException(400, "Le commentaire ne peut pas etre vide.")

    is_internal = bool(data.get("is_internal", False))
    # Only staff can post internal comments
    if is_internal and set(current_user.roles) == {"operateur"}:
        is_internal = False

    comment = ATICommentORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        author_username=current_user.username,
        body=body,
        is_internal=is_internal,
    )
    db.add(comment)
    db.commit()

    return {"status": "ok", "id": comment.id}


# ─── Kanban transition endpoint ──────────────────────────────────────────


@router.post("/ati/{ati_id}/transition", summary="Changer le statut d'un ATI (Kanban)",
             description="Endpoint simplifie pour le drag-and-drop Kanban. Effectue une transition de statut.")
async def transition_ati_kanban(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.ministre)),
    db: Session = Depends(get_db),
):
    new_statut = data.get("new_statut")
    if not new_statut:
        raise HTTPException(400, "new_statut est requis.")

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    prev_statut = ati.statut
    allowed = _STATUT_TRANSITIONS.get(ati.statut, set())
    if new_statut not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transition invalide: {ati.statut} -> {new_statut}. Transitions autorisees: {', '.join(allowed) or 'aucune'}",
        )

    now = now_utc()
    ati.statut = new_statut
    ati.updated_at = now

    # Handle approval
    if new_statut == "approuve" and not ati.date_decision:
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )

    # Handle rejection
    if new_statut == "rejete" and not ati.date_decision:
        ati.date_decision = now

    transition = ATITransitionORM(
        id=f"TR-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=prev_statut,
        new_statut=new_statut,
        note=data.get("note", "Transition via Kanban"),
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.transition_kanban",
        target=ati_id,
        details=f"statut:{prev_statut}->{new_statut}",
    )
    db.commit()

    return {"status": "ok", "previous": prev_statut, "new": new_statut}


# ─── ATI Tags ─────────────────────────────────────────────────────────────


@router.get("/ati/{ati_id}/tags")
async def get_ati_tags(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tags = db.execute(
        select(ATITagORM).where(ATITagORM.ati_id == ati_id)
        .order_by(ATITagORM.created_at.asc())
    ).scalars().all()
    return {"tags": [{"id": t.id, "label": t.label, "color": t.color, "created_by": t.created_by} for t in tags]}


@router.post("/ati/{ati_id}/tags")
async def add_ati_tag(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    label = (data.get("label") or "").strip()[:50]
    if not label:
        raise HTTPException(400, "Label requis.")
    color = data.get("color", "#0c7eb4")

    tag = ATITagORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        label=label,
        color=color,
        created_by=current_user.username,
    )
    db.add(tag)
    db.commit()
    return {"status": "ok", "id": tag.id}


@router.delete("/ati/tags/{tag_id}")
async def remove_ati_tag(
    tag_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    tag = db.get(ATITagORM, tag_id)
    if not tag:
        raise HTTPException(404, "Tag introuvable.")
    db.delete(tag)
    db.commit()
    return {"status": "ok"}


@router.get("/ati/{ati_id}/risk")
async def get_ati_risk(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return assess_risk(db, ati_id)


@router.get("/ati/{ati_id}/field-history")
async def get_ati_field_history(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = get_field_history(db, "ati", ati_id)
    return {"history": history}


@router.post("/ati/{ati_id}/renew")
async def renew_ati(
    ati_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a renewal application from an existing approved/expired ATI."""
    original = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not original:
        raise HTTPException(404, "ATI introuvable.")
    if original.statut not in ("approuve", "expire"):
        raise HTTPException(400, "Seuls les ATI approuves ou expires peuvent etre renouveles.")

    # Generate new ATI number
    count = db.execute(select(func.count()).select_from(AgrementTechniqueIndustrielORM)).scalar() or 0
    numero = f"ATI-REN-{count + 1:04d}"

    renewed = AgrementTechniqueIndustrielORM(
        id=str(uuid.uuid4()),
        numero_ati=numero,
        operateur_id=original.operateur_id,
        secteur=original.secteur,
        type_activite=data.get("type_activite", original.type_activite),
        observations=data.get("observations", f"Renouvellement de {original.numero_ati}"),
        statut="soumis",
        date_soumission=now_utc(),
        sla_jours=original.sla_jours,
    )
    db.add(renewed)

    write_audit_event(db, actor=current_user.username, action="ati.renew",
                     target=renewed.id, details=f"Renouvellement de {original.numero_ati} → {numero}")
    db.commit()

    return {
        "status": "ok",
        "new_ati_id": renewed.id,
        "numero_ati": numero,
        "original_ati": original.numero_ati,
    }


@router.get("/ati/{ati_id}/recommendation")
async def get_ati_recommendation(
    ati_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    return recommend_decision(db, ati_id)


@router.get("/ati/{ati_id}/product-qr")
async def generate_product_qr(
    ati_id: str,
    product_name: str = Query(...),
    batch_number: str = Query(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a QR code for product authenticity verification."""
    import qrcode  # type: ignore

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati or ati.statut != "approuve":
        raise HTTPException(400, "ATI approuve requis pour generer un QR produit.")

    op = ati.operateur
    verify_url = f"https://pnpi-gabon.ga/verify/product?ati={ati.numero_ati}&product={product_name}&batch={batch_number}"

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#003F8F", back_color="white")

    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    return FastAPIResponse(
        content=buf.read(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_product_{ati.numero_ati}_{batch_number}.png"'},
    )



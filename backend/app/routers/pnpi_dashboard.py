"""PNPI — Endpoints du tableau de bord de pilotage industriel gabonais."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from statistics import median
from typing import Dict, List, Optional

import io

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)
from ..schemas.pnpi import (
    ATIPipelineStats,
    ATIResume,
    MensuelStats,
    OperateurGeoPoint,
    PNPIDashboardKpis,
    ProvinceStats,
    SecteurStats,
)


router = APIRouter(prefix="/pnpi", tags=["PNPI Dashboard"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}


def _ati_age_jours(ati: AgrementTechniqueIndustrielORM) -> int:
    return max((now_utc().date() - ati.date_soumission.date()).days, 0)


def _ati_is_overdue(ati: AgrementTechniqueIndustrielORM) -> bool:
    return _ati_age_jours(ati) > ati.sla_jours and ati.statut not in _TERMINAL_STATUTS


@router.get("/dashboard/kpis", response_model=PNPIDashboardKpis)
async def pnpi_dashboard_kpis(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> PNPIDashboardKpis:
    now = now_utc()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    atis_total = len(all_atis)
    atis_en_cours = sum(1 for a in all_atis if a.statut not in _TERMINAL_STATUTS)

    # ATIs approuves ce mois
    first_of_month = now.date().replace(day=1)
    atis_approuves_ce_mois = sum(
        1 for a in all_atis
        if a.statut == "approuve" and a.date_decision and a.date_decision.date() >= first_of_month
    )

    # ATIs en retard
    atis_en_retard = sum(1 for a in all_atis if _ati_is_overdue(a))

    # Delai moyen (median) pour les ATIs decides
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    durations = [
        max((a.date_decision.date() - a.date_soumission.date()).days, 0)
        for a in decided
    ]
    delai_moyen_jours = float(median(durations)) if durations else 0.0

    # Taux SLA
    compliant = sum(
        1 for a in decided
        if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours
    )
    taux_sla_pct = round((compliant / len(durations) * 100) if durations else 0.0, 2)

    # Operateurs actifs
    operateurs_actifs = db.execute(
        select(func.count(OperateurIndustrielORM.id)).where(OperateurIndustrielORM.is_active.is_(True))
    ).scalar_one()

    # Taux conformite: % conforme parmi les dernieres inspections par operateur
    all_inspections = db.execute(
        select(InspectionConformiteORM).order_by(InspectionConformiteORM.date_inspection.desc())
    ).scalars().all()
    last_inspection_per_op: Dict[str, str] = {}
    for insp in all_inspections:
        if insp.operateur_id not in last_inspection_per_op:
            last_inspection_per_op[insp.operateur_id] = insp.statut_conformite

    nb_inspectes = len(last_inspection_per_op)
    nb_conformes = sum(1 for s in last_inspection_per_op.values() if s == "conforme")
    taux_conformite_pct = round((nb_conformes / nb_inspectes * 100) if nb_inspectes > 0 else 0.0, 2)

    return PNPIDashboardKpis(
        atis_total=atis_total,
        atis_en_cours=atis_en_cours,
        atis_approuves_ce_mois=atis_approuves_ce_mois,
        atis_en_retard=atis_en_retard,
        delai_moyen_jours=round(delai_moyen_jours, 1),
        taux_sla_pct=taux_sla_pct,
        operateurs_actifs=operateurs_actifs,
        taux_conformite_pct=taux_conformite_pct,
        generated_at=now,
    )


@router.get("/dashboard/carte", response_model=List[OperateurGeoPoint])
async def pnpi_dashboard_carte(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> List[OperateurGeoPoint]:
    operateurs = db.execute(
        select(OperateurIndustrielORM).where(
            OperateurIndustrielORM.is_active.is_(True),
            OperateurIndustrielORM.latitude.isnot(None),
            OperateurIndustrielORM.longitude.isnot(None),
        )
    ).scalars().all()

    # Build a map of operateur_id -> (nb_atis_actifs, statut_dernier_ati)
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    ati_by_op: Dict[str, List[AgrementTechniqueIndustrielORM]] = defaultdict(list)
    for ati in all_atis:
        ati_by_op[ati.operateur_id].append(ati)

    result = []
    for op in operateurs:
        op_atis = ati_by_op.get(op.id, [])
        nb_actifs = sum(1 for a in op_atis if a.statut not in _TERMINAL_STATUTS)
        # Most recent ATI
        sorted_atis = sorted(op_atis, key=lambda a: a.date_soumission, reverse=True)
        statut_dernier = sorted_atis[0].statut if sorted_atis else None
        result.append(
            OperateurGeoPoint(
                id=op.id,
                raison_sociale=op.raison_sociale,
                secteur=op.secteur,
                province=op.province,
                latitude=op.latitude,
                longitude=op.longitude,
                nb_atis_actifs=nb_actifs,
                statut_dernier_ati=statut_dernier,
            )
        )
    return result


@router.get("/dashboard/secteurs", response_model=List[SecteurStats])
async def pnpi_dashboard_secteurs(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> List[SecteurStats]:
    operateurs = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    secteur_ops: Dict[str, List[OperateurIndustrielORM]] = defaultdict(list)
    for op in operateurs:
        secteur_ops[op.secteur].append(op)

    secteur_atis: Dict[str, List[AgrementTechniqueIndustrielORM]] = defaultdict(list)
    for ati in all_atis:
        secteur_atis[ati.secteur].append(ati)

    all_secteurs = sorted(set(list(secteur_ops.keys()) + list(secteur_atis.keys())))
    result = []
    for secteur in all_secteurs:
        ops = secteur_ops.get(secteur, [])
        atis = secteur_atis.get(secteur, [])
        nb_approuves = sum(1 for a in atis if a.statut == "approuve")
        taux = round((nb_approuves / len(atis) * 100) if atis else 0.0, 2)
        emplois = sum(op.effectif_declare or 0 for op in ops)
        result.append(
            SecteurStats(
                secteur=secteur,
                nb_operateurs=len(ops),
                nb_atis_total=len(atis),
                nb_atis_approuves=nb_approuves,
                taux_approbation_pct=taux,
                emplois_declares=emplois,
            )
        )
    return result


@router.get("/dashboard/provinces", response_model=List[ProvinceStats])
async def pnpi_dashboard_provinces(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> List[ProvinceStats]:
    operateurs = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    province_ops: Dict[str, int] = defaultdict(int)
    op_province: Dict[str, str] = {}
    for op in operateurs:
        province_ops[op.province] += 1
        op_province[op.id] = op.province

    province_atis_actifs: Dict[str, int] = defaultdict(int)
    for ati in all_atis:
        if ati.statut not in _TERMINAL_STATUTS:
            province = op_province.get(ati.operateur_id, "inconnu")
            province_atis_actifs[province] += 1

    all_provinces = sorted(set(list(province_ops.keys()) + list(province_atis_actifs.keys())))
    return [
        ProvinceStats(
            province=province,
            nb_operateurs=province_ops.get(province, 0),
            nb_atis_actifs=province_atis_actifs.get(province, 0),
        )
        for province in all_provinces
    ]


@router.get("/dashboard/pipeline", response_model=ATIPipelineStats)
async def pnpi_dashboard_pipeline(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> ATIPipelineStats:
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    counts: Dict[str, int] = defaultdict(int)
    for ati in all_atis:
        counts[ati.statut] += 1
    return ATIPipelineStats(
        soumis=counts.get("soumis", 0),
        en_instruction=counts.get("en_instruction", 0),
        en_validation=counts.get("en_validation", 0),
        approuve=counts.get("approuve", 0),
        rejete=counts.get("rejete", 0),
        expire=counts.get("expire", 0),
    )


@router.get("/dashboard/tendances", response_model=List[MensuelStats])
async def pnpi_dashboard_tendances(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> List[MensuelStats]:
    now = now_utc()
    twelve_months_ago = now.replace(day=1) - timedelta(days=365)

    all_atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.date_soumission >= twelve_months_ago
        )
    ).scalars().all()

    by_month_soumis: Dict[str, int] = defaultdict(int)
    by_month_approuves: Dict[str, int] = defaultdict(int)
    by_month_rejetes: Dict[str, int] = defaultdict(int)

    for ati in all_atis:
        mois_key = ati.date_soumission.strftime("%Y-%m")
        by_month_soumis[mois_key] += 1
        if ati.statut == "approuve" and ati.date_decision:
            dec_key = ati.date_decision.strftime("%Y-%m")
            by_month_approuves[dec_key] += 1
        elif ati.statut == "rejete" and ati.date_decision:
            dec_key = ati.date_decision.strftime("%Y-%m")
            by_month_rejetes[dec_key] += 1

    all_months = sorted(
        set(list(by_month_soumis.keys()) + list(by_month_approuves.keys()) + list(by_month_rejetes.keys()))
    )
    return [
        MensuelStats(
            mois=mois,
            nb_soumis=by_month_soumis.get(mois, 0),
            nb_approuves=by_month_approuves.get(mois, 0),
            nb_rejetes=by_month_rejetes.get(mois, 0),
        )
        for mois in all_months
    ]


@router.get("/dashboard/sla-analytics")
async def sla_analytics(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Analyse SLA detaillee : conformite, delais moyens, repartition par priorite."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    now = now_utc()

    total = len(all_atis)
    active = [a for a in all_atis if a.statut not in _TERMINAL_STATUTS]
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"} and a.date_decision]
    overdue = [a for a in active if _ati_is_overdue(a)]

    # SLA compliance rate
    if decided:
        compliant = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)
        sla_compliance_pct = round(compliant / len(decided) * 100, 1)
    else:
        sla_compliance_pct = 0.0

    # Average processing time
    durations = [(a.date_decision.date() - a.date_soumission.date()).days for a in decided]
    avg_days = round(sum(durations) / len(durations), 1) if durations else 0

    # Distribution by SLA status
    on_track = sum(1 for a in active if not _ati_is_overdue(a))
    at_risk = sum(1 for a in active if not _ati_is_overdue(a) and _ati_age_jours(a) > a.sla_jours * 0.8)

    # By priority
    by_priority = {}
    for p in ["normale", "elevee", "urgente"]:
        p_atis = [a for a in active if a.priorite == p]
        p_overdue = [a for a in p_atis if _ati_is_overdue(a)]
        by_priority[p] = {"total": len(p_atis), "overdue": len(p_overdue)}

    return {
        "total_atis": total,
        "active_atis": len(active),
        "decided_atis": len(decided),
        "overdue_atis": len(overdue),
        "sla_compliance_pct": sla_compliance_pct,
        "avg_processing_days": avg_days,
        "on_track": on_track,
        "at_risk": at_risk,
        "by_priority": by_priority,
        "generated_at": now.isoformat(),
    }


@router.get("/dashboard/recents", response_model=List[ATIResume])
async def pnpi_dashboard_recents(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> List[ATIResume]:
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM)
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        .limit(15)
    ).scalars().all()

    result = []
    for ati in atis:
        age = _ati_age_jours(ati)
        op = ati.operateur  # lazy joined
        result.append(
            ATIResume(
                id=ati.id,
                numero_ati=ati.numero_ati,
                raison_sociale=op.raison_sociale if op else "Inconnu",
                secteur=ati.secteur,
                province=op.province if op else "Inconnu",
                statut=ati.statut,
                priorite=ati.priorite,
                etape=ati.etape,
                date_soumission=ati.date_soumission,
                age_jours=age,
                is_overdue=_ati_is_overdue(ati),
            )
        )
    return result


from pydantic import BaseModel as PydanticBaseModel

class SearchResult(PydanticBaseModel):
    type: str  # "ati" | "operateur"
    id: str
    title: str
    subtitle: str
    statut: Optional[str] = None
    href: str

@router.get("/dashboard/search", response_model=List[SearchResult])
async def pnpi_search(
    q: str = Query(..., min_length=2, max_length=100),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[SearchResult]:
    """Recherche globale dans les ATIs et opérateurs."""
    term = f"%{q.strip()}%"
    results: List[SearchResult] = []

    # Search operateurs
    ops = db.execute(
        select(OperateurIndustrielORM).where(
            (OperateurIndustrielORM.raison_sociale.ilike(term)) |
            (OperateurIndustrielORM.nif_gabon.ilike(term)) |
            (OperateurIndustrielORM.ville.ilike(term))
        ).limit(8)
    ).scalars().all()
    for op in ops:
        results.append(SearchResult(
            type="operateur",
            id=op.id,
            title=op.raison_sociale,
            subtitle=f"{op.secteur.capitalize()} · {op.province.replace('_', ' ')} · NIF: {op.nif_gabon}",
            href=f"/pnpi/operateurs/{op.id}",
        ))

    # Search ATIs
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            (AgrementTechniqueIndustrielORM.numero_ati.ilike(term)) |
            (AgrementTechniqueIndustrielORM.type_activite.ilike(term))
        ).limit(8)
    ).scalars().all()
    for a in atis:
        results.append(SearchResult(
            type="ati",
            id=a.id,
            title=a.numero_ati,
            subtitle=f"{a.type_activite[:60]}{'...' if len(a.type_activite) > 60 else ''} · {a.secteur}",
            statut=a.statut,
            href=f"/pnpi/ati/{a.id}",
        ))

    # Search inspections
    insps = db.execute(
        select(InspectionConformiteORM).where(
            (InspectionConformiteORM.id.ilike(term)) |
            (InspectionConformiteORM.inspecteur_username.ilike(term)) |
            (InspectionConformiteORM.observations.ilike(term))
        ).limit(5)
    ).scalars().all()
    for insp in insps:
        results.append(SearchResult(
            type="inspection",
            id=insp.id,
            title=insp.id,
            subtitle=f"{insp.statut_conformite} · {insp.inspecteur_username} · {insp.date_inspection.strftime('%d/%m/%Y') if insp.date_inspection else ''}",
            statut=insp.statut_conformite,
            href=f"/pnpi/inspections/{insp.id}",
        ))

    return results[:15]


@router.get("/dashboard/health", summary="Health-check PNPI")
async def pnpi_health(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict:
    """Statut de sante de la plateforme PNPI."""
    atis_total = db.execute(select(func.count(AgrementTechniqueIndustrielORM.id))).scalar_one()
    ops_total = db.execute(select(func.count(OperateurIndustrielORM.id))).scalar_one()
    inspections_total = db.execute(select(func.count(InspectionConformiteORM.id))).scalar_one()

    latest_ati = db.execute(
        select(AgrementTechniqueIndustrielORM.date_soumission)
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        .limit(1)
    ).scalar_one_or_none()

    latest_inspection = db.execute(
        select(InspectionConformiteORM.date_inspection)
        .order_by(InspectionConformiteORM.date_inspection.desc())
        .limit(1)
    ).scalar_one_or_none()

    return {
        "status": "ok",
        "timestamp": now_utc().isoformat(),
        "database": "connected",
        "counts": {
            "atis": atis_total,
            "operateurs": ops_total,
            "inspections": inspections_total,
        },
        "latest_activity": {
            "derniere_soumission_ati": latest_ati.isoformat() if latest_ati else None,
            "derniere_inspection": latest_inspection.isoformat() if latest_inspection else None,
        },
    }


@router.get("/dashboard/export-recap.pdf", summary="Recap mensuel PNPI en PDF")
async def export_recap_pdf(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.enums import TA_CENTER

    now = now_utc()
    bleu = colors.HexColor("#003F8F")
    vert = colors.HexColor("#009440")

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    atis_total = len(all_atis)
    atis_en_cours = sum(1 for a in all_atis if a.statut not in _TERMINAL_STATUTS)
    first_of_month = now.date().replace(day=1)
    atis_approuves_mois = sum(
        1 for a in all_atis
        if a.statut == "approuve" and a.date_decision and a.date_decision.date() >= first_of_month
    )
    atis_en_retard = sum(1 for a in all_atis if _ati_is_overdue(a))
    ops_actifs = db.execute(
        select(func.count(OperateurIndustrielORM.id)).where(OperateurIndustrielORM.is_active.is_(True))
    ).scalar_one()

    # Pipeline counts
    pipeline: Dict[str, int] = defaultdict(int)
    for a in all_atis:
        pipeline[a.statut] += 1

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    styles = getSampleStyleSheet()

    story = []
    story.append(Paragraph("REPUBLIQUE GABONAISE", ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray)))
    story.append(Paragraph("Ministere de l'Industrie — PNPI", ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu)))
    story.append(Spacer(1, 0.3*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Recap Mensuel PNPI", ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=16, spaceAfter=4)))
    story.append(Paragraph(f"Genere le {now.strftime('%d/%m/%Y a %H:%M')} UTC", ParagraphStyle("date", parent=styles["Normal"], textColor=colors.gray, fontSize=9, spaceAfter=12)))
    story.append(Spacer(1, 0.4*cm))

    # KPI table
    story.append(Paragraph("Indicateurs Cles", ParagraphStyle("sec", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceAfter=6)))
    kpi_data = [
        ["Indicateur", "Valeur"],
        ["Total ATI", str(atis_total)],
        ["ATI en cours", str(atis_en_cours)],
        ["Approuves ce mois", str(atis_approuves_mois)],
        ["ATI en retard SLA", str(atis_en_retard)],
        ["Operateurs actifs", str(ops_actifs)],
    ]
    t = Table(kpi_data, colWidths=[9*cm, 5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bleu),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.6*cm))

    # Pipeline table
    story.append(Paragraph("Pipeline ATI", ParagraphStyle("sec2", parent=styles["Heading2"], textColor=vert, fontSize=12, spaceAfter=6)))
    pipeline_data = [
        ["Statut", "Nombre"],
        ["Soumis", str(pipeline.get("soumis", 0))],
        ["En instruction", str(pipeline.get("en_instruction", 0))],
        ["En validation", str(pipeline.get("en_validation", 0))],
        ["Approuve", str(pipeline.get("approuve", 0))],
        ["Rejete", str(pipeline.get("rejete", 0))],
        ["Expire", str(pipeline.get("expire", 0))],
    ]
    t2 = Table(pipeline_data, colWidths=[9*cm, 5*cm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), vert),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#f3f4f6")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("PADDING", (0, 0), (-1, -1), 6),
        ("ALIGN", (1, 1), (1, -1), "CENTER"),
    ]))
    story.append(t2)
    story.append(Spacer(1, 1*cm))

    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    story.append(Paragraph(
        f"Document genere par la PNPI — {now.strftime('%d/%m/%Y %H:%M')} UTC",
        ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray)
    ))

    doc.build(story)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="recap_pnpi_{now.strftime("%Y%m")}.pdf"'},
    )

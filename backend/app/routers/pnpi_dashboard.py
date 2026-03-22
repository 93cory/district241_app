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
from ..core.tenant import TenantFilter, get_user_province
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
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> PNPIDashboardKpis:
    now = now_utc()

    # Multi-tenant province filtering
    province = get_user_province(current_user)
    tenant = TenantFilter(province)

    # Fetch ATIs, filtered by province if user is province-scoped
    ati_query = select(AgrementTechniqueIndustrielORM)
    if not tenant.is_global:
        # Filter ATIs via their operateur's province — join through operateur
        ati_query = ati_query.join(OperateurIndustrielORM, AgrementTechniqueIndustrielORM.operateur_id == OperateurIndustrielORM.id).where(
            OperateurIndustrielORM.province == tenant.province
        )
    all_atis = db.execute(ati_query).scalars().all()

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

    # Operateurs actifs (filtered by province)
    ops_count_query = select(func.count(OperateurIndustrielORM.id)).where(OperateurIndustrielORM.is_active.is_(True))
    ops_count_query = tenant.apply(ops_count_query, OperateurIndustrielORM)
    operateurs_actifs = db.execute(ops_count_query).scalar_one()

    # Taux conformite: % conforme parmi les dernieres inspections par operateur
    insp_query = select(InspectionConformiteORM).order_by(InspectionConformiteORM.date_inspection.desc())
    if not tenant.is_global:
        insp_query = insp_query.join(OperateurIndustrielORM, InspectionConformiteORM.operateur_id == OperateurIndustrielORM.id).where(
            OperateurIndustrielORM.province == tenant.province
        )
    all_inspections = db.execute(insp_query).scalars().all()
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


@router.get("/dashboard/data-quality")
async def data_quality_score(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compute a data quality score based on completeness and consistency."""

    ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    checks = []

    # 1. Operator completeness (email, phone, province filled)
    if ops:
        complete_ops = sum(1 for o in ops if o.email and o.telephone and o.province)
        score = round(complete_ops / len(ops) * 100)
        checks.append({
            "name": "Completude operateurs",
            "description": f"{complete_ops}/{len(ops)} operateurs avec email, telephone et province",
            "score": score,
            "status": "ok" if score >= 80 else "warning" if score >= 50 else "critical",
        })

    # 2. ATI with linked operator
    if atis:
        linked = sum(1 for a in atis if a.operateur_id)
        score = round(linked / len(atis) * 100)
        checks.append({
            "name": "ATIs lies a un operateur",
            "description": f"{linked}/{len(atis)} ATIs correctement lies",
            "score": score,
            "status": "ok" if score >= 95 else "warning" if score >= 80 else "critical",
        })

    # 3. ATI with observations filled
    if atis:
        with_obs = sum(1 for a in atis if hasattr(a, 'observations') and a.observations and len(a.observations) > 10)
        score = round(with_obs / len(atis) * 100)
        checks.append({
            "name": "ATIs avec observations",
            "description": f"{with_obs}/{len(atis)} ATIs ont des observations detaillees",
            "score": score,
            "status": "ok" if score >= 70 else "warning" if score >= 40 else "critical",
        })

    # 4. Decided ATIs have decision date
    decided = [a for a in atis if a.statut in ("approuve", "rejete")]
    if decided:
        with_date = sum(1 for a in decided if a.date_decision)
        score = round(with_date / len(decided) * 100)
        checks.append({
            "name": "Dates de decision renseignees",
            "description": f"{with_date}/{len(decided)} decisions avec date",
            "score": score,
            "status": "ok" if score >= 95 else "warning" if score >= 80 else "critical",
        })

    # 5. Inspections with observations
    if inspections:
        with_obs = sum(1 for i in inspections if i.observations and len(i.observations) > 10)
        score = round(with_obs / len(inspections) * 100)
        checks.append({
            "name": "Inspections documentees",
            "description": f"{with_obs}/{len(inspections)} inspections avec observations",
            "score": score,
            "status": "ok" if score >= 80 else "warning" if score >= 50 else "critical",
        })

    # 6. Orphan inspections (no operateur)
    if inspections:
        orphans = sum(1 for i in inspections if not i.operateur_id)
        score = round((1 - orphans / len(inspections)) * 100) if inspections else 100
        checks.append({
            "name": "Inspections liees",
            "description": f"{len(inspections) - orphans}/{len(inspections)} inspections avec operateur",
            "score": score,
            "status": "ok" if score >= 95 else "warning" if score >= 80 else "critical",
        })

    # Global score
    if checks:
        global_score = round(sum(c["score"] for c in checks) / len(checks))
    else:
        global_score = 0

    grade = "A" if global_score >= 90 else "B" if global_score >= 75 else "C" if global_score >= 60 else "D" if global_score >= 40 else "E"

    return {
        "global_score": global_score,
        "grade": grade,
        "checks": checks,
        "stats": {
            "operateurs": len(ops),
            "atis": len(atis),
            "inspections": len(inspections),
        },
    }


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


from ..core.executive_report import _compute_national_index


@router.get("/dashboard/transformation-index")
async def national_transformation_index(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    index = _compute_national_index(all_atis, all_ops, all_inspections)

    # Breakdown
    now = now_utc()
    month_ago = now - timedelta(days=30)
    decided = [a for a in all_atis if a.statut in {"approuve", "rejete"}]
    approved = sum(1 for a in decided if a.statut == "approuve")
    sectors = len(set(o.secteur for o in all_ops if o.is_active))
    recent_insp = [i for i in all_inspections if i.date_inspection >= month_ago]
    conformes = sum(1 for i in recent_insp if i.statut_conformite == "conforme") if recent_insp else 0
    actifs = sum(1 for o in all_ops if o.is_active)
    recent_subs = sum(1 for a in all_atis if a.date_soumission >= month_ago)

    return {
        "index": index,
        "max": 100,
        "breakdown": {
            "approbation": {"score": round(approved / len(decided) * 30, 1) if decided else 0, "max": 30, "detail": f"{approved}/{len(decided)} approuves"},
            "couverture_sectorielle": {"score": round(min(sectors / 7 * 20, 20), 1), "max": 20, "detail": f"{sectors}/7 secteurs couverts"},
            "conformite": {"score": round(conformes / len(recent_insp) * 25, 1) if recent_insp else 0, "max": 25, "detail": f"{conformes}/{len(recent_insp)} conformes (30j)"},
            "densite_operateurs": {"score": round(min(actifs / 100 * 15, 15), 1), "max": 15, "detail": f"{actifs} operateurs actifs"},
            "dynamisme": {"score": round(min(recent_subs / 20 * 10, 10), 1), "max": 10, "detail": f"{recent_subs} soumissions (30j)"},
        },
        "generated_at": now.isoformat(),
    }


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


@router.get("/dashboard/forecast")
async def pnpi_forecast(
    months: int = Query(default=6, ge=1, le=12),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Prevision des soumissions et approbations ATI pour les N prochains mois."""
    now = now_utc()

    # Historical data (last 12 months)
    twelve_months_ago = now - timedelta(days=365)
    all_atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.date_soumission >= twelve_months_ago
        )
    ).scalars().all()

    # Monthly submission counts
    monthly_subs: Dict[str, int] = defaultdict(int)
    monthly_approvals: Dict[str, int] = defaultdict(int)
    for ati in all_atis:
        key = ati.date_soumission.strftime("%Y-%m")
        monthly_subs[key] += 1
        if ati.statut == "approuve" and ati.date_decision:
            akey = ati.date_decision.strftime("%Y-%m")
            monthly_approvals[akey] += 1

    # Simple linear trend forecast
    sorted_months = sorted(monthly_subs.keys())
    if len(sorted_months) >= 3:
        recent_3 = [monthly_subs[m] for m in sorted_months[-3:]]
        avg_growth = (recent_3[-1] - recent_3[0]) / 2
        last_value = recent_3[-1]

        recent_3_app = [monthly_approvals.get(m, 0) for m in sorted_months[-3:]]
        avg_growth_app = (recent_3_app[-1] - recent_3_app[0]) / 2
        last_value_app = recent_3_app[-1]
    else:
        avg_growth = 0
        last_value = sum(monthly_subs.values()) / max(len(monthly_subs), 1)
        avg_growth_app = 0
        last_value_app = sum(monthly_approvals.values()) / max(len(monthly_approvals), 1)

    # Generate forecast
    forecast = []
    current_month = now.replace(day=1)
    for i in range(1, months + 1):
        next_month = current_month + timedelta(days=32 * i)
        next_month = next_month.replace(day=1)
        month_key = next_month.strftime("%Y-%m")

        predicted_subs = max(0, round(last_value + avg_growth * i))
        predicted_apps = max(0, round(last_value_app + avg_growth_app * i))

        forecast.append({
            "mois": month_key,
            "prevision_soumissions": predicted_subs,
            "prevision_approbations": predicted_apps,
            "confidence": max(0.5, 1.0 - 0.08 * i),  # Decreasing confidence
        })

    # Historical for context
    historical = [
        {"mois": m, "soumissions": monthly_subs[m], "approbations": monthly_approvals.get(m, 0)}
        for m in sorted_months[-6:]
    ]

    return {
        "historical": historical,
        "forecast": forecast,
        "trend": {
            "avg_monthly_submissions": round(sum(monthly_subs.values()) / max(len(monthly_subs), 1), 1),
            "avg_monthly_approvals": round(sum(monthly_approvals.values()) / max(len(monthly_approvals), 1), 1),
            "growth_rate_submissions": round(avg_growth, 1),
            "growth_rate_approvals": round(avg_growth_app, 1),
        },
        "generated_at": now.isoformat(),
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


@router.get("/dashboard/comparison", summary="Comparaison entre deux periodes")
async def period_comparison(
    period1_start: str = Query(..., description="ISO date YYYY-MM-DD"),
    period1_end: str = Query(...),
    period2_start: str = Query(...),
    period2_end: str = Query(...),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare two periods (e.g., Q1 vs Q2)."""
    from datetime import timezone as tz

    p1_start = datetime.fromisoformat(period1_start).replace(tzinfo=tz.utc)
    p1_end = datetime.fromisoformat(period1_end).replace(tzinfo=tz.utc)
    p2_start = datetime.fromisoformat(period2_start).replace(tzinfo=tz.utc)
    p2_end = datetime.fromisoformat(period2_end).replace(tzinfo=tz.utc)

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_inspections = db.execute(select(InspectionConformiteORM)).scalars().all()

    def period_stats(start, end):
        atis = [a for a in all_atis if start <= a.date_soumission <= end]
        approved = sum(1 for a in atis if a.statut == "approuve")
        rejected = sum(1 for a in atis if a.statut == "rejete")
        inspections = [i for i in all_inspections if start <= i.date_inspection <= end]
        conformes = sum(1 for i in inspections if i.statut_conformite == "conforme")

        decided = [a for a in atis if a.statut in {"approuve", "rejete"} and a.date_decision]
        avg_days = 0
        if decided:
            durations = [(a.date_decision.date() - a.date_soumission.date()).days for a in decided]
            avg_days = round(sum(durations) / len(durations), 1)

        return {
            "soumissions": len(atis),
            "approuves": approved,
            "rejetes": rejected,
            "taux_approbation": round(approved / len([a for a in atis if a.statut in {"approuve", "rejete"}]) * 100, 1) if any(a.statut in {"approuve", "rejete"} for a in atis) else 0,
            "inspections": len(inspections),
            "conformes": conformes,
            "taux_conformite": round(conformes / len(inspections) * 100, 1) if inspections else 0,
            "delai_moyen_jours": avg_days,
        }

    p1 = period_stats(p1_start, p1_end)
    p2 = period_stats(p2_start, p2_end)

    # Compute deltas
    deltas = {}
    for key in p1:
        v1, v2 = p1[key], p2[key]
        if isinstance(v1, (int, float)) and v1 != 0:
            deltas[key] = round((v2 - v1) / v1 * 100, 1)
        else:
            deltas[key] = 0

    return {
        "period1": {"start": period1_start, "end": period1_end, "stats": p1},
        "period2": {"start": period2_start, "end": period2_end, "stats": p2},
        "deltas_pct": deltas,
    }


@router.get("/dashboard/search/advanced")
async def advanced_search(
    q: str = Query("", min_length=1),
    type: Optional[str] = Query(None, description="ati|operateur|inspection|all"),
    statut: Optional[str] = Query(None),
    secteur: Optional[str] = Query(None),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Advanced full-text search across ATIs, operators, and inspections."""
    from datetime import datetime as dt, timezone

    results = []
    search_term = q.lower().strip()
    search_types = [type] if type and type != "all" else ["ati", "operateur", "inspection"]

    if "ati" in search_types:
        query = select(AgrementTechniqueIndustrielORM)
        atis = db.execute(query).scalars().all()
        for ati in atis:
            op = ati.operateur
            searchable = " ".join(filter(None, [
                ati.numero_ati,
                ati.type_activite,
                ati.secteur,
                ati.observations if hasattr(ati, 'observations') else "",
                op.raison_sociale if op else "",
                op.nif_gabon if op else "",
            ])).lower()

            if search_term in searchable:
                if statut and ati.statut != statut:
                    continue
                if secteur and ati.secteur != secteur:
                    continue
                results.append({
                    "type": "ati",
                    "id": ati.id,
                    "title": f"ATI {ati.numero_ati}",
                    "subtitle": f"{op.raison_sociale if op else 'Inconnu'} — {ati.secteur}",
                    "statut": ati.statut,
                    "date": ati.date_soumission.isoformat(),
                    "link": f"/pnpi/ati/{ati.id}",
                    "relevance": searchable.count(search_term),
                })

    if "operateur" in search_types:
        ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
        for op in ops:
            searchable = " ".join(filter(None, [
                op.raison_sociale, op.nif_gabon, op.secteur,
                op.province, op.ville, op.email,
            ])).lower()

            if search_term in searchable:
                if secteur and op.secteur != secteur:
                    continue
                results.append({
                    "type": "operateur",
                    "id": op.id,
                    "title": op.raison_sociale,
                    "subtitle": f"{op.secteur} — {op.province or ''}".replace("_", " ").title(),
                    "statut": "actif" if op.is_active else "inactif",
                    "date": None,
                    "link": f"/pnpi/operateurs/{op.id}",
                    "relevance": searchable.count(search_term),
                })

    if "inspection" in search_types:
        inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
        for insp in inspections:
            op = insp.operateur
            searchable = " ".join(filter(None, [
                insp.observations or "",
                insp.inspecteur_username,
                op.raison_sociale if op else "",
                insp.statut_conformite,
            ])).lower()

            if search_term in searchable:
                results.append({
                    "type": "inspection",
                    "id": insp.id,
                    "title": f"Inspection — {insp.statut_conformite}",
                    "subtitle": f"{op.raison_sociale if op else 'Inconnu'} — {insp.inspecteur_username}",
                    "statut": insp.statut_conformite,
                    "date": insp.date_inspection.isoformat(),
                    "link": f"/pnpi/inspections/{insp.id}",
                    "relevance": searchable.count(search_term),
                })

    # Sort by relevance
    results.sort(key=lambda r: r["relevance"], reverse=True)

    return {
        "query": q,
        "total": len(results),
        "results": results[:limit],
    }


@router.get("/dashboard/instructor-performance")
async def instructor_performance(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Performance metrics per instructor."""

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    instructors: dict = defaultdict(lambda: {
        "assigned": 0, "decided": 0, "approved": 0, "rejected": 0,
        "total_days": 0, "overdue": 0,
    })

    now = now_utc()

    for ati in all_atis:
        instr = ati.instructeur_username if hasattr(ati, 'instructeur_username') and ati.instructeur_username else None
        if not instr:
            continue

        data = instructors[instr]
        data["assigned"] += 1

        if ati.statut in ("approuve", "rejete"):
            data["decided"] += 1
            if ati.statut == "approuve":
                data["approved"] += 1
            else:
                data["rejected"] += 1
            if ati.date_decision:
                days = (ati.date_decision.date() - ati.date_soumission.date()).days
                data["total_days"] += days

        if ati.statut not in ("approuve", "rejete", "expire"):
            age = (now.date() - ati.date_soumission.date()).days
            if age > ati.sla_jours:
                data["overdue"] += 1

    results = []
    for username, metrics in sorted(instructors.items()):
        avg_days = round(metrics["total_days"] / metrics["decided"], 1) if metrics["decided"] else 0
        approval_rate = round(metrics["approved"] / metrics["decided"] * 100, 1) if metrics["decided"] else 0
        results.append({
            "username": username,
            "assigned": metrics["assigned"],
            "decided": metrics["decided"],
            "approved": metrics["approved"],
            "rejected": metrics["rejected"],
            "overdue": metrics["overdue"],
            "avg_days": avg_days,
            "approval_rate": approval_rate,
        })

    results.sort(key=lambda r: r["decided"], reverse=True)
    return {"instructors": results}


@router.get("/dashboard/predictions")
async def predictions(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Simple predictive analytics based on historical trends."""
    from collections import defaultdict
    from datetime import timedelta

    now = now_utc()
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()

    # Monthly submission trends (last 12 months)
    monthly = defaultdict(int)
    for ati in all_atis:
        key = ati.date_soumission.strftime("%Y-%m")
        monthly[key] += 1

    sorted_months = sorted(monthly.items())[-12:]

    # Linear trend for next 3 months
    if len(sorted_months) >= 3:
        recent = [v for _, v in sorted_months[-6:]]
        avg_recent = sum(recent) / len(recent)
        older = [v for _, v in sorted_months[:max(1, len(sorted_months)-6)]]
        avg_older = sum(older) / len(older) if older else avg_recent
        trend = (avg_recent - avg_older) / max(avg_older, 1)

        forecasts = []
        for i in range(1, 4):
            month_dt = now + timedelta(days=30 * i)
            predicted = max(0, round(avg_recent * (1 + trend * 0.1 * i)))
            forecasts.append({
                "month": month_dt.strftime("%Y-%m"),
                "label": month_dt.strftime("%b %Y"),
                "predicted_submissions": predicted,
                "confidence": max(50, round(90 - i * 10)),
            })
    else:
        forecasts = []

    # Approval rate trend
    decided = [a for a in all_atis if a.statut in ("approuve", "rejete")]
    if decided:
        recent_decided = [a for a in decided if (now - a.date_soumission).days < 180]
        older_decided = [a for a in decided if (now - a.date_soumission).days >= 180]
        recent_rate = sum(1 for a in recent_decided if a.statut == "approuve") / max(len(recent_decided), 1) * 100
        older_rate = sum(1 for a in older_decided if a.statut == "approuve") / max(len(older_decided), 1) * 100
    else:
        recent_rate = 0
        older_rate = 0

    # Backlog prediction
    in_progress = [a for a in all_atis if a.statut not in ("approuve", "rejete", "expire")]
    if decided:
        avg_processing = sum(
            (a.date_decision.date() - a.date_soumission.date()).days
            for a in decided if a.date_decision
        ) / len([a for a in decided if a.date_decision]) if any(a.date_decision for a in decided) else 30
    else:
        avg_processing = 30

    est_clearance_days = round(len(in_progress) * avg_processing / max(len(set(
        a.instructeur_username for a in all_atis if hasattr(a, 'instructeur_username') and a.instructeur_username
    )), 1))

    # Sector growth
    sector_counts = defaultdict(lambda: {"recent": 0, "older": 0})
    for ati in all_atis:
        if (now - ati.date_soumission).days < 180:
            sector_counts[ati.secteur]["recent"] += 1
        else:
            sector_counts[ati.secteur]["older"] += 1

    growing_sectors = []
    for sect, counts in sector_counts.items():
        if counts["older"] > 0:
            growth = round((counts["recent"] - counts["older"]) / counts["older"] * 100)
        elif counts["recent"] > 0:
            growth = 100
        else:
            growth = 0
        growing_sectors.append({"secteur": sect, "recent": counts["recent"], "older": counts["older"], "growth_pct": growth})

    growing_sectors.sort(key=lambda s: s["growth_pct"], reverse=True)

    return {
        "monthly_trend": [{"month": m, "count": c} for m, c in sorted_months],
        "forecasts": forecasts,
        "approval_rate": {
            "recent_6m": round(recent_rate, 1),
            "older": round(older_rate, 1),
            "trend": "hausse" if recent_rate > older_rate else "baisse" if recent_rate < older_rate else "stable",
        },
        "backlog": {
            "in_progress": len(in_progress),
            "avg_processing_days": round(avg_processing, 1),
            "est_clearance_days": est_clearance_days,
        },
        "sector_growth": growing_sectors[:8],
    }


@router.get("/dashboard/advanced-stats")
async def advanced_statistics(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Advanced statistics: funnel, cohorts, conversion rates."""
    from collections import defaultdict

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    now = now_utc()

    # 1. Funnel analysis
    total = len(all_atis)
    soumis = sum(1 for a in all_atis if a.statut != "brouillon")
    en_instruction = sum(1 for a in all_atis if a.statut in ("en_instruction", "valide", "approuve", "rejete"))
    valide = sum(1 for a in all_atis if a.statut in ("valide", "approuve"))
    approuve = sum(1 for a in all_atis if a.statut == "approuve")

    funnel = [
        {"stage": "Soumis", "count": soumis, "pct": 100},
        {"stage": "En instruction", "count": en_instruction, "pct": round(en_instruction / max(soumis, 1) * 100, 1)},
        {"stage": "Valide", "count": valide, "pct": round(valide / max(soumis, 1) * 100, 1)},
        {"stage": "Approuve", "count": approuve, "pct": round(approuve / max(soumis, 1) * 100, 1)},
    ]

    # 2. Monthly cohort analysis
    cohorts = defaultdict(lambda: {"submitted": 0, "approved": 0, "rejected": 0, "pending": 0, "avg_days": 0})
    for ati in all_atis:
        cohort = ati.date_soumission.strftime("%Y-%m")
        cohorts[cohort]["submitted"] += 1
        if ati.statut == "approuve":
            cohorts[cohort]["approved"] += 1
        elif ati.statut == "rejete":
            cohorts[cohort]["rejected"] += 1
        else:
            cohorts[cohort]["pending"] += 1

    # Avg days per cohort
    for ati in all_atis:
        if ati.date_decision:
            cohort = ati.date_soumission.strftime("%Y-%m")
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            decided_in_cohort = cohorts[cohort]["approved"] + cohorts[cohort]["rejected"]
            if decided_in_cohort > 0:
                cohorts[cohort]["avg_days"] = round(
                    (cohorts[cohort]["avg_days"] * (decided_in_cohort - 1) + days) / decided_in_cohort, 1
                )

    sorted_cohorts = [
        {"cohort": k, **v, "conversion_rate": round(v["approved"] / max(v["submitted"], 1) * 100, 1)}
        for k, v in sorted(cohorts.items())[-12:]
    ]

    # 3. Day of week distribution
    dow_counts = defaultdict(int)
    dow_labels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    for ati in all_atis:
        dow = ati.date_soumission.weekday()
        dow_counts[dow] += 1

    day_distribution = [{"day": dow_labels[i], "count": dow_counts.get(i, 0)} for i in range(7)]

    # 4. Processing time distribution
    time_buckets = {"0-15j": 0, "15-30j": 0, "30-45j": 0, "45-60j": 0, "60j+": 0}
    for ati in all_atis:
        if ati.date_decision:
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            if days <= 15: time_buckets["0-15j"] += 1
            elif days <= 30: time_buckets["15-30j"] += 1
            elif days <= 45: time_buckets["30-45j"] += 1
            elif days <= 60: time_buckets["45-60j"] += 1
            else: time_buckets["60j+"] += 1

    return {
        "funnel": funnel,
        "cohorts": sorted_cohorts,
        "day_distribution": day_distribution,
        "processing_time": [{"bucket": k, "count": v} for k, v in time_buckets.items()],
    }


@router.get("/dashboard/annual-report/{year}")
async def annual_report(
    year: int,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Generate annual activity summary."""
    from datetime import datetime as dt, timezone

    start = dt(year, 1, 1, tzinfo=timezone.utc)
    end = dt(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)

    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    year_atis = [a for a in all_atis if start <= a.date_soumission <= end]

    all_ops = db.execute(select(OperateurIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    year_insp = [i for i in all_insp if start <= i.date_inspection <= end]

    # Monthly breakdown
    monthly = defaultdict(lambda: {"soumissions": 0, "approuves": 0, "rejetes": 0, "inspections": 0})
    for ati in year_atis:
        m = ati.date_soumission.strftime("%m")
        monthly[m]["soumissions"] += 1
        if ati.statut == "approuve":
            monthly[m]["approuves"] += 1
        elif ati.statut == "rejete":
            monthly[m]["rejetes"] += 1
    for insp in year_insp:
        m = insp.date_inspection.strftime("%m")
        monthly[m]["inspections"] += 1

    months_data = []
    month_names = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
    for i in range(12):
        m = str(i + 1).zfill(2)
        data = monthly[m]
        months_data.append({"month": month_names[i], **data})

    # Sector breakdown
    sector_counts = defaultdict(int)
    for ati in year_atis:
        sector_counts[ati.secteur] += 1

    # Province breakdown
    province_counts = defaultdict(int)
    for ati in year_atis:
        if ati.operateur:
            province_counts[ati.operateur.province or "inconnu"] += 1

    # SLA performance
    decided = [a for a in year_atis if a.statut in ("approuve", "rejete") and a.date_decision]
    avg_days = round(sum((a.date_decision.date() - a.date_soumission.date()).days for a in decided) / len(decided), 1) if decided else 0
    sla_respect = sum(1 for a in decided if (a.date_decision.date() - a.date_soumission.date()).days <= a.sla_jours)

    approved = sum(1 for a in year_atis if a.statut == "approuve")
    rejected = sum(1 for a in year_atis if a.statut == "rejete")
    conformes = sum(1 for i in year_insp if i.statut_conformite == "conforme")

    return {
        "year": year,
        "summary": {
            "soumissions": len(year_atis),
            "approuves": approved,
            "rejetes": rejected,
            "taux_approbation": round(approved / max(len(decided), 1) * 100, 1),
            "inspections": len(year_insp),
            "conformes": conformes,
            "taux_conformite": round(conformes / max(len(year_insp), 1) * 100, 1),
            "operateurs_actifs": len([o for o in all_ops if o.is_active]),
            "delai_moyen": avg_days,
            "taux_sla": round(sla_respect / max(len(decided), 1) * 100, 1),
        },
        "monthly": months_data,
        "sectors": [{"secteur": k, "count": v} for k, v in sorted(sector_counts.items(), key=lambda x: -x[1])],
        "provinces": [{"province": k.replace("_", " ").title(), "count": v} for k, v in sorted(province_counts.items(), key=lambda x: -x[1])],
    }


@router.get("/dashboard/province-benchmark")
async def province_benchmark(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Compare performance metrics across all provinces."""
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    all_ops = db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    now = now_utc()

    provinces: dict = defaultdict(lambda: {
        "operateurs": 0, "atis": 0, "approuves": 0, "rejetes": 0,
        "en_cours": 0, "inspections": 0, "conformes": 0,
        "total_days": 0, "decided": 0, "overdue": 0,
    })

    for op in all_ops:
        prov = op.province or "inconnu"
        provinces[prov]["operateurs"] += 1

    for ati in all_atis:
        prov = ati.operateur.province if ati.operateur else "inconnu"
        p = provinces[prov]
        p["atis"] += 1
        if ati.statut == "approuve":
            p["approuves"] += 1
        elif ati.statut == "rejete":
            p["rejetes"] += 1
        elif ati.statut not in ("expire",):
            p["en_cours"] += 1

        if ati.statut in ("approuve", "rejete") and ati.date_decision:
            days = (ati.date_decision.date() - ati.date_soumission.date()).days
            p["total_days"] += days
            p["decided"] += 1

        if ati.statut not in ("approuve", "rejete", "expire"):
            age = (now.date() - ati.date_soumission.date()).days
            if age > ati.sla_jours:
                p["overdue"] += 1

    for insp in all_insp:
        prov = insp.operateur.province if insp.operateur else "inconnu"
        provinces[prov]["inspections"] += 1
        if insp.statut_conformite == "conforme":
            provinces[prov]["conformes"] += 1

    result = []
    for prov, m in sorted(provinces.items()):
        avg_days = round(m["total_days"] / m["decided"], 1) if m["decided"] else 0
        approval_rate = round(m["approuves"] / max(m["decided"], 1) * 100, 1)
        conformity_rate = round(m["conformes"] / max(m["inspections"], 1) * 100, 1)

        # Score composite (0-100)
        score = round(
            approval_rate * 0.3 +
            conformity_rate * 0.3 +
            max(0, (1 - m["overdue"] / max(m["en_cours"], 1)) * 100) * 0.2 +
            min(m["operateurs"] / 5, 1) * 100 * 0.1 +
            min(m["atis"] / 10, 1) * 100 * 0.1
        , 1)

        result.append({
            "province": prov,
            "label": prov.replace("_", " ").title(),
            "operateurs": m["operateurs"],
            "atis": m["atis"],
            "approuves": m["approuves"],
            "rejetes": m["rejetes"],
            "en_cours": m["en_cours"],
            "overdue": m["overdue"],
            "inspections": m["inspections"],
            "conformes": m["conformes"],
            "avg_days": avg_days,
            "approval_rate": approval_rate,
            "conformity_rate": conformity_rate,
            "score": score,
        })

    result.sort(key=lambda r: r["score"], reverse=True)
    return {"provinces": result}


@router.get("/dashboard/activity-feed")
async def activity_feed(
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Recent activity feed across all entities."""
    from ..models.core import AuditEventORM

    events = db.execute(
        select(AuditEventORM)
        .order_by(AuditEventORM.timestamp.desc())
        .limit(limit)
    ).scalars().all()

    ACTION_ICONS = {
        "ati.": "📋", "inspection.": "🔍", "auth.": "🔐",
        "admin.": "⚙️", "export.": "📤", "operateurs.": "🏭",
        "ati.sign": "✍️", "ati.certificate": "📜",
    }

    def get_icon(action: str) -> str:
        for prefix, icon in ACTION_ICONS.items():
            if action.startswith(prefix):
                return icon
        return "📌"

    return {
        "events": [
            {
                "id": e.id,
                "icon": get_icon(e.action),
                "actor": e.actor,
                "action": e.action,
                "target": e.target,
                "details": e.details[:150] if e.details else "",
                "timestamp": e.timestamp.isoformat(),
            }
            for e in events
        ]
    }

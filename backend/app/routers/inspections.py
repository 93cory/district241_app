"""PNPI · Endpoints de gestion des inspections de conformité."""

from __future__ import annotations

import io
import json
import math
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..database import as_utc, get_db, now_utc
from ..models.core import UserAccountORM
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionAnnualPlanORM,
    InspectionCampaignORM,
    InspectionChecklistTemplateORM,
    InspectionConformiteORM,
    InspectionCorrectiveActionORM,
    InspectionFindingORM,
    InspectionMissionOrderORM,
    InspectionPhotoORM,
    InspectionSanctionORM,
    OperateurIndustrielORM,
)
from ..schemas.pnpi import InspectionCreate, InspectionRead

router = APIRouter(prefix="/pnpi", tags=["Inspections"])

PHOTO_UPLOAD_DIR = Path(os.getenv("PNPI_UPLOAD_DIR", "uploads/inspections"))
PHOTO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PHOTO_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
PHOTO_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
PHOTO_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

SEVERITY_DUE_DAYS = {"mineure": 30, "majeure": 15, "critique": 0}
DEFAULT_CHECKLISTS = {
    "agroalimentaire": [
        "Hygiene",
        "Tracabilite",
        "Stockage",
        "Temperature",
        "Securite incendie",
        "Equipements",
        "Personnel",
        "Registres",
    ],
    "bois": [
        "Origine du bois",
        "Sechage",
        "Stockage grumes",
        "Equipements",
        "Securite machine",
        "Gestion dechets",
        "Traçabilite",
        "EPI",
    ],
    "mines": [
        "Autorisation site",
        "HSE",
        "Stockage explosifs",
        "Eaux usees",
        "Protection personnel",
        "Signalisation",
        "Registre incidents",
    ],
    "btp": ["Materiaux", "Securite chantier", "Equipements", "Permis", "Stockage", "Gestion dechets"],
    "petrole": [
        "HSE",
        "Stockage hydrocarbures",
        "Plan urgence",
        "Equipements pression",
        "Formation personnel",
        "Rejets",
    ],
    "services": ["Registres", "Securite", "Equipements", "Hygiene", "Procedure qualite"],
}


class PhotoRead(BaseModel):
    id: str
    inspection_id: str
    nom_fichier: str
    taille_octets: int
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    captured_at: str | None = None
    uploaded_at: str
    uploaded_by: str

    model_config = ConfigDict(from_attributes=True)


class AnnualPlanPayload(BaseModel):
    year: int
    secteur: str
    province: str | None = None
    target_count: int
    direction: str | None = None


class CampaignPayload(BaseModel):
    title: str
    objective: str
    secteur: str | None = None
    provinces: list[str] = []
    criteria: list[str] = []
    responsible_team: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class MissionOrderPayload(BaseModel):
    operateur_id: str
    campaign_id: str | None = None
    inspecteurs: list[str]
    lieu: str | None = None
    objective: str
    scheduled_at: datetime
    duration_days: int = 1


class ChecklistTemplatePayload(BaseModel):
    secteur: str
    title: str
    items: list[str]
    is_active: bool = True


class FindingPayload(BaseModel):
    category: str
    severity: str
    description: str
    evidence_ref: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    due_at: datetime | None = None
    responsible: str | None = None


class CorrectiveActionPayload(BaseModel):
    action: str
    due_at: datetime | None = None
    operator_response: str | None = None
    status: str | None = None


class SanctionPayload(BaseModel):
    sanction_type: str
    motive: str
    decision_reference: str | None = None


def _to_photo_read(photo: InspectionPhotoORM) -> PhotoRead:
    return PhotoRead(
        id=photo.id,
        inspection_id=photo.inspection_id,
        nom_fichier=photo.nom_fichier,
        taille_octets=photo.taille_octets,
        description=photo.description,
        latitude=photo.latitude,
        longitude=photo.longitude,
        captured_at=photo.captured_at.isoformat() if photo.captured_at else None,
        uploaded_at=photo.uploaded_at.isoformat(),
        uploaded_by=photo.uploaded_by,
    )


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
        mission_order_id=getattr(insp, "mission_order_id", None),
        campaign_id=getattr(insp, "campaign_id", None),
        inspecteur_username=insp.inspecteur_username,
        inspecteur_nom=user.full_name if user else insp.inspecteur_username,
        date_inspection=insp.date_inspection,
        workflow_status=getattr(insp, "workflow_status", "rapport"),
        statut_conformite=insp.statut_conformite,
        score_conformite=getattr(insp, "score_conformite", None),
        observations=insp.observations,
        mesures_correctives=insp.mesures_correctives,
        latitude=insp.latitude,
        longitude=insp.longitude,
        province=op.province if op else "",
        secteur=op.secteur if op else "",
        created_at=insp.created_at,
    )


def _generate_mission_numero(db: Session) -> str:
    year = now_utc().year
    prefix = f"OMI-{year}-"
    max_num = (
        db.execute(select(InspectionMissionOrderORM.numero).where(InspectionMissionOrderORM.numero.like(f"{prefix}%")))
        .scalars()
        .all()
    )
    seq = 1
    if max_num:
        try:
            seq = max(int(num.split("-")[-1]) for num in max_num) + 1
        except ValueError:
            seq = len(max_num) + 1
    return f"{prefix}{seq:04d}"


def _inspection_score(status: str, critical: int = 0, major: int = 0, minor: int = 0, open_actions: int = 0) -> int:
    base = {"conforme": 100, "partiel": 70, "non_conforme": 45}.get(status, 60)
    score = base - critical * 25 - major * 12 - minor * 5 - open_actions * 4
    return max(0, min(100, score))


def _serialize_plan(plan: InspectionAnnualPlanORM) -> dict:
    return {
        "id": plan.id,
        "year": plan.year,
        "secteur": plan.secteur,
        "province": plan.province,
        "target_count": plan.target_count,
        "direction": plan.direction,
        "created_by": plan.created_by,
        "created_at": plan.created_at.isoformat(),
    }


def _serialize_campaign(campaign: InspectionCampaignORM) -> dict:
    return {
        "id": campaign.id,
        "title": campaign.title,
        "objective": campaign.objective,
        "secteur": campaign.secteur,
        "provinces": json.loads(campaign.provinces or "[]"),
        "criteria": json.loads(campaign.criteria or "[]"),
        "responsible_team": campaign.responsible_team,
        "start_date": campaign.start_date.isoformat() if campaign.start_date else None,
        "end_date": campaign.end_date.isoformat() if campaign.end_date else None,
        "status": campaign.status,
        "created_by": campaign.created_by,
        "created_at": campaign.created_at.isoformat(),
    }


def _serialize_mission(order: InspectionMissionOrderORM, db: Session) -> dict:
    op = db.get(OperateurIndustrielORM, order.operateur_id)
    return {
        "id": order.id,
        "numero": order.numero,
        "inspection_id": order.inspection_id,
        "campaign_id": order.campaign_id,
        "operateur_id": order.operateur_id,
        "operateur_nom": op.raison_sociale if op else order.operateur_id,
        "inspecteurs": json.loads(order.inspecteurs or "[]"),
        "lieu": order.lieu,
        "objective": order.objective,
        "scheduled_at": order.scheduled_at.isoformat(),
        "duration_days": order.duration_days,
        "status": order.status,
        "qr_code_data": order.qr_code_data,
        "created_by": order.created_by,
        "created_at": order.created_at.isoformat(),
    }


def _serialize_finding(finding: InspectionFindingORM) -> dict:
    return {
        "id": finding.id,
        "inspection_id": finding.inspection_id,
        "category": finding.category,
        "severity": finding.severity,
        "description": finding.description,
        "evidence_ref": finding.evidence_ref,
        "latitude": finding.latitude,
        "longitude": finding.longitude,
        "due_at": finding.due_at.isoformat() if finding.due_at else None,
        "responsible": finding.responsible,
        "status": finding.status,
        "created_by": finding.created_by,
        "created_at": finding.created_at.isoformat(),
    }


def _serialize_action(action: InspectionCorrectiveActionORM) -> dict:
    return {
        "id": action.id,
        "finding_id": action.finding_id,
        "action": action.action,
        "due_at": action.due_at.isoformat() if action.due_at else None,
        "status": action.status,
        "operator_response": action.operator_response,
        "validated_by": action.validated_by,
        "validated_at": action.validated_at.isoformat() if action.validated_at else None,
        "created_by": action.created_by,
        "created_at": action.created_at.isoformat(),
    }


def _pct(part: int | float, total: int | float) -> float:
    return round((part / total) * 100, 1) if total else 0.0


def _conformity_grade(score: float) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "E"


def _risk_label(score: float) -> str:
    if score < 40:
        return "critique"
    if score < 60:
        return "eleve"
    if score < 75:
        return "modere"
    return "maitrise"


@router.get("/inspections", response_model=list[InspectionRead], summary="Lister les inspections de conformite")
async def list_inspections(
    operateur_id: str | None = Query(default=None),
    statut_conformite: str | None = Query(default=None),
    inspecteur_username: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    _: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> list[InspectionRead]:
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


@router.post(
    "/inspections",
    response_model=InspectionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Creer une inspection de conformite",
)
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
        workflow_status="rapport",
        statut_conformite=payload.statut_conformite,
        score_conformite=_inspection_score(payload.statut_conformite),
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


@router.post("/inspections/tournee/optimize", summary="Optimisation de tournee (nearest-neighbor TSP)")
async def optimize_tournee(
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Prend une liste d'operateurs a visiter + point de depart, renvoie l'ordre
    optimal via l'algorithme nearest-neighbor (O(n^2), suffisant pour ~20 points).
    Input : { start: {lat, lng}, operateur_ids: [...] }
    """
    import math

    start = data.get("start") or {}
    start_lat = start.get("lat")
    start_lng = start.get("lng")
    operateur_ids = data.get("operateur_ids") or []

    if start_lat is None or start_lng is None:
        raise HTTPException(400, "Coordonnees de depart manquantes (start.lat, start.lng).")
    if not operateur_ids or not isinstance(operateur_ids, list):
        raise HTTPException(400, "Liste operateur_ids requise.")

    ops = db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.id.in_(operateur_ids))).scalars().all()

    # Ne garder que ceux qui ont une geoloc
    geo_ops = [(op, op.latitude, op.longitude) for op in ops if op.latitude and op.longitude]
    if not geo_ops:
        raise HTTPException(400, "Aucun operateur geocode dans la liste fournie.")

    def haversine(lat1, lng1, lat2, lng2):
        R = 6371  # km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
        )
        return 2 * R * math.asin(math.sqrt(a))

    # Nearest neighbor depuis le point de depart
    route = []
    current_lat, current_lng = start_lat, start_lng
    remaining = list(geo_ops)
    total_km = 0.0
    while remaining:
        best_idx = 0
        best_dist = float("inf")
        for i, (_, lat, lng) in enumerate(remaining):
            d = haversine(current_lat, current_lng, lat, lng)
            if d < best_dist:
                best_dist = d
                best_idx = i
        op, lat, lng = remaining.pop(best_idx)
        total_km += best_dist
        route.append(
            {
                "operateur_id": op.id,
                "raison_sociale": op.raison_sociale,
                "secteur": op.secteur,
                "latitude": lat,
                "longitude": lng,
                "distance_km_from_prev": round(best_dist, 2),
            }
        )
        current_lat, current_lng = lat, lng

    return {
        "start": {"lat": start_lat, "lng": start_lng},
        "route": route,
        "total_km": round(total_km, 2),
        "nb_stops": len(route),
        "skipped_no_geo": len(ops) - len(geo_ops),
    }


@router.get("/inspections/control-center", summary="Centre de controle operationnel des inspections")
async def inspection_control_center(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    now = now_utc()
    year_start = datetime(now.year, 1, 1, tzinfo=now.tzinfo)
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    missions = db.execute(select(InspectionMissionOrderORM)).scalars().all()
    findings = db.execute(select(InspectionFindingORM)).scalars().all()
    actions = db.execute(select(InspectionCorrectiveActionORM)).scalars().all()
    operateurs = db.execute(select(OperateurIndustrielORM)).scalars().all()
    plans = db.execute(select(InspectionAnnualPlanORM).where(InspectionAnnualPlanORM.year == now.year)).scalars().all()

    planned = [m for m in missions if m.status in {"planifie", "en_mission"}]
    overdue_missions = [
        m for m in planned if as_utc(m.scheduled_at) and as_utc(m.scheduled_at) < now and not m.inspection_id
    ]
    critical_findings = [f for f in findings if f.severity == "critique" and f.status != "cloturee"]
    open_actions = [a for a in actions if a.status not in {"validee", "cloturee"}]
    overdue_actions = [a for a in open_actions if as_utc(a.due_at) and as_utc(a.due_at) < now]
    to_close = [i for i in inspections if getattr(i, "workflow_status", "rapport") in {"suivi", "validation"}]
    inspections_ytd = [i for i in inspections if as_utc(i.date_inspection) and as_utc(i.date_inspection) >= year_start]
    target_ytd = sum(max(plan.target_count, 0) for plan in plans)
    inspected_operator_ids = {i.operateur_id for i in inspections}
    inspected_operator_ids_ytd = {i.operateur_id for i in inspections_ytd}
    coverage_pct = _pct(len(inspected_operator_ids), len(operateurs))
    coverage_ytd_pct = _pct(len(inspected_operator_ids_ytd), len(operateurs))
    conformity_rate = _pct(sum(1 for i in inspections if i.statut_conformite == "conforme"), len(inspections))
    non_conformity_rate = _pct(
        sum(1 for i in inspections if i.statut_conformite in {"non_conforme", "partiel"}),
        len(inspections),
    )
    action_closure_rate = _pct(
        sum(1 for a in actions if a.status in {"validee", "cloturee"}),
        len(actions),
    )
    avg_score = (
        round(
            sum(i.score_conformite or _inspection_score(i.statut_conformite) for i in inspections) / len(inspections),
            1,
        )
        if inspections
        else 0.0
    )

    by_province: dict[str, dict] = {}
    by_sector: dict[str, dict] = {}
    latest_by_operator: dict[str, InspectionConformiteORM] = {}
    for insp in inspections:
        op = insp.operateur
        province = op.province if op else "inconnu"
        secteur = op.secteur if op else "inconnu"
        for bucket, key in ((by_province, province), (by_sector, secteur)):
            bucket.setdefault(key, {"total": 0, "conformes": 0, "non_conformes": 0, "partiels": 0, "score_moyen": 0})
            bucket[key]["total"] += 1
            if insp.statut_conformite == "conforme":
                bucket[key]["conformes"] += 1
            elif insp.statut_conformite == "non_conforme":
                bucket[key]["non_conformes"] += 1
            else:
                bucket[key]["partiels"] += 1
            bucket[key]["score_moyen"] += insp.score_conformite or _inspection_score(insp.statut_conformite)
        latest = latest_by_operator.get(insp.operateur_id)
        if latest is None or as_utc(insp.date_inspection) > as_utc(latest.date_inspection):
            latest_by_operator[insp.operateur_id] = insp

    for bucket in (by_province, by_sector):
        for value in bucket.values():
            value["score_moyen"] = round(value["score_moyen"] / value["total"], 1) if value["total"] else 0
            value["taux_conformite"] = _pct(value["conformes"], value["total"])

    findings_by_inspection: dict[str, list[InspectionFindingORM]] = {}
    actions_by_finding: dict[str, list[InspectionCorrectiveActionORM]] = {}
    for finding in findings:
        findings_by_inspection.setdefault(finding.inspection_id, []).append(finding)
    for action in actions:
        actions_by_finding.setdefault(action.finding_id, []).append(action)

    risk_queue = []
    for op in operateurs:
        latest = latest_by_operator.get(op.id)
        op_findings = findings_by_inspection.get(latest.id, []) if latest else []
        critical = sum(1 for f in op_findings if f.severity == "critique" and f.status != "cloturee")
        major = sum(1 for f in op_findings if f.severity == "majeure" and f.status != "cloturee")
        open_for_operator = sum(
            1 for f in op_findings for a in actions_by_finding.get(f.id, []) if a.status not in {"validee", "cloturee"}
        )
        days_since = (
            (now.date() - as_utc(latest.date_inspection).date()).days
            if latest and as_utc(latest.date_inspection)
            else None
        )
        base_score = latest.score_conformite or _inspection_score(latest.statut_conformite) if latest else 50
        risk_score = max(
            0,
            min(
                100,
                100
                - base_score
                + critical * 20
                + major * 8
                + open_for_operator * 5
                + (15 if days_since is None or days_since > 365 else 0),
            ),
        )
        risk_queue.append(
            {
                "operateur_id": op.id,
                "operateur": op.raison_sociale,
                "province": op.province,
                "secteur": op.secteur,
                "last_inspection": as_utc(latest.date_inspection).isoformat()
                if latest and as_utc(latest.date_inspection)
                else None,
                "status": latest.statut_conformite if latest else "jamais_inspecte",
                "score_conformite": base_score if latest else None,
                "risk_score": round(risk_score, 1),
                "risk_level": _risk_label(100 - risk_score),
                "critical_findings": critical,
                "open_actions": open_for_operator,
                "next_action": (
                    "Planifier une inspection prioritaire"
                    if latest is None
                    else "Exiger une action corrective immédiate"
                    if critical
                    else "Suivre les actions ouvertes"
                    if open_for_operator
                    else "Maintenir le cycle de contrôle"
                ),
            }
        )
    risk_queue = sorted(risk_queue, key=lambda item: item["risk_score"], reverse=True)

    executive_alerts = []
    if overdue_missions:
        executive_alerts.append(
            {
                "level": "urgent",
                "title": "Missions en retard",
                "detail": f"{len(overdue_missions)} mission(s) planifiée(s) sans rapport.",
            }
        )
    if critical_findings:
        executive_alerts.append(
            {
                "level": "critique",
                "title": "Non-conformités critiques",
                "detail": f"{len(critical_findings)} constat(s) critique(s) encore ouvert(s).",
            }
        )
    if overdue_actions:
        executive_alerts.append(
            {
                "level": "eleve",
                "title": "Actions correctives échues",
                "detail": f"{len(overdue_actions)} action(s) corrective(s) dépassent leur échéance.",
            }
        )
    if coverage_ytd_pct < 35:
        executive_alerts.append(
            {
                "level": "attention",
                "title": "Couverture annuelle faible",
                "detail": f"{coverage_ytd_pct}% des opérateurs inspectés cette année.",
            }
        )

    recommendations = [
        "Traiter en priorité les opérateurs de la file de risque critique.",
        "Transformer les non-conformités critiques en décisions suivies : mise en demeure, suspension ou clôture après correction.",
        "Renforcer la planification annuelle par secteur/province pour équilibrer la couverture territoriale.",
    ]
    if action_closure_rate < 70 and actions:
        recommendations.insert(1, "Mettre en place une revue hebdomadaire des actions correctives non clôturées.")

    return {
        "generated_at": now.isoformat(),
        "headline": {
            "score_national": avg_score,
            "grade": _conformity_grade(avg_score),
            "risk_level": _risk_label(avg_score),
            "taux_conformite": conformity_rate,
            "taux_non_conformite": non_conformity_rate,
            "couverture_globale": coverage_pct,
            "couverture_annuelle": coverage_ytd_pct,
            "execution_plan_annuel": _pct(len(inspections_ytd), target_ytd) if target_ytd else 0,
            "taux_cloture_actions": action_closure_rate,
        },
        "stats": {
            "inspections_total": len(inspections),
            "inspections_annee": len(inspections_ytd),
            "missions_planifiees": len(planned),
            "missions_en_retard": len(overdue_missions),
            "non_conformites_critiques": len(critical_findings),
            "actions_ouvertes": len(open_actions),
            "actions_en_retard": len(overdue_actions),
            "dossiers_a_cloturer": len(to_close),
            "operateurs_couverts": len(inspected_operator_ids),
            "operateurs_jamais_inspectes": max(len(operateurs) - len(inspected_operator_ids), 0),
        },
        "buckets": {
            "missions_en_retard": [_serialize_mission(m, db) for m in overdue_missions[:10]],
            "non_conformites_critiques": [_serialize_finding(f) for f in critical_findings[:10]],
            "actions_en_retard": [_serialize_action(a) for a in overdue_actions[:10]],
            "dossiers_a_cloturer": [_to_inspection_read(i, db).model_dump(mode="json") for i in to_close[:10]],
        },
        "risk_queue": risk_queue[:12],
        "executive_alerts": executive_alerts,
        "recommendations": recommendations,
        "by_province": by_province,
        "by_sector": by_sector,
    }


@router.get("/inspections/annual-plans", summary="Plan annuel d'inspection")
async def list_annual_plans(
    year: int | None = Query(default=None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    query = select(InspectionAnnualPlanORM)
    if year:
        query = query.where(InspectionAnnualPlanORM.year == year)
    plans = (
        db.execute(query.order_by(InspectionAnnualPlanORM.year.desc(), InspectionAnnualPlanORM.secteur)).scalars().all()
    )
    return [_serialize_plan(plan) for plan in plans]


@router.post("/inspections/annual-plans", status_code=status.HTTP_201_CREATED)
async def create_annual_plan(
    payload: AnnualPlanPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    plan = InspectionAnnualPlanORM(
        id=f"PLAN-{uuid.uuid4().hex[:10].upper()}",
        year=payload.year,
        secteur=payload.secteur.strip().lower(),
        province=payload.province.strip().lower() if payload.province else None,
        target_count=payload.target_count,
        direction=payload.direction,
        created_by=current_user.username,
        created_at=now_utc(),
    )
    db.add(plan)
    write_audit_event(
        db, actor=current_user.username, action="inspection.plan.create", target=plan.id, details=plan.secteur
    )
    db.commit()
    db.refresh(plan)
    return _serialize_plan(plan)


@router.get("/inspections/campaigns", summary="Campagnes nationales d'inspection")
async def list_campaigns(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    campaigns = (
        db.execute(select(InspectionCampaignORM).order_by(InspectionCampaignORM.created_at.desc())).scalars().all()
    )
    return [_serialize_campaign(campaign) for campaign in campaigns]


@router.post("/inspections/campaigns", status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    campaign = InspectionCampaignORM(
        id=f"CAMP-{uuid.uuid4().hex[:10].upper()}",
        title=payload.title.strip(),
        objective=payload.objective.strip(),
        secteur=payload.secteur.strip().lower() if payload.secteur else None,
        provinces=json.dumps(payload.provinces, ensure_ascii=False),
        criteria=json.dumps(payload.criteria, ensure_ascii=False),
        responsible_team=payload.responsible_team,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="planifiee",
        created_by=current_user.username,
        created_at=now_utc(),
    )
    db.add(campaign)
    write_audit_event(
        db, actor=current_user.username, action="inspection.campaign.create", target=campaign.id, details=campaign.title
    )
    db.commit()
    db.refresh(campaign)
    return _serialize_campaign(campaign)


@router.get("/inspections/mission-orders", summary="Ordres de mission d'inspection")
async def list_mission_orders(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    orders = (
        db.execute(select(InspectionMissionOrderORM).order_by(InspectionMissionOrderORM.scheduled_at.desc()).limit(100))
        .scalars()
        .all()
    )
    return [_serialize_mission(order, db) for order in orders]


@router.post("/inspections/mission-orders", status_code=status.HTTP_201_CREATED)
async def create_mission_order(
    payload: MissionOrderPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    op = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    numero = _generate_mission_numero(db)
    order = InspectionMissionOrderORM(
        id=f"OMI-{uuid.uuid4().hex[:10].upper()}",
        numero=numero,
        campaign_id=payload.campaign_id,
        operateur_id=payload.operateur_id,
        inspecteurs=json.dumps(payload.inspecteurs, ensure_ascii=False),
        lieu=payload.lieu or f"{op.ville}, {op.province}",
        objective=payload.objective.strip(),
        scheduled_at=payload.scheduled_at,
        duration_days=max(payload.duration_days, 1),
        status="planifie",
        qr_code_data=f"PNPI:MISSION:{numero}:{payload.operateur_id}",
        created_by=current_user.username,
        created_at=now_utc(),
    )
    db.add(order)
    write_audit_event(
        db, actor=current_user.username, action="inspection.mission.create", target=order.id, details=numero
    )
    db.commit()
    db.refresh(order)
    return _serialize_mission(order, db)


@router.get("/inspections/checklists", summary="Checklists dynamiques par secteur")
async def list_checklists(
    secteur: str | None = Query(default=None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    query = select(InspectionChecklistTemplateORM).where(InspectionChecklistTemplateORM.is_active.is_(True))
    if secteur:
        query = query.where(InspectionChecklistTemplateORM.secteur == secteur)
    templates = db.execute(query.order_by(InspectionChecklistTemplateORM.secteur)).scalars().all()
    if templates:
        return [
            {
                "id": t.id,
                "secteur": t.secteur,
                "title": t.title,
                "items": json.loads(t.items or "[]"),
                "is_active": t.is_active,
                "updated_by": t.updated_by,
                "updated_at": t.updated_at.isoformat(),
            }
            for t in templates
        ]
    return [
        {"id": f"default-{key}", "secteur": key, "title": f"Checklist {key}", "items": items, "is_active": True}
        for key, items in DEFAULT_CHECKLISTS.items()
        if not secteur or key == secteur
    ]


@router.post("/inspections/checklists", status_code=status.HTTP_201_CREATED)
async def create_checklist(
    payload: ChecklistTemplatePayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    template = InspectionChecklistTemplateORM(
        id=f"CHK-{uuid.uuid4().hex[:10].upper()}",
        secteur=payload.secteur.strip().lower(),
        title=payload.title.strip(),
        items=json.dumps(payload.items, ensure_ascii=False),
        is_active=payload.is_active,
        updated_by=current_user.username,
        updated_at=now_utc(),
    )
    db.add(template)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.checklist.create",
        target=template.id,
        details=template.secteur,
    )
    db.commit()
    db.refresh(template)
    return {
        "id": template.id,
        "secteur": template.secteur,
        "title": template.title,
        "items": json.loads(template.items),
        "is_active": template.is_active,
    }


@router.get("/inspections/compliance-intelligence", summary="Indice National de Conformite Industrielle")
async def compliance_intelligence(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    findings = db.execute(select(InspectionFindingORM)).scalars().all()
    actions = db.execute(select(InspectionCorrectiveActionORM)).scalars().all()
    findings_by_inspection: dict[str, list[InspectionFindingORM]] = {}
    actions_by_finding: dict[str, list[InspectionCorrectiveActionORM]] = {}
    for finding in findings:
        findings_by_inspection.setdefault(finding.inspection_id, []).append(finding)
    for action in actions:
        actions_by_finding.setdefault(action.finding_id, []).append(action)

    operator_scores: dict[str, dict] = {}
    for insp in inspections:
        op = insp.operateur
        insp_findings = findings_by_inspection.get(insp.id, [])
        critical = sum(1 for f in insp_findings if f.severity == "critique")
        major = sum(1 for f in insp_findings if f.severity == "majeure")
        minor = sum(1 for f in insp_findings if f.severity == "mineure")
        open_actions = sum(
            1
            for f in insp_findings
            for a in actions_by_finding.get(f.id, [])
            if a.status not in {"validee", "cloturee"}
        )
        score = insp.score_conformite or _inspection_score(insp.statut_conformite, critical, major, minor, open_actions)
        current = operator_scores.get(insp.operateur_id)
        if current is None or insp.date_inspection > current["last_inspection"]:
            operator_scores[insp.operateur_id] = {
                "operateur_id": insp.operateur_id,
                "operateur": op.raison_sociale if op else insp.operateur_id,
                "province": op.province if op else "inconnu",
                "secteur": op.secteur if op else "inconnu",
                "score": score,
                "last_inspection": insp.date_inspection,
                "critical_findings": critical,
                "open_actions": open_actions,
            }

    scores = list(operator_scores.values())
    national = round(sum(s["score"] for s in scores) / len(scores), 1) if scores else 0
    for s in scores:
        s["last_inspection"] = s["last_inspection"].isoformat()
        s["risk_level"] = (
            "critique"
            if s["score"] < 45
            else "eleve"
            if s["score"] < 65
            else "modere"
            if s["score"] < 80
            else "maitrise"
        )

    by_province: dict[str, list[int]] = {}
    by_sector: dict[str, list[int]] = {}
    for s in scores:
        by_province.setdefault(s["province"], []).append(s["score"])
        by_sector.setdefault(s["secteur"], []).append(s["score"])

    return {
        "generated_at": now_utc().isoformat(),
        "inci_national": national,
        "operators": sorted(scores, key=lambda s: s["score"]),
        "by_province": {k: round(sum(v) / len(v), 1) for k, v in by_province.items()},
        "by_sector": {k: round(sum(v) / len(v), 1) for k, v in by_sector.items()},
        "methodology": {
            "respect_delais": 20,
            "historique_inspections": 20,
            "non_conformites_critiques": 25,
            "actions_correctives": 20,
            "documents_a_jour": 15,
        },
    }


@router.get(
    "/inspections/{inspection_id}/comparison", summary="Comparaison avec l'inspection precedente de l'operateur"
)
async def inspection_comparison(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    current = db.get(InspectionConformiteORM, inspection_id)
    if not current:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    # Derniere inspection du MEME operateur anterieure a celle-ci
    previous = db.execute(
        select(InspectionConformiteORM)
        .where(
            InspectionConformiteORM.operateur_id == current.operateur_id,
            InspectionConformiteORM.id != inspection_id,
            InspectionConformiteORM.date_inspection < current.date_inspection,
        )
        .order_by(InspectionConformiteORM.date_inspection.desc())
        .limit(1)
    ).scalar_one_or_none()

    def serialize(i: InspectionConformiteORM | None):
        if not i:
            return None
        return {
            "id": i.id,
            "date_inspection": i.date_inspection.isoformat(),
            "statut_conformite": i.statut_conformite,
            "inspecteur": i.inspecteur_username,
            "observations": i.observations,
            "mesures_correctives": i.mesures_correctives,
        }

    # Evolution de conformite
    evolution = None
    if previous:
        rank = {"conforme": 2, "partiel": 1, "non_conforme": 0}
        prev_rank = rank.get(previous.statut_conformite, 0)
        curr_rank = rank.get(current.statut_conformite, 0)
        if curr_rank > prev_rank:
            evolution = "amelioration"
        elif curr_rank < prev_rank:
            evolution = "degradation"
        else:
            evolution = "stable"

    return {
        "current": serialize(current),
        "previous": serialize(previous),
        "evolution": evolution,
        "days_between": (current.date_inspection.date() - previous.date_inspection.date()).days if previous else None,
    }


@router.get("/inspections/{inspection_id}", response_model=InspectionRead, summary="Detail d'une inspection")
async def get_inspection(
    inspection_id: str,
    _: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> InspectionRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    return _to_inspection_read(insp, db)


@router.get("/inspections/{inspection_id}/findings", summary="Constats et non-conformites d'une inspection")
async def list_findings(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    if not db.get(InspectionConformiteORM, inspection_id):
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    findings = (
        db.execute(select(InspectionFindingORM).where(InspectionFindingORM.inspection_id == inspection_id))
        .scalars()
        .all()
    )
    return [_serialize_finding(finding) for finding in findings]


@router.post("/inspections/{inspection_id}/findings", status_code=status.HTTP_201_CREATED)
async def create_finding(
    inspection_id: str,
    payload: FindingPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    severity = payload.severity.strip().lower()
    if severity not in SEVERITY_DUE_DAYS:
        raise HTTPException(status_code=422, detail="Gravite invalide: mineure, majeure ou critique.")
    due_at = payload.due_at
    if due_at is None:
        due_days = SEVERITY_DUE_DAYS[severity]
        due_at = now_utc() if due_days == 0 else now_utc() + timedelta(days=due_days)
    finding = InspectionFindingORM(
        id=f"NC-{uuid.uuid4().hex[:10].upper()}",
        inspection_id=inspection_id,
        category=payload.category.strip(),
        severity=severity,
        description=payload.description.strip(),
        evidence_ref=payload.evidence_ref,
        latitude=payload.latitude,
        longitude=payload.longitude,
        due_at=due_at,
        responsible=payload.responsible,
        status="ouverte",
        created_by=current_user.username,
        created_at=now_utc(),
    )
    insp.workflow_status = "suivi"
    if insp.statut_conformite == "conforme":
        insp.statut_conformite = "partiel"
    db.add(finding)
    write_audit_event(
        db, actor=current_user.username, action="inspection.finding.create", target=inspection_id, details=severity
    )
    db.commit()
    db.refresh(finding)
    return _serialize_finding(finding)


@router.patch("/inspections/{inspection_id}/findings/{finding_id}")
async def update_finding(
    inspection_id: str,
    finding_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    finding = db.get(InspectionFindingORM, finding_id)
    if not finding or finding.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Constat introuvable.")
    status_value = data.get("status")
    if status_value:
        finding.status = str(status_value)
    responsible = data.get("responsible")
    if responsible is not None:
        finding.responsible = str(responsible)
    write_audit_event(
        db, actor=current_user.username, action="inspection.finding.update", target=finding.id, details=finding.status
    )
    db.commit()
    db.refresh(finding)
    return _serialize_finding(finding)


@router.get("/inspections/{inspection_id}/corrective-actions", summary="Actions correctives d'une inspection")
async def list_corrective_actions(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    findings = (
        db.execute(select(InspectionFindingORM).where(InspectionFindingORM.inspection_id == inspection_id))
        .scalars()
        .all()
    )
    finding_ids = [finding.id for finding in findings]
    if not finding_ids:
        return []
    actions = (
        db.execute(
            select(InspectionCorrectiveActionORM).where(InspectionCorrectiveActionORM.finding_id.in_(finding_ids))
        )
        .scalars()
        .all()
    )
    return [_serialize_action(action) for action in actions]


@router.post(
    "/inspections/{inspection_id}/findings/{finding_id}/corrective-actions", status_code=status.HTTP_201_CREATED
)
async def create_corrective_action(
    inspection_id: str,
    finding_id: str,
    payload: CorrectiveActionPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    finding = db.get(InspectionFindingORM, finding_id)
    if not finding or finding.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Constat introuvable.")
    action = InspectionCorrectiveActionORM(
        id=f"AC-{uuid.uuid4().hex[:10].upper()}",
        finding_id=finding_id,
        action=payload.action.strip(),
        due_at=payload.due_at or finding.due_at,
        status=payload.status or "a_faire",
        operator_response=payload.operator_response,
        created_by=current_user.username,
        created_at=now_utc(),
    )
    db.add(action)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.action.create",
        target=finding_id,
        details=action.action[:120],
    )
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


@router.patch("/inspections/{inspection_id}/corrective-actions/{action_id}")
async def update_corrective_action(
    inspection_id: str,
    action_id: str,
    payload: CorrectiveActionPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    action = db.get(InspectionCorrectiveActionORM, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action corrective introuvable.")
    finding = db.get(InspectionFindingORM, action.finding_id)
    if not finding or finding.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Action corrective introuvable.")
    if payload.action:
        action.action = payload.action
    if payload.due_at is not None:
        action.due_at = payload.due_at
    if payload.operator_response is not None:
        action.operator_response = payload.operator_response
    if payload.status is not None:
        action.status = payload.status
        if payload.status in {"validee", "cloturee"}:
            action.validated_by = current_user.username
            action.validated_at = now_utc()
    write_audit_event(
        db, actor=current_user.username, action="inspection.action.update", target=action.id, details=action.status
    )
    db.commit()
    db.refresh(action)
    return _serialize_action(action)


@router.get("/inspections/{inspection_id}/sanctions", summary="Sanctions rattachees a une inspection")
async def list_sanctions(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    sanctions = (
        db.execute(select(InspectionSanctionORM).where(InspectionSanctionORM.inspection_id == inspection_id))
        .scalars()
        .all()
    )
    return [
        {
            "id": s.id,
            "inspection_id": s.inspection_id,
            "sanction_type": s.sanction_type,
            "motive": s.motive,
            "decision_reference": s.decision_reference,
            "status": s.status,
            "decided_by": s.decided_by,
            "decided_at": s.decided_at.isoformat() if s.decided_at else None,
            "created_by": s.created_by,
            "created_at": s.created_at.isoformat(),
        }
        for s in sanctions
    ]


@router.post("/inspections/{inspection_id}/sanctions", status_code=status.HTTP_201_CREATED)
async def create_sanction(
    inspection_id: str,
    payload: SanctionPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    if not db.get(InspectionConformiteORM, inspection_id):
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    sanction = InspectionSanctionORM(
        id=f"SANC-{uuid.uuid4().hex[:10].upper()}",
        inspection_id=inspection_id,
        sanction_type=payload.sanction_type.strip().lower(),
        motive=payload.motive.strip(),
        decision_reference=payload.decision_reference,
        status="proposee",
        created_by=current_user.username,
        created_at=now_utc(),
    )
    db.add(sanction)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.sanction.create",
        target=inspection_id,
        details=sanction.sanction_type,
    )
    db.commit()
    db.refresh(sanction)
    return {
        "id": sanction.id,
        "inspection_id": sanction.inspection_id,
        "sanction_type": sanction.sanction_type,
        "motive": sanction.motive,
        "decision_reference": sanction.decision_reference,
        "status": sanction.status,
        "created_by": sanction.created_by,
        "created_at": sanction.created_at.isoformat(),
    }


@router.post("/inspections/{inspection_id}/workflow")
async def update_inspection_workflow(
    inspection_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    status_value = str(data.get("workflow_status") or "").strip()
    if status_value not in {"planifiee", "en_mission", "rapport", "suivi", "validation", "cloturee"}:
        raise HTTPException(status_code=422, detail="Statut workflow invalide.")
    insp.workflow_status = status_value
    write_audit_event(
        db, actor=current_user.username, action="inspection.workflow.update", target=inspection_id, details=status_value
    )
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.patch("/inspections/{inspection_id}", response_model=InspectionRead, summary="Mettre a jour une inspection")
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
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.update",
        target=insp.id,
        details=f"statut={payload.statut_conformite}",
    )
    db.commit()
    db.refresh(insp)
    return _to_inspection_read(insp, db)


@router.get(
    "/inspections/{inspection_id}/report.pdf", summary="Rapport d'inspection de conformite PDF (nouveau format)"
)
async def download_inspection_report_pdf(
    inspection_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from ..core.inspection_report import generate_inspection_report

    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    op = (
        insp.operateur
        if hasattr(insp, "operateur")
        else (db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None)
    )

    pdf = generate_inspection_report(
        numero_inspection=insp.id[:12].upper(),
        operateur=op.raison_sociale if op else "Inconnu",
        nif=op.nif_gabon if op else "",
        province=op.province if op else "",
        site=insp.site_inspecte if hasattr(insp, "site_inspecte") else "",
        inspecteur=insp.inspecteur_username,
        date_inspection=insp.date_inspection,
        statut_conformite=insp.statut_conformite,
        observations=insp.observations or "",
        recommandations=insp.recommandations if hasattr(insp, "recommandations") else None,
        score_conformite=insp.score_conformite if hasattr(insp, "score_conformite") else None,
    )

    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection.report_pdf",
        target=inspection_id,
        details="Rapport inspection PDF telecharge",
    )
    db.commit()

    return FastAPIResponse(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="rapport_inspection_{insp.id[:12]}.pdf"'},
    )


@router.get("/inspections/{inspection_id}/pdf", summary="Rapport PDF d'inspection")
async def download_inspection_pdf(
    inspection_id: str,
    _: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    op = db.get(OperateurIndustrielORM, insp.operateur_id) if insp.operateur_id else None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm
    )
    styles = getSampleStyleSheet()
    bleu = colors.HexColor("#003F8F")
    CONF_COLORS_MAP = {"conforme": "#10b981", "non_conforme": "#ef4444", "partiel": "#f59e0b"}
    CONF_LABELS_MAP = {"conforme": "CONFORME", "non_conforme": "NON CONFORME", "partiel": "PARTIEL"}

    story = []
    story.append(
        Paragraph(
            "REPUBLIQUE GABONAISE",
            ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray),
        )
    )
    story.append(
        Paragraph(
            "Ministere de l'Industrie · PNPI",
            ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu),
        )
    )
    story.append(Spacer(1, 0.3 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=bleu))
    story.append(Spacer(1, 0.3 * cm))
    story.append(
        Paragraph(
            "Rapport d'Inspection de Conformite",
            ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=15, spaceAfter=4),
        )
    )
    story.append(
        Paragraph(
            f"Ref. {insp.id}",
            ParagraphStyle(
                "ref", parent=styles["Normal"], textColor=colors.HexColor("#009440"), fontSize=10, spaceAfter=8
            ),
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    conf_color = colors.HexColor(CONF_COLORS_MAP.get(insp.statut_conformite, "#6b7280"))
    conf_label = CONF_LABELS_MAP.get(insp.statut_conformite, insp.statut_conformite.upper())
    data = [
        ["Resultat", conf_label, "Date inspection", insp.date_inspection.strftime("%d/%m/%Y")],
        ["Inspecteur", insp.inspecteur_username, "Operateur", op.raison_sociale if op else insp.operateur_id],
        ["ATI lie", insp.ati_id or "·", "Province", op.province.replace("_", " ").capitalize() if op else "·"],
    ]
    t = Table(data, colWidths=[4 * cm, 5 * cm, 4 * cm, 4 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
                ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
                ("TEXTCOLOR", (1, 0), (1, 0), conf_color),
                ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                ("FONTNAME", (1, 0), (1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        Paragraph(
            "Observations",
            ParagraphStyle("sec", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=6, spaceAfter=4),
        )
    )
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
    story.append(
        Paragraph(
            insp.observations.replace("\n", "<br/>"),
            ParagraphStyle("obs", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16),
        )
    )
    if insp.mesures_correctives:
        story.append(
            Paragraph(
                "Mesures Correctives",
                ParagraphStyle(
                    "sec2",
                    parent=styles["Heading2"],
                    textColor=colors.HexColor("#d97706"),
                    fontSize=12,
                    spaceBefore=6,
                    spaceAfter=4,
                ),
            )
        )
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(
            Paragraph(
                insp.mesures_correctives.replace("\n", "<br/>"),
                ParagraphStyle("mes", parent=styles["Normal"], fontSize=10, spaceAfter=8, leading=16),
            )
        )
    if insp.latitude and insp.longitude:
        story.append(
            Paragraph(
                f"Localisation GPS : {insp.latitude:.5f}N, {insp.longitude:.5f}E",
                ParagraphStyle("gps", parent=styles["Normal"], fontSize=9, textColor=colors.gray),
            )
        )
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=bleu))
    from ..database import now_utc as _now

    story.append(
        Paragraph(
            f"Document genere par la PNPI · {_now().strftime('%d/%m/%Y %H:%M')} UTC",
            ParagraphStyle("footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray),
        )
    )
    doc.build(story)
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="inspection_{insp.id}.pdf"'},
    )


# ─── Inspection Photos ──────────────────────────────────────────────────────


@router.get(
    "/inspections/{inspection_id}/photos", response_model=list[PhotoRead], summary="Lister les photos d'une inspection"
)
async def list_inspection_photos(
    inspection_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> list[PhotoRead]:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")
    photos = (
        db.execute(
            select(InspectionPhotoORM)
            .where(InspectionPhotoORM.inspection_id == inspection_id)
            .order_by(InspectionPhotoORM.uploaded_at.desc())
        )
        .scalars()
        .all()
    )
    return [_to_photo_read(p) for p in photos]


@router.post(
    "/inspections/{inspection_id}/photos",
    response_model=PhotoRead,
    status_code=status.HTTP_201_CREATED,
    summary="Uploader une photo d'inspection",
)
async def upload_inspection_photo(
    inspection_id: str,
    file: UploadFile = File(...),
    description: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    captured_at: str | None = Form(default=None),
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> PhotoRead:
    insp = db.get(InspectionConformiteORM, inspection_id)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection introuvable.")

    # Validate extension
    ext = Path(file.filename or "photo.bin").suffix.lower()
    if ext not in PHOTO_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Type de fichier non autorise. Extensions acceptees: {', '.join(PHOTO_ALLOWED_EXTENSIONS)}",
        )

    # Validate content type
    if file.content_type and file.content_type not in PHOTO_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Type MIME non autorise. Types acceptes: {', '.join(PHOTO_ALLOWED_CONTENT_TYPES)}",
        )

    content = await file.read()
    if len(content) > PHOTO_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux. Maximum: {PHOTO_MAX_FILE_SIZE // 1024 // 1024} MB",
        )

    photo_id = f"PHO-{uuid.uuid4().hex[:12].upper()}"
    stored_name = f"{photo_id}{ext}"
    inspection_dir = PHOTO_UPLOAD_DIR / inspection_id
    inspection_dir.mkdir(parents=True, exist_ok=True)
    file_path = inspection_dir / stored_name
    file_path.write_bytes(content)

    # Parse captured_at si ISO fourni
    captured_dt = None
    if captured_at:
        try:
            from datetime import datetime as _dt

            captured_dt = _dt.fromisoformat(captured_at.replace("Z", "+00:00"))
        except Exception:
            captured_dt = None

    photo = InspectionPhotoORM(
        id=photo_id,
        inspection_id=inspection_id,
        nom_fichier=file.filename or stored_name,
        chemin_stockage=str(file_path),
        taille_octets=len(content),
        description=description,
        latitude=latitude,
        longitude=longitude,
        captured_at=captured_dt,
        uploaded_at=now_utc(),
        uploaded_by=current_user.username,
    )
    db.add(photo)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection_photo.upload",
        target=photo_id,
        details=f"inspection={inspection_id}; file={file.filename}",
    )
    db.commit()
    db.refresh(photo)
    return _to_photo_read(photo)


@router.get("/inspections/{inspection_id}/photos/{photo_id}/file", summary="Telecharger le fichier photo")
async def download_inspection_photo(
    inspection_id: str,
    photo_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FileResponse:
    photo = db.get(InspectionPhotoORM, photo_id)
    if not photo or photo.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    file_path = Path(photo.chemin_stockage)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier physique introuvable sur le serveur.")
    return FileResponse(path=str(file_path), filename=photo.nom_fichier, media_type="application/octet-stream")


@router.delete(
    "/inspections/{inspection_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Supprimer une photo d'inspection",
)
async def delete_inspection_photo(
    inspection_id: str,
    photo_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.inspecteur, Role.directeur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    photo = db.get(InspectionPhotoORM, photo_id)
    if not photo or photo.inspection_id != inspection_id:
        raise HTTPException(status_code=404, detail="Photo introuvable.")
    file_path = Path(photo.chemin_stockage)
    if file_path.exists():
        file_path.unlink()
    db.delete(photo)
    write_audit_event(
        db,
        actor=current_user.username,
        action="inspection_photo.delete",
        target=photo_id,
        details=f"inspection={inspection_id}; file={photo.nom_fichier}",
    )
    db.commit()
    return FastAPIResponse(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/inspections/validate-location", summary="Valider la geolocalisation d'un inspecteur")
async def validate_inspection_location(
    data: dict,
    current_user: User = Depends(require_roles(Role.inspecteur, Role.admin)),
    db: Session = Depends(get_db),
):
    """Validate that the inspector is within range of the operator's registered location."""
    lat = data.get("latitude")
    lng = data.get("longitude")
    operateur_id = data.get("operateur_id")
    max_distance_km = data.get("max_distance_km", 5.0)

    if lat is None or lng is None or not operateur_id:
        raise HTTPException(400, "latitude, longitude et operateur_id requis.")

    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(404, "Operateur introuvable.")

    # Get operator coordinates (from province centroids or stored coords)
    op_lat = getattr(op, "latitude", None)
    op_lng = getattr(op, "longitude", None)

    PROVINCE_COORDS = {
        "estuaire": (0.4, 9.45),
        "haut_ogooue": (-1.6, 13.95),
        "moyen_ogooue": (-0.45, 10.75),
        "ngounie": (-1.5, 11.4),
        "nyanga": (-2.85, 11.15),
        "ogooue_ivindo": (0.8, 12.0),
        "ogooue_lolo": (-0.85, 12.65),
        "ogooue_maritime": (-1.6, 9.7),
        "woleu_ntem": (2.15, 11.75),
    }

    if not op_lat or not op_lng:
        coords = PROVINCE_COORDS.get(op.province, (0.0, 11.0))
        op_lat, op_lng = coords

    # Haversine distance
    R = 6371  # km
    dlat = math.radians(op_lat - lat)
    dlng = math.radians(op_lng - lng)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(op_lat)) * math.sin(dlng / 2) ** 2
    distance = R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    within_range = distance <= max_distance_km

    return {
        "within_range": within_range,
        "distance_km": round(distance, 2),
        "max_distance_km": max_distance_km,
        "inspector_location": {"lat": lat, "lng": lng},
        "operator_location": {"lat": op_lat, "lng": op_lng},
        "operator": op.raison_sociale,
        "message": "Localisation validee."
        if within_range
        else f"Vous etes a {distance:.1f}km du site. Maximum autorise: {max_distance_km}km.",
    }

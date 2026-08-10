"""PNPI · Observatoire National de l'Industrie (ONI)."""

from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import PRIVILEGED_ROLES, Role, User, require_roles
from ..core.auth import user_role_values as _role_values
from ..database import get_db, now_utc
from ..models.pnpi import ONIAlertORM, ONIPeriodicDeclarationORM, OperateurIndustrielORM

router = APIRouter(prefix="/pnpi/oni", tags=["ONI"])


class ONIDeclarationPayload(BaseModel):
    operateur_id: str
    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    period_type: str = "mensuel"
    secteur: str | None = None
    production_volume: float = 0
    production_unit: str = "tonnes"
    capacity_installed: float = 0
    capacity_used: float = 0
    downtime_hours: float = 0
    jobs_total: int = 0
    jobs_created: int = 0
    jobs_lost: int = 0
    jobs_women: int = 0
    jobs_youth: int = 0
    investment_fcfa: int = 0
    exports_value_fcfa: int = 0
    imports_value_fcfa: int = 0
    local_raw_material_pct: float = 0
    imported_raw_material_pct: float = 0
    energy_kwh: float = 0
    stock_raw_material: float = 0
    stock_finished_goods: float = 0
    average_price_fcfa: float | None = None


class ONIValidationPayload(BaseModel):
    status: str = Field(..., pattern="^(validee|rejetee|a_corriger)$")
    note: str | None = None


def _is_privileged(user: User) -> bool:
    return bool(_role_values(user) & PRIVILEGED_ROLES)


def _operator_owned_by_user(operateur: OperateurIndustrielORM, user: User) -> bool:
    return (operateur.created_by or "").lower() == user.username.lower()


def _check_operator_scope(operateur: OperateurIndustrielORM, user: User) -> None:
    if _is_privileged(user):
        return
    if _operator_owned_by_user(operateur, user):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acces refuse: cet operateur ne fait pas partie de votre perimetre.",
    )


def _safe_json_list(value: str | None) -> list[dict]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _pct(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def _clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))


def _declaration_to_dict(row: ONIPeriodicDeclarationORM) -> dict:
    op = row.operateur
    utilization = _pct(row.capacity_used, row.capacity_installed)
    return {
        "id": row.id,
        "operateur_id": row.operateur_id,
        "operateur_nom": op.raison_sociale if op else row.operateur_id,
        "province": op.province if op else None,
        "ville": op.ville if op else None,
        "period_type": row.period_type,
        "period": row.period,
        "secteur": row.secteur,
        "production_volume": row.production_volume,
        "production_unit": row.production_unit,
        "capacity_installed": row.capacity_installed,
        "capacity_used": row.capacity_used,
        "capacity_utilization_pct": utilization,
        "downtime_hours": row.downtime_hours,
        "jobs_total": row.jobs_total,
        "jobs_created": row.jobs_created,
        "jobs_lost": row.jobs_lost,
        "jobs_women": row.jobs_women,
        "jobs_youth": row.jobs_youth,
        "investment_fcfa": row.investment_fcfa,
        "exports_value_fcfa": row.exports_value_fcfa,
        "imports_value_fcfa": row.imports_value_fcfa,
        "trade_balance_fcfa": row.exports_value_fcfa - row.imports_value_fcfa,
        "local_raw_material_pct": row.local_raw_material_pct,
        "imported_raw_material_pct": row.imported_raw_material_pct,
        "energy_kwh": row.energy_kwh,
        "stock_raw_material": row.stock_raw_material,
        "stock_finished_goods": row.stock_finished_goods,
        "average_price_fcfa": row.average_price_fcfa,
        "status": row.status,
        "anomaly_flags": _safe_json_list(row.anomaly_flags),
        "ai_summary": row.ai_summary,
        "submitted_by": row.submitted_by,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "validated_by": row.validated_by,
        "validated_at": row.validated_at.isoformat() if row.validated_at else None,
    }


def _alert_to_dict(row: ONIAlertORM) -> dict:
    return {
        "id": row.id,
        "declaration_id": row.declaration_id,
        "operateur_id": row.operateur_id,
        "severity": row.severity,
        "alert_type": row.alert_type,
        "title": row.title,
        "message": row.message,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "resolved_by": row.resolved_by,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
    }


def _detect_anomalies(row: ONIPeriodicDeclarationORM, previous: ONIPeriodicDeclarationORM | None) -> list[dict]:
    flags: list[dict] = []
    utilization = _pct(row.capacity_used, row.capacity_installed)
    if row.capacity_installed > 0 and row.capacity_used > row.capacity_installed:
        flags.append(
            {
                "type": "capacity_overrun",
                "severity": "critique",
                "label": "Capacite utilisee superieure a la capacite installee",
            }
        )
    if row.capacity_installed > 0 and utilization < 40:
        flags.append(
            {
                "type": "low_utilization",
                "severity": "moyenne",
                "label": f"Taux d'utilisation faible ({utilization}%).",
            }
        )
    if row.imported_raw_material_pct > 70:
        flags.append(
            {
                "type": "import_dependency",
                "severity": "moyenne",
                "label": "Dependance elevee aux matieres premieres importees.",
            }
        )
    if row.jobs_lost > row.jobs_created and row.jobs_lost > 0:
        flags.append(
            {
                "type": "employment_drop",
                "severity": "haute",
                "label": "Pertes d'emplois superieures aux emplois crees.",
            }
        )
    if row.production_volume > 0:
        energy_intensity = row.energy_kwh / row.production_volume
        if energy_intensity > 500:
            flags.append(
                {
                    "type": "energy_intensity",
                    "severity": "moyenne",
                    "label": "Consommation energetique atypiquement elevee par unite produite.",
                }
            )
    if previous and previous.production_volume > 0:
        variation = ((row.production_volume - previous.production_volume) / previous.production_volume) * 100
        if variation <= -30:
            flags.append(
                {
                    "type": "production_drop",
                    "severity": "haute",
                    "label": f"Baisse de production de {abs(round(variation, 1))}% vs periode precedente.",
                }
            )
    return flags


def _ai_summary(row: ONIPeriodicDeclarationORM, flags: list[dict]) -> str:
    utilization = _pct(row.capacity_used, row.capacity_installed)
    risk = "sous surveillance" if flags else "stable"
    return (
        f"Declaration {row.period} du secteur {row.secteur}: production {row.production_volume:g} "
        f"{row.production_unit}, utilisation capacitaire {utilization}%, emplois {row.jobs_total}. "
        f"Lecture ONI: profil {risk} avec {len(flags)} alerte(s) de coherence."
    )


def _create_alerts(db: Session, row: ONIPeriodicDeclarationORM, flags: list[dict]) -> None:
    for flag in flags:
        existing = db.execute(
            select(ONIAlertORM).where(
                ONIAlertORM.declaration_id == row.id,
                ONIAlertORM.alert_type == flag["type"],
            )
        ).scalar_one_or_none()
        if existing:
            continue
        db.add(
            ONIAlertORM(
                id=f"ONIA-{uuid.uuid4().hex[:10].upper()}",
                declaration_id=row.id,
                operateur_id=row.operateur_id,
                severity=flag["severity"],
                alert_type=flag["type"],
                title=flag["label"],
                message=f"{row.operateur.raison_sociale if row.operateur else row.operateur_id} · periode {row.period}",
                status="ouverte",
                created_at=now_utc(),
            )
        )


def _inpi_for_row(row: ONIPeriodicDeclarationORM, compliance_score: float = 80) -> dict:
    utilization = _pct(row.capacity_used, row.capacity_installed)
    production_score = _clamp(utilization)
    employment_score = _clamp(55 + row.jobs_created * 4 - row.jobs_lost * 7)
    investment_score = _clamp(row.investment_fcfa / 10_000_000)
    local_score = _clamp(row.local_raw_material_pct)
    trade_score = _clamp(55 + ((row.exports_value_fcfa - row.imports_value_fcfa) / 20_000_000))
    score = round(
        production_score * 0.28
        + employment_score * 0.20
        + investment_score * 0.18
        + compliance_score * 0.14
        + local_score * 0.10
        + trade_score * 0.10,
        1,
    )
    return {
        "score": score,
        "breakdown": {
            "production": round(production_score, 1),
            "emploi": round(employment_score, 1),
            "investissement": round(investment_score, 1),
            "conformite": round(compliance_score, 1),
            "intrants_locaux": round(local_score, 1),
            "balance_commerciale": round(trade_score, 1),
        },
    }


def _visible_declarations_query(user: User):
    query = select(ONIPeriodicDeclarationORM)
    if not _is_privileged(user):
        query = query.where(ONIPeriodicDeclarationORM.submitted_by == user.username)
    return query


def _latest_by_operator(rows: list[ONIPeriodicDeclarationORM]) -> list[ONIPeriodicDeclarationORM]:
    latest: dict[str, ONIPeriodicDeclarationORM] = {}
    for row in sorted(rows, key=lambda item: item.period, reverse=True):
        latest.setdefault(row.operateur_id, row)
    return list(latest.values())


def _aggregate_indicators(rows: list[ONIPeriodicDeclarationORM]) -> dict:
    by_sector: dict[str, dict] = defaultdict(
        lambda: {"production": 0.0, "emplois": 0, "investissement_fcfa": 0, "declarations": 0}
    )
    by_province: dict[str, dict] = defaultdict(
        lambda: {"production": 0.0, "emplois": 0, "investissement_fcfa": 0, "declarations": 0}
    )
    by_period: dict[str, dict] = defaultdict(
        lambda: {"production": 0.0, "emplois": 0, "investissement_fcfa": 0, "declarations": 0}
    )
    utilizations = []
    local_rates = []
    for row in rows:
        province = row.operateur.province if row.operateur else "inconnu"
        for bucket, key in ((by_sector, row.secteur), (by_province, province), (by_period, row.period)):
            bucket[key]["production"] += row.production_volume
            bucket[key]["emplois"] += row.jobs_total
            bucket[key]["investissement_fcfa"] += row.investment_fcfa
            bucket[key]["declarations"] += 1
        if row.capacity_installed > 0:
            utilizations.append(_pct(row.capacity_used, row.capacity_installed))
        local_rates.append(row.local_raw_material_pct)

    return {
        "declarations_total": len(rows),
        "production_total": round(sum(row.production_volume for row in rows), 2),
        "jobs_total": sum(row.jobs_total for row in rows),
        "jobs_created": sum(row.jobs_created for row in rows),
        "jobs_lost": sum(row.jobs_lost for row in rows),
        "investment_fcfa": sum(row.investment_fcfa for row in rows),
        "exports_value_fcfa": sum(row.exports_value_fcfa for row in rows),
        "imports_value_fcfa": sum(row.imports_value_fcfa for row in rows),
        "trade_balance_fcfa": sum(row.exports_value_fcfa - row.imports_value_fcfa for row in rows),
        "energy_kwh": round(sum(row.energy_kwh for row in rows), 2),
        "stock_raw_material": round(sum(row.stock_raw_material for row in rows), 2),
        "stock_finished_goods": round(sum(row.stock_finished_goods for row in rows), 2),
        "capacity_utilization_avg": round(mean(utilizations), 1) if utilizations else 0,
        "local_raw_material_pct_avg": round(mean(local_rates), 1) if local_rates else 0,
        "by_sector": dict(by_sector),
        "by_province": dict(by_province),
        "by_period": dict(sorted(by_period.items())),
    }


@router.get("/declarations", summary="Lister les declarations periodiques ONI")
async def list_oni_declarations(
    period: str | None = Query(default=None),
    secteur: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=100, le=500),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
):
    query = _visible_declarations_query(current_user)
    if period:
        query = query.where(ONIPeriodicDeclarationORM.period == period)
    if secteur:
        query = query.where(ONIPeriodicDeclarationORM.secteur == secteur.strip().lower())
    if status_filter:
        query = query.where(ONIPeriodicDeclarationORM.status == status_filter.strip().lower())
    rows = db.execute(query.order_by(ONIPeriodicDeclarationORM.period.desc()).limit(limit)).scalars().all()
    return [_declaration_to_dict(row) for row in rows]


@router.post("/declarations", status_code=status.HTTP_201_CREATED, summary="Soumettre une declaration ONI")
async def create_oni_declaration(
    payload: ONIDeclarationPayload,
    current_user: User = Depends(
        require_roles(Role.admin, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
):
    operateur = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not operateur:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    _check_operator_scope(operateur, current_user)

    previous = db.execute(
        select(ONIPeriodicDeclarationORM)
        .where(
            ONIPeriodicDeclarationORM.operateur_id == payload.operateur_id,
            ONIPeriodicDeclarationORM.period < payload.period,
        )
        .order_by(ONIPeriodicDeclarationORM.period.desc())
    ).scalar_one_or_none()
    row = ONIPeriodicDeclarationORM(
        id=f"ONID-{uuid.uuid4().hex[:10].upper()}",
        operateur_id=payload.operateur_id,
        period_type=payload.period_type.strip().lower() or "mensuel",
        period=payload.period,
        secteur=(payload.secteur or operateur.secteur).strip().lower(),
        production_volume=payload.production_volume,
        production_unit=payload.production_unit.strip() or "tonnes",
        capacity_installed=payload.capacity_installed,
        capacity_used=payload.capacity_used,
        downtime_hours=payload.downtime_hours,
        jobs_total=payload.jobs_total,
        jobs_created=payload.jobs_created,
        jobs_lost=payload.jobs_lost,
        jobs_women=payload.jobs_women,
        jobs_youth=payload.jobs_youth,
        investment_fcfa=payload.investment_fcfa,
        exports_value_fcfa=payload.exports_value_fcfa,
        imports_value_fcfa=payload.imports_value_fcfa,
        local_raw_material_pct=payload.local_raw_material_pct,
        imported_raw_material_pct=payload.imported_raw_material_pct,
        energy_kwh=payload.energy_kwh,
        stock_raw_material=payload.stock_raw_material,
        stock_finished_goods=payload.stock_finished_goods,
        average_price_fcfa=payload.average_price_fcfa,
        status="soumise",
        submitted_by=current_user.username,
        submitted_at=now_utc(),
    )
    flags = _detect_anomalies(row, previous)
    row.anomaly_flags = json.dumps(flags, ensure_ascii=False)
    row.ai_summary = _ai_summary(row, flags)
    db.add(row)
    db.flush()
    _create_alerts(db, row, flags)
    write_audit_event(
        db, actor=current_user.username, action="oni.declaration.create", target=row.id, details=row.period
    )
    db.commit()
    db.refresh(row)
    return _declaration_to_dict(row)


@router.patch("/declarations/{declaration_id}/validate", summary="Valider ou retourner une declaration ONI")
async def validate_oni_declaration(
    declaration_id: str,
    payload: ONIValidationPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    row = db.get(ONIPeriodicDeclarationORM, declaration_id)
    if not row:
        raise HTTPException(status_code=404, detail="Declaration introuvable.")
    row.status = payload.status
    row.validated_by = current_user.username
    row.validated_at = now_utc()
    write_audit_event(
        db,
        actor=current_user.username,
        action="oni.declaration.validate",
        target=row.id,
        details=f"{payload.status}; {payload.note or ''}",
    )
    db.commit()
    db.refresh(row)
    return _declaration_to_dict(row)


@router.get("/alerts", summary="Alertes ONI issues des controles automatiques")
async def list_oni_alerts(
    status_filter: str | None = Query(default="ouverte", alias="status"),
    severity: str | None = Query(default=None),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
):
    query = select(ONIAlertORM)
    if not _is_privileged(current_user):
        declarations = (
            db.execute(
                select(ONIPeriodicDeclarationORM.id).where(
                    ONIPeriodicDeclarationORM.submitted_by == current_user.username
                )
            )
            .scalars()
            .all()
        )
        query = query.where(ONIAlertORM.declaration_id.in_(declarations or ["__none__"]))
    if status_filter:
        query = query.where(ONIAlertORM.status == status_filter.strip().lower())
    if severity:
        query = query.where(ONIAlertORM.severity == severity.strip().lower())
    rows = db.execute(query.order_by(ONIAlertORM.created_at.desc()).limit(100)).scalars().all()
    return [_alert_to_dict(row) for row in rows]


@router.post("/alerts/{alert_id}/resolve", summary="Cloturer une alerte ONI")
async def resolve_oni_alert(
    alert_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    alert = db.get(ONIAlertORM, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable.")
    alert.status = "resolue"
    alert.resolved_by = current_user.username
    alert.resolved_at = now_utc()
    write_audit_event(
        db, actor=current_user.username, action="oni.alert.resolve", target=alert.id, details=alert.alert_type
    )
    db.commit()
    db.refresh(alert)
    return _alert_to_dict(alert)


@router.get("/indicators", summary="Consolidation nationale ONI")
async def oni_indicators(
    period: str | None = Query(default=None),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    query = select(ONIPeriodicDeclarationORM)
    if period:
        query = query.where(ONIPeriodicDeclarationORM.period == period)
    rows = db.execute(query).scalars().all()
    return {"generated_at": now_utc().isoformat(), **_aggregate_indicators(rows)}


@router.get("/inpi", summary="Indice National de Performance Industrielle")
async def oni_inpi(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    latest_rows = _latest_by_operator(rows)
    operators = []
    by_sector: dict[str, list[float]] = defaultdict(list)
    by_province: dict[str, list[float]] = defaultdict(list)
    for row in latest_rows:
        scored = _inpi_for_row(row)
        province = row.operateur.province if row.operateur else "inconnu"
        operators.append(
            {
                "operateur_id": row.operateur_id,
                "operateur": row.operateur.raison_sociale if row.operateur else row.operateur_id,
                "secteur": row.secteur,
                "province": province,
                "period": row.period,
                **scored,
            }
        )
        by_sector[row.secteur].append(scored["score"])
        by_province[province].append(scored["score"])
    national = round(mean([item["score"] for item in operators]), 1) if operators else 0
    return {
        "generated_at": now_utc().isoformat(),
        "inpi_national": national,
        "operators": sorted(operators, key=lambda item: item["score"], reverse=True),
        "by_sector": {key: round(mean(values), 1) for key, values in by_sector.items()},
        "by_province": {key: round(mean(values), 1) for key, values in by_province.items()},
        "methodology": {
            "production": 28,
            "emploi": 20,
            "investissement": 18,
            "conformite": 14,
            "intrants_locaux": 10,
            "balance_commerciale": 10,
        },
    }


@router.get("/cockpit", summary="Centre National de Pilotage Industriel")
async def oni_cockpit(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    indicators = _aggregate_indicators(rows)
    alerts = (
        db.execute(select(ONIAlertORM).where(ONIAlertORM.status == "ouverte").order_by(ONIAlertORM.created_at.desc()))
        .scalars()
        .all()
    )
    latest_rows = _latest_by_operator(rows)
    inpi_scores = [_inpi_for_row(row)["score"] for row in latest_rows]
    inpi = round(mean(inpi_scores), 1) if inpi_scores else 0
    narrative = (
        "L'ONI ne dispose pas encore de declarations consolidees."
        if not rows
        else (
            f"Le tissu industriel declare {indicators['production_total']:g} tonnes, "
            f"{indicators['jobs_total']} emplois et {indicators['investment_fcfa']:,} FCFA d'investissements. "
            f"INPI national: {inpi}/100, avec {len(alerts)} alerte(s) ouverte(s)."
        )
    )
    return {
        "generated_at": now_utc().isoformat(),
        "national_control_center": {
            "status": "prototype operationnel",
            "narrative": narrative,
            "priorities": [
                "fiabiliser les declarations mensuelles",
                "reduire les anomalies de coherence",
                "suivre les secteurs a faible utilisation capacitaire",
            ],
        },
        "indicators": indicators,
        "inpi_national": inpi,
        "alerts": [_alert_to_dict(alert) for alert in alerts[:10]],
        "latest_declarations": [_declaration_to_dict(row) for row in latest_rows[:10]],
    }


@router.get("/reports/{kind}", summary="Rapport ONI structure")
async def oni_report(
    kind: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    indicators = _aggregate_indicators(rows)
    inpi_scores = [_inpi_for_row(row)["score"] for row in _latest_by_operator(rows)]
    return {
        "kind": kind,
        "title": f"Rapport ONI {kind}",
        "generated_at": now_utc().isoformat(),
        "period_covered": sorted({row.period for row in rows}),
        "summary": {
            "production_total": indicators["production_total"],
            "emplois_total": indicators["jobs_total"],
            "investissements_fcfa": indicators["investment_fcfa"],
            "inpi_national": round(mean(inpi_scores), 1) if inpi_scores else 0,
        },
        "sections": [
            {"title": "Production industrielle", "data": indicators["by_sector"]},
            {"title": "Repartition territoriale", "data": indicators["by_province"]},
            {"title": "Tendances mensuelles", "data": indicators["by_period"]},
        ],
    }


@router.get("/open-data", summary="Jeu de donnees ouvert ONI agrege")
async def oni_open_data(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    rows = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    return {
        "license": "Donnees agregees non confidentielles - PNPI/ONI",
        "generated_at": datetime.utcnow().isoformat(),
        "dataset": _aggregate_indicators(rows)["by_sector"],
    }

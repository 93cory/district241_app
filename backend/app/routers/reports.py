"""PNPI — Constructeur de rapports personnalises."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..core.auth import User, require_roles, Role
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/builder")
async def build_report(
    metric: str = Query(..., description="atis|inspections|operateurs"),
    group_by: str = Query("secteur", description="secteur|province|mois|statut"),
    date_start: Optional[str] = Query(None),
    date_end: Optional[str] = Query(None),
    secteur: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Dynamic report builder — aggregate any metric by any dimension."""

    now = datetime.now(timezone.utc)
    start = datetime.fromisoformat(date_start).replace(tzinfo=timezone.utc) if date_start else now - timedelta(days=365)
    end = datetime.fromisoformat(date_end).replace(tzinfo=timezone.utc) if date_end else now

    if metric == "atis":
        return _report_atis(db, group_by, start, end, secteur, province)
    elif metric == "inspections":
        return _report_inspections(db, group_by, start, end, secteur, province)
    elif metric == "operateurs":
        return _report_operateurs(db, group_by, secteur, province)
    else:
        return {"error": f"Metric inconnue: {metric}. Utilisez: atis, inspections, operateurs"}


def _report_atis(db, group_by, start, end, secteur, province):
    query = select(AgrementTechniqueIndustrielORM).where(
        AgrementTechniqueIndustrielORM.date_soumission.between(start, end)
    )
    if secteur:
        query = query.where(AgrementTechniqueIndustrielORM.secteur == secteur)

    atis = db.execute(query).scalars().all()

    if province:
        atis = [a for a in atis if a.operateur and a.operateur.province == province]

    groups = {}
    for ati in atis:
        if group_by == "secteur":
            key = ati.secteur
        elif group_by == "province":
            key = ati.operateur.province if ati.operateur else "inconnu"
        elif group_by == "mois":
            key = ati.date_soumission.strftime("%Y-%m")
        elif group_by == "statut":
            key = ati.statut
        else:
            key = "total"

        if key not in groups:
            groups[key] = {"total": 0, "approuves": 0, "rejetes": 0, "en_cours": 0}
        groups[key]["total"] += 1
        if ati.statut == "approuve":
            groups[key]["approuves"] += 1
        elif ati.statut == "rejete":
            groups[key]["rejetes"] += 1
        else:
            groups[key]["en_cours"] += 1

    return {
        "metric": "atis",
        "group_by": group_by,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "total": len(atis),
        "data": [{"group": k, **v} for k, v in sorted(groups.items())],
    }


def _report_inspections(db, group_by, start, end, secteur, province):
    query = select(InspectionConformiteORM).where(
        InspectionConformiteORM.date_inspection.between(start, end)
    )

    inspections = db.execute(query).scalars().all()

    if secteur:
        inspections = [i for i in inspections if i.operateur and i.operateur.secteur == secteur]
    if province:
        inspections = [i for i in inspections if i.operateur and i.operateur.province == province]

    groups = {}
    for insp in inspections:
        if group_by == "secteur":
            key = insp.operateur.secteur if insp.operateur else "inconnu"
        elif group_by == "province":
            key = insp.operateur.province if insp.operateur else "inconnu"
        elif group_by == "mois":
            key = insp.date_inspection.strftime("%Y-%m")
        elif group_by == "statut":
            key = insp.statut_conformite
        else:
            key = "total"

        if key not in groups:
            groups[key] = {"total": 0, "conforme": 0, "non_conforme": 0, "partiel": 0}
        groups[key]["total"] += 1
        if insp.statut_conformite == "conforme":
            groups[key]["conforme"] += 1
        elif insp.statut_conformite == "non_conforme":
            groups[key]["non_conforme"] += 1
        else:
            groups[key]["partiel"] += 1

    return {
        "metric": "inspections",
        "group_by": group_by,
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "total": len(inspections),
        "data": [{"group": k, **v} for k, v in sorted(groups.items())],
    }


def _report_operateurs(db, group_by, secteur, province):
    query = select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))
    if secteur:
        query = query.where(OperateurIndustrielORM.secteur == secteur)
    if province:
        query = query.where(OperateurIndustrielORM.province == province)

    ops = db.execute(query).scalars().all()

    groups = {}
    for op in ops:
        key = getattr(op, group_by, "autre") if group_by in ("secteur", "province") else "total"
        groups[key] = groups.get(key, 0) + 1

    return {
        "metric": "operateurs",
        "group_by": group_by,
        "total": len(ops),
        "data": [{"group": k, "count": v} for k, v in sorted(groups.items(), key=lambda x: -x[1])],
    }

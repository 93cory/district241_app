"""PNPI · API GraphQL (lecture seule, complement du REST).

Utilise une approche legere sans bibliotheque GraphQL lourde.
Parse les requetes simples et retourne les donnees demandees.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import User, get_current_user
from ..database import get_db
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)

router = APIRouter(tags=["GraphQL"])

# Simple field resolvers
RESOLVERS = {
    "atis": lambda db, args: _resolve_atis(db, args),
    "operateurs": lambda db, args: _resolve_operateurs(db, args),
    "inspections": lambda db, args: _resolve_inspections(db, args),
    "kpis": lambda db, args: _resolve_kpis(db),
}


@router.post("/graphql")
async def graphql_endpoint(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lightweight GraphQL-like query endpoint.

    Example body:
    {
        "query": "atis",
        "args": {"secteur": "bois", "limit": 10},
        "fields": ["id", "numero_ati", "statut", "operateur_nom"]
    }
    """
    query_name = data.get("query", "")
    args = data.get("args", {})
    fields = data.get("fields")

    resolver = RESOLVERS.get(query_name)
    if not resolver:
        return {"error": f"Query inconnue: {query_name}", "available": list(RESOLVERS.keys())}

    result = resolver(db, args)

    # Filter fields if specified
    if fields and isinstance(result, list):
        result = [{k: v for k, v in item.items() if k in fields} for item in result]

    return {"data": {query_name: result}}


def _resolve_atis(db: Session, args: dict) -> list[dict]:
    query = select(AgrementTechniqueIndustrielORM)
    if args.get("secteur"):
        query = query.where(AgrementTechniqueIndustrielORM.secteur == args["secteur"])
    if args.get("statut"):
        query = query.where(AgrementTechniqueIndustrielORM.statut == args["statut"])

    limit = min(args.get("limit", 50), 100)
    query = query.order_by(AgrementTechniqueIndustrielORM.date_soumission.desc()).limit(limit)

    atis = db.execute(query).scalars().all()
    return [
        {
            "id": a.id,
            "numero_ati": a.numero_ati,
            "secteur": a.secteur,
            "statut": a.statut,
            "type_activite": a.type_activite,
            "date_soumission": a.date_soumission.isoformat(),
            "sla_jours": a.sla_jours,
            "operateur_nom": a.operateur.raison_sociale if a.operateur else None,
            "operateur_nif": a.operateur.nif if a.operateur else None,
        }
        for a in atis
    ]


def _resolve_operateurs(db: Session, args: dict) -> list[dict]:
    query = select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))
    if args.get("secteur"):
        query = query.where(OperateurIndustrielORM.secteur == args["secteur"])
    if args.get("province"):
        query = query.where(OperateurIndustrielORM.province == args["province"])

    limit = min(args.get("limit", 50), 100)
    ops = db.execute(query.order_by(OperateurIndustrielORM.raison_sociale).limit(limit)).scalars().all()
    return [
        {
            "id": o.id,
            "raison_sociale": o.raison_sociale,
            "nif_gabon": o.nif,
            "secteur": o.secteur,
            "province": o.province,
            "ville": o.ville,
            "email": o.contact_email,
            "telephone": o.contact_telephone,
        }
        for o in ops
    ]


def _resolve_inspections(db: Session, args: dict) -> list[dict]:
    query = select(InspectionConformiteORM)
    if args.get("statut_conformite"):
        query = query.where(InspectionConformiteORM.statut_conformite == args["statut_conformite"])

    limit = min(args.get("limit", 50), 100)
    insps = db.execute(query.order_by(InspectionConformiteORM.date_inspection.desc()).limit(limit)).scalars().all()
    return [
        {
            "id": i.id,
            "statut_conformite": i.statut_conformite,
            "inspecteur": i.inspecteur_username,
            "date_inspection": i.date_inspection.isoformat(),
            "observations": (i.observations or "")[:200],
            "operateur_nom": i.operateur.raison_sociale if i.operateur else None,
        }
        for i in insps
    ]


def _resolve_kpis(db: Session) -> dict:
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    all_ops = (
        db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))).scalars().all()
    )
    all_insp = db.execute(select(InspectionConformiteORM)).scalars().all()
    return {
        "atis_total": len(all_atis),
        "atis_approuves": sum(1 for a in all_atis if a.statut == "approuve"),
        "atis_rejetes": sum(1 for a in all_atis if a.statut == "rejete"),
        "operateurs_actifs": len(all_ops),
        "inspections_total": len(all_insp),
    }

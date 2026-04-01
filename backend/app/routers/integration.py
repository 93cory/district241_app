"""PNPI — API d'integration pour systemes externes.

Endpoints pour:
- Douanes (DGDI): Verification statut ATI d'un operateur
- Impots (DGI): Verification NIF et activites agreees
- Emploi (MTEPS): Liste des operateurs actifs par secteur
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
)

router = APIRouter(prefix="/integration", tags=["Integration"])

# Simple API key auth for external systems
INTEGRATION_API_KEYS = {
    "dgdi": "PNPI_DGDI_KEY",  # Douanes
    "dgi": "PNPI_DGI_KEY",    # Impots
    "mteps": "PNPI_MTEPS_KEY", # Emploi
}

import os
import secrets

async def verify_api_key(x_api_key: str = Header(...), x_system_id: str = Header(...)):
    """Verify external system API key."""
    expected_env = INTEGRATION_API_KEYS.get(x_system_id.lower())
    if not expected_env:
        raise HTTPException(status_code=403, detail="Systeme non reconnu.")

    expected_key = os.environ.get(expected_env, "")
    if not expected_key or not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=403, detail="Cle API invalide.")

    return x_system_id.lower()


@router.get("/verify-operateur/{nif}")
async def verify_operateur_by_nif(
    nif: str,
    system_id: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Verify an operator by NIF. Used by customs and tax systems."""
    op = db.execute(
        select(OperateurIndustrielORM).where(OperateurIndustrielORM.nif_gabon == nif)
    ).scalar_one_or_none()

    if not op:
        return {"found": False, "nif": nif}

    # Get approved ATIs
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.operateur_id == op.id,
            AgrementTechniqueIndustrielORM.statut == "approuve",
        )
    ).scalars().all()

    now = datetime.now(timezone.utc)
    active_atis = []
    for ati in atis:
        is_expired = ati.date_expiration and ati.date_expiration.date() < now.date()
        if not is_expired:
            active_atis.append({
                "numero_ati": ati.numero_ati,
                "secteur": ati.secteur,
                "type_activite": ati.type_activite,
                "date_approbation": ati.date_decision.isoformat() if ati.date_decision else None,
                "date_expiration": ati.date_expiration.isoformat() if ati.date_expiration else None,
            })

    return {
        "found": True,
        "nif": nif,
        "raison_sociale": op.raison_sociale,
        "province": op.province,
        "is_active": op.is_active,
        "active_atis_count": len(active_atis),
        "active_atis": active_atis,
        "verified_at": now.isoformat(),
    }


@router.get("/operateurs-actifs")
async def list_active_operateurs(
    secteur: Optional[str] = Query(None),
    province: Optional[str] = Query(None),
    system_id: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """List active operators. Used by employment ministry for economic indicators."""
    query = select(OperateurIndustrielORM).where(OperateurIndustrielORM.is_active.is_(True))

    if secteur:
        query = query.where(OperateurIndustrielORM.secteur == secteur.lower())
    if province:
        query = query.where(OperateurIndustrielORM.province == province.lower())

    ops = db.execute(query.order_by(OperateurIndustrielORM.raison_sociale)).scalars().all()

    return {
        "count": len(ops),
        "filters": {"secteur": secteur, "province": province},
        "operateurs": [
            {
                "nif": op.nif_gabon,
                "raison_sociale": op.raison_sociale,
                "secteur": op.secteur,
                "province": op.province,
                "ville": op.ville,
            }
            for op in ops
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/conformite/{nif}")
async def check_conformite(
    nif: str,
    system_id: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Check compliance status for an operator by NIF. Used by all external systems."""
    op = db.execute(
        select(OperateurIndustrielORM).where(OperateurIndustrielORM.nif_gabon == nif)
    ).scalar_one_or_none()

    if not op:
        return {"found": False, "nif": nif}

    # Latest inspection
    latest_insp = db.execute(
        select(InspectionConformiteORM).where(
            InspectionConformiteORM.operateur_id == op.id
        ).order_by(InspectionConformiteORM.date_inspection.desc())
    ).scalars().first()

    # ATI stats
    atis = db.execute(
        select(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.operateur_id == op.id
        )
    ).scalars().all()

    return {
        "found": True,
        "nif": nif,
        "raison_sociale": op.raison_sociale,
        "is_active": op.is_active,
        "derniere_inspection": {
            "date": latest_insp.date_inspection.isoformat() if latest_insp else None,
            "statut": latest_insp.statut_conformite if latest_insp else None,
            "inspecteur": latest_insp.inspecteur_username if latest_insp else None,
        } if latest_insp else None,
        "atis": {
            "total": len(atis),
            "approuves": sum(1 for a in atis if a.statut == "approuve"),
            "rejetes": sum(1 for a in atis if a.statut == "rejete"),
            "en_cours": sum(1 for a in atis if a.statut not in {"approuve", "rejete", "expire"}),
        },
        "verified_at": datetime.now(timezone.utc).isoformat(),
    }

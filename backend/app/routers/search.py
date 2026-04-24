"""PNPI · Endpoint de recherche full-text sur ATI et operateurs."""
from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, select, cast, String

from ..core.auth import Role, User, require_roles
from ..database import get_db
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    OperateurIndustrielORM,
)

router = APIRouter(prefix="/search", tags=["Recherche"])


@router.get("/global")
async def search_global(
    q: str = Query(..., min_length=2, max_length=200, description="Terme de recherche"),
    type: Optional[str] = Query(default=None, description="Filtrer par type: ati, operateur"),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles(
        Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur
    )),
    db: Session = Depends(get_db),
):
    """Recherche full-text sur les ATI et operateurs.

    Recherche dans: numero_ati, type_activite, raison_sociale, nif_gabon, secteur, province.
    """
    term = f"%{q.strip().lower()}%"
    results = []

    if type is None or type == "ati":
        ati_query = (
            select(AgrementTechniqueIndustrielORM)
            .where(
                or_(
                    func.lower(AgrementTechniqueIndustrielORM.numero_ati).like(term),
                    func.lower(AgrementTechniqueIndustrielORM.type_activite).like(term),
                    func.lower(AgrementTechniqueIndustrielORM.secteur).like(term),
                    func.lower(AgrementTechniqueIndustrielORM.statut).like(term),
                    func.lower(AgrementTechniqueIndustrielORM.observations).like(term),
                )
            )
            .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
            .limit(limit)
        )
        atis = db.execute(ati_query).scalars().all()
        for a in atis:
            results.append({
                "type": "ati",
                "id": a.id,
                "title": f"{a.numero_ati} · {a.type_activite}",
                "subtitle": f"{a.secteur} | {a.statut}",
                "url": f"/pnpi/ati/{a.id}",
            })

    if type is None or type == "operateur":
        op_query = (
            select(OperateurIndustrielORM)
            .where(
                or_(
                    func.lower(OperateurIndustrielORM.raison_sociale).like(term),
                    func.lower(OperateurIndustrielORM.nif_gabon).like(term),
                    func.lower(OperateurIndustrielORM.secteur).like(term),
                    func.lower(OperateurIndustrielORM.province).like(term),
                    func.lower(OperateurIndustrielORM.ville).like(term),
                )
            )
            .order_by(OperateurIndustrielORM.raison_sociale)
            .limit(limit)
        )
        ops = db.execute(op_query).scalars().all()
        for op in ops:
            results.append({
                "type": "operateur",
                "id": op.id,
                "title": op.raison_sociale,
                "subtitle": f"{op.secteur} | {op.province} | NIF: {op.nif_gabon}",
                "url": f"/pnpi/operateurs/{op.id}",
            })

    return {"query": q, "count": len(results), "results": results[:limit]}

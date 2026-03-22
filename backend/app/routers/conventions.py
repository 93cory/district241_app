"""PNPI — Gestion des conventions et accords-cadres."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db, now_utc
from ..core.auth import User, get_current_user, require_roles, Role
from ..models.pnpi import ConventionORM

router = APIRouter(prefix="/conventions", tags=["Conventions"])

@router.get("/list")
async def list_conventions(
    statut: str = Query(None),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(ConventionORM).order_by(ConventionORM.date_signature.desc())
    if statut:
        query = query.where(ConventionORM.statut == statut)
    convs = db.execute(query).scalars().all()
    return {"conventions": [{
        "id": c.id, "numero": c.numero, "titre": c.titre,
        "partenaire": c.partenaire, "type_convention": c.type_convention,
        "date_signature": c.date_signature.isoformat(),
        "date_expiration": c.date_expiration.isoformat() if c.date_expiration else None,
        "montant_fcfa": c.montant_fcfa, "statut": c.statut,
    } for c in convs]}

@router.post("/create")
async def create_convention(
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    conv = ConventionORM(
        id=str(uuid.uuid4()),
        numero=data.get("numero", f"CONV-{uuid.uuid4().hex[:6].upper()}"),
        titre=data["titre"],
        partenaire=data["partenaire"],
        type_convention=data.get("type_convention", "accord_cadre"),
        date_signature=datetime.fromisoformat(data["date_signature"]).replace(tzinfo=timezone.utc),
        date_expiration=datetime.fromisoformat(data["date_expiration"]).replace(tzinfo=timezone.utc) if data.get("date_expiration") else None,
        montant_fcfa=data.get("montant_fcfa"),
        description=data.get("description"),
        created_by=current_user.username,
    )
    db.add(conv)
    db.commit()
    return {"status": "ok", "id": conv.id}

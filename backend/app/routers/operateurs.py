"""PNPI — Endpoints de gestion des operateurs industriels."""
from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..core.auth import Role, User, require_roles
from ..core.audit import write_audit_event
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    OperateurIndustrielORM,
)
from ..schemas.pnpi import ATIBrief, OperateurBrief, OperateurCreate, OperateurRead


router = APIRouter(prefix="/pnpi", tags=["Operateurs"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}


def _ati_age_jours(ati: AgrementTechniqueIndustrielORM) -> int:
    return max((now_utc().date() - ati.date_soumission.date()).days, 0)


def _ati_is_overdue(ati: AgrementTechniqueIndustrielORM) -> bool:
    return _ati_age_jours(ati) > ati.sla_jours and ati.statut not in _TERMINAL_STATUTS


def _to_operateur_read(op: OperateurIndustrielORM) -> OperateurRead:
    return OperateurRead(
        id=op.id,
        nif_gabon=op.nif_gabon,
        raison_sociale=op.raison_sociale,
        secteur=op.secteur,
        province=op.province,
        ville=op.ville,
        latitude=op.latitude,
        longitude=op.longitude,
        contact_email=op.contact_email,
        contact_telephone=op.contact_telephone,
        effectif_declare=op.effectif_declare,
        is_active=op.is_active,
        created_at=op.created_at,
        created_by=op.created_by,
    )


def _to_operateur_brief(op: OperateurIndustrielORM) -> OperateurBrief:
    return OperateurBrief(
        id=op.id,
        nif_gabon=op.nif_gabon,
        raison_sociale=op.raison_sociale,
        secteur=op.secteur,
        province=op.province,
        ville=op.ville,
        is_active=op.is_active,
        effectif_declare=op.effectif_declare,
    )


def _to_ati_brief(ati: AgrementTechniqueIndustrielORM) -> ATIBrief:
    return ATIBrief(
        id=ati.id,
        numero_ati=ati.numero_ati,
        type_activite=ati.type_activite,
        statut=ati.statut,
        etape=ati.etape,
        priorite=ati.priorite,
        date_soumission=ati.date_soumission,
        age_jours=_ati_age_jours(ati),
        is_overdue=_ati_is_overdue(ati),
    )


@router.get("/operateurs", response_model=List[OperateurBrief], summary="Lister les operateurs industriels")
async def list_operateurs(
    secteur: Optional[str] = Query(default=None),
    province: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[OperateurBrief]:
    query = select(OperateurIndustrielORM)
    if secteur is not None:
        query = query.where(OperateurIndustrielORM.secteur == secteur)
    if province is not None:
        query = query.where(OperateurIndustrielORM.province == province)
    if is_active is not None:
        query = query.where(OperateurIndustrielORM.is_active.is_(is_active))
    query = query.order_by(OperateurIndustrielORM.raison_sociale)
    ops = db.execute(query).scalars().all()
    return [_to_operateur_brief(op) for op in ops]


@router.post("/operateurs", response_model=OperateurRead, status_code=status.HTTP_201_CREATED,
             summary="Enregistrer un nouvel operateur")
async def create_operateur(
    payload: OperateurCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.instructeur, Role.ministre)),
    db: Session = Depends(get_db),
) -> OperateurRead:
    # Check NIF uniqueness
    existing = db.execute(
        select(OperateurIndustrielORM).where(OperateurIndustrielORM.nif_gabon == payload.nif_gabon)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Un operateur avec ce NIF existe deja.")

    op = OperateurIndustrielORM(
        id=f"OP-{uuid.uuid4().hex[:12].upper()}",
        nif_gabon=payload.nif_gabon.strip(),
        raison_sociale=payload.raison_sociale.strip(),
        secteur=payload.secteur.strip(),
        province=payload.province.strip(),
        ville=payload.ville.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        contact_email=payload.contact_email,
        contact_telephone=payload.contact_telephone,
        effectif_declare=payload.effectif_declare,
        is_active=payload.is_active,
        created_at=now_utc(),
        created_by=current_user.username,
    )
    db.add(op)
    write_audit_event(
        db,
        actor=current_user.username,
        action="operateur.create",
        target=op.id,
        details=f"nif={payload.nif_gabon}; raison={payload.raison_sociale}; secteur={payload.secteur}; province={payload.province}",
    )
    db.commit()
    db.refresh(op)
    return _to_operateur_read(op)


@router.get("/operateurs/{operateur_id}", response_model=OperateurRead, summary="Detail d'un operateur")
async def get_operateur(
    operateur_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> OperateurRead:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    return _to_operateur_read(op)


@router.get("/operateurs/{operateur_id}/ati", response_model=List[ATIBrief], summary="ATI d'un operateur")
async def list_operateur_atis(
    operateur_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> List[ATIBrief]:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")

    atis = db.execute(
        select(AgrementTechniqueIndustrielORM)
        .where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
        .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
    ).scalars().all()
    return [_to_ati_brief(a) for a in atis]


@router.post("/operateurs/{operateur_id}/toggle-active", response_model=OperateurRead,
             summary="Activer ou desactiver un operateur")
async def toggle_operateur_active(
    operateur_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> OperateurRead:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    op.is_active = not op.is_active
    write_audit_event(
        db,
        actor=current_user.username,
        action="operateur.toggle_active",
        target=op.id,
        details=f"is_active={op.is_active}",
    )
    db.commit()
    db.refresh(op)
    return _to_operateur_read(op)

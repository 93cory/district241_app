"""Recours administratif apres rejet d'ATI.

Procedure : un operateur dont l'ATI a ete rejete peut deposer un recours
dans un delai de 30 jours. Le recours est examine par le Directeur (ou
ministre selon le cas), qui peut soit confirmer le rejet, soit ordonner
la reouverture de l'instruction.
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, get_current_user, require_roles
from ..database import as_utc, get_db, now_utc
from ..models.core import UserAccountORM
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    ATIAppealORM,
    ATITransitionORM,
)
from .ati import check_ati_access

router = APIRouter(prefix="/pnpi/ati", tags=["ATI · Recours"])


APPEAL_DEADLINE_DAYS = 30


class AppealCreate(BaseModel):
    motif: str = Field(..., min_length=20, max_length=2000)
    pieces_complementaires: list[str] | None = Field(None, max_length=20)


class AppealDecision(BaseModel):
    decision: str = Field(..., pattern="^(accepte|rejete)$")
    motif: str = Field(..., min_length=10, max_length=2000)


@router.post("/{ati_id}/appeals", summary="Deposer un recours apres rejet d'ATI")
def create_appeal(
    ati_id: str,
    payload: AppealCreate,
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> dict[str, Any]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    check_ati_access(ati, current_user)

    if ati.statut != "rejete":
        raise HTTPException(400, "Le recours n'est possible que sur un ATI rejete.")

    # Delai de recours : 30 jours apres date_decision
    if ati.date_decision:
        deadline = as_utc(ati.date_decision) + timedelta(days=APPEAL_DEADLINE_DAYS)
        if now_utc() > deadline:
            raise HTTPException(
                400,
                f"Delai de recours depasse ({APPEAL_DEADLINE_DAYS} jours apres la decision).",
            )

    # Un seul recours actif par ATI a la fois
    existing = db.execute(
        select(ATIAppealORM).where(
            ATIAppealORM.ati_id == ati_id,
            ATIAppealORM.statut == "en_examen",
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "Un recours est deja en cours d'examen pour cet ATI.")

    appeal = ATIAppealORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        motif=payload.motif,
        pieces_complementaires=",".join(payload.pieces_complementaires or []),
        deposed_by=current_user.username,
        deposed_at=now_utc(),
        statut="en_examen",
    )
    db.add(appeal)
    db.commit()

    write_audit_event(
        db,
        actor=current_user.username,
        action="appeal.created",
        target=ati_id,
        details=f"appeal_id={appeal.id}; motif={payload.motif[:200]}",
    )

    return {"id": appeal.id, "statut": appeal.statut, "deposed_at": appeal.deposed_at.isoformat()}


@router.get("/{ati_id}/appeals", summary="Liste les recours pour un ATI")
def list_appeals(
    ati_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccountORM = Depends(get_current_user),
) -> list[dict[str, Any]]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    check_ati_access(ati, current_user)

    appeals = (
        db.execute(select(ATIAppealORM).where(ATIAppealORM.ati_id == ati_id).order_by(ATIAppealORM.deposed_at.desc()))
        .scalars()
        .all()
    )
    return [
        {
            "id": a.id,
            "ati_id": a.ati_id,
            "statut": a.statut,
            "motif": a.motif,
            "deposed_by": a.deposed_by,
            "deposed_at": a.deposed_at.isoformat() if a.deposed_at else None,
            "decision_motif": a.decision_motif,
            "decided_by": a.decided_by,
            "decided_at": a.decided_at.isoformat() if a.decided_at else None,
        }
        for a in appeals
    ]


@router.post(
    "/{ati_id}/appeals/{appeal_id}/decide",
    summary="Decider d'un recours (Directeur ou Ministre)",
)
def decide_appeal(
    ati_id: str,
    appeal_id: str,
    payload: AppealDecision,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(Role.directeur, Role.ministre, Role.admin)),
    current_user: UserAccountORM = Depends(get_current_user),
) -> dict[str, Any]:
    appeal = db.get(ATIAppealORM, appeal_id)
    if not appeal or appeal.ati_id != ati_id:
        raise HTTPException(404, "Recours introuvable.")
    if appeal.statut != "en_examen":
        raise HTTPException(400, "Ce recours a deja ete examine.")

    appeal.statut = payload.decision
    appeal.decision_motif = payload.motif
    appeal.decided_by = current_user.username
    appeal.decided_at = now_utc()

    # Si recours accepte : remettre l'ATI en instruction
    if payload.decision == "accepte":
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if ati:
            previous_statut = ati.statut
            ati.statut = "en_instruction"
            ati.etape = "reception"
            ati.motif_rejet = None
            ati.updated_at = now_utc()
            db.add(
                ATITransitionORM(
                    id=str(uuid.uuid4()),
                    ati_id=ati_id,
                    changed_by=current_user.username,
                    previous_statut=previous_statut,
                    new_statut="en_instruction",
                    note=f"Reouvert suite a recours accepte : {payload.motif[:200]}",
                    changed_at=now_utc(),
                )
            )

    db.commit()

    write_audit_event(
        db,
        actor=current_user.username,
        action=f"appeal.{payload.decision}",
        target=appeal_id,
        details=f"ati_id={ati_id}; motif={payload.motif[:200]}",
    )

    return {
        "id": appeal.id,
        "statut": appeal.statut,
        "decided_at": appeal.decided_at.isoformat(),
    }

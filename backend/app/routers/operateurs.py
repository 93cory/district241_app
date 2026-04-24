"""PNPI · Endpoints de gestion des operateurs industriels."""

from __future__ import annotations

import csv
import io
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, get_current_user, require_roles
from ..core.pagination import PaginatedResponse, PaginationParams
from ..core.scoring import compute_all_scores, compute_operator_score
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
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


@router.post("/operateurs/import-csv", summary="Import en masse d'operateurs depuis un fichier CSV")
async def import_operateurs_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Import operators from CSV file.

    Expected columns: raison_sociale, nif_gabon, secteur, province, ville, email, telephone
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Fichier CSV requis.")

    content = await file.read()
    text = content.decode("utf-8-sig")  # Handle BOM
    reader = csv.DictReader(io.StringIO(text), delimiter=";")

    required = {"raison_sociale", "nif_gabon", "secteur", "province"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(
            status_code=400,
            detail=f"Colonnes requises: {', '.join(sorted(required))}. "
            f"Colonnes trouvees: {', '.join(reader.fieldnames or [])}",
        )

    created = 0
    skipped = 0
    errors: list[str] = []

    try:
        for i, row in enumerate(reader, start=2):
            raison = (row.get("raison_sociale") or "").strip()
            nif = (row.get("nif_gabon") or "").strip()

            if not raison or not nif:
                errors.append(f"Ligne {i}: raison_sociale ou nif_gabon manquant")
                skipped += 1
                continue

            # Check duplicate NIF
            existing = db.execute(
                select(OperateurIndustrielORM).where(OperateurIndustrielORM.nif_gabon == nif)
            ).scalar_one_or_none()

            if existing:
                skipped += 1
                continue

            op = OperateurIndustrielORM(
                id=f"OP-{uuid.uuid4().hex[:12].upper()}",
                nif_gabon=nif,
                raison_sociale=raison,
                secteur=(row.get("secteur") or "autre").strip().lower(),
                province=(row.get("province") or "").strip().lower().replace(" ", "_"),
                ville=(row.get("ville") or "").strip(),
                contact_email=(row.get("email") or "").strip(),
                contact_telephone=(row.get("telephone") or "").strip(),
                is_active=True,
                created_at=now_utc(),
                created_by=current_user.username,
            )
            db.add(op)
            created += 1

        write_audit_event(
            db,
            actor=current_user.username,
            action="operateurs.import_csv",
            target=file.filename or "unknown.csv",
            details=f"{created} crees, {skipped} ignores, {len(errors)} erreurs",
        )
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur import CSV: {e!s}")

    return {
        "status": "ok",
        "created": created,
        "skipped": skipped,
        "errors": errors[:20],  # Limit error messages
    }


@router.get("/operateurs/scores/ranking", summary="Classement des operateurs par score de conformite")
async def get_operators_ranking(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur)),
    db: Session = Depends(get_db),
):
    return compute_all_scores(db)


@router.get("/operateurs", response_model=list[OperateurBrief], summary="Lister les operateurs industriels")
async def list_operateurs(
    secteur: str | None = Query(default=None),
    province: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[OperateurBrief]:
    query = select(OperateurIndustrielORM)
    roles = {r.value if hasattr(r, "value") else str(r) for r in current_user.roles}
    privileged = {"admin", "ministre", "directeur", "instructeur", "inspecteur"}
    operateur_only = not (roles & privileged) and "operateur" in roles
    if secteur is not None:
        query = query.where(OperateurIndustrielORM.secteur == secteur)
    if province is not None:
        query = query.where(OperateurIndustrielORM.province == province)
    if is_active is not None:
        query = query.where(OperateurIndustrielORM.is_active.is_(is_active))
    # Exclude soft-deleted by default
    query = query.where(OperateurIndustrielORM.deleted_at.is_(None))
    query = query.order_by(OperateurIndustrielORM.raison_sociale).offset(skip).limit(limit)
    ops = db.execute(query).scalars().all()
    briefs = [_to_operateur_brief(op) for op in ops]
    # Operateur ne doit pas voir NIF / effectif des concurrents (annuaire public minimal).
    if operateur_only:
        for b in briefs:
            b.nif_gabon = ""
            b.effectif_declare = None
    return briefs


@router.get("/operateurs/paginated", response_model=PaginatedResponse, summary="Lister les operateurs avec pagination")
async def list_operateurs_paginated(
    secteur: str | None = Query(default=None),
    province: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    pagination: PaginationParams = Depends(),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    from sqlalchemy import func as sa_func

    base_query = select(OperateurIndustrielORM)
    if secteur is not None:
        base_query = base_query.where(OperateurIndustrielORM.secteur == secteur)
    if province is not None:
        base_query = base_query.where(OperateurIndustrielORM.province == province)
    if is_active is not None:
        base_query = base_query.where(OperateurIndustrielORM.is_active.is_(is_active))

    total = db.execute(select(sa_func.count()).select_from(base_query.subquery())).scalar_one()
    data_query = (
        base_query.order_by(OperateurIndustrielORM.raison_sociale).offset(pagination.skip).limit(pagination.limit)
    )
    ops = db.execute(data_query).scalars().all()

    return PaginatedResponse.create(
        items=[_to_operateur_brief(op) for op in ops],
        total=total,
        params=pagination,
    )


@router.post(
    "/operateurs",
    response_model=OperateurRead,
    status_code=status.HTTP_201_CREATED,
    summary="Enregistrer un nouvel operateur",
)
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
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> OperateurRead:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    # Operateur: detail complet uniquement pour les entreprises avec lesquelles il a interagi
    # (ATI deja soumis pour cet operateur). Sinon 403.
    roles = {r.value if hasattr(r, "value") else str(r) for r in current_user.roles}
    privileged = {"admin", "ministre", "directeur", "instructeur", "inspecteur"}
    if not (roles & privileged) and "operateur" in roles:
        has_link = (
            db.execute(
                select(AgrementTechniqueIndustrielORM.id)
                .where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
                .where(AgrementTechniqueIndustrielORM.created_by == current_user.username)
                .limit(1)
            ).scalar()
            is not None
        )
        if not has_link:
            raise HTTPException(
                status_code=403, detail="Acces restreint aux operateurs avec lesquels vous avez interagi."
            )
    return _to_operateur_read(op)


@router.get("/operateurs/{operateur_id}/risk-profile", summary="Profil de risque d'un operateur")
async def operateur_risk_profile(
    operateur_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Calcule un profil de risque base sur les inspections, ATI et historique."""
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")

    # ATIs
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
        )
        .scalars()
        .all()
    )

    terminal = {"approuve", "rejete", "expire"}
    rejected = sum(1 for a in atis if a.statut == "rejete")
    expired = sum(1 for a in atis if a.statut == "expire")
    overdue = sum(1 for a in atis if a.statut not in terminal and _ati_is_overdue(a))

    # Inspections
    inspections = (
        db.execute(
            select(InspectionConformiteORM)
            .where(InspectionConformiteORM.operateur_id == operateur_id)
            .order_by(InspectionConformiteORM.date_inspection.desc())
        )
        .scalars()
        .all()
    )

    non_conforme = sum(1 for i in inspections if i.statut_conformite == "non_conforme")
    partiel = sum(1 for i in inspections if i.statut_conformite == "partiel")
    total_inspections = len(inspections)

    # Risk score (0=low, 100=high risk)
    risk = 0
    if rejected > 0:
        risk += min(rejected * 15, 30)
    if expired > 0:
        risk += min(expired * 10, 20)
    if overdue > 0:
        risk += min(overdue * 10, 20)
    if total_inspections > 0:
        non_conf_rate = (non_conforme + partiel * 0.5) / total_inspections
        risk += int(non_conf_rate * 30)
    if total_inspections == 0 and len(atis) > 0:
        risk += 10  # Never inspected

    risk = min(risk, 100)
    level = "faible" if risk < 25 else "modere" if risk < 50 else "eleve" if risk < 75 else "critique"

    return {
        "operateur_id": operateur_id,
        "raison_sociale": op.raison_sociale,
        "risk_score": risk,
        "risk_level": level,
        "facteurs": {
            "atis_rejetes": rejected,
            "atis_expires": expired,
            "atis_en_retard": overdue,
            "inspections_non_conformes": non_conforme,
            "inspections_partielles": partiel,
            "total_inspections": total_inspections,
            "total_atis": len(atis),
        },
    }


@router.get("/operateurs/{operateur_id}/ati", response_model=list[ATIBrief], summary="ATI d'un operateur")
async def list_operateur_atis(
    operateur_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[ATIBrief]:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")

    query = select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
    # Operateur ne voit que ses propres ATI, meme pour un operateur qu'il a cree.
    roles = {r.value if hasattr(r, "value") else str(r) for r in current_user.roles}
    privileged = {"admin", "ministre", "directeur", "instructeur", "inspecteur"}
    if not (roles & privileged) and "operateur" in roles:
        query = query.where(AgrementTechniqueIndustrielORM.created_by == current_user.username)
    atis = db.execute(query.order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())).scalars().all()
    return [_to_ati_brief(a) for a in atis]


@router.post(
    "/operateurs/{operateur_id}/toggle-active",
    response_model=OperateurRead,
    summary="Activer ou desactiver un operateur",
)
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


@router.get("/operateurs/{operateur_id}/score", summary="Score de conformite d'un operateur")
async def get_operator_score(
    operateur_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    return compute_operator_score(db, operateur_id)


@router.get("/operateurs/{operateur_id}/timeline")
async def get_operator_timeline(
    operateur_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get chronological compliance timeline for an operator."""
    events = []

    # ATI events
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
        )
        .scalars()
        .all()
    )

    for ati in atis:
        events.append(
            {
                "date": ati.date_soumission.isoformat(),
                "type": "ati_submission",
                "icon": "\U0001f4cb",
                "title": f"ATI {ati.numero_ati} soumis",
                "detail": ati.type_activite[:80] if ati.type_activite else "",
                "color": "#0c7eb4",
            }
        )
        if ati.date_decision:
            color = "#006233" if ati.statut == "approuve" else "#b42318"
            events.append(
                {
                    "date": ati.date_decision.isoformat(),
                    "type": "ati_decision",
                    "icon": "\u2713" if ati.statut == "approuve" else "\u2715",
                    "title": f"ATI {ati.numero_ati} {ati.statut}",
                    "detail": "",
                    "color": color,
                }
            )
        if ati.date_expiration:
            events.append(
                {
                    "date": ati.date_expiration.isoformat(),
                    "type": "ati_expiration",
                    "icon": "\u23f0",
                    "title": f"ATI {ati.numero_ati} expire",
                    "detail": "",
                    "color": "#d97706",
                }
            )

    # Inspections
    inspections = (
        db.execute(select(InspectionConformiteORM).where(InspectionConformiteORM.operateur_id == operateur_id))
        .scalars()
        .all()
    )

    for insp in inspections:
        colors = {"conforme": "#006233", "non_conforme": "#b42318", "partiel": "#d97706"}
        icons = {"conforme": "\u2705", "non_conforme": "\u274c", "partiel": "\u26a0\ufe0f"}
        events.append(
            {
                "date": insp.date_inspection.isoformat(),
                "type": "inspection",
                "icon": icons.get(insp.statut_conformite, "\U0001f50d"),
                "title": f"Inspection · {insp.statut_conformite.replace('_', ' ')}",
                "detail": f"Inspecteur: {insp.inspecteur_username}",
                "color": colors.get(insp.statut_conformite, "#526175"),
            }
        )

    events.sort(key=lambda e: e["date"])
    return {"operateur_id": operateur_id, "events": events}


@router.delete("/operateurs/{operateur_id}", summary="Supprimer un operateur (soft delete)")
async def soft_delete_operateur(
    operateur_id: str,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Soft delete: marque l'operateur comme supprime sans le retirer de la base."""
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    if op.deleted_at:
        raise HTTPException(status_code=400, detail="Operateur deja supprime.")

    op.deleted_at = now_utc()
    op.is_active = False
    write_audit_event(
        db,
        actor=current_user.username,
        action="operateur.soft_delete",
        target=operateur_id,
        details=f"Operateur {op.raison_sociale} supprime",
    )
    db.commit()
    return {"message": f"Operateur '{op.raison_sociale}' supprime.", "id": operateur_id}


@router.post("/operateurs/{operateur_id}/restore", summary="Restaurer un operateur supprime")
async def restore_operateur(
    operateur_id: str,
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Restore a soft-deleted operator."""
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    if not op.deleted_at:
        raise HTTPException(status_code=400, detail="Operateur non supprime.")

    op.deleted_at = None
    op.is_active = True
    write_audit_event(
        db,
        actor=current_user.username,
        action="operateur.restore",
        target=operateur_id,
        details=f"Operateur {op.raison_sociale} restaure",
    )
    db.commit()
    return {"message": f"Operateur '{op.raison_sociale}' restaure.", "id": operateur_id}

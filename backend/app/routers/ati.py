"""PNPI · Endpoints de gestion des ATI (Agrements Techniques Industriels)."""

from __future__ import annotations

import io
import json
import logging
import os
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Form, HTTPException, Query, status
from fastapi.responses import Response as FastAPIResponse
from pydantic import BaseModel as _BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import PRIVILEGED_ROLES, Role, User, get_current_user, require_roles, user_role_values
from ..core.decision_engine import recommend_decision
from ..core.field_tracker import get_field_history
from ..core.pagination import PaginatedResponse, PaginationParams
from ..core.risk_assessment import assess_risk
from ..core.storage import get_storage
from ..database import as_utc, get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    ATIBusinessRuleORM,
    ATICommentORM,
    ATIComplementRequestORM,
    ATITagORM,
    ATITechnicalOpinionORM,
    ATITransitionORM,
    DocumentDossierORM,
    InspectionConformiteORM,
    OperateurIndustrielORM,
    UserFavoriteORM,
)
from ..schemas.pnpi import (
    ATIBrief,
    ATIBusinessRuleCreate,
    ATIBusinessRuleRead,
    ATIBusinessRuleUpdate,
    ATIComplementRequestCreate,
    ATIComplementRequestRead,
    ATIComplementResponse,
    ATICreate,
    ATIRead,
    ATIStatusUpdate,
    ATITechnicalOpinionCreate,
    ATITechnicalOpinionRead,
    ATITechnicalOpinionUpdate,
    ATITransitionRead,
)

logger = logging.getLogger("pnpi")


class _BulkAssignPayload(_BaseModel):
    ati_ids: list[str]
    instructeur_username: str


# Alias locaux : cf core/auth.py::PRIVILEGED_ROLES / user_role_values (dette D-005,
# ex-copies dupliquees ici et dans 7 autres modules, desormais consolidees).
_PRIVILEGED_ROLES = PRIVILEGED_ROLES
_user_role_values = user_role_values


def _has_decision_signature(ati_id: str) -> bool:
    """Verifie qu'au moins une signature PNG existe pour cet ATI."""
    storage = get_storage("uploads/signatures")
    return any(ref.lower().endswith(".png") for ref in storage.list_prefix(ati_id))


def _enforce_signature_before_approval(ati: AgrementTechniqueIndustrielORM) -> None:
    """Refuse l'approbation si la signature ministerielle n'a pas ete apposee.

    Controle desactivable via `PNPI_FF_REQUIRE_SIGNATURE_APPROVAL=0` (legacy / tests).
    Par defaut active, conformement aux exigences d'audit ministeriel.
    """
    flag = os.getenv("PNPI_FF_REQUIRE_SIGNATURE_APPROVAL", "1").lower()
    if flag in ("0", "false", "no", "off"):
        return
    if not _has_decision_signature(ati.id):
        raise HTTPException(
            status_code=422,
            detail=(
                "Signature ministerielle requise avant approbation. "
                "Apposer la signature via POST /pnpi/ati/{id}/sign-decision tant que le statut est en_validation."
            ),
        )


_REQUIRED_DOC_TYPES = {"statuts", "bilan", "plan_site", "certification"}
_ATI_DEMANDE_TYPES = {
    "creation": {
        "label": "Creation",
        "description": "Premiere demande d'autorisation technique industrielle.",
        "documents": ["statuts", "bilan", "plan_site", "certification"],
    },
    "renouvellement": {
        "label": "Renouvellement",
        "description": "Renouveler une ATI avant son echeance.",
        "documents": ["ancienne_ati", "bilan", "certification"],
    },
    "extension": {
        "label": "Extension",
        "description": "Ajouter une activite, un site ou une capacite industrielle.",
        "documents": ["statuts", "plan_site", "note_extension", "certification"],
    },
    "modification": {
        "label": "Modification",
        "description": "Modifier les informations administratives ou techniques d'une ATI.",
        "documents": ["statuts", "justificatif_modification"],
    },
    "duplicata": {
        "label": "Duplicata",
        "description": "Demander une copie officielle apres perte ou deterioration.",
        "documents": ["declaration_perte", "ancienne_ati"],
    },
    "suspension": {
        "label": "Suspension",
        "description": "Suspendre temporairement une autorisation.",
        "documents": ["motif_suspension", "ancienne_ati"],
    },
    "cloture": {
        "label": "Cloture",
        "description": "Clore une autorisation en fin d'activite ou de procedure.",
        "documents": ["motif_cloture", "ancienne_ati"],
    },
}


def _json_loads(value: str | None, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def _required_docs_for_ati(ati: AgrementTechniqueIndustrielORM, db: Session) -> set[str]:
    """Documents requis : regles configurees d'abord, puis defaults metier."""
    rules = (
        db.execute(
            select(ATIBusinessRuleORM).where(
                ATIBusinessRuleORM.rule_type == "documents_requis",
                ATIBusinessRuleORM.is_active.is_(True),
            )
        )
        .scalars()
        .all()
    )
    selected: list[str] = []
    for rule in rules:
        if rule.demande_type and rule.demande_type != getattr(ati, "type_demande", "creation"):
            continue
        if rule.secteur and rule.secteur != ati.secteur:
            continue
        config = _json_loads(rule.config, {})
        docs = config.get("documents") if isinstance(config, dict) else None
        if isinstance(docs, list):
            selected.extend(str(doc).strip() for doc in docs if str(doc).strip())
    if selected:
        return set(selected)
    type_demande = getattr(ati, "type_demande", "creation") or "creation"
    return set(_ATI_DEMANDE_TYPES.get(type_demande, _ATI_DEMANDE_TYPES["creation"])["documents"])


def _enforce_dossier_complet(ati_id: str, db: Session) -> None:
    """Refuse la transition vers 'en_validation' si les documents requis sont absents.

    Controle desactivable via `PNPI_FF_REQUIRE_COMPLETE_DOSSIER=0` (legacy / tests).
    Par defaut active : conformite processus d'instruction (pas de validation
    sur dossier vide).
    """
    flag = os.getenv("PNPI_FF_REQUIRE_COMPLETE_DOSSIER", "1").lower()
    if flag in ("0", "false", "no", "off"):
        return
    present = {
        d.type_document
        for d in db.execute(select(DocumentDossierORM).where(DocumentDossierORM.ati_id == ati_id)).scalars().all()
    }
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    missing = _required_docs_for_ati(ati, db) - present
    if missing:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Dossier incomplet. Documents requis manquants: {', '.join(sorted(missing))}. "
                "Uploader via POST /pnpi/ati/{id}/documents avant de passer en_validation."
            ),
        )


def _document_diagnostic(ati: AgrementTechniqueIndustrielORM, db: Session) -> dict[str, object]:
    documents = db.execute(select(DocumentDossierORM).where(DocumentDossierORM.ati_id == ati.id)).scalars().all()
    present = {doc.type_document for doc in documents}
    required = _required_docs_for_ati(ati, db)
    missing = sorted(required - present)
    extra = sorted(present - required)
    completion = round((len(required - set(missing)) / max(len(required), 1)) * 100)
    return {
        "required": sorted(required),
        "present": sorted(present),
        "missing": missing,
        "extra": extra,
        "documents_count": len(documents),
        "completion_pct": completion,
        "is_complete": not missing,
    }


def _ati_control_card(ati: AgrementTechniqueIndustrielORM, db: Session) -> dict[str, object]:
    doc = _document_diagnostic(ati, db)
    complements = (
        db.execute(
            select(ATIComplementRequestORM)
            .where(ATIComplementRequestORM.ati_id == ati.id)
            .order_by(ATIComplementRequestORM.requested_at.desc())
        )
        .scalars()
        .all()
    )
    opinions = (
        db.execute(
            select(ATITechnicalOpinionORM)
            .where(ATITechnicalOpinionORM.ati_id == ati.id)
            .order_by(ATITechnicalOpinionORM.requested_at.desc())
        )
        .scalars()
        .all()
    )
    transitions = (
        db.execute(
            select(ATITransitionORM)
            .where(ATITransitionORM.ati_id == ati.id)
            .order_by(ATITransitionORM.changed_at.asc())
        )
        .scalars()
        .all()
    )
    open_complements = [item for item in complements if item.status in {"ouvert", "repondu"}]
    pending_opinions = [item for item in opinions if item.status in {"demande", "reserve"}]
    has_signature = _has_decision_signature(ati.id)
    blockers: list[str] = []
    warnings: list[str] = []
    if doc["missing"]:
        blockers.append(f"Pièces requises manquantes: {', '.join(doc['missing'])}")
    if open_complements:
        blockers.append(f"{len(open_complements)} demande(s) de complément ouverte(s)")
    if pending_opinions:
        blockers.append(f"{len(pending_opinions)} avis technique(s) attendu(s)")
    if ati.statut == "en_validation" and not has_signature:
        blockers.append("Signature ministérielle requise avant approbation")
    if _ati_is_overdue(ati):
        warnings.append("Dossier en dépassement SLA")
    if not ati.instructeur_username and ati.statut in {"soumis", "en_instruction"}:
        warnings.append("Instructeur non assigné")

    workflow_position = {
        "soumis": 20,
        "en_instruction": 45,
        "en_validation": 70,
        "approuve": 100,
        "rejete": 100,
        "expire": 100,
    }.get(ati.statut, 10)
    readiness = round(
        (int(doc["completion_pct"]) * 0.45)
        + (workflow_position * 0.25)
        + ((100 if not open_complements else 45) * 0.1)
        + ((100 if not pending_opinions else 50) * 0.1)
        + ((100 if ati.statut != "en_validation" or has_signature else 35) * 0.1)
    )
    urgency = min(
        100,
        (35 if _ati_is_overdue(ati) else 0)
        + (25 if blockers else 0)
        + (20 if ati.priorite in {"urgente", "elevee", "haute"} else 0)
        + min(20, max(_ati_age_jours(ati) - ati.sla_jours + 10, 0)),
    )
    if blockers:
        decision_state = "bloqué"
        next_action = blockers[0]
    elif ati.statut == "soumis":
        decision_state = "recevable"
        next_action = "Affecter le dossier et lancer l'instruction."
    elif ati.statut == "en_instruction":
        decision_state = "instruction possible"
        next_action = "Finaliser l'analyse puis transmettre en validation."
    elif ati.statut == "en_validation":
        decision_state = "prêt pour décision"
        next_action = "Signer puis approuver ou rejeter avec motivation."
    elif ati.statut == "approuve":
        decision_state = "décidé"
        next_action = "Notifier, archiver et suivre l'échéance de renouvellement."
    else:
        decision_state = "terminé"
        next_action = "Conserver l'historique et traiter une éventuelle resoumission."

    return {
        "generated_at": now_utc().isoformat(),
        "ati_id": ati.id,
        "numero_ati": ati.numero_ati,
        "score_preparation": readiness,
        "score_urgence": urgency,
        "decision_state": decision_state,
        "next_action": next_action,
        "responsible": ati.instructeur_username or ("Opérateur" if doc["missing"] else "Service ATI"),
        "documents": doc,
        "blockers": blockers,
        "warnings": warnings,
        "control_points": [
            {
                "label": "Dossier documentaire",
                "status": "ok" if doc["is_complete"] else "bloquant",
                "detail": f"{doc['completion_pct']}% complet",
            },
            {
                "label": "Compléments",
                "status": "ok" if not open_complements else "bloquant",
                "detail": f"{len(open_complements)} ouvert(s)",
            },
            {
                "label": "Avis techniques",
                "status": "ok" if not pending_opinions else "attente",
                "detail": f"{len(pending_opinions)} attendu(s)",
            },
            {
                "label": "Signature",
                "status": "ok" if ati.statut != "en_validation" or has_signature else "bloquant",
                "detail": "présente" if has_signature else "à apposer",
            },
            {
                "label": "Traçabilité",
                "status": "ok" if transitions else "attente",
                "detail": f"{len(transitions)} transition(s)",
            },
        ],
        "workflow_guardrails": [
            "Le dossier ne passe pas en validation si les pièces requises sont absentes.",
            "L'approbation exige une signature lorsque le contrôle est activé.",
            "Chaque transition est historisée avec acteur, date et note.",
            "Les avis et compléments restent rattachés au dossier.",
        ],
    }


def check_ati_access(ati: AgrementTechniqueIndustrielORM, current_user: User) -> None:
    """Operateur: accede uniquement aux ATI qu'il a crees. Roles privilegies: pass-through.

    A appeler sur chaque endpoint /ati/{id}/* accessible a l'operateur pour
    bloquer l'IDOR (enumeration/lecture/modification des dossiers concurrents).
    """
    roles = _user_role_values(current_user)
    if roles & _PRIVILEGED_ROLES:
        return
    if "operateur" in roles and ati.created_by != current_user.username:
        raise HTTPException(status_code=403, detail="Acces restreint a vos propres dossiers.")


router = APIRouter(prefix="/pnpi", tags=["ATI"])

_TERMINAL_STATUTS = {"approuve", "rejete", "expire"}

# Valid transition graph: statut -> allowed next statuts
_STATUT_TRANSITIONS = {
    "soumis": {"en_instruction"},
    "en_instruction": {"en_validation", "rejete"},
    "en_validation": {"approuve", "rejete"},
    "rejete": {"soumis"},  # resubmission
    "approuve": {"expire"},  # only by system
    "expire": set(),  # terminal
}

# Valid etape transitions
_ETAPE_TRANSITIONS = {
    "reception": {"analyse_technique"},
    "analyse_technique": {"verification_terrain", "decision"},
    "verification_terrain": {"decision"},
    "decision": {"notification"},
    "notification": set(),  # terminal
}


def _ati_age_jours(ati: AgrementTechniqueIndustrielORM) -> int:
    return max((now_utc().date() - ati.date_soumission.date()).days, 0)


def _ati_is_overdue(ati: AgrementTechniqueIndustrielORM) -> bool:
    return _ati_age_jours(ati) > ati.sla_jours and ati.statut not in _TERMINAL_STATUTS


def _to_ati_read(ati: AgrementTechniqueIndustrielORM) -> ATIRead:
    age = _ati_age_jours(ati)
    return ATIRead(
        id=ati.id,
        numero_ati=ati.numero_ati,
        operateur_id=ati.operateur_id,
        type_demande=getattr(ati, "type_demande", "creation"),
        type_activite=ati.type_activite,
        secteur=ati.secteur,
        statut=ati.statut,
        etape=ati.etape,
        priorite=ati.priorite,
        payment_status=getattr(ati, "payment_status", "prototype"),
        payment_reference=getattr(ati, "payment_reference", None),
        instructeur_username=ati.instructeur_username,
        date_soumission=ati.date_soumission,
        date_decision=ati.date_decision,
        date_expiration=ati.date_expiration,
        sla_jours=ati.sla_jours,
        qr_code_data=ati.qr_code_data,
        motif_rejet=ati.motif_rejet,
        numero_reference_decision=ati.numero_reference_decision,
        observations=ati.observations,
        created_by=ati.created_by,
        updated_at=ati.updated_at,
        age_jours=age,
        is_overdue=_ati_is_overdue(ati),
    )


def _to_ati_brief(ati: AgrementTechniqueIndustrielORM) -> ATIBrief:
    return ATIBrief(
        id=ati.id,
        operateur_id=ati.operateur_id,
        numero_ati=ati.numero_ati,
        type_demande=getattr(ati, "type_demande", "creation"),
        type_activite=ati.type_activite,
        secteur=ati.secteur,
        statut=ati.statut,
        etape=ati.etape,
        priorite=ati.priorite,
        payment_status=getattr(ati, "payment_status", "prototype"),
        payment_reference=getattr(ati, "payment_reference", None),
        instructeur_username=ati.instructeur_username,
        date_soumission=ati.date_soumission,
        age_jours=_ati_age_jours(ati),
        is_overdue=_ati_is_overdue(ati),
    )


def _generate_numero_ati(db: Session) -> str:
    year = now_utc().year
    prefix = f"ATI-{year}-"
    max_num = db.execute(
        select(func.max(AgrementTechniqueIndustrielORM.numero_ati)).where(
            AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%")
        )
    ).scalar()
    if max_num:
        try:
            last_num = int(max_num.split("-")[-1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0
    return f"{prefix}{last_num + 1:04d}"


@router.get(
    "/ati",
    response_model=list[ATIRead],
    summary="Lister les ATI",
    description="Retourne la liste des agrements techniques avec filtres optionnels sur statut, secteur et province.",
)
async def list_atis(
    statut: str | None = Query(default=None),
    secteur: str | None = Query(default=None),
    province: str | None = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=500),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[ATIRead]:
    query = select(AgrementTechniqueIndustrielORM)
    # Les operateurs ne voient que leurs propres dossiers.
    roles = _user_role_values(current_user)
    if not (roles & _PRIVILEGED_ROLES) and "operateur" in roles:
        query = query.where(AgrementTechniqueIndustrielORM.created_by == current_user.username)
    if assigned_to_me:
        query = query.where(AgrementTechniqueIndustrielORM.instructeur_username == current_user.username)
    if statut:
        query = query.where(AgrementTechniqueIndustrielORM.statut == statut)
    if secteur:
        query = query.where(AgrementTechniqueIndustrielORM.secteur == secteur)
    if province:
        # Filter via join on operateur province
        query = query.join(OperateurIndustrielORM).where(OperateurIndustrielORM.province == province)
    query = query.order_by(AgrementTechniqueIndustrielORM.date_soumission.desc()).offset(skip).limit(limit)
    atis = db.execute(query).scalars().all()
    return [_to_ati_read(a) for a in atis]


@router.get(
    "/ati/paginated",
    response_model=PaginatedResponse,
    summary="Lister les ATI avec pagination",
    description="Version paginee retournant total, page courante et nombre de pages.",
)
async def list_atis_paginated(
    statut: str | None = Query(default=None),
    secteur: str | None = Query(default=None),
    province: str | None = Query(default=None),
    assigned_to_me: bool = Query(default=False),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> PaginatedResponse:
    base_query = select(AgrementTechniqueIndustrielORM)
    if assigned_to_me:
        base_query = base_query.where(AgrementTechniqueIndustrielORM.instructeur_username == current_user.username)
    if statut:
        base_query = base_query.where(AgrementTechniqueIndustrielORM.statut == statut)
    if secteur:
        base_query = base_query.where(AgrementTechniqueIndustrielORM.secteur == secteur)
    if province:
        base_query = base_query.join(OperateurIndustrielORM).where(OperateurIndustrielORM.province == province)

    count_query = select(func.count()).select_from(base_query.subquery())
    total = db.execute(count_query).scalar_one()

    data_query = (
        base_query.order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        .offset(pagination.skip)
        .limit(pagination.limit)
    )
    atis = db.execute(data_query).scalars().all()

    return PaginatedResponse.create(
        items=[_to_ati_read(a) for a in atis],
        total=total,
        params=pagination,
    )


@router.post(
    "/ati",
    response_model=ATIRead,
    status_code=status.HTTP_201_CREATED,
    summary="Soumettre un nouvel ATI",
    description="Cree un agrement technique industriel et genere son numero unique.",
)
async def create_ati(
    payload: ATICreate,
    current_user: User = Depends(require_roles(Role.admin, Role.instructeur, Role.ministre, Role.operateur)),
    db: Session = Depends(get_db),
) -> ATIRead:
    type_demande = payload.type_demande.strip().lower()
    if type_demande not in _ATI_DEMANDE_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Type de demande invalide. Valeurs autorisees: {', '.join(_ATI_DEMANDE_TYPES)}",
        )
    operateur = db.get(OperateurIndustrielORM, payload.operateur_id)
    if not operateur:
        raise HTTPException(status_code=404, detail="Operateur industriel introuvable.")

    numero_ati = _generate_numero_ati(db)
    now = now_utc()

    ati = AgrementTechniqueIndustrielORM(
        id=f"ATI-{uuid.uuid4().hex[:12].upper()}",
        numero_ati=numero_ati,
        operateur_id=payload.operateur_id,
        type_demande=type_demande,
        type_activite=payload.type_activite.strip(),
        secteur=payload.secteur.strip(),
        statut="soumis",
        etape="reception",
        priorite=payload.priorite,
        payment_status="prototype",
        instructeur_username=payload.instructeur_username,
        date_soumission=now,
        sla_jours=payload.sla_jours,
        observations=payload.observations,
        created_by=current_user.username,
        updated_at=now,
    )
    db.add(ati)

    transition = ATITransitionORM(
        id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=None,
        new_statut="soumis",
        previous_etape=None,
        new_etape="reception",
        note=f"Creation ATI · type={type_demande}",
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.create",
        target=ati.id,
        details=f"numero={numero_ati}; operateur={payload.operateur_id}; secteur={payload.secteur}",
    )
    db.commit()
    db.refresh(ati)
    return _to_ati_read(ati)


# ─── Static /ati/* routes MUST be registered BEFORE /ati/{ati_id} ──────────


@router.post("/ati/archive-expired")
async def archive_expired_atis(
    current_user: User = Depends(require_roles(Role.admin)),
    db: Session = Depends(get_db),
):
    """Archive all expired ATIs (set status to 'expire')."""
    now = now_utc()
    all_atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut == "approuve",
                AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
                AgrementTechniqueIndustrielORM.date_expiration < now,
            )
        )
        .scalars()
        .all()
    )

    archived = 0
    for ati in all_atis:
        ati.statut = "expire"
        archived += 1

    if archived:
        db.commit()
        write_audit_event(
            db,
            actor=current_user.username,
            action="ati.bulk_archive",
            target="expired",
            details=f"{archived} ATI(s) archives automatiquement",
        )
        db.commit()

    return {"status": "ok", "archived": archived}


@router.get("/ati/archived")
async def list_archived_atis(
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List archived/expired ATIs."""
    query = (
        select(AgrementTechniqueIndustrielORM)
        .where(AgrementTechniqueIndustrielORM.statut == "expire")
        .order_by(AgrementTechniqueIndustrielORM.date_expiration.desc())
        .offset(skip)
        .limit(limit)
    )
    atis = db.execute(query).scalars().all()

    return {
        "atis": [
            {
                "id": a.id,
                "numero_ati": a.numero_ati,
                "operateur": a.operateur.raison_sociale if a.operateur else None,
                "secteur": a.secteur,
                "date_expiration": a.date_expiration.isoformat() if a.date_expiration else None,
                "date_soumission": a.date_soumission.isoformat(),
            }
            for a in atis
        ]
    }


@router.get("/ati/favorites", summary="Liste des ATI favoris de l'utilisateur")
async def get_favorites(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    favs = (
        db.execute(
            select(UserFavoriteORM)
            .where(UserFavoriteORM.username == current_user.username)
            .order_by(UserFavoriteORM.created_at.desc())
        )
        .scalars()
        .all()
    )

    result = []
    for f in favs:
        ati = db.get(AgrementTechniqueIndustrielORM, f.ati_id)
        result.append(
            {
                "id": f.id,
                "ati_id": f.ati_id,
                "numero_ati": ati.numero_ati if ati else None,
                "statut": ati.statut if ati else None,
                "operateur": ati.operateur.raison_sociale if ati and ati.operateur else None,
                "note": f.note,
                "created_at": f.created_at.isoformat(),
            }
        )
    return {"favorites": result}


@router.get("/ati/tags/all")
async def list_all_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all unique tag labels used across ATIs."""
    from sqlalchemy import distinct

    labels = db.execute(select(distinct(ATITagORM.label), ATITagORM.color).order_by(ATITagORM.label)).all()
    return {"tags": [{"label": label, "color": c} for label, c in labels]}


@router.get("/ati/expiring-soon")
async def expiring_soon(
    days: int = Query(60, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List ATIs expiring within N days."""
    now = now_utc()
    cutoff = now + timedelta(days=days)

    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM)
            .where(
                AgrementTechniqueIndustrielORM.statut == "approuve",
                AgrementTechniqueIndustrielORM.date_expiration.isnot(None),
                AgrementTechniqueIndustrielORM.date_expiration <= cutoff,
                AgrementTechniqueIndustrielORM.date_expiration >= now,
            )
            .order_by(AgrementTechniqueIndustrielORM.date_expiration.asc())
        )
        .scalars()
        .all()
    )

    return {
        "count": len(atis),
        "days_threshold": days,
        "atis": [
            {
                "id": a.id,
                "numero_ati": a.numero_ati,
                "operateur": a.operateur.raison_sociale if a.operateur else None,
                "secteur": a.secteur,
                "date_expiration": a.date_expiration.isoformat(),
                "days_remaining": (a.date_expiration.date() - now.date()).days,
            }
            for a in atis
        ],
    }


@router.get("/ati/triage")
async def get_triage_queue(
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Get ATIs sorted by priority score for triage."""
    now = now_utc()
    pending = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut.notin_(["approuve", "rejete", "expire"])
            )
        )
        .scalars()
        .all()
    )

    scored = []
    for ati in pending:
        age = (now.date() - ati.date_soumission.date()).days
        sla_pct = age / max(ati.sla_jours, 1) * 100

        # Priority score (higher = more urgent)
        priority = 0
        priority += min(sla_pct, 150)  # SLA urgency (max 150)

        # Sector weight
        SECTOR_PRIORITY = {"mines": 20, "energie": 15, "chimie": 10, "btp": 8, "bois": 5, "agroalimentaire": 5}
        priority += SECTOR_PRIORITY.get(ati.secteur, 0)

        # Resubmission bonus
        if "REN" in ati.numero_ati or "RESUB" in ati.numero_ati:
            priority += 15

        level = (
            "critique" if priority >= 120 else "urgent" if priority >= 80 else "normal" if priority >= 40 else "faible"
        )
        color = (
            "#b42318"
            if priority >= 120
            else "#e65100"
            if priority >= 80
            else "#d97706"
            if priority >= 40
            else "#006233"
        )

        scored.append(
            {
                "id": ati.id,
                "numero_ati": ati.numero_ati,
                "operateur": ati.operateur.raison_sociale if ati.operateur else None,
                "secteur": ati.secteur,
                "statut": ati.statut,
                "age_jours": age,
                "sla_jours": ati.sla_jours,
                "sla_pct": round(sla_pct, 1),
                "priority_score": round(priority),
                "priority_level": level,
                "color": color,
                "instructeur": getattr(ati, "instructeur_username", None),
            }
        )

    scored.sort(key=lambda x: -x["priority_score"])
    return {"queue": scored, "total": len(scored)}


@router.get("/ati/request-types", summary="Types de demandes ATI disponibles")
async def get_ati_request_types(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
):
    return [
        {
            "key": key,
            "label": meta["label"],
            "description": meta["description"],
            "documents_requis": meta["documents"],
        }
        for key, meta in _ATI_DEMANDE_TYPES.items()
    ]


@router.get("/ati/payment-prototype", summary="Prototype du volet paiement ATI")
async def get_payment_prototype(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
):
    return {
        "mode": "prototype",
        "is_blocking": False,
        "label": "Paiement administratif ATI",
        "message": (
            "Le paiement est volontairement en prototype : il presente le parcours cible "
            "sans bloquer le workflow tant que le cadre de perception n'est pas confirme."
        ),
        "statuts": ["prototype", "non_applicable", "en_attente", "paye", "exonere"],
    }


def _business_rule_to_read(rule: ATIBusinessRuleORM) -> ATIBusinessRuleRead:
    return ATIBusinessRuleRead(
        id=rule.id,
        rule_type=rule.rule_type,
        demande_type=rule.demande_type,
        secteur=rule.secteur,
        label=rule.label,
        config=_json_loads(rule.config, {}),
        is_active=rule.is_active,
        updated_by=rule.updated_by,
        updated_at=rule.updated_at,
    )


@router.get("/ati/business-rules", response_model=list[ATIBusinessRuleRead], summary="Regles metier ATI")
async def list_ati_business_rules(
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list[ATIBusinessRuleRead]:
    rules = (
        db.execute(select(ATIBusinessRuleORM).order_by(ATIBusinessRuleORM.rule_type, ATIBusinessRuleORM.label))
        .scalars()
        .all()
    )
    if rules:
        return [_business_rule_to_read(rule) for rule in rules]
    now = now_utc()
    return [
        ATIBusinessRuleRead(
            id=f"default-{key}",
            rule_type="documents_requis",
            demande_type=key,
            secteur=None,
            label=f"Pieces requises · {meta['label']}",
            config={"documents": meta["documents"]},
            is_active=True,
            updated_by="system",
            updated_at=now,
        )
        for key, meta in _ATI_DEMANDE_TYPES.items()
    ]


@router.post("/ati/business-rules", response_model=ATIBusinessRuleRead, status_code=status.HTTP_201_CREATED)
async def create_ati_business_rule(
    payload: ATIBusinessRuleCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> ATIBusinessRuleRead:
    rule = ATIBusinessRuleORM(
        id=f"ATIR-{uuid.uuid4().hex[:10].upper()}",
        rule_type=payload.rule_type.strip(),
        demande_type=payload.demande_type.strip().lower() if payload.demande_type else None,
        secteur=payload.secteur.strip().lower() if payload.secteur else None,
        label=payload.label.strip(),
        config=json.dumps(payload.config, ensure_ascii=False),
        is_active=payload.is_active,
        updated_by=current_user.username,
        updated_at=now_utc(),
    )
    db.add(rule)
    write_audit_event(db, actor=current_user.username, action="ati.rule.create", target=rule.id, details=rule.label)
    db.commit()
    db.refresh(rule)
    return _business_rule_to_read(rule)


@router.patch("/ati/business-rules/{rule_id}", response_model=ATIBusinessRuleRead)
async def update_ati_business_rule(
    rule_id: str,
    payload: ATIBusinessRuleUpdate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> ATIBusinessRuleRead:
    rule = db.get(ATIBusinessRuleORM, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Regle ATI introuvable.")
    if payload.label is not None:
        rule.label = payload.label.strip()
    if payload.config is not None:
        rule.config = json.dumps(payload.config, ensure_ascii=False)
    if payload.is_active is not None:
        rule.is_active = payload.is_active
    rule.updated_by = current_user.username
    rule.updated_at = now_utc()
    write_audit_event(db, actor=current_user.username, action="ati.rule.update", target=rule.id, details=rule.label)
    db.commit()
    db.refresh(rule)
    return _business_rule_to_read(rule)


@router.get("/ati/processing-center", summary="Centre de traitement operationnel ATI")
async def get_ati_processing_center(
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM)
            .where(AgrementTechniqueIndustrielORM.statut.notin_(list(_TERMINAL_STATUTS)))
            .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        )
        .scalars()
        .all()
    )
    open_complements = (
        db.execute(select(ATIComplementRequestORM).where(ATIComplementRequestORM.status.in_(["ouvert", "repondu"])))
        .scalars()
        .all()
    )
    pending_opinions = (
        db.execute(select(ATITechnicalOpinionORM).where(ATITechnicalOpinionORM.status.in_(["demande", "reserve"])))
        .scalars()
        .all()
    )
    complements_by_ati: dict[str, list[ATIComplementRequestORM]] = {}
    opinions_by_ati: dict[str, list[ATITechnicalOpinionORM]] = {}
    for complement in open_complements:
        complements_by_ati.setdefault(complement.ati_id, []).append(complement)
    for opinion in pending_opinions:
        opinions_by_ati.setdefault(opinion.ati_id, []).append(opinion)

    buckets: dict[str, list[dict]] = {
        "urgents": [],
        "incomplets": [],
        "complements": [],
        "avis_attendus": [],
        "a_signer": [],
        "en_instruction": [],
        "en_validation": [],
    }
    items: list[dict] = []
    for ati in atis:
        control = _ati_control_card(ati, db)
        missing_docs = list(control["documents"]["missing"])  # type: ignore[index]
        blocking_reasons = []
        if missing_docs:
            blocking_reasons.append(f"Pieces manquantes: {', '.join(missing_docs)}")
        if complements_by_ati.get(ati.id):
            blocking_reasons.append("Demande de complement ouverte")
        if opinions_by_ati.get(ati.id):
            blocking_reasons.append("Avis technique attendu")
        if ati.statut == "en_validation" and not _has_decision_signature(ati.id):
            blocking_reasons.append("Signature ministerielle a apposer")

        next_action = "Suivre le workflow"
        responsible = ati.instructeur_username or "Service ATI"
        if missing_docs:
            next_action = "Completer les pieces requises"
            responsible = ati.created_by or "Operateur"
        elif complements_by_ati.get(ati.id):
            next_action = "Repondre/closer la demande de complement"
        elif opinions_by_ati.get(ati.id):
            next_action = "Relancer ou enregistrer l'avis technique"
        elif ati.statut == "en_validation":
            next_action = "Signer puis approuver/rejeter"
            responsible = "Directeur / Ministre"
        elif ati.statut == "soumis":
            next_action = "Affecter et passer en instruction"

        item = {
            "id": ati.id,
            "numero_ati": ati.numero_ati,
            "operateur": ati.operateur.raison_sociale if ati.operateur else ati.operateur_id,
            "secteur": ati.secteur,
            "type_demande": getattr(ati, "type_demande", "creation"),
            "statut": ati.statut,
            "etape": ati.etape,
            "priorite": ati.priorite,
            "age_jours": _ati_age_jours(ati),
            "sla_jours": ati.sla_jours,
            "is_overdue": _ati_is_overdue(ati),
            "blocking_reasons": blocking_reasons,
            "next_action": next_action,
            "responsible": responsible,
            "missing_documents": missing_docs,
            "score_preparation": control["score_preparation"],
            "score_urgence": control["score_urgence"],
            "decision_state": control["decision_state"],
        }
        items.append(item)
        if item["is_overdue"] or item["priorite"] in {"urgente", "elevee", "haute"}:
            buckets["urgents"].append(item)
        if missing_docs:
            buckets["incomplets"].append(item)
        if complements_by_ati.get(ati.id):
            buckets["complements"].append(item)
        if opinions_by_ati.get(ati.id):
            buckets["avis_attendus"].append(item)
        if ati.statut == "en_validation" and not _has_decision_signature(ati.id):
            buckets["a_signer"].append(item)
        if ati.statut == "en_instruction":
            buckets["en_instruction"].append(item)
        if ati.statut == "en_validation":
            buckets["en_validation"].append(item)

    return {
        "generated_at": now_utc().isoformat(),
        "stats": {
            "total_actifs": len(items),
            "urgents": len(buckets["urgents"]),
            "incomplets": len(buckets["incomplets"]),
            "complements_ouverts": len(buckets["complements"]),
            "avis_attendus": len(buckets["avis_attendus"]),
            "a_signer": len(buckets["a_signer"]),
            "preparation_moyenne": round(
                sum(int(item["score_preparation"]) for item in items) / max(len(items), 1),
                1,
            ),
            "urgence_moyenne": round(
                sum(int(item["score_urgence"]) for item in items) / max(len(items), 1),
                1,
            ),
        },
        "buckets": buckets,
        "items": sorted(items, key=lambda item: (not item["is_overdue"], -item["age_jours"])),
    }


# ─── Parameterized /ati/{ati_id} routes below ─────────────────────────────


@router.get("/ati/{ati_id}", response_model=ATIRead, summary="Detail d'un ATI")
async def get_ati(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    return _to_ati_read(ati)


@router.get("/ati/{ati_id}/control-card", summary="Carte de contrôle opérationnel d'un ATI")
async def get_ati_control_card(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    return _ati_control_card(ati, db)


def _opinion_to_read(opinion: ATITechnicalOpinionORM) -> ATITechnicalOpinionRead:
    return ATITechnicalOpinionRead.model_validate(opinion)


def _complement_to_read(complement: ATIComplementRequestORM) -> ATIComplementRequestRead:
    return ATIComplementRequestRead(
        id=complement.id,
        ati_id=complement.ati_id,
        requested_by=complement.requested_by,
        requested_at=complement.requested_at,
        due_at=complement.due_at,
        status=complement.status,
        motif=complement.motif,
        requested_documents=_json_loads(complement.requested_documents, []),
        response_note=complement.response_note,
        responded_by=complement.responded_by,
        responded_at=complement.responded_at,
    )


@router.get("/ati/{ati_id}/technical-opinions", response_model=list[ATITechnicalOpinionRead])
async def list_technical_opinions(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[ATITechnicalOpinionRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    opinions = (
        db.execute(
            select(ATITechnicalOpinionORM)
            .where(ATITechnicalOpinionORM.ati_id == ati_id)
            .order_by(ATITechnicalOpinionORM.requested_at.desc())
        )
        .scalars()
        .all()
    )
    return [_opinion_to_read(opinion) for opinion in opinions]


@router.post(
    "/ati/{ati_id}/technical-opinions", response_model=ATITechnicalOpinionRead, status_code=status.HTTP_201_CREATED
)
async def create_technical_opinion(
    ati_id: str,
    payload: ATITechnicalOpinionCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> ATITechnicalOpinionRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    opinion = ATITechnicalOpinionORM(
        id=f"AVIS-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati_id,
        direction=payload.direction.strip(),
        requested_by=current_user.username,
        requested_at=now_utc(),
        due_at=payload.due_at,
        status="demande",
        motivation=payload.motivation,
    )
    db.add(opinion)
    db.add(
        ATITransitionORM(
            id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut=ati.statut,
            new_statut=ati.statut,
            previous_etape=ati.etape,
            new_etape=ati.etape,
            note=f"Avis technique demande: {opinion.direction}",
            changed_at=now_utc(),
        )
    )
    write_audit_event(
        db, actor=current_user.username, action="ati.opinion.request", target=ati.id, details=opinion.direction
    )
    db.commit()
    db.refresh(opinion)
    return _opinion_to_read(opinion)


@router.patch("/ati/{ati_id}/technical-opinions/{opinion_id}", response_model=ATITechnicalOpinionRead)
async def update_technical_opinion(
    ati_id: str,
    opinion_id: str,
    payload: ATITechnicalOpinionUpdate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> ATITechnicalOpinionRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    opinion = db.get(ATITechnicalOpinionORM, opinion_id)
    if not ati or not opinion or opinion.ati_id != ati_id:
        raise HTTPException(status_code=404, detail="Avis technique introuvable.")
    if payload.status not in {"demande", "favorable", "reserve", "defavorable"}:
        raise HTTPException(status_code=422, detail="Statut d'avis invalide.")
    opinion.status = payload.status
    opinion.motivation = payload.motivation
    if payload.status != "demande":
        opinion.signed_by = current_user.username
        opinion.signed_at = now_utc()
    write_audit_event(
        db, actor=current_user.username, action="ati.opinion.update", target=ati.id, details=payload.status
    )
    db.commit()
    db.refresh(opinion)
    return _opinion_to_read(opinion)


@router.get("/ati/{ati_id}/complements", response_model=list[ATIComplementRequestRead])
async def list_complement_requests(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[ATIComplementRequestRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    complements = (
        db.execute(
            select(ATIComplementRequestORM)
            .where(ATIComplementRequestORM.ati_id == ati_id)
            .order_by(ATIComplementRequestORM.requested_at.desc())
        )
        .scalars()
        .all()
    )
    return [_complement_to_read(complement) for complement in complements]


@router.post("/ati/{ati_id}/complements", response_model=ATIComplementRequestRead, status_code=status.HTTP_201_CREATED)
async def create_complement_request(
    ati_id: str,
    payload: ATIComplementRequestCreate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> ATIComplementRequestRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    complement = ATIComplementRequestORM(
        id=f"COMP-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati_id,
        requested_by=current_user.username,
        requested_at=now_utc(),
        due_at=payload.due_at,
        status="ouvert",
        motif=payload.motif.strip(),
        requested_documents=json.dumps(payload.requested_documents, ensure_ascii=False),
    )
    db.add(complement)
    db.add(
        ATITransitionORM(
            id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut=ati.statut,
            new_statut=ati.statut,
            previous_etape=ati.etape,
            new_etape=ati.etape,
            note=f"Complement demande: {', '.join(payload.requested_documents) or payload.motif[:80]}",
            changed_at=now_utc(),
        )
    )
    write_audit_event(
        db, actor=current_user.username, action="ati.complement.request", target=ati.id, details=complement.motif
    )
    db.commit()
    db.refresh(complement)
    return _complement_to_read(complement)


@router.post("/ati/{ati_id}/complements/{request_id}/respond", response_model=ATIComplementRequestRead)
async def respond_complement_request(
    ati_id: str,
    request_id: str,
    payload: ATIComplementResponse,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.operateur)),
    db: Session = Depends(get_db),
) -> ATIComplementRequestRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    complement = db.get(ATIComplementRequestORM, request_id)
    if not ati or not complement or complement.ati_id != ati_id:
        raise HTTPException(status_code=404, detail="Demande de complement introuvable.")
    check_ati_access(ati, current_user)
    complement.status = "repondu"
    complement.response_note = payload.response_note
    complement.responded_by = current_user.username
    complement.responded_at = now_utc()
    write_audit_event(
        db, actor=current_user.username, action="ati.complement.respond", target=ati.id, details=request_id
    )
    db.commit()
    db.refresh(complement)
    return _complement_to_read(complement)


@router.post("/ati/{ati_id}/complements/{request_id}/close", response_model=ATIComplementRequestRead)
async def close_complement_request(
    ati_id: str,
    request_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> ATIComplementRequestRead:
    complement = db.get(ATIComplementRequestORM, request_id)
    if not complement or complement.ati_id != ati_id:
        raise HTTPException(status_code=404, detail="Demande de complement introuvable.")
    complement.status = "clos"
    write_audit_event(db, actor=current_user.username, action="ati.complement.close", target=ati_id, details=request_id)
    db.commit()
    db.refresh(complement)
    return _complement_to_read(complement)


@router.patch(
    "/ati/{ati_id}/statut",
    response_model=ATIRead,
    summary="Changer le statut d'un ATI",
    description="Effectue une transition de statut selon le graphe de workflow (soumis -> en_instruction -> en_validation -> approuve/rejete).",
)
async def update_ati_statut(
    ati_id: str,
    payload: ATIStatusUpdate,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.ministre)),
    db: Session = Depends(get_db),
) -> ATIRead:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    prev_statut = ati.statut
    prev_etape = ati.etape
    now = now_utc()

    if payload.new_statut is not None:
        allowed = _STATUT_TRANSITIONS.get(ati.statut, set())
        if payload.new_statut not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Transition invalide: {ati.statut} -> {payload.new_statut}. Transitions autorisees: {', '.join(allowed) or 'aucune'}",
            )
        if payload.new_statut == "en_validation":
            _enforce_dossier_complet(ati_id, db)
        if payload.new_statut == "approuve":
            _enforce_signature_before_approval(ati)
        ati.statut = payload.new_statut

    if payload.new_etape is not None:
        allowed_etapes = _ETAPE_TRANSITIONS.get(ati.etape, set())
        if payload.new_etape not in allowed_etapes:
            raise HTTPException(
                status_code=400,
                detail=f"Transition etape invalide: {ati.etape} -> {payload.new_etape}. Transitions autorisees: {', '.join(allowed_etapes) or 'aucune'}",
            )
        ati.etape = payload.new_etape

    if payload.instructeur_username is not None:
        ati.instructeur_username = payload.instructeur_username

    if payload.motif_rejet is not None:
        ati.motif_rejet = payload.motif_rejet

    if payload.numero_reference_decision is not None:
        ati.numero_reference_decision = payload.numero_reference_decision

    # Handle approval: set decision dates, generate QR code
    if ati.statut == "approuve" and not ati.date_decision:
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )

    # Handle rejection
    if ati.statut == "rejete" and not ati.date_decision:
        ati.date_decision = now

    ati.updated_at = now

    transition = ATITransitionORM(
        id=f"ATIT-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=prev_statut,
        new_statut=ati.statut,
        previous_etape=prev_etape,
        new_etape=ati.etape,
        note=payload.note or "",
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.update_statut",
        target=ati_id,
        details=f"statut:{prev_statut}->{ati.statut}; etape:{prev_etape}->{ati.etape}",
    )
    db.commit()
    db.refresh(ati)

    # Notifications email asynchrones
    try:
        from ..core.notifications import notify_ati_approved, notify_ati_rejected

        op = db.get(OperateurIndustrielORM, ati.operateur_id)
        emails = [e for e in [op.contact_email if op else None] if e]
        raison = op.raison_sociale if op else ati.operateur_id
        if ati.statut == "approuve" and prev_statut != "approuve" and emails:
            notify_ati_approved(ati.numero_ati, raison, emails)
        elif ati.statut == "rejete" and prev_statut != "rejete" and emails:
            notify_ati_rejected(ati.numero_ati, raison, ati.motif_rejet or "", emails)
    except Exception as e:
        logger.warning(f"Notification failed for ATI {ati.numero_ati}: {e}")

    return _to_ati_read(ati)


@router.post(
    "/ati/{ati_id}/resubmit",
    summary="Resoumettre un ATI rejete",
    description="Permet a un operateur de resoumettre un ATI precedemment rejete apres corrections.",
)
async def resubmit_ati(
    ati_id: str,
    observations: str = Form(""),
    current_user: User = Depends(require_roles(Role.operateur, Role.admin)),
    db: Session = Depends(get_db),
) -> dict:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    if ati.statut != "rejete":
        raise HTTPException(status_code=400, detail="Seul un ATI rejete peut etre resoumis.")

    # Reset to soumis
    previous_statut = ati.statut
    ati.statut = "soumis"
    ati.etape = "reception"
    ati.motif_rejet = None
    ati.date_decision = None
    if observations.strip():
        ati.observations = observations.strip()
    ati.updated_at = now_utc()

    # Record transition
    transition = ATITransitionORM(
        id=f"TR-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=previous_statut,
        new_statut="soumis",
        previous_etape="decision",
        new_etape="reception",
        note=f"Resoumission par l'operateur. {observations.strip()}",
        changed_at=now_utc(),
    )
    db.add(transition)

    write_audit_event(
        db, actor=current_user.username, action="ati.resubmit", target=ati.id, details="ATI resoumis apres rejet"
    )
    db.commit()

    return {"message": "ATI resoumis avec succes.", "id": ati.id, "statut": "soumis"}


@router.get("/ati/{ati_id}/sla-status", summary="Detail du suivi SLA pour un ATI")
async def ati_sla_status(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Retourne le detail SLA: jours ecoules, jours restants, pourcentage, alerte."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    now = now_utc()
    terminal = {"approuve", "rejete", "expire"}

    if ati.statut in terminal and ati.date_decision:
        elapsed = max((ati.date_decision.date() - ati.date_soumission.date()).days, 0)
        within_sla = elapsed <= ati.sla_jours
        return {
            "ati_id": ati.id,
            "numero_ati": ati.numero_ati,
            "statut": ati.statut,
            "sla_jours": ati.sla_jours,
            "jours_ecoules": elapsed,
            "jours_restants": 0,
            "pct_utilise": round(elapsed / ati.sla_jours * 100, 1) if ati.sla_jours > 0 else 0,
            "within_sla": within_sla,
            "alerte": "none",
            "decided": True,
        }

    elapsed = max((now.date() - ati.date_soumission.date()).days, 0)
    remaining = max(ati.sla_jours - elapsed, 0)
    pct = round(elapsed / ati.sla_jours * 100, 1) if ati.sla_jours > 0 else 0

    if elapsed > ati.sla_jours:
        alerte = "overdue"
    elif remaining <= 3:
        alerte = "critical"
    elif remaining <= 7:
        alerte = "warning"
    else:
        alerte = "ok"

    return {
        "ati_id": ati.id,
        "numero_ati": ati.numero_ati,
        "statut": ati.statut,
        "sla_jours": ati.sla_jours,
        "jours_ecoules": elapsed,
        "jours_restants": remaining,
        "pct_utilise": pct,
        "within_sla": elapsed <= ati.sla_jours,
        "alerte": alerte,
        "decided": False,
    }


@router.get(
    "/ati/{ati_id}/historique", response_model=list[ATITransitionRead], summary="Historique des transitions ATI"
)
async def ati_historique(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> list[ATITransitionRead]:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)

    transitions = (
        db.execute(
            select(ATITransitionORM)
            .where(ATITransitionORM.ati_id == ati_id)
            .order_by(ATITransitionORM.changed_at.asc())
        )
        .scalars()
        .all()
    )

    return [
        ATITransitionRead(
            id=t.id,
            ati_id=t.ati_id,
            changed_by=t.changed_by,
            previous_statut=t.previous_statut,
            new_statut=t.new_statut,
            previous_etape=t.previous_etape,
            new_etape=t.new_etape,
            note=t.note,
            changed_at=t.changed_at,
        )
        for t in transitions
    ]


@router.get(
    "/ati/{ati_id}/changelog",
    summary="Journal complet des modifications ATI",
    description="Combine transitions de statut, modifications de champs et commentaires en un flux chronologique.",
)
async def ati_changelog(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    events = []

    # 1. Transitions
    transitions = (
        db.execute(
            select(ATITransitionORM)
            .where(ATITransitionORM.ati_id == ati_id)
            .order_by(ATITransitionORM.changed_at.asc())
        )
        .scalars()
        .all()
    )
    for t in transitions:
        events.append(
            {
                "type": "transition",
                "timestamp": t.changed_at.isoformat(),
                "actor": t.changed_by,
                "summary": f"{t.previous_statut or '·'} → {t.new_statut or '·'}",
                "detail": t.note or "",
            }
        )

    # 2. Field history
    try:
        field_changes = get_field_history(db, ati_id)
        for fc in field_changes:
            events.append(
                {
                    "type": "field_change",
                    "timestamp": fc.get("changed_at", ""),
                    "actor": fc.get("changed_by", ""),
                    "summary": f"Champ '{fc.get('field', '')}': {fc.get('old_value', '·')} → {fc.get('new_value', '·')}",
                    "detail": "",
                }
            )
    except Exception:
        pass  # Field tracker may not have data

    # 3. Comments
    try:
        from ..models.pnpi import ATICommentORM

        comments = (
            db.execute(
                select(ATICommentORM).where(ATICommentORM.ati_id == ati_id).order_by(ATICommentORM.created_at.asc())
            )
            .scalars()
            .all()
        )
        for c in comments:
            events.append(
                {
                    "type": "comment",
                    "timestamp": c.created_at.isoformat(),
                    "actor": c.author_username,
                    "summary": f"Commentaire{'(interne)' if c.is_internal else ''}",
                    "detail": c.body[:200],
                }
            )
    except Exception:
        pass

    events.sort(key=lambda e: e["timestamp"])
    return {"ati_id": ati_id, "numero_ati": ati.numero_ati, "total_events": len(events), "events": events}


@router.get(
    "/ati/{ati_id}/qrcode", summary="QR Code ATI", description="Genere un QR code PNG pour l'agrement technique."
)
async def download_ati_qrcode(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    import qrcode  # type: ignore

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    if not ati.qr_code_data:
        raise HTTPException(status_code=404, detail="QR code non disponible. L'ATI doit etre approuve.")

    img = qrcode.make(ati.qr_code_data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return FastAPIResponse(
        content=buf.read(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{ati.numero_ati}.png"'},
    )


@router.get(
    "/ati/{ati_id}/pdf", summary="Certificat PDF ATI", description="Genere le certificat PDF d'un agrement approuve."
)
async def download_ati_pdf(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

        op = db.get(OperateurIndustrielORM, ati.operateur_id) if ati.operateur_id else None

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm
        )
        styles = getSampleStyleSheet()
        bleu = colors.HexColor("#003F8F")
        vert = colors.HexColor("#009440")

        title_style = ParagraphStyle("title", parent=styles["Title"], textColor=bleu, fontSize=16, spaceAfter=6)
        sub_style = ParagraphStyle("sub", parent=styles["Normal"], textColor=vert, fontSize=10, spaceAfter=4)
        label_style = ParagraphStyle(
            "label", parent=styles["Normal"], textColor=colors.HexColor("#6b7280"), fontSize=8, spaceAfter=2
        )
        value_style = ParagraphStyle("value", parent=styles["Normal"], fontSize=10, spaceAfter=8)

        story = []

        # Header
        story.append(
            Paragraph(
                "REPUBLIQUE GABONAISE",
                ParagraphStyle("rg", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray),
            )
        )
        story.append(
            Paragraph(
                "Ministere de l'Industrie",
                ParagraphStyle("mi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=colors.gray),
            )
        )
        story.append(
            Paragraph(
                "Plateforme Nationale de Pilotage Industriel (PNPI)",
                ParagraphStyle("pnpi", parent=styles["Normal"], alignment=TA_CENTER, fontSize=9, textColor=bleu),
            )
        )
        story.append(Spacer(1, 0.4 * cm))
        story.append(HRFlowable(width="100%", thickness=2, color=bleu))
        story.append(Spacer(1, 0.3 * cm))

        story.append(Paragraph("Agrement Technique Industriel", title_style))
        story.append(Paragraph(f"N° {ati.numero_ati}", sub_style))
        story.append(Spacer(1, 0.5 * cm))

        # Infos ATI
        statut_colors_map = {
            "approuve": "#10b981",
            "rejete": "#ef4444",
            "soumis": "#f59e0b",
            "en_instruction": "#3b82f6",
            "en_validation": "#8b5cf6",
            "expire": "#9ca3af",
        }
        statut_colors_map.get(ati.statut, "#6b7280")
        data = [
            ["Statut", ati.statut.upper().replace("_", " "), "Priorite", ati.priorite.capitalize()],
            ["Secteur", ati.secteur.capitalize(), "Etape", ati.etape.replace("_", " ").capitalize()],
            [
                "Date soumission",
                ati.date_soumission.strftime("%d/%m/%Y") if ati.date_soumission else "·",
                "SLA (jours)",
                str(ati.sla_jours),
            ],
        ]
        if ati.date_decision:
            data.append(
                [
                    "Date decision",
                    ati.date_decision.strftime("%d/%m/%Y"),
                    "Ref. decision",
                    ati.numero_reference_decision or "·",
                ]
            )

        t = Table(data, colWidths=[4 * cm, 6 * cm, 4 * cm, 3 * cm])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
                    ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                    ("PADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(t)
        story.append(Spacer(1, 0.5 * cm))

        # Operateur
        if op:
            story.append(
                Paragraph(
                    "Operateur industriel",
                    ParagraphStyle(
                        "section", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=8, spaceAfter=4
                    ),
                )
            )
            story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
            op_data = [
                ["Raison sociale", op.raison_sociale, "NIF", op.nif],
                ["Province", op.province.replace("_", " ").capitalize(), "Ville", op.ville or "·"],
                ["Secteur", op.secteur.capitalize(), "Effectif", str(op.effectif_declare or "·")],
            ]
            ot = Table(op_data, colWidths=[4 * cm, 6 * cm, 4 * cm, 3 * cm])
            ot.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f4f6")),
                        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f3f4f6")),
                        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
                        ("PADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.append(ot)
            story.append(Spacer(1, 0.3 * cm))

        # Activite
        story.append(
            Paragraph(
                "Activite industrielle",
                ParagraphStyle(
                    "section", parent=styles["Heading2"], textColor=bleu, fontSize=12, spaceBefore=8, spaceAfter=4
                ),
            )
        )
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e5e7eb")))
        story.append(Paragraph(ati.type_activite, value_style))

        if ati.observations:
            story.append(Paragraph("Observations", label_style))
            story.append(Paragraph(ati.observations, value_style))

        if ati.motif_rejet:
            story.append(
                Paragraph(
                    "Motif de rejet",
                    ParagraphStyle("rej", parent=styles["Normal"], textColor=colors.red, fontSize=9, spaceAfter=4),
                )
            )
            story.append(Paragraph(ati.motif_rejet, value_style))

        # Footer
        story.append(Spacer(1, 1 * cm))
        story.append(HRFlowable(width="100%", thickness=1, color=bleu))
        story.append(
            Paragraph(
                f"Document genere par la PNPI · {now_utc().strftime('%d/%m/%Y %H:%M')} UTC",
                ParagraphStyle(
                    "footer", parent=styles["Normal"], alignment=TA_CENTER, fontSize=7, textColor=colors.gray
                ),
            )
        )

        doc.build(story)
        buf.seek(0)
        filename = f"ATI_{ati.numero_ati.replace('-', '_')}.pdf"
        return FastAPIResponse(
            content=buf.read(),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur generation PDF: {e!s}")


@router.get(
    "/ati/{ati_id}/certificate.pdf",
    summary="Certificat officiel ATI avec QR code",
    description="Genere un certificat officiel PDF avec QR code pour un ATI approuve.",
)
async def download_ati_certificate(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur)
    ),
    db: Session = Depends(get_db),
) -> FastAPIResponse:
    from ..core.certificate import generate_ati_certificate

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    if ati.statut != "approuve":
        raise HTTPException(status_code=400, detail="Certificat disponible uniquement pour les ATI approuves.")

    try:
        op = ati.operateur
        op_name = op.raison_sociale if op else "Inconnu"
        pdf = generate_ati_certificate(
            numero_ati=ati.numero_ati,
            operateur=op_name,
            nif=(op.nif or "") if op else "",
            secteur=ati.secteur,
            province=op.province if op else "",
            type_activite=ati.type_activite,
            date_soumission=ati.date_soumission,
            date_decision=ati.date_decision,
            date_expiration=ati.date_expiration,
            reference_decision=ati.numero_reference_decision,
            sla_jours=ati.sla_jours,
        )

        write_audit_event(
            db,
            actor=current_user.username,
            action="ati.certificate",
            target=ati.id,
            details=f"Certificat ATI {ati.numero_ati} telecharge",
        )
        db.commit()

        return FastAPIResponse(
            content=pdf,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="certificat_ATI_{ati.numero_ati}.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur generation certificat: {e!s}")


@router.post(
    "/ati/bulk-assign",
    summary="Assigner des ATI en lot a un instructeur",
    description="Permet a un directeur ou admin d'assigner plusieurs ATI a un instructeur en une seule operation.",
)
async def bulk_assign_ati(
    payload: _BulkAssignPayload,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
) -> dict:
    if not payload.ati_ids:
        raise HTTPException(status_code=400, detail="La liste ati_ids ne peut pas etre vide.")
    if len(payload.ati_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 ATI par operation.")

    atis = (
        db.execute(select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.id.in_(payload.ati_ids)))
        .scalars()
        .all()
    )

    if len(atis) != len(payload.ati_ids):
        found_ids = {a.id for a in atis}
        missing = [aid for aid in payload.ati_ids if aid not in found_ids]
        raise HTTPException(status_code=404, detail=f"ATI introuvables: {missing}")

    assigned = 0
    for ati in atis:
        if ati.statut in _TERMINAL_STATUTS:
            continue
        prev_instructeur = ati.instructeur_username
        ati.instructeur_username = payload.instructeur_username
        ati.updated_at = now_utc()

        db.add(
            ATITransitionORM(
                id=f"TR-{uuid.uuid4().hex[:16].upper()}",
                ati_id=ati.id,
                changed_by=current_user.username,
                previous_statut=ati.statut,
                new_statut=ati.statut,
                note=f"Assignation instructeur: {prev_instructeur or 'aucun'} -> {payload.instructeur_username}",
                changed_at=now_utc(),
            )
        )
        assigned += 1

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.bulk_assign",
        target=payload.instructeur_username,
        details=f"ati_ids={len(payload.ati_ids)}; assigned={assigned}",
    )
    db.commit()

    return {"assigned": assigned, "skipped": len(atis) - assigned, "instructeur": payload.instructeur_username}


@router.get("/alerts", summary="Alertes PNPI auto-generees")
async def list_pnpi_alerts(
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
) -> list:
    """Genere dynamiquement des alertes a partir des donnees PNPI."""
    alerts = []
    now = now_utc()

    # 1. ATIs en retard SLA (+ predictives : va depasser dans 3j / 7j)
    all_atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    for a in all_atis:
        if a.statut in _TERMINAL_STATUTS:
            continue
        age = max((now.date() - a.date_soumission.date()).days, 0)
        days_to_sla = a.sla_jours - age  # positif = reste du temps, negatif = en retard

        if days_to_sla < 0:
            # En retard confirme
            alerts.append(
                {
                    "type": "sla_overdue",
                    "severity": "high" if age > a.sla_jours * 1.5 else "medium",
                    "title": f"ATI {a.numero_ati} en retard SLA",
                    "message": f"Age : {age}j / SLA : {a.sla_jours}j · {a.type_activite}",
                    "target_id": a.id,
                    "created_at": now.isoformat(),
                }
            )
        elif 0 < days_to_sla <= 3:
            # Predictif : va depasser dans <= 3j
            alerts.append(
                {
                    "type": "sla_predictive",
                    "severity": "medium",
                    "title": f"ATI {a.numero_ati} · SLA dans {days_to_sla}j",
                    "message": f"Va depasser le SLA dans {days_to_sla} jour(s). Traiter maintenant.",
                    "target_id": a.id,
                    "created_at": now.isoformat(),
                }
            )
        elif 3 < days_to_sla <= 7:
            # Predictif moins urgent : SLA approche dans la semaine
            alerts.append(
                {
                    "type": "sla_predictive_week",
                    "severity": "info",
                    "title": f"ATI {a.numero_ati} · SLA dans {days_to_sla}j",
                    "message": f"Echeance SLA dans {days_to_sla}j. A planifier.",
                    "target_id": a.id,
                    "created_at": now.isoformat(),
                }
            )

    # 2. Inspections non conformes recentes (30 derniers jours)
    cutoff = now - timedelta(days=30)
    recent_inspections = (
        db.execute(
            select(InspectionConformiteORM)
            .where(InspectionConformiteORM.statut_conformite == "non_conforme")
            .where(InspectionConformiteORM.date_inspection >= cutoff)
            .order_by(InspectionConformiteORM.date_inspection.desc())
        )
        .scalars()
        .all()
    )
    for insp in recent_inspections:
        alerts.append(
            {
                "type": "non_conforme",
                "severity": "high",
                "title": f"Inspection non conforme · {insp.operateur_id}",
                "message": insp.observations[:120] if insp.observations else "",
                "target_id": insp.id,
                "created_at": insp.date_inspection.isoformat(),
            }
        )

    # 3. ATIs expirant dans les 90 prochains jours
    now.date() + timedelta(days=90)
    for a in all_atis:
        if a.statut == "approuve" and a.date_expiration:
            days_left = (a.date_expiration.date() - now.date()).days
            if 0 < days_left <= 90:
                sev = "critical" if days_left <= 30 else "medium"
                alerts.append(
                    {
                        "type": "expiring_soon",
                        "severity": sev,
                        "title": f"ATI {a.numero_ati} expire dans {days_left}j",
                        "message": f"Expiration: {a.date_expiration.date().isoformat()} · {a.type_activite}",
                        "target_id": a.id,
                        "created_at": now.isoformat(),
                    }
                )

    # Sort by severity (critical > high > medium > info)
    severity_order = {"critical": 0, "high": 1, "medium": 2, "info": 3}
    alerts.sort(key=lambda x: severity_order.get(x["severity"], 9))

    return alerts


@router.get("/courriers/templates", summary="Liste des templates de courriers administratifs")
async def list_courrier_templates(
    _: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
):
    from ..core.courriers import COURRIER_TEMPLATES

    return {"templates": [{"id": t["id"], "category": t["category"], "title": t["title"]} for t in COURRIER_TEMPLATES]}


@router.get("/ati/{ati_id}/courriers/{template_id}", summary="Genere un courrier pre-redige pour un ATI")
async def render_courrier(
    ati_id: str,
    template_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    from ..core.courriers import render
    from ..models.pnpi import OperateurIndustrielORM

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    op = db.get(OperateurIndustrielORM, ati.operateur_id)

    age_jours = (now_utc().date() - ati.date_soumission.date()).days
    try:
        result = render(
            template_id,
            {
                "numero_ati": ati.numero_ati,
                "operateur_nom": op.raison_sociale if op else "(operateur)",
                "instructeur_nom": current_user.full_name or current_user.username,
                "date_decision": ati.date_decision.strftime("%d/%m/%Y") if ati.date_decision else "(date)",
                "date_expiration": ati.date_expiration.strftime("%d/%m/%Y") if ati.date_expiration else "(expiration)",
                "numero_reference_decision": ati.numero_reference_decision or "(ref)",
                "age_jours": age_jours,
                "ville": op.ville if op else "Libreville",
            },
        )
    except KeyError:
        raise HTTPException(404, f"Template {template_id} introuvable.")

    return result


@router.post("/ati/{ati_id}/sign-decision", summary="Signer electroniquement la decision finale d'un ATI")
async def sign_decision(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.ministre)),
    db: Session = Depends(get_db),
):
    """Associe une signature manuscrite (data URL base64) a la decision finale de l'ATI.
    Stocke le PNG dans uploads/signatures/{ati_id}/{user}_{timestamp}.png
    et trace dans l'audit.
    """
    import base64
    import re

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")
    # en_validation autorise = signature pre-approbation (workflow exige par l'audit ministeriel).
    if ati.statut not in ("approuve", "rejete", "en_validation"):
        raise HTTPException(
            400, "La signature peut etre apposee en en_validation (avant decision) ou apres approuve/rejete."
        )

    data_url = (data.get("signature_dataurl") or "").strip()
    m = re.match(r"^data:image/png;base64,(.+)$", data_url)
    if not m:
        raise HTTPException(400, "Format de signature invalide (attend data:image/png;base64,...).")

    try:
        png_bytes = base64.b64decode(m.group(1))
    except Exception:
        raise HTTPException(400, "Signature base64 illisible.")

    filename = f"{current_user.username}_{now_utc().strftime('%Y%m%d_%H%M%S')}.png"
    sig_ref = get_storage("uploads/signatures").save(f"{ati_id}/{filename}", png_bytes)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.sign_decision",
        target=ati.numero_ati,
        details=f"Signature {current_user.username} apposee sur decision {ati.statut} (fichier: {filename}, {len(png_bytes)} octets)",
    )
    db.commit()

    return {
        "status": "ok",
        "filename": filename,
        "path": sig_ref,
        "signed_by": current_user.username,
        "signed_at": now_utc().isoformat(),
        "ati_statut": ati.statut,
    }


@router.get("/ati/{ati_id}/assign-suggestion", summary="Suggere le meilleur instructeur pour un ATI (regles auto)")
async def suggest_assignment(
    ati_id: str,
    _: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Scoring : match de nom d'utilisateur sur secteur (instructeur_bois pour bois...)
    + charge actuelle (moins charge = prioritaire) + taux d'approbation.
    """
    from ..models.core import UserAccountORM

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")

    users = db.execute(select(UserAccountORM).where(UserAccountORM.is_active.is_(True))).scalars().all()
    instructeurs = [u for u in users if "instructeur" in (u.roles_csv or "").split(",")]

    candidates = []
    for u in instructeurs:
        # Charge actuelle : ATI non-terminaux assignes
        charge = (
            db.execute(
                select(func.count())
                .select_from(AgrementTechniqueIndustrielORM)
                .where(
                    AgrementTechniqueIndustrielORM.instructeur_username == u.username,
                    AgrementTechniqueIndustrielORM.statut.not_in(list(_TERMINAL_STATUTS)),
                )
            ).scalar()
            or 0
        )

        # Specialisation par username (instructeur_bois, instructeur_mines)
        sector_match = ati.secteur in u.username.lower()

        # Score : sector_match × 100 - charge × 5
        score = (100 if sector_match else 0) - charge * 5

        candidates.append(
            {
                "username": u.username,
                "full_name": u.full_name,
                "charge_actuelle": charge,
                "sector_match": sector_match,
                "score": score,
            }
        )

    candidates.sort(key=lambda x: x["score"], reverse=True)

    return {
        "ati_id": ati_id,
        "numero_ati": ati.numero_ati,
        "secteur": ati.secteur,
        "best_match": candidates[0] if candidates else None,
        "all_candidates": candidates,
    }


@router.post("/ati/{ati_id}/peer-review/request", summary="Demander une relecture par un pair avant decision")
async def request_peer_review(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Marque un ATI comme necessitant une double signature.
    Ajoute un commentaire interne 'peer-review requested'.
    """
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")

    reviewer = (data.get("reviewer_username") or "").strip()
    if not reviewer:
        raise HTTPException(400, "Identifiant du relecteur requis.")
    note = (data.get("note") or "").strip() or f"Relecture demandee a {reviewer}"

    import uuid as _uuid

    from ..models.pnpi import ATICommentORM

    db.add(
        ATICommentORM(
            id=str(_uuid.uuid4()),
            ati_id=ati_id,
            author_username=current_user.username,
            body=f"[PEER-REVIEW] {note}",
            is_internal=True,
        )
    )
    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.peer_review.request",
        target=ati.numero_ati,
        details=f"Reviewer demande : {reviewer}",
    )
    db.commit()
    return {"status": "ok", "ati_id": ati_id, "reviewer": reviewer}


@router.post("/ati/{ati_id}/peer-review/approve", summary="Approuver une relecture par un pair")
async def approve_peer_review(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    """Signe la double validation. Le reviewer doit etre different de l'instructeur d'origine."""
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(404, "ATI introuvable.")

    if ati.instructeur_username == current_user.username:
        raise HTTPException(400, "Vous ne pouvez pas relire un dossier que vous avez instruit.")

    decision = (data.get("decision") or "approuve").lower()
    if decision not in {"approuve", "demande_revision"}:
        raise HTTPException(400, "Decision invalide (approuve | demande_revision).")

    note = (data.get("note") or "").strip() or f"Peer review {decision}"

    import uuid as _uuid

    from ..models.pnpi import ATICommentORM

    db.add(
        ATICommentORM(
            id=str(_uuid.uuid4()),
            ati_id=ati_id,
            author_username=current_user.username,
            body=f"[PEER-REVIEW · {decision.upper()}] {note}",
            is_internal=True,
        )
    )
    write_audit_event(
        db,
        actor=current_user.username,
        action=f"ati.peer_review.{decision}",
        target=ati.numero_ati,
        details=note,
    )
    db.commit()
    return {"status": "ok", "decision": decision}


@router.get("/team/workload", summary="Charge de travail par instructeur (pour directeur)")
async def team_workload(
    _: User = Depends(require_roles(Role.admin, Role.directeur)),
    db: Session = Depends(get_db),
):
    """Liste des instructeurs avec leur charge : ATI actifs, en retard, decides ce mois,
    taux approbation. Permet au directeur de reequilibrer les affectations.
    """
    from ..models.core import UserAccountORM

    # Instructeurs + directeurs
    users = db.execute(select(UserAccountORM).where(UserAccountORM.is_active.is_(True))).scalars().all()
    instructeurs = [u for u in users if "instructeur" in (u.roles_csv or "").split(",")]

    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    out = []
    for user in instructeurs:
        # ATI assignes
        my_atis = (
            db.execute(
                select(AgrementTechniqueIndustrielORM).where(
                    AgrementTechniqueIndustrielORM.instructeur_username == user.username
                )
            )
            .scalars()
            .all()
        )

        actifs = [a for a in my_atis if a.statut not in _TERMINAL_STATUTS]
        en_retard = sum(1 for a in actifs if (now.date() - a.date_soumission.date()).days > a.sla_jours)

        # Transitions faites ce mois
        month_transitions = (
            db.execute(
                select(ATITransitionORM).where(
                    ATITransitionORM.changed_by == user.username,
                    ATITransitionORM.changed_at >= month_start,
                )
            )
            .scalars()
            .all()
        )

        decisions_mois = [t for t in month_transitions if t.new_statut in ("approuve", "rejete")]
        approuves_mois = sum(1 for t in decisions_mois if t.new_statut == "approuve")

        taux_approb = (approuves_mois / len(decisions_mois) * 100) if decisions_mois else None

        # Niveau de charge : vert < 10, orange 10-20, rouge > 20
        if len(actifs) > 20:
            charge_level = "critical"
        elif len(actifs) > 10:
            charge_level = "warning"
        else:
            charge_level = "ok"
        if en_retard >= 3:
            charge_level = "critical"

        out.append(
            {
                "username": user.username,
                "full_name": user.full_name,
                "nb_actifs": len(actifs),
                "nb_en_retard": en_retard,
                "decisions_mois": len(decisions_mois),
                "approuves_mois": approuves_mois,
                "taux_approbation_pct": round(taux_approb, 1) if taux_approb is not None else None,
                "charge_level": charge_level,
            }
        )

    # Trier par charge decroissante
    out.sort(key=lambda x: (x["nb_en_retard"], x["nb_actifs"]), reverse=True)
    return out


@router.get("/ati/{ati_id}/reglementation", summary="Articles reglementaires applicables a un ATI")
async def ati_regulations(
    ati_id: str,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    from ..core.reglementation import get_regulations_for_sector

    return {
        "secteur": ati.secteur,
        "references": get_regulations_for_sector(ati.secteur),
    }


@router.get("/delays-by-sector", summary="Estimation delai traitement par secteur (mediane + moyenne)")
async def delays_by_sector(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retourne pour chaque secteur le delai mediane/moyen des ATI approuves,
    pour permettre a un operateur d'estimer le delai de son prochain dossier.
    """
    decided = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.statut == "approuve",
                AgrementTechniqueIndustrielORM.date_decision.isnot(None),
            )
        )
        .scalars()
        .all()
    )

    by_sector: dict[str, list[int]] = {}
    for a in decided:
        if not a.date_decision:
            continue
        delay = (a.date_decision.date() - a.date_soumission.date()).days
        by_sector.setdefault(a.secteur, []).append(delay)

    out = []
    for sector, delays in by_sector.items():
        s = sorted(delays)
        median = s[len(s) // 2] if s else 0
        avg = sum(s) / len(s) if s else 0
        out.append(
            {
                "secteur": sector,
                "nb_dossiers": len(s),
                "delai_min": s[0] if s else 0,
                "delai_median": median,
                "delai_moyen": round(avg, 1),
                "delai_max": s[-1] if s else 0,
            }
        )

    # Ajouter "all sectors"
    all_delays = [d for dlist in by_sector.values() for d in dlist]
    if all_delays:
        s = sorted(all_delays)
        out.append(
            {
                "secteur": "TOUS",
                "nb_dossiers": len(s),
                "delai_min": s[0],
                "delai_median": s[len(s) // 2],
                "delai_moyen": round(sum(s) / len(s), 1),
                "delai_max": s[-1],
            }
        )

    return sorted(out, key=lambda x: x["secteur"])


@router.get("/me/stats", summary="Statistiques personnelles de l'utilisateur courant")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stats perso : volume traite, taux approbation, delai moyen, SLA, activite recente."""
    now = now_utc()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    # Transitions faites par cet utilisateur
    transitions = (
        db.execute(select(ATITransitionORM).where(ATITransitionORM.changed_by == current_user.username)).scalars().all()
    )

    total_transitions = len(transitions)
    this_month_transitions = sum(1 for t in transitions if as_utc(t.changed_at) >= month_start)
    last_30d_transitions = sum(1 for t in transitions if as_utc(t.changed_at) >= thirty_days_ago)

    # Decisions (transitions vers approuve/rejete)
    decisions = [t for t in transitions if t.new_statut in ("approuve", "rejete")]
    approuves = sum(1 for t in decisions if t.new_statut == "approuve")
    rejetes = sum(1 for t in decisions if t.new_statut == "rejete")
    taux_approbation = (approuves / len(decisions) * 100) if decisions else 0

    # ATIs actuellement assignes
    my_atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM).where(
                AgrementTechniqueIndustrielORM.instructeur_username == current_user.username
            )
        )
        .scalars()
        .all()
    )

    actifs = [a for a in my_atis if a.statut not in ("approuve", "rejete", "expire")]
    en_retard = sum(1 for a in actifs if (now.date() - a.date_soumission.date()).days > a.sla_jours)

    # Delai moyen de decision (sur ATI decides par cet utilisateur)
    decided_atis = []
    for t in decisions:
        ati = db.get(AgrementTechniqueIndustrielORM, t.ati_id)
        if ati and ati.date_decision:
            delay = (ati.date_decision.date() - ati.date_soumission.date()).days
            decided_atis.append({"ati": ati, "delay": delay})

    delai_moyen = sum(d["delay"] for d in decided_atis) / len(decided_atis) if decided_atis else 0

    # Respect SLA personnel
    sla_respecte = sum(1 for d in decided_atis if d["delay"] <= d["ati"].sla_jours)
    taux_sla_perso = (sla_respecte / len(decided_atis) * 100) if decided_atis else 0

    # 5 dernieres actions
    recent = sorted(transitions, key=lambda t: t.changed_at, reverse=True)[:5]
    recent_list = []
    for t in recent:
        ati = db.get(AgrementTechniqueIndustrielORM, t.ati_id)
        recent_list.append(
            {
                "ati_id": t.ati_id,
                "numero_ati": ati.numero_ati if ati else "?",
                "action": f"{t.previous_statut or '?'} -> {t.new_statut}",
                "note": t.note,
                "changed_at": t.changed_at.isoformat(),
            }
        )

    return {
        "username": current_user.username,
        "roles": [r.value for r in current_user.roles],
        "total_transitions": total_transitions,
        "this_month_transitions": this_month_transitions,
        "last_30d_transitions": last_30d_transitions,
        "decisions": len(decisions),
        "approuves": approuves,
        "rejetes": rejetes,
        "taux_approbation_pct": round(taux_approbation, 1),
        "delai_moyen_jours": round(delai_moyen, 1),
        "taux_sla_perso_pct": round(taux_sla_perso, 1),
        "atis_assignes_actifs": len(actifs),
        "atis_assignes_en_retard": en_retard,
        "activite_recente": recent_list,
    }


@router.get("/historique", summary="Historique global des transitions ATI")
async def list_all_transitions(
    limit: int = Query(default=100, le=500),
    changed_by: str | None = Query(default=None),
    date_from: str | None = Query(default=None, description="Date debut ISO (YYYY-MM-DD)"),
    date_to: str | None = Query(default=None, description="Date fin ISO (YYYY-MM-DD)"),
    actor: str | None = Query(default=None, description="Nom d'utilisateur acteur"),
    ati_numero: str | None = Query(default=None, description="Numero ATI (recherche partielle)"),
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
) -> list:
    query = select(ATITransitionORM).order_by(ATITransitionORM.changed_at.desc())
    # Support both changed_by and actor params (actor is the new name)
    effective_actor = actor or changed_by
    if effective_actor:
        query = query.where(ATITransitionORM.changed_by == effective_actor)
    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=UTC)
            query = query.where(ATITransitionORM.changed_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=UTC)
            query = query.where(ATITransitionORM.changed_at <= dt_to)
        except ValueError:
            pass
    if ati_numero:
        # Join to ATI table and filter by numero_ati (partial match)
        query = query.join(AgrementTechniqueIndustrielORM).where(
            AgrementTechniqueIndustrielORM.numero_ati.ilike(f"%{ati_numero}%")
        )
    query = query.limit(limit)
    transitions = db.execute(query).scalars().all()

    return [
        {
            "id": t.id,
            "ati_id": t.ati_id,
            "changed_by": t.changed_by,
            "previous_statut": t.previous_statut,
            "new_statut": t.new_statut,
            "previous_etape": t.previous_etape,
            "new_etape": t.new_etape,
            "note": t.note,
            "changed_at": t.changed_at.isoformat(),
        }
        for t in transitions
    ]


class _BulkApprovePayload(_BaseModel):
    ati_ids: list[str]
    note: str = ""


class _BulkRejectPayload(_BaseModel):
    ati_ids: list[str]
    motif_rejet: str


@router.post(
    "/ati/bulk-approve",
    summary="Approuver des ATI en lot",
    description="Permet a un directeur, admin ou ministre d'approuver plusieurs ATI en validation en une seule operation.",
)
async def bulk_approve(
    payload: _BulkApprovePayload,
    current_user: User = Depends(require_roles(Role.directeur, Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    results: dict = {"approved": [], "errors": []}
    for ati_id in payload.ati_ids:
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if not ati:
            results["errors"].append({"id": ati_id, "error": "ATI introuvable"})
            continue
        if ati.statut not in ("en_validation",):
            results["errors"].append({"id": ati_id, "error": f"Statut actuel: {ati.statut}, transition impossible"})
            continue
        try:
            _enforce_signature_before_approval(ati)
        except HTTPException as exc:
            results["errors"].append({"id": ati_id, "error": exc.detail})
            continue
        now = now_utc()
        ati.statut = "approuve"
        ati.etape = "decision"
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )
        ati.updated_at = now
        # Record transition
        transition = ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut="en_validation",
            new_statut="approuve",
            note=payload.note or "Approbation groupee",
            changed_at=now,
        )
        db.add(transition)
        results["approved"].append(ati.id)

    if results["approved"]:
        write_audit_event(
            db,
            actor=current_user.username,
            action="ati.bulk_approve",
            target=f"{len(results['approved'])} ATIs",
            details=f"IDs: {', '.join(results['approved'][:10])}",
        )
        db.commit()
    return results


@router.post(
    "/ati/bulk-reject",
    summary="Rejeter des ATI en lot",
    description="Permet a un directeur, admin ou ministre de rejeter plusieurs ATI en validation en une seule operation.",
)
async def bulk_reject(
    payload: _BulkRejectPayload,
    current_user: User = Depends(require_roles(Role.directeur, Role.admin, Role.ministre)),
    db: Session = Depends(get_db),
):
    results: dict = {"rejected": [], "errors": []}
    for ati_id in payload.ati_ids:
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if not ati:
            results["errors"].append({"id": ati_id, "error": "ATI introuvable"})
            continue
        if ati.statut not in ("en_validation",):
            results["errors"].append({"id": ati_id, "error": f"Statut actuel: {ati.statut}, transition impossible"})
            continue
        now = now_utc()
        ati.statut = "rejete"
        ati.etape = "decision"
        ati.date_decision = now
        ati.motif_rejet = payload.motif_rejet
        ati.updated_at = now
        # Record transition
        transition = ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut="en_validation",
            new_statut="rejete",
            note=f"Rejet groupe: {payload.motif_rejet}",
            changed_at=now,
        )
        db.add(transition)
        results["rejected"].append(ati.id)

    if results["rejected"]:
        write_audit_event(
            db,
            actor=current_user.username,
            action="ati.bulk_reject",
            target=f"{len(results['rejected'])} ATIs",
            details=f"IDs: {', '.join(results['rejected'][:10])}",
        )
        db.commit()
    return results


class _BulkStatusPayload(_BaseModel):
    ati_ids: list[str]
    new_statut: str
    note: str = ""


@router.post(
    "/ati/bulk-transition",
    summary="Transition de statut en masse",
    description="Permet de faire passer plusieurs ATI a un nouveau statut (ex: soumis -> en_instruction).",
)
async def bulk_transition(
    payload: _BulkStatusPayload,
    current_user: User = Depends(require_roles(Role.directeur, Role.admin, Role.ministre, Role.instructeur)),
    db: Session = Depends(get_db),
):
    valid_transitions = {
        "soumis": ["en_instruction"],
        "en_instruction": ["en_validation"],
        "en_validation": ["approuve", "rejete"],
    }
    results: dict = {"transitioned": [], "errors": []}
    now = now_utc()

    for ati_id in payload.ati_ids[:100]:  # Cap at 100
        ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
        if not ati:
            results["errors"].append({"id": ati_id, "error": "ATI introuvable"})
            continue
        allowed = valid_transitions.get(ati.statut, [])
        if payload.new_statut not in allowed:
            results["errors"].append(
                {
                    "id": ati_id,
                    "error": f"Transition {ati.statut} -> {payload.new_statut} non autorisee",
                }
            )
            continue

        old_statut = ati.statut
        ati.statut = payload.new_statut
        ati.updated_at = now
        if payload.new_statut in ("approuve", "rejete"):
            ati.etape = "decision"
            ati.date_decision = now
            if payload.new_statut == "approuve":
                ati.date_expiration = now + timedelta(days=3 * 365)

        transition = ATITransitionORM(
            id=f"TR-{uuid.uuid4().hex[:10].upper()}",
            ati_id=ati.id,
            changed_by=current_user.username,
            previous_statut=old_statut,
            new_statut=payload.new_statut,
            note=payload.note or f"Transition groupee -> {payload.new_statut}",
            changed_at=now,
        )
        db.add(transition)
        results["transitioned"].append(ati.id)

    if results["transitioned"]:
        write_audit_event(
            db,
            actor=current_user.username,
            action="ati.bulk_transition",
            target=f"{len(results['transitioned'])} ATIs -> {payload.new_statut}",
            details=f"IDs: {', '.join(results['transitioned'][:10])}",
        )
        db.commit()
    return results


# ─── Public verification (no auth · used by QR code scanning) ─────────────


@router.get(
    "/ati/verify/{numero_ati}",
    summary="Verification publique d'un ATI",
    description="Endpoint public sans authentification. Utilise par le scan du QR code sur le certificat ATI.",
)
async def verify_ati_public(numero_ati: str, db: Session = Depends(get_db)):
    """Public endpoint · no authentication required. Used by QR code scanning."""
    ati = db.execute(
        select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.numero_ati == numero_ati)
    ).scalar_one_or_none()

    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    op = ati.operateur
    now = now_utc()

    # Check expiration
    is_expired = False
    if ati.date_expiration and ati.date_expiration.date() < now.date():
        is_expired = True

    # Masquage du NIF en public : seuls les 4 derniers chars sont visibles.
    # Format ex: "GA-NIF-12345678" -> "***-****-5678"
    nif_masked = None
    if op and op.nif:
        last4 = op.nif[-4:] if len(op.nif) >= 4 else op.nif
        nif_masked = f"***-****-{last4}"

    return {
        "valid": ati.statut == "approuve" and not is_expired,
        "numero_ati": ati.numero_ati,
        "statut": "expire" if is_expired else ati.statut,
        "operateur": op.raison_sociale if op else None,
        "nif_masque": nif_masked,
        "secteur": ati.secteur,
        "type_activite": ati.type_activite,
        "date_approbation": ati.date_decision.isoformat() if ati.date_decision else None,
        "date_expiration": ati.date_expiration.isoformat() if ati.date_expiration else None,
        "verified_at": now.isoformat(),
    }


@router.post("/ati/{ati_id}/favorite", summary="Epingler / desepingler un ATI")
async def toggle_favorite(
    ati_id: str,
    current_user: User = Depends(
        require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.operateur, Role.inspecteur)
    ),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)

    existing = db.execute(
        select(UserFavoriteORM).where(
            UserFavoriteORM.username == current_user.username,
            UserFavoriteORM.ati_id == ati_id,
        )
    ).scalar_one_or_none()

    if existing:
        db.delete(existing)
        db.commit()
        return {"status": "removed", "ati_id": ati_id}

    fav = UserFavoriteORM(
        id=str(uuid.uuid4()),
        username=current_user.username,
        ati_id=ati_id,
    )
    db.add(fav)
    db.commit()
    return {"status": "added", "ati_id": ati_id, "id": fav.id}


# ─── ATI Comments / Annotations ─────────────────────────────────────────


@router.get("/ati/{ati_id}/comments", summary="Commentaires d'un ATI")
async def get_ati_comments(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    query = select(ATICommentORM).where(ATICommentORM.ati_id == ati_id)
    # Operators only see non-internal comments
    user_roles = _user_role_values(current_user)
    if user_roles == {"operateur"}:
        query = query.where(ATICommentORM.is_internal.is_(False))

    comments = db.execute(query.order_by(ATICommentORM.created_at.asc())).scalars().all()
    return {
        "comments": [
            {
                "id": c.id,
                "author": c.author_username,
                "body": c.body,
                "is_internal": c.is_internal,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments
        ]
    }


@router.post("/ati/{ati_id}/comments", summary="Ajouter un commentaire a un ATI")
async def add_ati_comment(
    ati_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    body = (data.get("body") or "").strip()
    if not body:
        raise HTTPException(400, "Le commentaire ne peut pas etre vide.")

    is_internal = bool(data.get("is_internal", False))
    # Only staff can post internal comments
    if is_internal and _user_role_values(current_user) == {"operateur"}:
        is_internal = False

    comment = ATICommentORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        author_username=current_user.username,
        body=body,
        is_internal=is_internal,
    )
    db.add(comment)
    db.commit()

    return {"status": "ok", "id": comment.id}


# ─── Kanban transition endpoint ──────────────────────────────────────────


@router.post(
    "/ati/{ati_id}/transition",
    summary="Changer le statut d'un ATI (Kanban)",
    description="Endpoint simplifie pour le drag-and-drop Kanban. Effectue une transition de statut.",
)
async def transition_ati_kanban(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur, Role.ministre)),
    db: Session = Depends(get_db),
):
    new_statut = data.get("new_statut")
    if not new_statut:
        raise HTTPException(400, "new_statut est requis.")

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")

    prev_statut = ati.statut
    allowed = _STATUT_TRANSITIONS.get(ati.statut, set())
    if new_statut not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Transition invalide: {ati.statut} -> {new_statut}. Transitions autorisees: {', '.join(allowed) or 'aucune'}",
        )

    now = now_utc()
    ati.statut = new_statut
    ati.updated_at = now

    # Handle approval
    if new_statut == "approuve" and not ati.date_decision:
        ati.date_decision = now
        ati.date_expiration = now + timedelta(days=3 * 365)
        ati.qr_code_data = (
            f"PNPI-QR|{ati.numero_ati}|{ati.operateur_id}|"
            f"{ati.date_decision.date().isoformat()}|{ati.date_expiration.date().isoformat()}"
        )

    # Handle rejection
    if new_statut == "rejete" and not ati.date_decision:
        ati.date_decision = now

    transition = ATITransitionORM(
        id=f"TR-{uuid.uuid4().hex[:10].upper()}",
        ati_id=ati.id,
        changed_by=current_user.username,
        previous_statut=prev_statut,
        new_statut=new_statut,
        note=data.get("note", "Transition via Kanban"),
        changed_at=now,
    )
    db.add(transition)

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.transition_kanban",
        target=ati_id,
        details=f"statut:{prev_statut}->{new_statut}",
    )
    db.commit()

    return {"status": "ok", "previous": prev_statut, "new": new_statut}


# ─── ATI Tags ─────────────────────────────────────────────────────────────


@router.get("/ati/{ati_id}/tags")
async def get_ati_tags(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    tags = (
        db.execute(select(ATITagORM).where(ATITagORM.ati_id == ati_id).order_by(ATITagORM.created_at.asc()))
        .scalars()
        .all()
    )
    return {"tags": [{"id": t.id, "label": t.label, "color": t.color, "created_by": t.created_by} for t in tags]}


@router.post("/ati/{ati_id}/tags")
async def add_ati_tag(
    ati_id: str,
    data: dict,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    label = (data.get("label") or "").strip()[:50]
    if not label:
        raise HTTPException(400, "Label requis.")
    color = data.get("color", "#0c7eb4")

    tag = ATITagORM(
        id=str(uuid.uuid4()),
        ati_id=ati_id,
        label=label,
        color=color,
        created_by=current_user.username,
    )
    db.add(tag)
    db.commit()
    return {"status": "ok", "id": tag.id}


@router.delete("/ati/tags/{tag_id}")
async def remove_ati_tag(
    tag_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    tag = db.get(ATITagORM, tag_id)
    if not tag:
        raise HTTPException(404, "Tag introuvable.")
    db.delete(tag)
    db.commit()
    return {"status": "ok"}


@router.get("/ati/{ati_id}/risk")
async def get_ati_risk(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    return assess_risk(db, ati_id)


@router.get("/ati/{ati_id}/field-history")
async def get_ati_field_history(
    ati_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati:
        raise HTTPException(status_code=404, detail="ATI introuvable.")
    check_ati_access(ati, current_user)
    history = get_field_history(db, "ati", ati_id)
    return {"history": history}


@router.post("/ati/{ati_id}/renew")
async def renew_ati(
    ati_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a renewal application from an existing approved/expired ATI."""
    original = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not original:
        raise HTTPException(404, "ATI introuvable.")
    check_ati_access(original, current_user)
    if original.statut not in ("approuve", "expire"):
        raise HTTPException(400, "Seuls les ATI approuves ou expires peuvent etre renouveles.")

    # Generate new ATI number with REN prefix and atomic max-based sequencing.
    year = now_utc().year
    prefix = f"ATI-REN-{year}-"
    max_num = db.execute(
        select(func.max(AgrementTechniqueIndustrielORM.numero_ati)).where(
            AgrementTechniqueIndustrielORM.numero_ati.like(f"{prefix}%")
        )
    ).scalar()
    seq = int(max_num.split("-")[-1]) + 1 if max_num else 1
    numero = f"{prefix}{seq:04d}"

    now = now_utc()
    renewed = AgrementTechniqueIndustrielORM(
        id=str(uuid.uuid4()),
        numero_ati=numero,
        operateur_id=original.operateur_id,
        type_demande="renouvellement",
        secteur=original.secteur,
        type_activite=data.get("type_activite", original.type_activite),
        observations=data.get("observations", f"Renouvellement de {original.numero_ati}"),
        statut="soumis",
        etape="reception",
        date_soumission=now,
        sla_jours=original.sla_jours,
        payment_status="prototype",
        # created_by indispensable pour preserver l'acces operateur via check_ati_access.
        created_by=current_user.username,
        updated_at=now,
    )
    db.add(renewed)
    db.flush()

    # Transition initiale (creation) tracee dans l'historique.
    db.add(
        ATITransitionORM(
            id=str(uuid.uuid4()),
            ati_id=renewed.id,
            changed_by=current_user.username,
            previous_statut=None,
            new_statut="soumis",
            previous_etape=None,
            new_etape="reception",
            note=f"Renouvellement automatique de {original.numero_ati}",
            changed_at=now,
        )
    )

    write_audit_event(
        db,
        actor=current_user.username,
        action="ati.renew",
        target=renewed.id,
        details=f"Renouvellement de {original.numero_ati} -> {numero}",
    )
    db.commit()

    return {
        "status": "ok",
        "new_ati_id": renewed.id,
        "numero_ati": numero,
        "original_ati": original.numero_ati,
    }


@router.get("/ati/{ati_id}/recommendation")
async def get_ati_recommendation(
    ati_id: str,
    current_user: User = Depends(require_roles(Role.admin, Role.directeur, Role.instructeur)),
    db: Session = Depends(get_db),
):
    return recommend_decision(db, ati_id)


@router.get("/ati/{ati_id}/product-qr")
async def generate_product_qr(
    ati_id: str,
    product_name: str = Query(...),
    batch_number: str = Query(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a QR code for product authenticity verification."""
    import qrcode  # type: ignore

    ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
    if not ati or ati.statut != "approuve":
        raise HTTPException(400, "ATI approuve requis pour generer un QR produit.")
    check_ati_access(ati, current_user)

    verify_url = (
        f"https://pnpi-gabon.ga/verify/product?ati={ati.numero_ati}&product={product_name}&batch={batch_number}"
    )

    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#003F8F", back_color="white")

    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    return FastAPIResponse(
        content=buf.read(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_product_{ati.numero_ati}_{batch_number}.png"'},
    )

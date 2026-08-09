"""PNPI · Referentiel Industriel National (RIN)."""

from __future__ import annotations

import csv
import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    DocumentDossierORM,
    InspectionConformiteORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINProduitORM,
    RINRepresentantORM,
    RINRessourceORM,
    RINSiteIndustrielORM,
)
from ..schemas.pnpi import (
    RINInvestissementCreate,
    RINInvestissementRead,
    RINInvestissementUpdate,
    RINProduitCreate,
    RINProduitRead,
    RINProduitUpdate,
    RINProfileRead,
    RINRepresentantCreate,
    RINRepresentantRead,
    RINRepresentantUpdate,
    RINRessourceCreate,
    RINRessourceRead,
    RINRessourceUpdate,
    RINSiteCreate,
    RINSiteRead,
    RINSiteUpdate,
    RINTransitionUpdate,
)

router = APIRouter(prefix="/pnpi/rin", tags=["RIN"])

_READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur, Role.operateur)
_WRITE_ROLES = (Role.admin, Role.directeur, Role.instructeur, Role.operateur)
_VALIDATE_ROLES = (Role.admin, Role.directeur, Role.instructeur)
_PRIVILEGED = {"admin", "ministre", "directeur", "instructeur", "inspecteur"}
_VALID_STATUSES = {"brouillon", "soumis", "verifie", "valide", "archive"}


MODEL_BY_KIND = {
    "representants": RINRepresentantORM,
    "sites": RINSiteIndustrielORM,
    "produits": RINProduitORM,
    "ressources": RINRessourceORM,
    "investissements": RINInvestissementORM,
}

READ_SCHEMA_BY_KIND = {
    "representants": RINRepresentantRead,
    "sites": RINSiteRead,
    "produits": RINProduitRead,
    "ressources": RINRessourceRead,
    "investissements": RINInvestissementRead,
}

UPDATE_SCHEMA_BY_KIND = {
    "representants": RINRepresentantUpdate,
    "sites": RINSiteUpdate,
    "produits": RINProduitUpdate,
    "ressources": RINRessourceUpdate,
    "investissements": RINInvestissementUpdate,
}


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


def _role_values(user: User) -> set[str]:
    return {r.value if hasattr(r, "value") else str(r) for r in user.roles}


def _ensure_operateur(db: Session, operateur_id: str) -> OperateurIndustrielORM:
    op = db.get(OperateurIndustrielORM, operateur_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operateur introuvable.")
    return op


def _operator_has_link(db: Session, operateur_id: str, username: str) -> bool:
    return (
        db.execute(
            select(AgrementTechniqueIndustrielORM.id)
            .where(AgrementTechniqueIndustrielORM.operateur_id == operateur_id)
            .where(AgrementTechniqueIndustrielORM.created_by == username)
            .limit(1)
        ).scalar()
        is not None
    )


def _ensure_read_access(db: Session, operateur_id: str, user: User) -> None:
    roles = _role_values(user)
    if roles & _PRIVILEGED:
        return
    if "operateur" in roles and _operator_has_link(db, operateur_id, user.username):
        return
    raise HTTPException(status_code=403, detail="Acces RIN non autorise pour cet operateur.")


def _ensure_write_access(db: Session, operateur_id: str, user: User) -> None:
    roles = _role_values(user)
    if roles & {"admin", "directeur", "instructeur"}:
        return
    if "operateur" in roles and _operator_has_link(db, operateur_id, user.username):
        return
    raise HTTPException(status_code=403, detail="Ecriture RIN non autorisee pour cet operateur.")


def _query_active(db: Session, model: Any, operateur_id: str):
    return (
        db.execute(
            select(model)
            .where(model.operateur_id == operateur_id)
            .where(model.deleted_at.is_(None))
            .order_by(model.created_at.desc())
        )
        .scalars()
        .all()
    )


def _workflow_counts(*collections: list[Any]) -> dict[str, int]:
    counts = {key: 0 for key in ["brouillon", "soumis", "verifie", "valide", "archive"]}
    for items in collections:
        for item in items:
            counts[getattr(item, "statut_validation", "brouillon")] = (
                counts.get(getattr(item, "statut_validation", "brouillon"), 0) + 1
            )
    return counts


def _safe_label(value: str | None) -> str:
    if not value:
        return "non_precise"
    return value.strip().lower().replace(" ", "_")


def _grade(score: int | float) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "E"


def _risk_level(score: int | float, non_conformities: int, overdue_atis: int) -> str:
    if non_conformities or overdue_atis or score < 45:
        return "élevé"
    if score < 70:
        return "modéré"
    return "maîtrisé"


def _score_profile(
    *,
    representants: list[RINRepresentantORM],
    sites: list[RINSiteIndustrielORM],
    produits: list[RINProduitORM],
    ressources: list[RINRessourceORM],
    investissements: list[RINInvestissementORM],
) -> tuple[int, list[str]]:
    score = 0
    manques: list[str] = []

    if representants:
        score += 12
        if any(r.est_contact_principal for r in representants):
            score += 5
        else:
            manques.append("Contact principal à désigner")
        if any(r.email or r.telephone for r in representants):
            score += 3
    else:
        manques.append("Représentants / responsables à renseigner")

    if sites:
        score += 16
        if any(s.latitude is not None and s.longitude is not None for s in sites):
            score += 7
        else:
            manques.append("Coordonnées GPS des sites à compléter")
        if any(s.superficie_ha for s in sites):
            score += 2
    else:
        manques.append("Sites industriels à cartographier")

    if produits:
        score += 14
        if any(p.capacite_annuelle for p in produits):
            score += 6
        else:
            manques.append("Capacités annuelles à renseigner")
        if any(p.production_annuelle for p in produits):
            score += 3
        if any(p.certification for p in produits):
            score += 2
    else:
        manques.append("Produits et capacités de production à déclarer")

    if ressources:
        score += 12
        if any(r.type_ressource == "energie" for r in ressources):
            score += 4
        else:
            manques.append("Données énergie à documenter")
        if any(r.type_ressource == "matiere_premiere" for r in ressources):
            score += 4
        else:
            manques.append("Matières premières à documenter")
    else:
        manques.append("Matières premières et énergie à documenter")

    if investissements:
        score += 10
        current_year = now_utc().year
        if any(i.annee and i.annee >= current_year - 2 for i in investissements):
            score += 5
        if any(i.montant_fcfa for i in investissements):
            score += 3
        if any(i.emplois_prevus for i in investissements):
            score += 2
    else:
        manques.append("Investissements industriels à suivre")

    validated_items = [
        item
        for collection in [representants, sites, produits, ressources, investissements]
        for item in collection
        if getattr(item, "statut_validation", "") == "valide"
    ]
    all_items = [
        item for collection in [representants, sites, produits, ressources, investissements] for item in collection
    ]
    if all_items and len(validated_items) / len(all_items) >= 0.5:
        score += 5
    elif all_items:
        manques.append("Validation métier des données RIN à finaliser")

    return min(score, 100), manques[:6]


def _get_profile(db: Session, operateur_id: str) -> RINProfileRead:
    representants = _query_active(db, RINRepresentantORM, operateur_id)
    sites = _query_active(db, RINSiteIndustrielORM, operateur_id)
    produits = _query_active(db, RINProduitORM, operateur_id)
    ressources = _query_active(db, RINRessourceORM, operateur_id)
    investissements = _query_active(db, RINInvestissementORM, operateur_id)
    score, manques = _score_profile(
        representants=representants,
        sites=sites,
        produits=produits,
        ressources=ressources,
        investissements=investissements,
    )
    return RINProfileRead(
        operateur_id=operateur_id,
        score_structuration=score,
        representants=[RINRepresentantRead.model_validate(item) for item in representants],
        sites=[RINSiteRead.model_validate(item) for item in sites],
        produits=[RINProduitRead.model_validate(item) for item in produits],
        ressources=[RINRessourceRead.model_validate(item) for item in ressources],
        investissements=[RINInvestissementRead.model_validate(item) for item in investissements],
        manques=manques,
        workflow_counts=_workflow_counts(representants, sites, produits, ressources, investissements),
    )


def _build_360_profile(db: Session, op: OperateurIndustrielORM) -> dict[str, object]:
    representants = _query_active(db, RINRepresentantORM, op.id)
    sites = _query_active(db, RINSiteIndustrielORM, op.id)
    produits = _query_active(db, RINProduitORM, op.id)
    ressources = _query_active(db, RINRessourceORM, op.id)
    investissements = _query_active(db, RINInvestissementORM, op.id)
    atis = (
        db.execute(
            select(AgrementTechniqueIndustrielORM)
            .where(AgrementTechniqueIndustrielORM.operateur_id == op.id)
            .order_by(AgrementTechniqueIndustrielORM.date_soumission.desc())
        )
        .scalars()
        .all()
    )
    inspections = (
        db.execute(
            select(InspectionConformiteORM)
            .where(InspectionConformiteORM.operateur_id == op.id)
            .order_by(InspectionConformiteORM.date_inspection.desc())
        )
        .scalars()
        .all()
    )
    declarations = (
        db.execute(
            select(ONIPeriodicDeclarationORM)
            .where(ONIPeriodicDeclarationORM.operateur_id == op.id)
            .order_by(ONIPeriodicDeclarationORM.submitted_at.desc())
        )
        .scalars()
        .all()
    )
    documents = (
        db.execute(
            select(DocumentDossierORM)
            .where(DocumentDossierORM.ati_id.in_([ati.id for ati in atis] or ["__none__"]))
            .order_by(DocumentDossierORM.uploaded_at.desc())
        )
        .scalars()
        .all()
    )

    struct_score, missing = _operator_360_score(
        op,
        representants=representants,
        sites=sites,
        produits=produits,
        ressources=ressources,
        investissements=investissements,
        atis=atis,
        inspections=inspections,
        declarations=declarations,
    )
    approved_atis = [ati for ati in atis if ati.statut == "approuve"]
    active_atis = [ati for ati in atis if ati.statut in {"soumis", "en_instruction", "en_validation"}]
    non_conformities = [
        inspection
        for inspection in inspections
        if _safe_label(inspection.statut_conformite) in {"non_conforme", "partiel"}
    ]
    latest_declaration = declarations[0] if declarations else None
    total_investment = sum(item.montant_fcfa or 0 for item in investissements)
    expected_jobs = sum(item.emplois_prevus or 0 for item in investissements)
    production_total = sum(item.production_annuelle or 0 for item in produits)
    capacity_total = sum(item.capacite_annuelle or 0 for item in produits)
    capacity_usage = round((production_total / capacity_total) * 100, 1) if capacity_total else 0
    imported_resources = [item for item in ressources if item.dependance_import]
    validated_items = sum(
        1
        for collection in [representants, sites, produits, ressources, investissements]
        for item in collection
        if item.statut_validation == "valide"
    )
    all_items_count = sum(
        len(collection) for collection in [representants, sites, produits, ressources, investissements]
    )
    validation_rate = round((validated_items / all_items_count) * 100, 1) if all_items_count else 0

    risks = []
    if missing:
        risks.append(
            {
                "niveau": "modéré",
                "titre": "Fiche RIN incomplète",
                "detail": "Certaines données pivots doivent être complétées pour fiabiliser les décisions.",
            }
        )
    if non_conformities:
        risks.append(
            {
                "niveau": "élevé",
                "titre": "Conformité à surveiller",
                "detail": f"{len(non_conformities)} inspection(s) non conformes ou partielles à suivre.",
            }
        )
    if imported_resources:
        risks.append(
            {
                "niveau": "modéré",
                "titre": "Dépendance aux intrants importés",
                "detail": f"{len(imported_resources)} ressource(s) déclarée(s) avec dépendance import.",
            }
        )
    if not approved_atis:
        risks.append(
            {
                "niveau": "élevé",
                "titre": "Aucune ATI approuvée",
                "detail": "L'opérateur ne dispose pas encore d'une autorisation approuvée liée au RIN.",
            }
        )

    decision_cards = [
        {
            "decision": "Priorité de suivi",
            "lecture": "haute" if risks and any(r["niveau"] == "élevé" for r in risks) else "normale",
            "justification": "Basée sur le score RIN, les inspections, les ATI et les données ressources.",
        },
        {
            "decision": "Potentiel d'investissement",
            "lecture": "à accompagner" if total_investment or expected_jobs else "à qualifier",
            "justification": f"{total_investment:,} FCFA suivis et {expected_jobs} emploi(s) prévu(s).".replace(
                ",", " "
            ),
        },
        {
            "decision": "Qualité de donnée",
            "lecture": "fiable" if struct_score >= 75 else "à consolider",
            "justification": f"Score 360° {struct_score}/100, validation métier {validation_rate}%.",
        },
    ]

    timeline = []
    for ati in atis[:5]:
        timeline.append(
            {
                "date": ati.date_soumission.isoformat(),
                "type": "ATI",
                "titre": ati.numero_ati,
                "detail": f"{ati.statut} · {ati.etape} · {ati.type_demande}",
                "niveau": "positif" if ati.statut == "approuve" else "information",
            }
        )
    for inspection in inspections[:5]:
        timeline.append(
            {
                "date": inspection.date_inspection.isoformat(),
                "type": "Inspection",
                "titre": f"Inspection {inspection.statut_conformite}",
                "detail": inspection.observations[:180],
                "niveau": "alerte" if inspection in non_conformities else "positif",
            }
        )
    for item in investissements[:5]:
        timeline.append(
            {
                "date": item.created_at.isoformat(),
                "type": "Investissement",
                "titre": item.intitule,
                "detail": f"{item.statut} · {item.montant_fcfa or 0:,} FCFA".replace(",", " "),
                "niveau": "information",
            }
        )
    timeline.sort(key=lambda event: str(event["date"]), reverse=True)

    next_actions = [
        {
            "priorite": "haute",
            "action": missing[0] if missing else "Maintenir la fiche RIN à jour après chaque événement métier.",
        },
        {
            "priorite": "moyenne",
            "action": "Valider les sous-fiches RIN en attente pour renforcer l'opposabilité interne.",
        },
        {
            "priorite": "moyenne",
            "action": "Relier les données ONI périodiques à la fiche pour suivre production, emplois et énergie.",
        },
    ]

    return {
        "generated_at": now_utc().isoformat(),
        "operateur": {
            "id": op.id,
            "nif_gabon": op.nif_gabon,
            "raison_sociale": op.raison_sociale,
            "secteur": op.secteur,
            "province": op.province,
            "ville": op.ville,
            "is_active": op.is_active,
            "effectif_declare": op.effectif_declare,
            "geolocalise": op.latitude is not None and op.longitude is not None,
        },
        "score_360": struct_score,
        "grade": _grade(struct_score),
        "niveau_risque": _risk_level(struct_score, len(non_conformities), len(active_atis)),
        "stats": {
            "atis_total": len(atis),
            "atis_approuves": len(approved_atis),
            "atis_en_cours": len(active_atis),
            "inspections": len(inspections),
            "non_conformites": len(non_conformities),
            "documents": len(documents),
            "declarations_oni": len(declarations),
            "produits": len(produits),
            "sites": len(sites),
            "ressources": len(ressources),
            "investissement_fcfa": total_investment,
            "emplois_prevus": expected_jobs,
            "taux_validation_rin": validation_rate,
            "taux_utilisation_capacite": capacity_usage,
            "ressources_importees": len(imported_resources),
        },
        "synthese": {
            "identite": f"{op.raison_sociale} · {op.secteur} · {op.ville}, {op.province}",
            "activite": (
                f"{len(produits)} produit(s), capacité utilisée estimée {capacity_usage}%."
                if produits
                else "Activité industrielle à détailler dans la sous-fiche produits."
            ),
            "conformite": (
                f"{len(inspections)} inspection(s), {len(non_conformities)} anomalie(s) à suivre."
                if inspections
                else "Aucune inspection liée pour le moment."
            ),
            "oni": (
                f"Dernière déclaration ONI {latest_declaration.period}, production {latest_declaration.production_volume} {latest_declaration.production_unit}."
                if latest_declaration
                else "Aucune déclaration ONI rattachée."
            ),
        },
        "manques": missing,
        "risques": risks,
        "decisions_possibles": decision_cards,
        "timeline": timeline[:10],
        "actions_prioritaires": next_actions,
        "lecture_executive": (
            f"La fiche 360° consolide l'opérateur {op.raison_sociale} autour du DIUN/RIN : identité, ATI, "
            f"contrôles, documents, données ONI, ressources et investissements. Score actuel : {struct_score}/100."
        ),
    }


def _coverage_status(label: str, count: int, total: int, description: str) -> dict:
    ratio = count / total if total else 0
    if ratio >= 0.65:
        statut = "couvert"
    elif ratio > 0:
        statut = "partiel"
    else:
        statut = "à compléter"
    return {
        "label": label,
        "statut": statut,
        "couverture_pct": round(ratio * 100),
        "elements": count,
        "total_reference": total,
        "description": description,
    }


def _operator_360_score(
    op: OperateurIndustrielORM,
    *,
    representants: list[RINRepresentantORM],
    sites: list[RINSiteIndustrielORM],
    produits: list[RINProduitORM],
    ressources: list[RINRessourceORM],
    investissements: list[RINInvestissementORM],
    atis: list[AgrementTechniqueIndustrielORM],
    inspections: list[InspectionConformiteORM],
    declarations: list[ONIPeriodicDeclarationORM],
) -> tuple[int, list[str]]:
    score, missing = _score_profile(
        representants=representants,
        sites=sites,
        produits=produits,
        ressources=ressources,
        investissements=investissements,
    )
    if op.nif_gabon and op.raison_sociale and op.secteur and op.province:
        score = min(100, score + 5)
    else:
        missing.append("Identité opérateur à fiabiliser")
    if atis:
        score = min(100, score + 5)
    else:
        missing.append("Autorisation ATI à relier")
    if inspections:
        score = min(100, score + 5)
    else:
        missing.append("Inspection ou contrôle à planifier")
    if declarations:
        score = min(100, score + 5)
    else:
        missing.append("Déclaration ONI à collecter")
    return min(score, 100), missing[:6]


@router.get("/cockpit", summary="Cockpit national du Référentiel Industriel National")
async def rin_cockpit(
    _: User = Depends(require_roles(Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)),
    db: Session = Depends(get_db),
):
    operators = db.execute(select(OperateurIndustrielORM)).scalars().all()
    representants = (
        db.execute(select(RINRepresentantORM).where(RINRepresentantORM.deleted_at.is_(None))).scalars().all()
    )
    sites = db.execute(select(RINSiteIndustrielORM).where(RINSiteIndustrielORM.deleted_at.is_(None))).scalars().all()
    produits = db.execute(select(RINProduitORM).where(RINProduitORM.deleted_at.is_(None))).scalars().all()
    ressources = db.execute(select(RINRessourceORM).where(RINRessourceORM.deleted_at.is_(None))).scalars().all()
    investissements = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    documents = db.execute(select(DocumentDossierORM)).scalars().all()

    total = max(len(operators), 1)
    representants_by_operator: dict[str, list[RINRepresentantORM]] = {}
    sites_by_operator: dict[str, list[RINSiteIndustrielORM]] = {}
    produits_by_operator: dict[str, list[RINProduitORM]] = {}
    ressources_by_operator: dict[str, list[RINRessourceORM]] = {}
    investissements_by_operator: dict[str, list[RINInvestissementORM]] = {}
    atis_by_operator: dict[str, list[AgrementTechniqueIndustrielORM]] = {}
    inspections_by_operator: dict[str, list[InspectionConformiteORM]] = {}
    declarations_by_operator: dict[str, list[ONIPeriodicDeclarationORM]] = {}
    for collection, target in [
        (representants, representants_by_operator),
        (sites, sites_by_operator),
        (produits, produits_by_operator),
        (ressources, ressources_by_operator),
        (investissements, investissements_by_operator),
        (atis, atis_by_operator),
        (inspections, inspections_by_operator),
        (declarations, declarations_by_operator),
    ]:
        for item in collection:
            target.setdefault(item.operateur_id, []).append(item)

    operator_scores = []
    for op in operators:
        score, missing = _operator_360_score(
            op,
            representants=representants_by_operator.get(op.id, []),
            sites=sites_by_operator.get(op.id, []),
            produits=produits_by_operator.get(op.id, []),
            ressources=ressources_by_operator.get(op.id, []),
            investissements=investissements_by_operator.get(op.id, []),
            atis=atis_by_operator.get(op.id, []),
            inspections=inspections_by_operator.get(op.id, []),
            declarations=declarations_by_operator.get(op.id, []),
        )
        operator_scores.append(
            {
                "operateur_id": op.id,
                "raison_sociale": op.raison_sociale,
                "secteur": op.secteur,
                "province": op.province,
                "score": score,
                "manques": missing,
            }
        )
    operator_scores.sort(key=lambda item: item["score"])
    average_score = (
        round(sum(item["score"] for item in operator_scores) / len(operator_scores), 1) if operator_scores else 0
    )

    coverage = [
        _coverage_status(
            "Identité",
            sum(1 for op in operators if op.nif_gabon and op.raison_sociale),
            total,
            "Carte d'identité officielle de l'entreprise.",
        ),
        _coverage_status(
            "Représentants", len({item.operateur_id for item in representants}), total, "Responsables et contacts clés."
        ),
        _coverage_status(
            "Sites industriels",
            len({item.operateur_id for item in sites}),
            total,
            "Usines, dépôts, plateformes et géolocalisation.",
        ),
        _coverage_status(
            "Activités",
            len({op.secteur for op in operators if op.secteur}),
            len({op.id for op in operators}) or 1,
            "Nomenclature nationale des activités.",
        ),
        _coverage_status(
            "Produits",
            len({item.operateur_id for item in produits}),
            total,
            "Produits fabriqués, capacités et marchés.",
        ),
        _coverage_status(
            "Capacités",
            len({item.operateur_id for item in produits if item.capacite_annuelle}),
            total,
            "Capacité annuelle, production réelle et utilisation.",
        ),
        _coverage_status("Équipements", 0, total, "Parc machines et équipements industriels à structurer."),
        _coverage_status(
            "Effectifs", sum(1 for op in operators if op.effectif_declare), total, "Effectif total et emplois déclarés."
        ),
        _coverage_status(
            "Matières premières",
            len({item.operateur_id for item in ressources if item.type_ressource == "matiere_premiere"}),
            total,
            "Origine, fournisseurs, dépendance importée.",
        ),
        _coverage_status(
            "Énergie",
            len({item.operateur_id for item in ressources if item.type_ressource == "energie"}),
            total,
            "Sources d'énergie, consommation et coûts.",
        ),
        _coverage_status(
            "Certifications",
            len({item.operateur_id for item in produits if item.certification}),
            total,
            "Qualité, sécurité, environnement, normalisation.",
        ),
        _coverage_status(
            "Investissements",
            len({item.operateur_id for item in investissements}),
            total,
            "Projets, financement, avancement et emplois.",
        ),
        _coverage_status(
            "Documents",
            len({item.ati_id for item in documents}),
            max(len(atis), 1),
            "Coffre documentaire lié aux dossiers ATI.",
        ),
        _coverage_status(
            "Historique", len(operator_scores), total, "Transitions, exports, validation et audit des fiches."
        ),
        _coverage_status(
            "Indicateurs",
            len({item.operateur_id for item in declarations}) + len({item.operateur_id for item in produits}),
            total * 2,
            "KPI production, emplois, exportations, investissements.",
        ),
    ]
    return {
        "generated_at": now_utc().isoformat(),
        "score_national": average_score,
        "stats": {
            "operateurs": len(operators),
            "fiches_exploitables": sum(1 for item in operator_scores if item["score"] >= 75),
            "fiches_prioritaires": sum(1 for item in operator_scores if item["score"] < 50),
            "sites": len(sites),
            "produits": len(produits),
            "ressources": len(ressources),
            "investissements": len(investissements),
            "documents": len(documents),
        },
        "coverage": coverage,
        "priorites": operator_scores[:8],
        "lecture_executive": (
            f"Le RIN consolide {len(operators)} opérateur(s) avec un score national de structuration "
            f"de {average_score}/100. {sum(1 for item in operator_scores if item['score'] < 50)} fiche(s) "
            "doivent être complétées en priorité pour fiabiliser les autres modules PNPI."
        ),
    }


def _get_kind_item(db: Session, kind: str, item_id: str):
    model = MODEL_BY_KIND.get(kind)
    if model is None:
        raise HTTPException(status_code=404, detail="Type de donnee RIN inconnu.")
    item = db.get(model, item_id)
    if not item or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Donnee RIN introuvable.")
    return item


@router.get("/operateurs/{operateur_id}", response_model=RINProfileRead, summary="Profil RIN complet d'un operateur")
async def get_rin_profile(
    operateur_id: str,
    current_user: User = Depends(require_roles(*_READ_ROLES)),
    db: Session = Depends(get_db),
) -> RINProfileRead:
    _ensure_operateur(db, operateur_id)
    _ensure_read_access(db, operateur_id, current_user)
    return _get_profile(db, operateur_id)


@router.get("/operateurs/{operateur_id}/360", summary="Fiche RIN 360° consolidée")
async def get_rin_360_profile(
    operateur_id: str,
    current_user: User = Depends(require_roles(*_READ_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    op = _ensure_operateur(db, operateur_id)
    _ensure_read_access(db, operateur_id, current_user)
    return _build_360_profile(db, op)


@router.get("/operateurs/{operateur_id}/export.json", summary="Exporter la fiche RIN en JSON")
async def export_rin_json(
    operateur_id: str,
    current_user: User = Depends(require_roles(*_READ_ROLES)),
    db: Session = Depends(get_db),
):
    _ensure_operateur(db, operateur_id)
    _ensure_read_access(db, operateur_id, current_user)
    return _get_profile(db, operateur_id).model_dump(mode="json")


@router.get("/operateurs/{operateur_id}/export.csv", summary="Exporter la fiche RIN en CSV")
async def export_rin_csv(
    operateur_id: str,
    current_user: User = Depends(require_roles(*_READ_ROLES)),
    db: Session = Depends(get_db),
) -> Response:
    op = _ensure_operateur(db, operateur_id)
    _ensure_read_access(db, operateur_id, current_user)
    profile = _get_profile(db, operateur_id)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")
    writer.writerow(["section", "id", "libelle", "detail", "statut_validation"])
    for section, items, label_key in [
        ("representants", profile.representants, "nom_complet"),
        ("sites", profile.sites, "nom_site"),
        ("produits", profile.produits, "nom_produit"),
        ("ressources", profile.ressources, "libelle"),
        ("investissements", profile.investissements, "intitule"),
    ]:
        for item in items:
            data = item.model_dump(mode="json")
            writer.writerow([section, data.get("id"), data.get(label_key), str(data), data.get("statut_validation")])
    write_audit_event(
        db,
        actor=current_user.username,
        action="rin.export.csv",
        target=operateur_id,
        details=f"operateur={op.raison_sociale}",
    )
    db.commit()
    filename = f"rin_{operateur_id}.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/operateurs/{operateur_id}/representants",
    response_model=RINRepresentantRead,
    status_code=201,
    summary="Ajouter un representant RIN",
)
async def create_representant(
    operateur_id: str,
    payload: RINRepresentantCreate,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
) -> RINRepresentantRead:
    _ensure_operateur(db, operateur_id)
    _ensure_write_access(db, operateur_id, current_user)
    item = RINRepresentantORM(
        id=_new_id("RIN-REP"),
        operateur_id=operateur_id,
        created_by=current_user.username,
        statut_validation="soumis" if "operateur" in _role_values(current_user) else "brouillon",
        updated_at=now_utc(),
        **payload.model_dump(),
    )
    db.add(item)
    write_audit_event(db, actor=current_user.username, action="rin.representant.create", target=operateur_id)
    db.commit()
    db.refresh(item)
    return RINRepresentantRead.model_validate(item)


@router.post("/operateurs/{operateur_id}/sites", response_model=RINSiteRead, status_code=201)
async def create_site(
    operateur_id: str,
    payload: RINSiteCreate,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
) -> RINSiteRead:
    _ensure_operateur(db, operateur_id)
    _ensure_write_access(db, operateur_id, current_user)
    item = RINSiteIndustrielORM(
        id=_new_id("RIN-SITE"),
        operateur_id=operateur_id,
        created_by=current_user.username,
        statut_validation="soumis" if "operateur" in _role_values(current_user) else "brouillon",
        updated_at=now_utc(),
        **payload.model_dump(),
    )
    db.add(item)
    write_audit_event(db, actor=current_user.username, action="rin.site.create", target=operateur_id)
    db.commit()
    db.refresh(item)
    return RINSiteRead.model_validate(item)


@router.post("/operateurs/{operateur_id}/produits", response_model=RINProduitRead, status_code=201)
async def create_produit(
    operateur_id: str,
    payload: RINProduitCreate,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
) -> RINProduitRead:
    _ensure_operateur(db, operateur_id)
    _ensure_write_access(db, operateur_id, current_user)
    item = RINProduitORM(
        id=_new_id("RIN-PROD"),
        operateur_id=operateur_id,
        created_by=current_user.username,
        statut_validation="soumis" if "operateur" in _role_values(current_user) else "brouillon",
        updated_at=now_utc(),
        **payload.model_dump(),
    )
    db.add(item)
    write_audit_event(db, actor=current_user.username, action="rin.produit.create", target=operateur_id)
    db.commit()
    db.refresh(item)
    return RINProduitRead.model_validate(item)


@router.post("/operateurs/{operateur_id}/ressources", response_model=RINRessourceRead, status_code=201)
async def create_ressource(
    operateur_id: str,
    payload: RINRessourceCreate,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
) -> RINRessourceRead:
    _ensure_operateur(db, operateur_id)
    _ensure_write_access(db, operateur_id, current_user)
    item = RINRessourceORM(
        id=_new_id("RIN-RES"),
        operateur_id=operateur_id,
        created_by=current_user.username,
        statut_validation="soumis" if "operateur" in _role_values(current_user) else "brouillon",
        updated_at=now_utc(),
        **payload.model_dump(),
    )
    db.add(item)
    write_audit_event(db, actor=current_user.username, action="rin.ressource.create", target=operateur_id)
    db.commit()
    db.refresh(item)
    return RINRessourceRead.model_validate(item)


@router.post("/operateurs/{operateur_id}/investissements", response_model=RINInvestissementRead, status_code=201)
async def create_investissement(
    operateur_id: str,
    payload: RINInvestissementCreate,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
) -> RINInvestissementRead:
    _ensure_operateur(db, operateur_id)
    _ensure_write_access(db, operateur_id, current_user)
    item = RINInvestissementORM(
        id=_new_id("RIN-INV"),
        operateur_id=operateur_id,
        created_by=current_user.username,
        statut_validation="soumis" if "operateur" in _role_values(current_user) else "brouillon",
        updated_at=now_utc(),
        **payload.model_dump(),
    )
    db.add(item)
    write_audit_event(db, actor=current_user.username, action="rin.investissement.create", target=operateur_id)
    db.commit()
    db.refresh(item)
    return RINInvestissementRead.model_validate(item)


@router.patch("/{kind}/{item_id}", summary="Modifier une donnee RIN")
async def update_rin_item(
    kind: str,
    item_id: str,
    payload: dict[str, Any],
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    item = _get_kind_item(db, kind, item_id)
    _ensure_write_access(db, item.operateur_id, current_user)
    schema = UPDATE_SCHEMA_BY_KIND.get(kind)
    if schema is None:
        raise HTTPException(status_code=404, detail="Type de donnee RIN inconnu.")
    update = schema.model_validate(payload).model_dump(exclude_unset=True)
    for field, value in update.items():
        setattr(item, field, value)
    item.updated_at = now_utc()
    if item.statut_validation == "valide":
        item.statut_validation = "verifie"
        item.validated_by = None
        item.validated_at = None
    write_audit_event(db, actor=current_user.username, action=f"rin.{kind}.update", target=item.operateur_id)
    db.commit()
    db.refresh(item)
    return READ_SCHEMA_BY_KIND[kind].model_validate(item)


@router.post("/{kind}/{item_id}/transition", summary="Changer le statut de validation d'une donnee RIN")
async def transition_rin_item(
    kind: str,
    item_id: str,
    payload: RINTransitionUpdate,
    current_user: User = Depends(require_roles(*_VALIDATE_ROLES)),
    db: Session = Depends(get_db),
):
    if payload.statut_validation not in _VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Statut RIN invalide.")
    item = _get_kind_item(db, kind, item_id)
    previous = item.statut_validation
    item.statut_validation = payload.statut_validation
    item.updated_at = now_utc()
    if payload.statut_validation == "valide":
        item.validated_by = current_user.username
        item.validated_at = now_utc()
    if payload.statut_validation == "archive":
        item.deleted_at = now_utc()
    write_audit_event(
        db,
        actor=current_user.username,
        action=f"rin.{kind}.transition",
        target=item.operateur_id,
        details=f"{item_id}: {previous} -> {payload.statut_validation}; {payload.note or ''}",
    )
    db.commit()
    db.refresh(item)
    return READ_SCHEMA_BY_KIND[kind].model_validate(item)


@router.delete("/{kind}/{item_id}", summary="Archiver une donnee RIN")
async def delete_rin_item(
    kind: str,
    item_id: str,
    current_user: User = Depends(require_roles(*_WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    item = _get_kind_item(db, kind, item_id)
    _ensure_write_access(db, item.operateur_id, current_user)
    item.deleted_at = now_utc()
    item.statut_validation = "archive"
    item.updated_at = now_utc()
    write_audit_event(db, actor=current_user.username, action=f"rin.{kind}.archive", target=item.operateur_id)
    db.commit()
    return {"status": "archived", "id": item_id, "kind": kind}

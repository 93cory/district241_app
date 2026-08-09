"""PNPI · Modèle conceptuel métier et modèle canonique des données."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    DocumentDossierORM,
    FiliereStrategiqueORM,
    InnovationProjectORM,
    InspectionConformiteORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINProduitORM,
    RINRessourceORM,
    RINSiteIndustrielORM,
)

router = APIRouter(prefix="/pnpi/modele-metier", tags=["Modèle métier PNPI"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)


CANONICAL_OBJECTS = [
    {
        "code": "entreprise",
        "nom": "Entreprise industrielle",
        "description": "Objet maître du SI. Il agrège l'identité, les activités, sites, produits, autorisations, contrôles et déclarations.",
        "systeme_responsable": "PNPI / RIN",
        "source": "operateurs_industriels",
        "niveau": "maître",
    },
    {
        "code": "site",
        "nom": "Site industriel",
        "description": "Usine, dépôt ou plateforme productive localisée, avec capacité, équipements et inspections.",
        "systeme_responsable": "PNPI / RIN",
        "source": "rin_sites_industriels",
        "niveau": "maître",
    },
    {
        "code": "produit",
        "nom": "Produit industriel",
        "description": "Produit fabriqué, famille, marché, capacité, normes et certifications associées.",
        "systeme_responsable": "PNPI / RIN",
        "source": "rin_produits",
        "niveau": "maître",
    },
    {
        "code": "ati",
        "nom": "Autorisation Technique Industrielle",
        "description": "Autorisation administrative avec type, statut, étape, décisions et historique.",
        "systeme_responsable": "PNPI / Autorisations",
        "source": "agrements_ati",
        "niveau": "transactionnel",
    },
    {
        "code": "inspection",
        "nom": "Inspection",
        "description": "Contrôle terrain, mission, rapport, anomalies, photos, sanctions et actions correctives.",
        "systeme_responsable": "PNPI / Contrôle",
        "source": "inspections_conformite",
        "niveau": "transactionnel",
    },
    {
        "code": "certification",
        "nom": "Certification",
        "description": "Information de certification utile au pilotage. AGANOR reste l'autorité responsable du cycle de vie.",
        "systeme_responsable": "AGANOR / PNPI en consolidation",
        "source": "rin_produits.certification",
        "niveau": "référencé",
    },
    {
        "code": "titre_pi",
        "nom": "Titre de propriété industrielle",
        "description": "Marque, brevet, dessin industriel ou modèle. OGAPI reste l'autorité de gestion.",
        "systeme_responsable": "OGAPI / PNPI en consolidation",
        "source": "prototype institutionnel",
        "niveau": "référencé",
    },
    {
        "code": "declaration",
        "nom": "Déclaration industrielle",
        "description": "Production, emplois, énergie, exportations, importations et matières premières.",
        "systeme_responsable": "PNPI / ONI",
        "source": "oni_periodic_declarations",
        "niveau": "transactionnel",
    },
    {
        "code": "investissement",
        "nom": "Investissement",
        "description": "Projet, budget, jalons, financement, emplois, avancement et engagements.",
        "systeme_responsable": "PNPI / GII-RIN",
        "source": "rin_investissements",
        "niveau": "transactionnel",
    },
    {
        "code": "document",
        "nom": "Document",
        "description": "Pièce justificative versionnée ou archivée, attachée aux dossiers et objets métier.",
        "systeme_responsable": "PNPI / Coffre documentaire",
        "source": "documents_dossier",
        "niveau": "support",
    },
    {
        "code": "filiere",
        "nom": "Filière / chaîne de valeur",
        "description": "Regroupement stratégique d'entreprises, produits, capacités, dépendances, risques et opportunités.",
        "systeme_responsable": "PNPI / Filières",
        "source": "filieres_strategiques",
        "niveau": "analytique",
    },
    {
        "code": "innovation",
        "nom": "Projet d'innovation",
        "description": "Modernisation, R&D, transfert technologique, pilote Industrie 4.0 et besoin de financement.",
        "systeme_responsable": "PNPI / Innovation",
        "source": "innovation_projects",
        "niveau": "transactionnel",
    },
]

RELATIONSHIPS = [
    {"from": "entreprise", "to": "site", "relation": "possède"},
    {"from": "entreprise", "to": "produit", "relation": "fabrique"},
    {"from": "entreprise", "to": "investissement", "relation": "porte"},
    {"from": "entreprise", "to": "ati", "relation": "demande / détient"},
    {"from": "entreprise", "to": "inspection", "relation": "est contrôlée par"},
    {"from": "entreprise", "to": "declaration", "relation": "déclare"},
    {"from": "produit", "to": "certification", "relation": "peut être certifié par AGANOR"},
    {"from": "entreprise", "to": "titre_pi", "relation": "peut détenir via OGAPI"},
    {"from": "ati", "to": "document", "relation": "s'appuie sur"},
    {"from": "filiere", "to": "entreprise", "relation": "agrège"},
    {"from": "innovation", "to": "entreprise", "relation": "modernise"},
]


def _count(db: Session, model) -> int:
    return int(db.execute(select(func.count()).select_from(model)).scalar() or 0)


@router.get("/cockpit", summary="Cockpit du modèle conceptuel métier PNPI")
async def business_model_cockpit(
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    counts = {
        "entreprise": _count(db, OperateurIndustrielORM),
        "site": _count(db, RINSiteIndustrielORM),
        "produit": _count(db, RINProduitORM),
        "ati": _count(db, AgrementTechniqueIndustrielORM),
        "inspection": _count(db, InspectionConformiteORM),
        "certification": int(
            db.execute(
                select(func.count()).select_from(RINProduitORM).where(RINProduitORM.certification.is_not(None))
            ).scalar()
            or 0
        ),
        "titre_pi": 0,
        "declaration": _count(db, ONIPeriodicDeclarationORM),
        "investissement": _count(db, RINInvestissementORM),
        "document": _count(db, DocumentDossierORM),
        "filiere": _count(db, FiliereStrategiqueORM),
        "innovation": _count(db, InnovationProjectORM),
    }
    ressources = _count(db, RINRessourceORM)
    objects = []
    for item in CANONICAL_OBJECTS:
        volume = counts.get(item["code"], 0)
        if volume > 0:
            statut = "implémenté"
        elif item["code"] in {"certification", "titre_pi"}:
            statut = "prototype partenaire"
        else:
            statut = "à structurer"
        objects.append({**item, "volume": volume, "statut": statut})
    implemented = sum(1 for item in objects if item["statut"] == "implémenté")
    prototype = sum(1 for item in objects if item["statut"] == "prototype partenaire")
    return {
        "generated_at": now_utc().isoformat(),
        "vision": "Le PNPI est structuré comme un Système d'Information Industriel National fondé sur des objets métier canoniques.",
        "stats": {
            "objets_canoniques": len(objects),
            "objets_implementes": implemented,
            "objets_prototype": prototype,
            "couverture_pct": round((implemented / len(objects)) * 100),
            "relations": len(RELATIONSHIPS),
            "ressources_rin": ressources,
        },
        "objects": objects,
        "relationships": RELATIONSHIPS,
        "principes": [
            "L'entreprise industrielle est l'objet maître.",
            "Les domaines métier manipulent les mêmes objets canoniques.",
            "AGANOR et OGAPI conservent leurs responsabilités institutionnelles.",
            "Le PNPI consolide les informations utiles au pilotage sans se substituer aux partenaires.",
            "Chaque objet sensible doit être traçable, historisé et gouverné.",
        ],
        "architecture_cible": [
            "Vision",
            "Gouvernance",
            "Modèle Conceptuel Métier",
            "Modèle Canonique des Données",
            "Architecture d'entreprise",
            "Capacités métier",
            "Processus",
            "Domaines métiers détaillés",
        ],
        "lecture_executive": (
            f"{implemented}/{len(objects)} objets canoniques disposent déjà de données réelles dans le PNPI. "
            "Le passage à un modèle objet stabilise l'interopérabilité et rend les domaines métier plus cohérents."
        ),
    }

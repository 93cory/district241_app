"""PNPI · Filières industrielles et chaînes de valeur."""

from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    FiliereActionORM,
    FiliereIndicatorORM,
    FiliereRiskORM,
    FiliereStrategiqueORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINProduitORM,
)

router = APIRouter(prefix="/pnpi/filieres", tags=["Filières"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
WRITE_ROLES = (Role.admin, Role.directeur, Role.instructeur)
DECISION_ROLES = (Role.admin, Role.ministre, Role.directeur)

DEFAULT_FILIERES = [
    {
        "code": "bois",
        "nom": "Bois et transformation locale",
        "description": "Transformation primaire et secondaire du bois, montée en valeur ajoutée et conformité filière.",
        "vision": "Passer d'une logique d'exportation brute à une chaîne de valeur locale structurée.",
        "objectifs": [
            "augmenter la transformation locale",
            "développer les fournisseurs",
            "réduire les pertes matière",
        ],
        "contraintes": ["énergie", "traçabilité", "certification", "valorisation des déchets"],
        "opportunites": ["meubles", "contreplaqué", "biomasse", "export régional"],
    },
    {
        "code": "agroalimentaire",
        "nom": "Agro-industrie",
        "description": "Transformation agricole, souveraineté alimentaire, emballage et conservation.",
        "vision": "Renforcer la souveraineté productive par la transformation locale des produits agricoles.",
        "objectifs": ["substitution aux importations", "emplois jeunes", "chaîne du froid"],
        "contraintes": ["intrants", "logistique", "qualité sanitaire", "financement"],
        "opportunites": ["huile", "cacao", "fruits transformés", "marchés urbains"],
    },
    {
        "code": "mines",
        "nom": "Mines et métallurgie",
        "description": "Valorisation locale des minerais, capacités industrielles et infrastructures associées.",
        "vision": "Accroître la profondeur de transformation des ressources minières.",
        "objectifs": ["capacités locales", "contenu local", "export de produits transformés"],
        "contraintes": ["énergie", "transport", "capital intensif", "environnement"],
        "opportunites": ["manganèse transformé", "fournisseurs locaux", "maintenance industrielle"],
    },
]

VALUE_CHAIN_BLUEPRINTS = {
    "bois": [
        ("ressource", "Ressource forestière", "traçabilité, disponibilité matière, gestion durable"),
        ("premiere_transformation", "Première transformation", "sciage, placage, séchage, rendement matière"),
        ("seconde_transformation", "Seconde transformation", "meubles, contreplaqué, menuiserie industrielle"),
        ("qualite", "Normalisation & certification", "qualité, conformité AGANOR, exigences export"),
        ("marche", "Marchés & export régional", "vente locale, CEMAC, logistique portuaire"),
    ],
    "agroalimentaire": [
        ("intrants", "Intrants agricoles", "matière première locale, saisonnalité, contractualisation"),
        ("transformation", "Transformation alimentaire", "unités, conservation, emballage, chaîne du froid"),
        ("qualite", "Qualité sanitaire", "normes, laboratoire, certification, traçabilité lot"),
        ("distribution", "Distribution nationale", "marchés urbains, grande distribution, restauration"),
        ("substitution", "Substitution aux importations", "produits transformés locaux et compétitivité prix"),
    ],
    "mines": [
        ("extraction", "Extraction", "ressource minière, sécurité, environnement"),
        ("beneficiation", "Pré-traitement", "lavage, concentration, préparation industrielle"),
        ("metallurgie", "Transformation métallurgique", "énergie, fours, maintenance, investissements lourds"),
        ("fournisseurs", "Fournisseurs locaux", "maintenance, pièces, services industriels, contenu local"),
        ("export", "Export transformé", "valeur ajoutée, logistique, contrats internationaux"),
    ],
}


class FilierePayload(BaseModel):
    code: str
    nom: str
    description: str | None = None
    responsable: str | None = None
    statut: str = "prioritaire"
    vision: str | None = None
    objectifs: list[str] = []
    contraintes: list[str] = []
    opportunites: list[str] = []
    maturite_cible: int = Field(default=80, ge=0, le=100)


class IndicatorPayload(BaseModel):
    code: str
    libelle: str
    definition: str | None = None
    formule: str | None = None
    source: str | None = None
    unite: str | None = None
    periodicite: str = "mensuelle"
    niveau_diffusion: str = "interne"
    responsable: str | None = None
    valeur_courante: float | None = None
    valeur_cible: float | None = None
    qualite_donnee: str = "estimation"
    methode_version: str = "v1"


class ActionPayload(BaseModel):
    intitule: str
    objectif: str | None = None
    responsable: str | None = None
    partenaires: list[str] = []
    echeance: datetime | None = None
    statut: str = "proposee"
    indicateurs: list[str] = []
    risques: list[str] = []
    progression_pct: int = Field(default=0, ge=0, le=100)


class RiskPayload(BaseModel):
    titre: str
    categorie: str = "structurel"
    probabilite: int = Field(default=3, ge=1, le=5)
    impact: int = Field(default=3, ge=1, le=5)
    description: str | None = None
    mitigation: str | None = None
    statut: str = "ouvert"


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _dump_list(value: list[str]) -> str:
    return json.dumps(value, ensure_ascii=False)


def _risk_level(probabilite: int, impact: int) -> str:
    score = probabilite * impact
    if score >= 16:
        return "critique"
    if score >= 10:
        return "haute"
    if score >= 5:
        return "moyenne"
    return "basse"


def _seed_default_filieres(db: Session, actor: str = "system") -> None:
    existing = db.execute(select(FiliereStrategiqueORM.id).limit(1)).scalar_one_or_none()
    if existing:
        return
    for item in DEFAULT_FILIERES:
        filiere = FiliereStrategiqueORM(
            id=_new_id("FIL"),
            code=item["code"],
            nom=item["nom"],
            description=item["description"],
            responsable=None,
            statut="prioritaire",
            vision=item["vision"],
            objectifs=_dump_list(item["objectifs"]),
            contraintes=_dump_list(item["contraintes"]),
            opportunites=_dump_list(item["opportunites"]),
            maturite_cible=80,
            created_by=actor,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(filiere)
        db.flush()
        db.add_all(
            [
                FiliereIndicatorORM(
                    id=_new_id("FILI"),
                    filiere_id=filiere.id,
                    code=f"{filiere.code}.production",
                    libelle="Production déclarée",
                    definition="Volume de production consolidé sur la filière.",
                    formule="Somme des déclarations ONI de production",
                    source="ONI / déclarations périodiques",
                    unite="tonnes",
                    periodicite="mensuelle",
                    niveau_diffusion="interne",
                    responsable="ONI",
                    valeur_courante=None,
                    valeur_cible=None,
                    qualite_donnee="estimation",
                    methode_version="v1",
                    updated_at=now_utc(),
                ),
                FiliereIndicatorORM(
                    id=_new_id("FILI"),
                    filiere_id=filiere.id,
                    code=f"{filiere.code}.contenu_local",
                    libelle="Contenu local",
                    definition="Part moyenne des intrants locaux déclarés.",
                    formule="Moyenne ONI local_raw_material_pct",
                    source="ONI / entreprises",
                    unite="%",
                    periodicite="mensuelle",
                    niveau_diffusion="stratégique",
                    responsable="Direction études",
                    valeur_courante=None,
                    valeur_cible=70,
                    qualite_donnee="estimation",
                    methode_version="v1",
                    updated_at=now_utc(),
                ),
            ]
        )
        db.add(
            FiliereActionORM(
                id=_new_id("FILA"),
                filiere_id=filiere.id,
                intitule="Organiser une revue de filière",
                objectif="Valider les contraintes, opportunités et priorités de transformation locale.",
                responsable="Direction générale de l'industrie",
                partenaires=_dump_list(["AGANOR", "OGAPI", "ONI"]),
                statut="planifiee",
                indicateurs=_dump_list(["production", "contenu local", "investissement"]),
                risques=_dump_list(["données incomplètes", "coordination institutionnelle"]),
                progression_pct=20,
                created_by=actor,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
        )
        db.add(
            FiliereRiskORM(
                id=_new_id("FILR"),
                filiere_id=filiere.id,
                titre="Données individuelles insuffisamment consolidées",
                categorie="qualite_donnee",
                probabilite=4,
                impact=3,
                criticite=_risk_level(4, 3),
                description="Les restitutions de filière peuvent être fragilisées par des fiches RIN ou déclarations ONI incomplètes.",
                mitigation="Renforcer la complétude RIN et préciser le niveau de diffusion des indicateurs.",
                statut="ouvert",
                created_by=actor,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
        )
    db.commit()


def _serialize_filiere(row: FiliereStrategiqueORM) -> dict:
    return {
        "id": row.id,
        "code": row.code,
        "nom": row.nom,
        "description": row.description,
        "responsable": row.responsable,
        "statut": row.statut,
        "vision": row.vision,
        "objectifs": _json_list(row.objectifs),
        "contraintes": _json_list(row.contraintes),
        "opportunites": _json_list(row.opportunites),
        "maturite_cible": row.maturite_cible,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_indicator(row: FiliereIndicatorORM) -> dict:
    return {
        "id": row.id,
        "filiere_id": row.filiere_id,
        "code": row.code,
        "libelle": row.libelle,
        "definition": row.definition,
        "formule": row.formule,
        "source": row.source,
        "unite": row.unite,
        "periodicite": row.periodicite,
        "niveau_diffusion": row.niveau_diffusion,
        "responsable": row.responsable,
        "valeur_courante": row.valeur_courante,
        "valeur_cible": row.valeur_cible,
        "qualite_donnee": row.qualite_donnee,
        "methode_version": row.methode_version,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_action(row: FiliereActionORM) -> dict:
    return {
        "id": row.id,
        "filiere_id": row.filiere_id,
        "intitule": row.intitule,
        "objectif": row.objectif,
        "responsable": row.responsable,
        "partenaires": _json_list(row.partenaires),
        "echeance": row.echeance.isoformat() if row.echeance else None,
        "statut": row.statut,
        "indicateurs": _json_list(row.indicateurs),
        "risques": _json_list(row.risques),
        "progression_pct": row.progression_pct,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_risk(row: FiliereRiskORM) -> dict:
    return {
        "id": row.id,
        "filiere_id": row.filiere_id,
        "titre": row.titre,
        "categorie": row.categorie,
        "probabilite": row.probabilite,
        "impact": row.impact,
        "criticite": row.criticite,
        "description": row.description,
        "mitigation": row.mitigation,
        "statut": row.statut,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _sector_alias(code: str) -> set[str]:
    aliases = {code}
    if code == "agroalimentaire":
        aliases.add("agro-industrie")
    if code == "bois":
        aliases.add("foret")
    return aliases


def _maturity_score(
    filiere: FiliereStrategiqueORM,
    indicators: list[FiliereIndicatorORM],
    actions: list[FiliereActionORM],
    risks: list[FiliereRiskORM],
    stats: dict,
) -> dict:
    indicator_score = min(len(indicators) * 10, 25)
    data_quality_score = 0
    if indicators:
        quality_map = {"observee": 100, "verifiee": 90, "estimation": 55, "manquante": 15}
        data_quality_score = round(mean([quality_map.get(i.qualite_donnee, 40) for i in indicators]) * 0.2)
    action_score = min(sum(a.progression_pct for a in actions) / max(len(actions), 1) * 0.25, 25) if actions else 0
    risk_penalty = min(
        sum(
            12 if r.criticite == "critique" else 7 if r.criticite == "haute" else 3
            for r in risks
            if r.statut == "ouvert"
        ),
        20,
    )
    ecosystem_score = min(stats["operateurs"] * 4 + stats["atis_approuves"] * 3 + stats["investissements"] * 2, 25)
    score = round(
        max(0, min(100, indicator_score + data_quality_score + action_score + ecosystem_score - risk_penalty)), 1
    )
    return {
        "score": score,
        "cible": filiere.maturite_cible,
        "breakdown": {
            "indicateurs": round(indicator_score, 1),
            "qualite_donnee": round(data_quality_score, 1),
            "actions": round(action_score, 1),
            "ecosysteme": round(ecosystem_score, 1),
            "penalite_risques": round(risk_penalty, 1),
        },
    }


def _sovereignty_score(stats: dict) -> dict:
    """Score demo: capacité locale + contenu local + couverture territoriale + dépendance import."""

    local_pct = float(stats.get("contenu_local_pct") or 0)
    import_pct = float(stats.get("matiere_importee_pct") or 0)
    coverage_score = min(len(stats.get("provinces") or []) * 7, 25)
    ecosystem_score = min(float(stats.get("operateurs") or 0) * 4 + float(stats.get("produits_rin") or 0) * 3, 25)
    local_score = min(local_pct * 0.3, 30)
    import_penalty = min(import_pct * 0.2, 20)
    score = round(max(0, min(100, local_score + coverage_score + ecosystem_score - import_penalty)), 1)
    if score >= 70:
        niveau = "robuste"
    elif score >= 45:
        niveau = "en consolidation"
    else:
        niveau = "fragile"
    return {
        "score": score,
        "niveau": niveau,
        "breakdown": {
            "contenu_local": round(local_score, 1),
            "couverture_territoriale": round(coverage_score, 1),
            "ecosysteme_productif": round(ecosystem_score, 1),
            "penalite_imports": round(import_penalty, 1),
        },
    }


def _value_chain_analysis(filiere: FiliereStrategiqueORM, stats: dict) -> dict:
    blueprint = VALUE_CHAIN_BLUEPRINTS.get(filiere.code) or [
        ("intrants", "Intrants", "approvisionnement et disponibilité"),
        ("transformation", "Transformation", "capacité industrielle et qualité"),
        ("marche", "Marchés", "commercialisation locale et export"),
    ]
    operators = stats.get("operateurs") or 0
    approved = stats.get("atis_approuves") or 0
    products = stats.get("produits_rin") or 0
    investment = stats.get("investissement_fcfa") or 0
    local_pct = stats.get("contenu_local_pct") or 0
    import_pct = stats.get("matiere_importee_pct") or 0
    capacity = stats.get("capacite_utilisee_pct") or 0
    exports = stats.get("exportations_fcfa") or 0

    stage_inputs = {
        "ressource": local_pct,
        "intrants": max(local_pct, 100 - import_pct),
        "extraction": operators * 15,
        "premiere_transformation": operators * 12 + approved * 8,
        "transformation": operators * 12 + approved * 8,
        "beneficiation": approved * 15 + investment / 60_000_000,
        "seconde_transformation": products * 12 + capacity * 0.35,
        "metallurgie": investment / 80_000_000 + capacity * 0.25,
        "qualite": approved * 12 + products * 5,
        "fournisseurs": products * 10 + local_pct * 0.35,
        "distribution": operators * 9 + products * 8,
        "marche": products * 8 + exports / 35_000_000,
        "substitution": max(0, 100 - import_pct) * 0.8 + products * 5,
        "export": exports / 25_000_000 + approved * 5,
    }

    stages = []
    for key, label, enjeu in blueprint:
        score = round(max(0, min(100, stage_inputs.get(key, 45))))
        if score >= 70:
            status = "fort"
        elif score >= 45:
            status = "à consolider"
        else:
            status = "goulet"
        stages.append({"key": key, "label": label, "enjeu": enjeu, "score": score, "status": status})

    bottlenecks = [stage for stage in stages if stage["status"] == "goulet"]
    if not bottlenecks:
        bottlenecks = sorted(stages, key=lambda stage: stage["score"])[:1]

    opportunities = []
    if import_pct >= 35:
        opportunities.append("Substituer les intrants importés par des fournisseurs locaux qualifiés.")
    if products < max(2, operators):
        opportunities.append(
            "Accélérer la déclaration des produits RIN pour mieux lire la profondeur de transformation."
        )
    if investment > 0:
        opportunities.append("Aligner les investissements déclarés avec les maillons faibles de la chaîne de valeur.")
    if capacity and capacity < 60:
        opportunities.append(
            "Identifier les causes de sous-utilisation capacitaire et les contraintes énergie/logistique."
        )
    if not opportunities:
        opportunities.append("Maintenir une revue trimestrielle de filière et documenter les gains de valeur ajoutée.")

    return {
        "stages": stages,
        "bottlenecks": bottlenecks[:3],
        "opportunities": opportunities[:4],
        "depth_score": round(mean([stage["score"] for stage in stages]), 1) if stages else 0,
    }


def _recommendations(
    filiere: FiliereStrategiqueORM, stats: dict, maturity: dict, sovereignty: dict, risks: list[FiliereRiskORM]
) -> list[dict]:
    recommendations: list[dict] = []
    if maturity["score"] < filiere.maturite_cible:
        recommendations.append(
            {
                "priorite": "haute",
                "titre": "Accélérer le plan de montée en maturité",
                "action": "Prioriser les actions bloquantes et fixer une revue mensuelle de filière.",
                "impact": "Réduit l'ecart entre la situation actuelle et la cible stratégique.",
            }
        )
    if sovereignty["score"] < 50:
        recommendations.append(
            {
                "priorite": "haute",
                "titre": "Renforcer la souveraineté productive",
                "action": "Identifier les intrants importés critiques et lancer un plan fournisseurs locaux.",
                "impact": "Diminue la dépendance extérieure et améliore la résilience industrielle.",
            }
        )
    if len(stats.get("provinces") or []) < 3:
        recommendations.append(
            {
                "priorite": "moyenne",
                "titre": "Élargir la couverture territoriale",
                "action": "Cartographier les provinces sans opérateurs actifs et cibler les investissements.",
                "impact": "Favorise un développement industriel plus équilibré.",
            }
        )
    if any(r.criticite in {"critique", "haute"} and r.statut == "ouvert" for r in risks):
        recommendations.append(
            {
                "priorite": "haute",
                "titre": "Arbitrer les risques ouverts",
                "action": "Inscrire les risques élevés à l'ordre du jour du comité de gouvernance.",
                "impact": "Sécurise la trajectoire de transformation locale.",
            }
        )
    if not recommendations:
        recommendations.append(
            {
                "priorite": "suivi",
                "titre": "Maintenir la trajectoire",
                "action": "Conserver le suivi trimestriel des indicateurs et la qualité des données.",
                "impact": "Préserve la dynamique positive de la filière.",
            }
        )
    return recommendations[:4]


def _filiere_stats(db: Session, code: str) -> dict:
    aliases = _sector_alias(code)
    ops = db.execute(select(OperateurIndustrielORM).where(OperateurIndustrielORM.secteur.in_(aliases))).scalars().all()
    atis = (
        db.execute(select(AgrementTechniqueIndustrielORM).where(AgrementTechniqueIndustrielORM.secteur.in_(aliases)))
        .scalars()
        .all()
    )
    oni = (
        db.execute(select(ONIPeriodicDeclarationORM).where(ONIPeriodicDeclarationORM.secteur.in_(aliases)))
        .scalars()
        .all()
    )
    produits = db.execute(select(RINProduitORM).where(RINProduitORM.categorie.in_(aliases))).scalars().all()
    investments = (
        db.execute(
            select(RINInvestissementORM).where(
                RINInvestissementORM.operateur_id.in_([op.id for op in ops] or ["__none__"])
            )
        )
        .scalars()
        .all()
    )
    local_material_values = [row.local_raw_material_pct for row in oni if row.local_raw_material_pct is not None]
    imported_material_values = [
        row.imported_raw_material_pct for row in oni if row.imported_raw_material_pct is not None
    ]
    capacity_values = [
        (row.capacity_used / row.capacity_installed) * 100
        for row in oni
        if row.capacity_installed and row.capacity_installed > 0
    ]
    return {
        "operateurs": len(ops),
        "atis_total": len(atis),
        "atis_approuves": sum(1 for ati in atis if ati.statut == "approuve"),
        "production_oni": round(sum(row.production_volume for row in oni), 2),
        "capacite_utilisee_pct": round(mean(capacity_values), 1) if capacity_values else 0,
        "contenu_local_pct": round(mean(local_material_values), 1) if local_material_values else 0,
        "matiere_importee_pct": round(mean(imported_material_values), 1) if imported_material_values else 0,
        "exportations_fcfa": sum(row.exports_value_fcfa or 0 for row in oni),
        "importations_fcfa": sum(row.imports_value_fcfa or 0 for row in oni),
        "emplois_declares": sum(op.effectif_declare or 0 for op in ops),
        "produits_rin": len(produits),
        "investissements": len(investments),
        "investissement_fcfa": sum(inv.montant_fcfa or 0 for inv in investments),
        "provinces": sorted({op.province for op in ops if op.province}),
    }


@router.get("", summary="Lister les filières stratégiques")
async def list_filieres(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    _seed_default_filieres(db, actor=current_user.username)
    filieres = db.execute(select(FiliereStrategiqueORM).order_by(FiliereStrategiqueORM.nom)).scalars().all()
    return [_serialize_filiere(row) for row in filieres]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Créer une filière stratégique")
async def create_filiere(
    payload: FilierePayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if db.execute(
        select(FiliereStrategiqueORM).where(FiliereStrategiqueORM.code == payload.code.strip().lower())
    ).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Une filière avec ce code existe déjà.")
    row = FiliereStrategiqueORM(
        id=_new_id("FIL"),
        code=payload.code.strip().lower(),
        nom=payload.nom.strip(),
        description=payload.description,
        responsable=payload.responsable,
        statut=payload.statut,
        vision=payload.vision,
        objectifs=_dump_list(payload.objectifs),
        contraintes=_dump_list(payload.contraintes),
        opportunites=_dump_list(payload.opportunites),
        maturite_cible=payload.maturite_cible,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(db, actor=current_user.username, action="filiere.create", target=row.id, details=row.code)
    db.commit()
    db.refresh(row)
    return _serialize_filiere(row)


@router.get("/cockpit", summary="Cockpit national des filières")
async def filieres_cockpit(
    current_user: User = Depends(require_roles(*DECISION_ROLES)),
    db: Session = Depends(get_db),
):
    _seed_default_filieres(db, actor=current_user.username)
    filieres = db.execute(select(FiliereStrategiqueORM).order_by(FiliereStrategiqueORM.nom)).scalars().all()
    indicators = db.execute(select(FiliereIndicatorORM)).scalars().all()
    actions = db.execute(select(FiliereActionORM)).scalars().all()
    risks = db.execute(select(FiliereRiskORM)).scalars().all()

    indicators_by_filiere: dict[str, list[FiliereIndicatorORM]] = defaultdict(list)
    actions_by_filiere: dict[str, list[FiliereActionORM]] = defaultdict(list)
    risks_by_filiere: dict[str, list[FiliereRiskORM]] = defaultdict(list)
    for item in indicators:
        indicators_by_filiere[item.filiere_id].append(item)
    for item in actions:
        actions_by_filiere[item.filiere_id].append(item)
    for item in risks:
        risks_by_filiere[item.filiere_id].append(item)

    rows = []
    for filiere in filieres:
        stats = _filiere_stats(db, filiere.code)
        filiere_risks = risks_by_filiere[filiere.id]
        maturity = _maturity_score(
            filiere,
            indicators_by_filiere[filiere.id],
            actions_by_filiere[filiere.id],
            filiere_risks,
            stats,
        )
        sovereignty = _sovereignty_score(stats)
        chain = _value_chain_analysis(filiere, stats)
        rows.append(
            {
                **_serialize_filiere(filiere),
                "stats": stats,
                "maturite": maturity,
                "souverainete": sovereignty,
                "chaine_valeur": chain,
                "recommendations": _recommendations(filiere, stats, maturity, sovereignty, filiere_risks),
                "risques_ouverts": sum(1 for r in filiere_risks if r.statut == "ouvert"),
                "actions_en_cours": sum(
                    1 for a in actions_by_filiere[filiere.id] if a.statut in {"planifiee", "en_cours"}
                ),
            }
        )
    national_maturity = round(mean([row["maturite"]["score"] for row in rows]), 1) if rows else 0
    national_sovereignty = round(mean([row["souverainete"]["score"] for row in rows]), 1) if rows else 0
    national_chain_depth = round(mean([row["chaine_valeur"]["depth_score"] for row in rows]), 1) if rows else 0
    critical_risks = [risk for risk in risks if risk.criticite in {"critique", "haute"} and risk.statut == "ouvert"]
    province_counts: defaultdict[str, int] = defaultdict(int)
    for row in rows:
        for province in row["stats"].get("provinces", []):
            province_counts[province] += 1
    bottlenecks = []
    opportunities = []
    for row in rows:
        for bottleneck in row["chaine_valeur"]["bottlenecks"]:
            bottlenecks.append({"filiere": row["nom"], **bottleneck})
        for opportunity in row["chaine_valeur"]["opportunities"]:
            opportunities.append({"filiere": row["nom"], "opportunity": opportunity})
    return {
        "generated_at": now_utc().isoformat(),
        "maturite_nationale": national_maturity,
        "souverainete_nationale": national_sovereignty,
        "profondeur_chaine_nationale": national_chain_depth,
        "stats": {
            "filieres_prioritaires": len(rows),
            "indicateurs_gouvernes": len(indicators),
            "actions": len(actions),
            "risques_ouverts": sum(1 for r in risks if r.statut == "ouvert"),
            "risques_critiques": len(critical_risks),
            "goulets_chaine": len(bottlenecks),
        },
        "filieres": rows,
        "alertes": [_serialize_risk(risk) for risk in critical_risks[:8]],
        "goulets_chaine": sorted(bottlenecks, key=lambda item: item["score"])[:8],
        "opportunites_chaine": opportunities[:10],
        "territoires": [
            {"province": province, "filieres": count}
            for province, count in sorted(province_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "lecture_executive": (
            f"{len(rows)} filière(s) suivie(s), maturité moyenne {national_maturity}/100, "
            f"souveraineté productive {national_sovereignty}/100, profondeur chaîne de valeur {national_chain_depth}/100. "
            f"{len(critical_risks)} risque(s) élevé(s) nécessitent une revue de gouvernance."
        ),
    }


@router.get("/reports/national", summary="Rapport national des filières")
async def filieres_report(
    current_user: User = Depends(require_roles(*DECISION_ROLES)),
    db: Session = Depends(get_db),
):
    cockpit = await filieres_cockpit(current_user, db)
    return {
        "title": "Rapport national des filières industrielles",
        "generated_at": now_utc().isoformat(),
        "executive_summary": cockpit["lecture_executive"],
        "sections": [
            {"title": "Maturité des chaînes de valeur", "data": cockpit["filieres"]},
            {"title": "Risques prioritaires", "data": cockpit["alertes"]},
            {"title": "Indicateurs exécutifs", "data": cockpit["stats"]},
        ],
        "diffusion": "stratégique",
        "methodology_note": "Prototype fondé sur les données RIN, ATI, ONI et registres de gouvernance de filière.",
    }


@router.get("/{filiere_id}", summary="Détail stratégique d'une filière")
async def filiere_detail(
    filiere_id: str,
    _: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    filiere = db.get(FiliereStrategiqueORM, filiere_id)
    if not filiere:
        raise HTTPException(status_code=404, detail="Filière introuvable.")
    indicators = (
        db.execute(select(FiliereIndicatorORM).where(FiliereIndicatorORM.filiere_id == filiere_id)).scalars().all()
    )
    actions = db.execute(select(FiliereActionORM).where(FiliereActionORM.filiere_id == filiere_id)).scalars().all()
    risks = db.execute(select(FiliereRiskORM).where(FiliereRiskORM.filiere_id == filiere_id)).scalars().all()
    stats = _filiere_stats(db, filiere.code)
    maturity = _maturity_score(filiere, indicators, actions, risks, stats)
    sovereignty = _sovereignty_score(stats)
    chain = _value_chain_analysis(filiere, stats)
    return {
        **_serialize_filiere(filiere),
        "stats": stats,
        "maturite": maturity,
        "souverainete": sovereignty,
        "chaine_valeur": chain,
        "recommendations": _recommendations(filiere, stats, maturity, sovereignty, risks),
        "indicators": [_serialize_indicator(row) for row in indicators],
        "actions": [_serialize_action(row) for row in actions],
        "risks": [_serialize_risk(row) for row in risks],
    }


@router.post("/{filiere_id}/indicators", status_code=status.HTTP_201_CREATED)
async def create_indicator(
    filiere_id: str,
    payload: IndicatorPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if not db.get(FiliereStrategiqueORM, filiere_id):
        raise HTTPException(status_code=404, detail="Filière introuvable.")
    row = FiliereIndicatorORM(id=_new_id("FILI"), filiere_id=filiere_id, updated_at=now_utc(), **payload.model_dump())
    db.add(row)
    write_audit_event(
        db, actor=current_user.username, action="filiere.indicator.create", target=filiere_id, details=row.code
    )
    db.commit()
    db.refresh(row)
    return _serialize_indicator(row)


@router.post("/{filiere_id}/actions", status_code=status.HTTP_201_CREATED)
async def create_action(
    filiere_id: str,
    payload: ActionPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if not db.get(FiliereStrategiqueORM, filiere_id):
        raise HTTPException(status_code=404, detail="Filière introuvable.")
    row = FiliereActionORM(
        id=_new_id("FILA"),
        filiere_id=filiere_id,
        intitule=payload.intitule,
        objectif=payload.objectif,
        responsable=payload.responsable,
        partenaires=_dump_list(payload.partenaires),
        echeance=payload.echeance,
        statut=payload.statut,
        indicateurs=_dump_list(payload.indicateurs),
        risques=_dump_list(payload.risques),
        progression_pct=payload.progression_pct,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(
        db, actor=current_user.username, action="filiere.action.create", target=filiere_id, details=row.intitule
    )
    db.commit()
    db.refresh(row)
    return _serialize_action(row)


@router.post("/{filiere_id}/risks", status_code=status.HTTP_201_CREATED)
async def create_risk(
    filiere_id: str,
    payload: RiskPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if not db.get(FiliereStrategiqueORM, filiere_id):
        raise HTTPException(status_code=404, detail="Filière introuvable.")
    row = FiliereRiskORM(
        id=_new_id("FILR"),
        filiere_id=filiere_id,
        titre=payload.titre,
        categorie=payload.categorie,
        probabilite=payload.probabilite,
        impact=payload.impact,
        criticite=_risk_level(payload.probabilite, payload.impact),
        description=payload.description,
        mitigation=payload.mitigation,
        statut=payload.statut,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(
        db, actor=current_user.username, action="filiere.risk.create", target=filiere_id, details=row.titre
    )
    db.commit()
    db.refresh(row)
    return _serialize_risk(row)

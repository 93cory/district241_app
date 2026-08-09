"""PNPI · Industrie durable, ressources, circularité et décarbonation."""

from __future__ import annotations

from collections import Counter, defaultdict
from statistics import mean

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    AgrementTechniqueIndustrielORM,
    InspectionConformiteORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
    RINRessourceORM,
)

router = APIRouter(prefix="/pnpi/durabilite", tags=["Industrie durable"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)

SECTOR_EMISSION_FACTORS_KG_PER_ATI = {
    "mines": 8500,
    "btp": 4200,
    "chimie": 3800,
    "energie": 2500,
    "bois": 1200,
    "agroalimentaire": 900,
    "peche": 600,
    "services": 450,
    "petrole": 7000,
}

CLIMATE_RISK_BY_PROVINCE = {
    "estuaire": {"niveau": "élevé", "risques": ["inondation", "érosion côtière", "continuité logistique"]},
    "ogooue_maritime": {"niveau": "élevé", "risques": ["érosion côtière", "submersion", "pollution littorale"]},
    "haut_ogooue": {"niveau": "modéré", "risques": ["stress hydrique local", "poussières minières"]},
    "moyen_ogooue": {"niveau": "modéré", "risques": ["crues", "accès routier"]},
}

SECTOR_SUSTAINABILITY_PROFILES = {
    "mines": {
        "leviers": ["efficacité énergétique", "eau industrielle", "réhabilitation des sites", "poussières"],
        "risques_transition": ["coût énergie", "conformité environnementale", "acceptabilité territoriale"],
        "priorite": "haute",
    },
    "petrole": {
        "leviers": ["réduction torchage", "efficacité procédés", "surveillance émissions", "plans d'urgence"],
        "risques_transition": ["pression carbone", "normes internationales", "risques littoraux"],
        "priorite": "haute",
    },
    "btp": {
        "leviers": ["matériaux locaux", "recyclage granulats", "performance énergétique", "déchets chantier"],
        "risques_transition": ["coût matériaux", "déchets", "empreinte transport"],
        "priorite": "moyenne",
    },
    "chimie": {
        "leviers": ["gestion effluents", "substitution intrants", "sécurité procédés", "ISO 14001"],
        "risques_transition": ["déchets dangereux", "eau", "conformité normes"],
        "priorite": "haute",
    },
    "bois": {
        "leviers": ["valorisation sciures", "séchage performant", "traçabilité", "certification durable"],
        "risques_transition": ["ressource forestière", "rendement matière", "marchés certifiés"],
        "priorite": "haute",
    },
    "agroalimentaire": {
        "leviers": ["biomasse", "emballages", "eau", "chaîne du froid efficace"],
        "risques_transition": ["pertes matières", "énergie froid", "qualité eau"],
        "priorite": "moyenne",
    },
}

SUSTAINABILITY_KEYWORDS = {
    "energie": ["energie", "énergie", "solaire", "efficac", "kwh", "groupe electrogene", "groupe électrogène"],
    "eau": ["eau", "effluent", "hydrique", "reutilisation", "réutilisation", "forage"],
    "dechets": ["dechet", "déchet", "recycl", "valorisation", "sous-produit", "biomasse"],
    "carbone": ["carbone", "co2", "bas-carbone", "decarbon", "décarbon"],
    "conformite": ["environnement", "iso 14001", "certification", "rehabilitation", "réhabilitation"],
}


def _label(value: str | None) -> str:
    if not value:
        return "non_precise"
    return value.strip().lower().replace(" ", "_")


def _maturity_level(score: float) -> str:
    if score >= 70:
        return "transition structurée"
    if score >= 45:
        return "transition à consolider"
    return "socle durable à construire"


def _contains_any(text: str, keywords: list[str]) -> bool:
    normalized = text.lower()
    return any(keyword in normalized for keyword in keywords)


@router.get("/cockpit")
async def get_durabilite_cockpit(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Cockpit exécutif FAM-DUR-001.

    Les indicateurs carbone/eau/circularité sont des estimations de pilotage.
    Ils doivent être consolidés avec les autorités compétentes lorsque les
    données réglementaires deviennent disponibles.
    """

    operators = (
        db.execute(
            select(OperateurIndustrielORM)
            .where(OperateurIndustrielORM.is_active.is_(True))
            .where(OperateurIndustrielORM.deleted_at.is_(None))
        )
        .scalars()
        .all()
    )
    atis = db.execute(select(AgrementTechniqueIndustrielORM)).scalars().all()
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    resources = db.execute(select(RINRessourceORM).where(RINRessourceORM.deleted_at.is_(None))).scalars().all()
    inspections = db.execute(select(InspectionConformiteORM)).scalars().all()
    investments = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )

    approved_atis_by_sector: Counter[str] = Counter(_label(ati.secteur) for ati in atis if ati.statut == "approuve")
    estimated_co2_kg_by_sector = {
        sector: count * SECTOR_EMISSION_FACTORS_KG_PER_ATI.get(sector, 500)
        for sector, count in approved_atis_by_sector.items()
    }
    total_co2_tonnes = round(sum(estimated_co2_kg_by_sector.values()) / 1000, 2)

    production_total = sum(row.production_volume or 0 for row in declarations)
    energy_total = sum(row.energy_kwh or 0 for row in declarations)
    energy_intensity = round(energy_total / production_total, 2) if production_total else 0
    imported_raw_material_avg = (
        round(mean([row.imported_raw_material_pct for row in declarations]), 1) if declarations else 0
    )
    local_raw_material_avg = round(mean([row.local_raw_material_pct for row in declarations]), 1) if declarations else 0

    resource_types = Counter(_label(item.type_ressource) for item in resources)
    import_dependent_resources = sum(1 for item in resources if item.dependance_import)
    energy_resources = [item for item in resources if _label(item.type_ressource) == "energie"]
    material_resources = [item for item in resources if _label(item.type_ressource) == "matiere_premiere"]

    sector_energy: dict[str, float] = defaultdict(float)
    sector_production: dict[str, float] = defaultdict(float)
    sector_imported_material: dict[str, list[float]] = defaultdict(list)
    for row in declarations:
        sector = _label(row.secteur)
        sector_energy[sector] += row.energy_kwh or 0
        sector_production[sector] += row.production_volume or 0
        sector_imported_material[sector].append(row.imported_raw_material_pct)

    circularity_score = round(
        max(
            0,
            min(
                100,
                (local_raw_material_avg * 0.55)
                + (max(0, 100 - imported_raw_material_avg) * 0.25)
                + (min(100, len(material_resources) * 8) * 0.2),
            ),
        ),
        1,
    )
    resource_score = round(
        max(
            0,
            min(
                100,
                (100 if energy_resources else 35) * 0.25
                + (100 if declarations else 30) * 0.25
                + max(0, 100 - min(100, import_dependent_resources * 8)) * 0.25
                + max(0, 100 - min(100, energy_intensity / 8)) * 0.25,
            ),
        ),
        1,
    )
    climate_score = round(
        max(
            0,
            min(
                100,
                72
                - (sum(1 for op in operators if _label(op.province) in CLIMATE_RISK_BY_PROVINCE) * 1.2)
                + (100 if inspections else 25) * 0.12,
            ),
        ),
        1,
    )
    carbon_score = round(max(0, min(100, 78 - total_co2_tonnes / 12)), 1)
    maturity_score = round(mean([resource_score, circularity_score, climate_score, carbon_score]), 1)

    sectors = []
    all_sectors = sorted(set(sector_energy) | set(estimated_co2_kg_by_sector) | set(approved_atis_by_sector))
    for sector in all_sectors:
        production = sector_production.get(sector, 0)
        energy = sector_energy.get(sector, 0)
        sectors.append(
            {
                "secteur": sector,
                "atis_approuves": approved_atis_by_sector.get(sector, 0),
                "energie_kwh": round(energy, 2),
                "production": round(production, 2),
                "intensite_energie": round(energy / production, 2) if production else 0,
                "co2_estime_tonnes": round(estimated_co2_kg_by_sector.get(sector, 0) / 1000, 2),
                "matiere_importee_pct": round(mean(sector_imported_material[sector]), 1)
                if sector_imported_material.get(sector)
                else 0,
            }
        )
    sectors.sort(key=lambda item: item["co2_estime_tonnes"], reverse=True)

    sector_profiles = []
    for sector in sectors:
        profile = SECTOR_SUSTAINABILITY_PROFILES.get(
            sector["secteur"],
            {
                "leviers": ["mesure énergie", "gestion matières", "conformité environnementale"],
                "risques_transition": ["données à qualifier", "normes à préciser"],
                "priorite": "à qualifier",
            },
        )
        intensity_score = max(0, 100 - min(100, float(sector["intensite_energie"]) / 8))
        import_score = max(0, 100 - float(sector["matiere_importee_pct"]))
        carbon_pressure = min(100, float(sector["co2_estime_tonnes"]) * 7)
        transition_readiness = round(
            (intensity_score * 0.35) + (import_score * 0.25) + (max(0, 100 - carbon_pressure) * 0.4), 1
        )
        sector_profiles.append(
            {
                "secteur": sector["secteur"],
                "priorite": profile["priorite"],
                "score_preparation": transition_readiness,
                "pression_carbone": round(carbon_pressure, 1),
                "leviers": profile["leviers"],
                "risques_transition": profile["risques_transition"],
            }
        )

    sustainability_taxonomy = []
    for category, keywords in SUSTAINABILITY_KEYWORDS.items():
        matched_investments = [
            item for item in investments if _contains_any(f"{item.intitule} {item.description or ''}", keywords)
        ]
        matched_resources = [
            item
            for item in resources
            if _contains_any(f"{item.type_ressource} {item.libelle} {item.origine or ''}", keywords)
        ]
        coverage = round(min(100, len(matched_investments) * 22 + len(matched_resources) * 12), 1)
        sustainability_taxonomy.append(
            {
                "axe": category,
                "couverture": coverage,
                "investissements": len(matched_investments),
                "ressources": len(matched_resources),
                "statut": "actif" if coverage >= 45 else "à structurer",
            }
        )

    circularity_opportunities = []
    by_operator_resources: dict[str, list[RINRessourceORM]] = defaultdict(list)
    operator_by_id = {op.id: op for op in operators}
    for resource in resources:
        by_operator_resources[resource.operateur_id].append(resource)
    for operator_id, operator_resources in by_operator_resources.items():
        operator = operator_by_id.get(operator_id)
        if not operator:
            continue
        imported = [item for item in operator_resources if item.dependance_import]
        local = [item for item in operator_resources if not item.dependance_import]
        if imported or len(local) >= 2:
            circularity_opportunities.append(
                {
                    "operateur": operator.raison_sociale,
                    "secteur": _label(operator.secteur),
                    "province": _label(operator.province),
                    "opportunite": (
                        "Substitution locale d'intrants importés"
                        if imported
                        else "Valorisation croisée de ressources et sous-produits"
                    ),
                    "ressources_cibles": [item.libelle for item in (imported or local)[:3]],
                    "gain_potentiel": "réduction import / déchets / coûts logistiques",
                    "priorite": "haute" if imported else "moyenne",
                }
            )

    environmental_inspections = [
        inspection
        for inspection in inspections
        if _contains_any(
            f"{inspection.observations} {inspection.mesures_correctives or ''}",
            SUSTAINABILITY_KEYWORDS["conformite"] + SUSTAINABILITY_KEYWORDS["eau"] + SUSTAINABILITY_KEYWORDS["dechets"],
        )
    ]
    non_compliant_environment = [
        inspection
        for inspection in environmental_inspections
        if _label(inspection.statut_conformite) not in {"conforme", "conforme_avec_reserves"}
    ]
    compliance_score = round(
        100
        if not environmental_inspections
        else max(0, 100 - (len(non_compliant_environment) / len(environmental_inspections) * 100)),
        1,
    )
    maturity_score = round(mean([resource_score, circularity_score, climate_score, carbon_score, compliance_score]), 1)

    resource_security = []
    for resource_type, count in resource_types.most_common():
        type_resources = [item for item in resources if _label(item.type_ressource) == resource_type]
        import_count = sum(1 for item in type_resources if item.dependance_import)
        dependency = round((import_count / len(type_resources) * 100), 1) if type_resources else 0
        resource_security.append(
            {
                "type": resource_type,
                "ressources": count,
                "dependance_import_pct": dependency,
                "niveau_risque": "élevé" if dependency >= 60 else "modéré" if dependency >= 25 else "maîtrisé",
            }
        )

    carbon_trajectory = [
        {
            "horizon": "référence actuelle",
            "co2_tonnes": total_co2_tonnes,
            "objectif": "Établir l'inventaire carbone indicatif consolidé.",
        },
        {
            "horizon": "2027",
            "co2_tonnes": round(total_co2_tonnes * 0.96, 2),
            "objectif": "Réduire 4% via efficacité énergétique et fiabilisation des mesures.",
        },
        {
            "horizon": "2030",
            "co2_tonnes": round(total_co2_tonnes * 0.82, 2),
            "objectif": "Réduire 18% sur les secteurs prioritaires et projets bas-carbone.",
        },
        {
            "horizon": "2035",
            "co2_tonnes": round(total_co2_tonnes * 0.68, 2),
            "objectif": "Installer une trajectoire industrielle compatible transition durable.",
        },
    ]

    ministerial_actions = [
        {
            "chantier": "Inventaire carbone industriel",
            "responsable": "Direction industrie + environnement",
            "delai": "0-6 mois",
            "livrable": "Méthode, facteurs d'émission versionnés, secteurs prioritaires.",
        },
        {
            "chantier": "Plan efficacité énergie/eau",
            "responsable": "Direction technique",
            "delai": "6-12 mois",
            "livrable": "Tableau de bord intensité énergétique, eau et alertes par filière.",
        },
        {
            "chantier": "Bourse des symbioses industrielles",
            "responsable": "PNPI + zones industrielles",
            "delai": "12 mois",
            "livrable": "Catalogue déchets, sous-produits, chaleur, eau réutilisable.",
        },
        {
            "chantier": "Conformité environnementale",
            "responsable": "Inspection industrielle",
            "delai": "continu",
            "livrable": "Contrôles ciblés, corrections suivies, preuves archivées.",
        },
    ]

    territories = []
    for province, count in Counter(_label(op.province) for op in operators).most_common():
        risk = CLIMATE_RISK_BY_PROVINCE.get(
            province, {"niveau": "à qualifier", "risques": ["risque climatique à qualifier"]}
        )
        territories.append(
            {
                "province": province,
                "operateurs": count,
                "niveau_risque": risk["niveau"],
                "risques": risk["risques"],
            }
        )

    transition_investments = [
        item
        for item in investments
        if any(
            keyword in f"{item.intitule} {item.description or ''}".lower()
            for keyword in ["energie", "énergie", "eau", "carbone", "solaire", "efficac", "recycl", "valorisation"]
        )
    ]

    alerts = []
    if energy_intensity > 500:
        alerts.append(
            {
                "niveau": "élevé",
                "titre": "Intensité énergétique élevée",
                "message": "Certaines déclarations ONI suggèrent une consommation d'énergie importante par unité produite.",
            }
        )
    if imported_raw_material_avg > 40:
        alerts.append(
            {
                "niveau": "modéré",
                "titre": "Dépendance aux matières importées",
                "message": "La dépendance moyenne aux intrants importés doit être surveillée par filière.",
            }
        )
    if not transition_investments:
        alerts.append(
            {
                "niveau": "modéré",
                "titre": "Investissements de transition à formaliser",
                "message": "Les investissements explicitement liés à l'énergie, l'eau, le recyclage ou le bas-carbone restent peu visibles.",
            }
        )
    if compliance_score < 70:
        alerts.append(
            {
                "niveau": "élevé",
                "titre": "Conformité environnementale à renforcer",
                "message": "Les inspections liées à l'environnement doivent être suivies avec preuves de correction et échéances.",
            }
        )

    recommendations = [
        {
            "priorite": "haute",
            "titre": "Normaliser les données ressources",
            "action": "Exiger source, période, unité, méthode et niveau de confiance pour énergie, eau et matières.",
        },
        {
            "priorite": "haute",
            "titre": "Créer l'inventaire carbone industriel progressif",
            "action": "Commencer par les secteurs prioritaires, puis distinguer émissions directes et indirectes.",
        },
        {
            "priorite": "moyenne",
            "titre": "Identifier les symbioses industrielles",
            "action": "Rapprocher déchets, sous-produits, chaleur fatale, eau réutilisable et besoins des zones industrielles.",
        },
        {
            "priorite": "moyenne",
            "titre": "Cartographier les risques climatiques",
            "action": "Relier unités, zones, infrastructures et chaînes de valeur aux risques physiques et de transition.",
        },
    ]

    return {
        "generated_at": now_utc().isoformat(),
        "maturite_durable": {
            "score": maturity_score,
            "niveau": _maturity_level(maturity_score),
            "breakdown": {
                "ressources": resource_score,
                "circularite": circularity_score,
                "carbone": carbon_score,
                "resilience_climatique": climate_score,
                "conformite_environnementale": compliance_score,
            },
        },
        "stats": {
            "operateurs": len(operators),
            "declarations_oni": len(declarations),
            "energie_kwh": round(energy_total, 2),
            "production_total": round(production_total, 2),
            "intensite_energie": energy_intensity,
            "co2_estime_tonnes": total_co2_tonnes,
            "matiere_locale_pct": local_raw_material_avg,
            "matiere_importee_pct": imported_raw_material_avg,
            "ressources_rin": len(resources),
            "ressources_dependantes_import": import_dependent_resources,
            "investissements_transition": len(transition_investments),
            "score_conformite_environnementale": compliance_score,
            "inspections_environnementales": len(environmental_inspections),
            "opportunites_circularite": len(circularity_opportunities),
        },
        "secteurs": sectors,
        "profils_sectoriels": sector_profiles,
        "territoires": territories,
        "ressources": {
            "par_type": [{"type": key, "count": value} for key, value in resource_types.most_common()],
            "energie": len(energy_resources),
            "matieres": len(material_resources),
        },
        "taxonomie_durable": sustainability_taxonomy,
        "opportunites_circularite": circularity_opportunities,
        "securite_ressources": resource_security,
        "trajectoire_carbone": carbon_trajectory,
        "actions_ministerielles": ministerial_actions,
        "alertes": alerts,
        "recommendations": recommendations,
        "trajectoire": [
            {"horizon": "0-6 mois", "objectif": "Fiabiliser les données énergie, eau, matières et émissions estimées."},
            {
                "horizon": "6-12 mois",
                "objectif": "Lancer inventaire carbone progressif et premières analyses de circularité.",
            },
            {
                "horizon": "12-24 mois",
                "objectif": "Piloter plans de réduction, symbioses industrielles et résilience climatique.",
            },
        ],
        "lecture_executive": (
            "Le domaine durable transforme le PNPI en outil de pilotage des ressources, de la circularité et de la "
            "décarbonation. Les données actuelles permettent déjà une lecture indicative, mais les émissions, risques "
            "climatiques et trajectoires doivent être consolidés avec les autorités compétentes et des méthodes versionnées."
        ),
        "source_note": (
            "Estimations de démonstration issues des ATI approuvés, déclarations ONI, ressources RIN, inspections et "
            "investissements. Les facteurs d'émission sont indicatifs et ne remplacent pas un inventaire réglementaire."
        ),
        "requested_by": current_user.username,
    }

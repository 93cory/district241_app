"""PNPI · Capital humain industriel, compétences et emploi."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from statistics import mean

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    InnovationActorORM,
    InnovationProjectORM,
    InnovationTechnologyORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
    RINInvestissementORM,
)

router = APIRouter(prefix="/pnpi/capital-humain", tags=["Capital humain industriel"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur)


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return [str(item) for item in parsed] if isinstance(parsed, list) else []


def _coverage_level(score: float) -> str:
    if score >= 70:
        return "socle structuré"
    if score >= 45:
        return "socle à consolider"
    return "priorité nationale"


def _sector_label(value: str | None) -> str:
    if not value:
        return "non_precise"
    return value.strip().lower().replace(" ", "_")


def _skill_family(skill: str) -> str:
    value = skill.lower()
    if any(token in value for token in ["data", "donnée", "analytique", "ia"]):
        return "Données & IA"
    if any(token in value for token in ["maintenance", "automatisme", "capteur", "machine"]):
        return "Maintenance & automatisation"
    if any(token in value for token in ["réseau", "reseau", "connectivité", "connectivite"]):
        return "Connectivité industrielle"
    if any(token in value for token in ["sécurité", "securite", "cyber"]):
        return "Sécurité industrielle"
    if any(token in value for token in ["production", "qualité", "qualite"]):
        return "Production & qualité"
    return "Compétences industrielles générales"


@router.get("/cockpit")
async def get_capital_humain_cockpit(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Cockpit exécutif du domaine FAM-CAP-001.

    Le module exploite les données déjà disponibles dans le prototype :
    opérateurs/effectifs, déclarations ONI, investissements RIN et compétences
    requises par les technologies d'innovation. Les estimations restent des
    aides à la décision et doivent être consolidées par enquête métier.
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
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    investments = (
        db.execute(select(RINInvestissementORM).where(RINInvestissementORM.deleted_at.is_(None))).scalars().all()
    )
    technologies = db.execute(select(InnovationTechnologyORM)).scalars().all()
    projects = db.execute(select(InnovationProjectORM)).scalars().all()
    actors = db.execute(select(InnovationActorORM)).scalars().all()

    declared_jobs = sum(op.effectif_declare or 0 for op in operators)
    oni_jobs = sum(item.jobs_total or 0 for item in declarations)
    jobs_created = sum(item.jobs_created or 0 for item in declarations)
    expected_jobs = sum(item.emplois_prevus or 0 for item in investments)
    training_actors = [
        actor for actor in actors if "formation" in " ".join(_json_list(actor.domaines_expertise)).lower()
    ]

    sector_jobs: dict[str, int] = defaultdict(int)
    sector_operators: Counter[str] = Counter()
    province_jobs: dict[str, int] = defaultdict(int)
    province_operators: Counter[str] = Counter()
    for op in operators:
        sector = _sector_label(op.secteur)
        province = _sector_label(op.province)
        jobs = op.effectif_declare or 0
        sector_jobs[sector] += jobs
        sector_operators[sector] += 1
        province_jobs[province] += jobs
        province_operators[province] += 1

    skills_counter: Counter[str] = Counter()
    skills_by_family: Counter[str] = Counter()
    skills_by_technology: list[dict[str, object]] = []
    sectors_needing_skills: Counter[str] = Counter()
    for tech in technologies:
        skills = _json_list(tech.competences_requises)
        for skill in skills:
            normalized_skill = skill.lower()
            skills_counter[normalized_skill] += 1
            skills_by_family[_skill_family(normalized_skill)] += 1
        if skills:
            skills_by_technology.append(
                {
                    "technologie": tech.nom,
                    "secteur": _sector_label(tech.secteur_application),
                    "niveau_maturite": tech.niveau_maturite,
                    "adoption_pct": tech.adoption_nationale_pct,
                    "competences": [skill.lower() for skill in skills],
                    "familles": sorted({_skill_family(skill) for skill in skills}),
                }
            )
        if skills:
            sectors_needing_skills[_sector_label(tech.secteur_application)] += len(skills)
    for project in projects:
        for risk in _json_list(project.risques):
            if "compétence" in risk.lower() or "competence" in risk.lower():
                skills_counter["compétences projet"] += 1
        if project.filiere_code:
            sectors_needing_skills[_sector_label(project.filiere_code)] += 1

    data_quality_parts = [
        100 if operators else 0,
        min(100, round((sum(1 for op in operators if op.effectif_declare) / max(1, len(operators))) * 100)),
        100 if declarations else 35,
        100 if technologies else 40,
        100 if investments else 45,
    ]
    data_quality_score = round(mean(data_quality_parts), 1)
    pressure_score = min(
        100, round((expected_jobs / max(1, declared_jobs + oni_jobs)) * 100 + len(skills_counter) * 4, 1)
    )
    maturity_score = round(
        (data_quality_score * 0.45)
        + (min(100, len(training_actors) * 35) * 0.25)
        + (max(25, 100 - pressure_score) * 0.3),
        1,
    )

    métiers_en_tension = [
        {
            "competence": skill,
            "occurrences": count,
            "niveau_tension": "élevé" if count >= 3 else "modéré",
            "source": "Technologies innovation / projets pilotes",
        }
        for skill, count in skills_counter.most_common(8)
    ]
    if not métiers_en_tension:
        métiers_en_tension = [
            {
                "competence": "maintenance industrielle",
                "occurrences": 1,
                "niveau_tension": "à qualifier",
                "source": "Hypothèse Livre Blanc — à consolider par enquête",
            }
        ]

    training_paths = [
        {
            "role": "operateur",
            "titre": "Déposer, suivre et compléter mes dossiers PNPI",
            "modules": ["RIN et DIUN", "ATI", "Documents", "Notifications", "Déclarations ONI"],
            "objectif": "Rendre l'entreprise autonome sur ses démarches et ses données.",
        },
        {
            "role": "instructeur",
            "titre": "Instruction conforme et traçable",
            "modules": ["Workflow ATI", "Contrôle des pièces", "Demandes de complément", "Avis motivés", "Audit"],
            "objectif": "Réduire les erreurs de procédure et harmoniser l'instruction.",
        },
        {
            "role": "directeur",
            "titre": "Pilotage opérationnel des dossiers et équipes",
            "modules": ["Centre ATI", "Inspections", "KPI", "Retards", "Validation hiérarchique"],
            "objectif": "Prioriser les dossiers, les risques et les décisions.",
        },
        {
            "role": "ministre",
            "titre": "Lecture stratégique du tissu industriel",
            "modules": ["Dashboard national", "Filières", "Investissements", "Carte", "Alertes stratégiques"],
            "objectif": "Décider avec une vision consolidée, territoriale et sectorielle.",
        },
        {
            "role": "admin",
            "titre": "Exploitation, sécurité et qualité de la plateforme",
            "modules": ["RBAC", "SOC", "Audit", "Configurations", "Interopérabilité", "Sauvegardes"],
            "objectif": "Garantir une plateforme exploitable, sûre et auditable.",
        },
    ]

    recommendations = [
        {
            "priorite": "haute",
            "titre": "Créer un référentiel national des métiers industriels",
            "action": "Structurer familles professionnelles, métiers, compétences, niveaux de maîtrise et certifications.",
        },
        {
            "priorite": "haute",
            "titre": "Relier investissements et besoins d'emploi",
            "action": "Chaque projet d'investissement doit déclarer les emplois prévus et compétences associées.",
        },
        {
            "priorite": "moyenne",
            "titre": "Personnaliser les formations PNPI par rôle",
            "action": "Adapter les parcours opérateur, instructeur, directeur, ministre et administrateur.",
        },
        {
            "priorite": "moyenne",
            "titre": "Mettre en place l'adéquation emploi-formation",
            "action": "Comparer besoins des filières, offres de formation et métiers en tension par province.",
        },
    ]

    employment_pipeline = [
        {
            "stage": "Emplois déclarés RIN",
            "value": declared_jobs,
            "description": "Effectifs consolidés depuis les fiches opérateurs.",
        },
        {
            "stage": "Emplois déclarés ONI",
            "value": oni_jobs,
            "description": "Effectifs issus des déclarations périodiques de production.",
        },
        {
            "stage": "Emplois créés ONI",
            "value": jobs_created,
            "description": "Signal d'évolution récente issu des déclarations ONI.",
        },
        {
            "stage": "Emplois prévus investissements",
            "value": expected_jobs,
            "description": "Besoins futurs estimés à partir des projets RIN.",
        },
    ]
    training_gap_score = round(min(100, pressure_score + max(0, len(skills_counter) - len(training_actors) * 3) * 5), 1)
    adequation_score = round(max(0, 100 - training_gap_score * 0.65), 1)
    training_gap_matrix = [
        {
            "famille": family,
            "besoin": count,
            "offre_identifiee": min(count, len(training_actors) * 2),
            "gap": max(0, count - len(training_actors) * 2),
            "priorite": "haute" if count - len(training_actors) * 2 >= 3 else "moyenne" if count else "veille",
        }
        for family, count in skills_by_family.most_common()
    ]
    if not training_gap_matrix:
        training_gap_matrix = [
            {
                "famille": "Maintenance industrielle",
                "besoin": 1,
                "offre_identifiee": len(training_actors),
                "gap": max(0, 1 - len(training_actors)),
                "priorite": "à qualifier",
            }
        ]

    ministerial_actions = [
        {
            "niveau": "Court terme",
            "horizon": "0-3 mois",
            "action": "Valider le référentiel national des métiers industriels et les familles de compétences.",
            "responsable": "Direction études / Capital humain",
        },
        {
            "niveau": "Moyen terme",
            "horizon": "3-9 mois",
            "action": "Lancer une enquête emploi-formation auprès des opérateurs et acteurs de formation.",
            "responsable": "ONI / directions métiers",
        },
        {
            "niveau": "Programme",
            "horizon": "6-18 mois",
            "action": "Aligner investissements, innovation et formation autour des filières prioritaires.",
            "responsable": "Ministère + partenaires formation",
        },
    ]

    return {
        "generated_at": now_utc().isoformat(),
        "maturite_capital_humain": {
            "score": maturity_score,
            "niveau": _coverage_level(maturity_score),
            "breakdown": {
                "qualite_donnees": data_quality_score,
                "pression_recrutement": pressure_score,
                "offre_formation_identifiee": min(100, len(training_actors) * 35),
                "couverture_competences": min(100, len(skills_counter) * 12),
                "adequation_emploi_formation": adequation_score,
            },
        },
        "stats": {
            "operateurs": len(operators),
            "emplois_declares_rin": declared_jobs,
            "emplois_declares_oni": oni_jobs,
            "emplois_crees_oni": jobs_created,
            "emplois_prevus_investissements": expected_jobs,
            "competences_identifiees": len(skills_counter),
            "acteurs_formation": len(training_actors),
            "score_adequation": adequation_score,
            "score_gap_formation": training_gap_score,
        },
        "secteurs": [
            {
                "secteur": sector,
                "operateurs": sector_operators[sector],
                "emplois_declares": jobs,
                "pression_competences": sectors_needing_skills.get(sector, 0),
            }
            for sector, jobs in sorted(sector_jobs.items(), key=lambda item: item[1], reverse=True)
        ],
        "territoires": [
            {
                "province": province,
                "operateurs": province_operators[province],
                "emplois_declares": jobs,
            }
            for province, jobs in sorted(province_jobs.items(), key=lambda item: item[1], reverse=True)
        ],
        "metiers_en_tension": métiers_en_tension,
        "familles_competences": [
            {"famille": family, "count": count} for family, count in skills_by_family.most_common()
        ],
        "competences_par_technologie": skills_by_technology,
        "pipeline_emplois": employment_pipeline,
        "matrice_formation": training_gap_matrix,
        "actions_ministerielles": ministerial_actions,
        "parcours_formation": training_paths,
        "recommendations": recommendations,
        "lecture_executive": (
            "Le capital humain devient un axe structurant du PNPI : les effectifs, les investissements, les "
            "technologies et les formations doivent être reliés pour anticiper les métiers en tension et soutenir "
            "la transformation locale. Les indicateurs actuels sont des signaux de pilotage à consolider par des "
            "enquêtes emploi-formation et des référentiels versionnés."
        ),
        "source_note": (
            "Calcul de démonstration basé sur RIN, ONI, investissements RIN et innovation. "
            "Les décisions emploi-formation restent à valider avec les institutions compétentes."
        ),
        "requested_by": current_user.username,
    }

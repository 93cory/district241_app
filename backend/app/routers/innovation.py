"""PNPI · Innovation industrielle, R&D, transfert technologique et Industrie 4.0."""

from __future__ import annotations

import json
import uuid
from collections import Counter, defaultdict
from statistics import mean

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.audit import write_audit_event
from ..core.auth import Role, User, require_roles
from ..database import get_db, now_utc
from ..models.pnpi import (
    InnovationActorORM,
    InnovationProjectORM,
    InnovationTechnologyORM,
    ONIPeriodicDeclarationORM,
    OperateurIndustrielORM,
)

router = APIRouter(prefix="/pnpi/innovation", tags=["Innovation & Industrie 4.0"])

READ_ROLES = (Role.admin, Role.ministre, Role.directeur, Role.instructeur, Role.inspecteur)
WRITE_ROLES = (Role.admin, Role.directeur, Role.instructeur)
DECISION_ROLES = (Role.admin, Role.ministre, Role.directeur)

DEFAULT_TECHNOLOGIES = [
    {
        "code": "iot_industriel",
        "nom": "IoT industriel",
        "domaine": "industrie_4_0",
        "description": "Capteurs connectés pour suivre la production, l'énergie, les arrêts et la maintenance.",
        "niveau_maturite": 3,
        "secteur_application": "bois",
        "cout_relatif": "moyen",
        "complexite": "moyenne",
        "competences_requises": ["automatisme", "réseaux", "maintenance"],
        "infrastructures_requises": ["connectivité usine", "capteurs", "supervision"],
        "adoption_nationale_pct": 22,
    },
    {
        "code": "erp_pme_industrielle",
        "nom": "ERP industriel PME",
        "domaine": "digitalisation",
        "description": "Gestion intégrée des stocks, achats, production, ventes et traçabilité.",
        "niveau_maturite": 4,
        "secteur_application": "agroalimentaire",
        "cout_relatif": "moyen",
        "complexite": "moyenne",
        "competences_requises": ["gestion production", "comptabilité", "données"],
        "infrastructures_requises": ["postes utilisateurs", "connexion internet", "formation"],
        "adoption_nationale_pct": 35,
    },
    {
        "code": "maintenance_predictive",
        "nom": "Maintenance prédictive",
        "domaine": "automatisation",
        "description": "Analyse des signaux machines pour anticiper les pannes et réduire les arrêts.",
        "niveau_maturite": 2,
        "secteur_application": "mines",
        "cout_relatif": "élevé",
        "complexite": "élevée",
        "competences_requises": ["data", "maintenance", "capteurs"],
        "infrastructures_requises": ["historique machine", "capteurs", "plateforme analytique"],
        "adoption_nationale_pct": 12,
    },
]

DEFAULT_ACTORS = [
    {
        "nom": "Cellule nationale Innovation Industrie",
        "type_organisation": "administration",
        "domaines_expertise": ["politique industrielle", "coordination", "financement"],
        "capacites_techniques": ["animation écosystème", "pilotage programmes"],
        "secteurs_couverts": ["bois", "agroalimentaire", "mines"],
        "equipements_disponibles": [],
        "province": "estuaire",
        "contact": "à valider",
    },
    {
        "nom": "Centre technique partenaire",
        "type_organisation": "centre_technique",
        "domaines_expertise": ["tests", "prototypage", "formation"],
        "capacites_techniques": ["diagnostic technologique", "accompagnement PME"],
        "secteurs_couverts": ["agroalimentaire", "bois"],
        "equipements_disponibles": ["laboratoire", "atelier pilote"],
        "province": "estuaire",
        "contact": "à valider",
    },
]

INDUSTRY_40_DIMENSIONS = [
    {
        "key": "donnees",
        "label": "Données industrielles",
        "description": "Capacité à collecter, structurer et exploiter les données de production.",
    },
    {
        "key": "connectivite",
        "label": "Connectivité usine",
        "description": "Réseaux, capteurs, supervision et remontée terrain.",
    },
    {
        "key": "automatisation",
        "label": "Automatisation",
        "description": "Équipements, maintenance, contrôle procédé et réduction des arrêts.",
    },
    {
        "key": "competences",
        "label": "Compétences numériques",
        "description": "Métiers data, maintenance connectée, cybersécurité et conduite du changement.",
    },
    {
        "key": "propriete_industrielle",
        "label": "Propriété industrielle",
        "description": "Protection OGAPI, transferts technologiques, marques, modèles et brevets.",
    },
]


class TechnologyPayload(BaseModel):
    code: str
    nom: str
    domaine: str = "industrie_4_0"
    description: str | None = None
    niveau_maturite: int = Field(default=1, ge=1, le=5)
    secteur_application: str | None = None
    cout_relatif: str | None = None
    complexite: str | None = None
    competences_requises: list[str] = []
    infrastructures_requises: list[str] = []
    adoption_nationale_pct: float = Field(default=0, ge=0, le=100)


class ActorPayload(BaseModel):
    nom: str
    type_organisation: str
    domaines_expertise: list[str] = []
    capacites_techniques: list[str] = []
    secteurs_couverts: list[str] = []
    equipements_disponibles: list[str] = []
    province: str | None = None
    contact: str | None = None
    statut: str = "actif"


class ProjectPayload(BaseModel):
    titre: str
    operateur_id: str | None = None
    technologie_id: str | None = None
    filiere_code: str | None = None
    description: str | None = None
    objectif: str | None = None
    niveau_maturite: int = Field(default=1, ge=1, le=5)
    budget_fcfa: int = Field(default=0, ge=0)
    partenaires: list[str] = []
    besoins_financement: str | None = None
    resultats_attendus: str | None = None
    risques: list[str] = []
    statut: str = "idee"


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def _dump_list(value: list[str]) -> str:
    return json.dumps(value, ensure_ascii=False)


def _json_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _seed_defaults(db: Session, actor: str = "system") -> None:
    if db.execute(select(InnovationTechnologyORM.id).limit(1)).scalar_one_or_none():
        return
    technologies: list[InnovationTechnologyORM] = []
    for item in DEFAULT_TECHNOLOGIES:
        row = InnovationTechnologyORM(
            id=_new_id("TECH"),
            code=item["code"],
            nom=item["nom"],
            domaine=item["domaine"],
            description=item["description"],
            niveau_maturite=item["niveau_maturite"],
            secteur_application=item["secteur_application"],
            cout_relatif=item["cout_relatif"],
            complexite=item["complexite"],
            competences_requises=_dump_list(item["competences_requises"]),
            infrastructures_requises=_dump_list(item["infrastructures_requises"]),
            adoption_nationale_pct=item["adoption_nationale_pct"],
            created_by=actor,
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(row)
        technologies.append(row)
    for item in DEFAULT_ACTORS:
        db.add(
            InnovationActorORM(
                id=_new_id("ACTI"),
                nom=item["nom"],
                type_organisation=item["type_organisation"],
                domaines_expertise=_dump_list(item["domaines_expertise"]),
                capacites_techniques=_dump_list(item["capacites_techniques"]),
                secteurs_couverts=_dump_list(item["secteurs_couverts"]),
                equipements_disponibles=_dump_list(item["equipements_disponibles"]),
                province=item["province"],
                contact=item["contact"],
                statut="actif",
                created_by=actor,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
        )
    db.flush()
    first_operator = db.execute(select(OperateurIndustrielORM).limit(1)).scalar_one_or_none()
    for tech in technologies:
        db.add(
            InnovationProjectORM(
                id=_new_id("INNP"),
                titre=f"Programme pilote · {tech.nom}",
                operateur_id=first_operator.id if first_operator else None,
                technologie_id=tech.id,
                filiere_code=tech.secteur_application,
                description="Projet pilote issu du livre blanc PNPI pour évaluer l'adoption technologique.",
                objectif="Démontrer l'impact productif, documenter les besoins et préparer un passage à l'échelle.",
                niveau_maturite=max(1, min(5, tech.niveau_maturite - 1)),
                budget_fcfa=75_000_000,
                partenaires=_dump_list(["Ministère de l'Industrie", "Centre technique partenaire"]),
                besoins_financement="Budget pilote, formation et accompagnement technique.",
                resultats_attendus="Diagnostic, pilote opérationnel, retour d'expérience et feuille de route.",
                risques=_dump_list(["compétences disponibles", "connectivité", "maintenance"]),
                statut="pilote",
                created_by=actor,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
        )
    db.commit()


def _serialize_technology(row: InnovationTechnologyORM) -> dict:
    return {
        "id": row.id,
        "code": row.code,
        "nom": row.nom,
        "domaine": row.domaine,
        "description": row.description,
        "niveau_maturite": row.niveau_maturite,
        "secteur_application": row.secteur_application,
        "cout_relatif": row.cout_relatif,
        "complexite": row.complexite,
        "competences_requises": _json_list(row.competences_requises),
        "infrastructures_requises": _json_list(row.infrastructures_requises),
        "adoption_nationale_pct": row.adoption_nationale_pct,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_actor(row: InnovationActorORM) -> dict:
    return {
        "id": row.id,
        "nom": row.nom,
        "type_organisation": row.type_organisation,
        "domaines_expertise": _json_list(row.domaines_expertise),
        "capacites_techniques": _json_list(row.capacites_techniques),
        "secteurs_couverts": _json_list(row.secteurs_couverts),
        "equipements_disponibles": _json_list(row.equipements_disponibles),
        "province": row.province,
        "contact": row.contact,
        "statut": row.statut,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _serialize_project(row: InnovationProjectORM) -> dict:
    return {
        "id": row.id,
        "titre": row.titre,
        "operateur_id": row.operateur_id,
        "operateur_nom": row.operateur.raison_sociale if row.operateur else None,
        "technologie_id": row.technologie_id,
        "technologie_nom": row.technologie.nom if row.technologie else None,
        "filiere_code": row.filiere_code,
        "description": row.description,
        "objectif": row.objectif,
        "niveau_maturite": row.niveau_maturite,
        "budget_fcfa": row.budget_fcfa,
        "partenaires": _json_list(row.partenaires),
        "besoins_financement": row.besoins_financement,
        "resultats_attendus": row.resultats_attendus,
        "risques": _json_list(row.risques),
        "statut": row.statut,
        "created_by": row.created_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _digital_maturity(
    technologies: list[InnovationTechnologyORM],
    projects: list[InnovationProjectORM],
    declarations: list[ONIPeriodicDeclarationORM],
) -> dict:
    tech_score = min(mean([t.niveau_maturite for t in technologies]) * 12 if technologies else 0, 60)
    project_score = min(len(projects) * 6, 25)
    adoption_score = min(mean([t.adoption_nationale_pct for t in technologies]) * 0.3 if technologies else 0, 15)
    capacity_values = [
        (row.capacity_used / row.capacity_installed) * 100
        for row in declarations
        if row.capacity_installed and row.capacity_installed > 0
    ]
    capacity_signal = round(mean(capacity_values), 1) if capacity_values else 0
    score = round(min(100, tech_score + project_score + adoption_score), 1)
    if score >= 70:
        niveau = "Industrie 4.0 en accélération"
    elif score >= 45:
        niveau = "Digitalisation en consolidation"
    elif score >= 25:
        niveau = "Premiers pilotes structurés"
    else:
        niveau = "Base encore manuelle"
    return {
        "score": score,
        "niveau": niveau,
        "capacite_utilisee_pct": capacity_signal,
        "breakdown": {
            "technologies": round(tech_score, 1),
            "projets": round(project_score, 1),
            "adoption": round(adoption_score, 1),
        },
    }


def _recommendations(
    maturity: dict, technologies: list[InnovationTechnologyORM], projects: list[InnovationProjectORM]
) -> list[dict]:
    recommendations: list[dict] = []
    if maturity["score"] < 45:
        recommendations.append(
            {
                "priorite": "haute",
                "titre": "Lancer un diagnostic numérique national",
                "action": "Évaluer les processus, équipements, données, maintenance et compétences des unités industrielles prioritaires.",
            }
        )
    if technologies and mean([t.adoption_nationale_pct for t in technologies]) < 30:
        recommendations.append(
            {
                "priorite": "haute",
                "titre": "Accélérer les pilotes technologiques",
                "action": "Sélectionner 3 à 5 entreprises vitrines et mesurer les gains de productivité avant généralisation.",
            }
        )
    if len(projects) < 5:
        recommendations.append(
            {
                "priorite": "moyenne",
                "titre": "Constituer un portefeuille de projets Innovation",
                "action": "Relier chaque projet à une filière, une technologie, un budget et un partenaire technique.",
            }
        )
    recommendations.append(
        {
            "priorite": "suivi",
            "titre": "Coordonner avec l'OGAPI",
            "action": "Documenter les brevets, marques, modèles et transferts technologiques sans se substituer à l'OGAPI.",
        }
    )
    return recommendations[:4]


def _industry_40_diagnostic(
    technologies: list[InnovationTechnologyORM],
    projects: list[InnovationProjectORM],
    actors: list[InnovationActorORM],
    declarations: list[ONIPeriodicDeclarationORM],
) -> dict:
    domain_counts = Counter(t.domaine for t in technologies)
    project_by_status = Counter(project.statut for project in projects)
    competencies = Counter(
        competence for technology in technologies for competence in _json_list(technology.competences_requises)
    )
    actor_capabilities = Counter(
        capability for actor in actors for capability in _json_list(actor.capacites_techniques)
    )
    capacity_values = [
        (row.capacity_used / row.capacity_installed) * 100
        for row in declarations
        if row.capacity_installed and row.capacity_installed > 0
    ]
    capacity_signal = mean(capacity_values) if capacity_values else 0

    scores = {
        "donnees": min(100, len(declarations) * 18 + domain_counts.get("digitalisation", 0) * 18),
        "connectivite": min(100, domain_counts.get("industrie_4_0", 0) * 28 + len(projects) * 8),
        "automatisation": min(100, domain_counts.get("automatisation", 0) * 32 + capacity_signal * 0.45),
        "competences": min(100, len(competencies) * 9 + len(actor_capabilities) * 5),
        "propriete_industrielle": min(
            100,
            sum(1 for p in projects if any("ogapi" in partner.lower() for partner in _json_list(p.partenaires))) * 24
            + len(projects) * 6,
        ),
    }
    dimensions = []
    for dimension in INDUSTRY_40_DIMENSIONS:
        score = round(scores.get(dimension["key"], 0), 1)
        if score >= 70:
            status = "prêt"
        elif score >= 45:
            status = "à consolider"
        else:
            status = "prioritaire"
        dimensions.append({**dimension, "score": score, "status": status})

    roadmap = [
        {
            "phase": "Diagnostic",
            "horizon": "0-3 mois",
            "focus": "Cartographier les équipements, données, compétences et irritants industriels.",
            "status": "à lancer" if not declarations else "en cours",
        },
        {
            "phase": "Pilotes",
            "horizon": "3-9 mois",
            "focus": "Sélectionner des entreprises vitrines par filière et mesurer les gains.",
            "status": "en cours" if project_by_status.get("pilote", 0) else "à lancer",
        },
        {
            "phase": "Protection & normalisation",
            "horizon": "6-12 mois",
            "focus": "Aligner OGAPI, AGANOR et PNPI sur les preuves, normes et titres de propriété industrielle.",
            "status": "protocole cible",
        },
        {
            "phase": "Passage à l'échelle",
            "horizon": "12-24 mois",
            "focus": "Transformer les pilotes en programmes nationaux par filière et province.",
            "status": "cible",
        },
    ]
    return {
        "score": round(mean([item["score"] for item in dimensions]), 1) if dimensions else 0,
        "dimensions": dimensions,
        "competences_critiques": [{"competence": key, "count": value} for key, value in competencies.most_common(8)],
        "capacites_acteurs": [{"capacite": key, "count": value} for key, value in actor_capabilities.most_common(8)],
        "roadmap": roadmap,
    }


def _rd_portfolio(projects: list[InnovationProjectORM], technologies: list[InnovationTechnologyORM]) -> dict:
    technology_by_id = {technology.id: technology for technology in technologies}
    status_counts = Counter(project.statut for project in projects)
    maturity_counts = Counter(project.niveau_maturite for project in projects)
    projects_by_filiere = Counter(project.filiere_code or "non_precise" for project in projects)
    total_budget = sum(project.budget_fcfa or 0 for project in projects)
    protected_candidates = []
    for project in projects:
        technology = technology_by_id.get(project.technologie_id or "")
        if project.niveau_maturite >= 3 or (technology and technology.niveau_maturite >= 3):
            protected_candidates.append(
                {
                    "project": project.titre,
                    "technology": technology.nom if technology else project.technologie_id,
                    "filiere": project.filiere_code,
                    "orientation": "OGAPI: analyser brevet, marque, dessin/modèle ou secret industriel.",
                }
            )
    return {
        "status_counts": [{"status": key, "count": value} for key, value in status_counts.most_common()],
        "maturity_counts": [{"niveau": key, "count": value} for key, value in sorted(maturity_counts.items())],
        "by_filiere": [{"filiere": key, "count": value} for key, value in projects_by_filiere.most_common()],
        "total_budget_fcfa": total_budget,
        "protected_candidates": protected_candidates[:6],
    }


@router.get("/cockpit", summary="Cockpit national Innovation & Industrie 4.0")
async def innovation_cockpit(
    current_user: User = Depends(require_roles(*DECISION_ROLES)),
    db: Session = Depends(get_db),
):
    _seed_defaults(db, actor=current_user.username)
    technologies = db.execute(select(InnovationTechnologyORM).order_by(InnovationTechnologyORM.nom)).scalars().all()
    actors = db.execute(select(InnovationActorORM).order_by(InnovationActorORM.nom)).scalars().all()
    projects = db.execute(select(InnovationProjectORM).order_by(InnovationProjectORM.created_at.desc())).scalars().all()
    declarations = db.execute(select(ONIPeriodicDeclarationORM)).scalars().all()
    operators = db.execute(select(OperateurIndustrielORM)).scalars().all()

    maturity = _digital_maturity(technologies, projects, declarations)
    diagnostic = _industry_40_diagnostic(technologies, projects, actors, declarations)
    portfolio = _rd_portfolio(projects, technologies)
    domains = Counter(t.domaine for t in technologies)
    sectors = Counter(t.secteur_application for t in technologies if t.secteur_application)
    provinces: defaultdict[str, int] = defaultdict(int)
    for actor in actors:
        if actor.province:
            provinces[actor.province] += 1
    for operator in operators:
        if operator.province:
            provinces[operator.province] += 1
    return {
        "generated_at": now_utc().isoformat(),
        "maturite_numerique": maturity,
        "diagnostic_industrie40": diagnostic,
        "portefeuille_rd": portfolio,
        "stats": {
            "technologies": len(technologies),
            "projets": len(projects),
            "acteurs": len(actors),
            "budget_fcfa": sum(project.budget_fcfa or 0 for project in projects),
            "projets_pilotes": sum(1 for project in projects if project.statut in {"pilote", "industrialisation"}),
            "adoption_moyenne_pct": round(mean([t.adoption_nationale_pct for t in technologies]), 1)
            if technologies
            else 0,
            "score_industrie40": diagnostic["score"],
            "candidats_ogapi": len(portfolio["protected_candidates"]),
        },
        "technologies": [_serialize_technology(row) for row in technologies],
        "projects": [_serialize_project(row) for row in projects[:8]],
        "actors": [_serialize_actor(row) for row in actors[:8]],
        "domaines": [{"domaine": key, "count": value} for key, value in domains.most_common()],
        "secteurs": [{"secteur": key, "count": value} for key, value in sectors.most_common()],
        "territoires": [
            {"province": province, "acteurs_et_operateurs": count}
            for province, count in sorted(provinces.items(), key=lambda item: (-item[1], item[0]))
        ],
        "recommendations": _recommendations(maturity, technologies, projects),
        "institutional_links": [
            {
                "institution": "OGAPI",
                "role": "Propriété industrielle",
                "usage": "Identifier les innovations protégeables : brevets, marques, dessins et modèles.",
                "status": "protocole cible",
            },
            {
                "institution": "AGANOR",
                "role": "Normalisation",
                "usage": "Encadrer essais, conformité, certification et normes techniques des pilotes.",
                "status": "protocole cible",
            },
            {
                "institution": "Capital humain",
                "role": "Compétences",
                "usage": "Relier chaque technologie aux métiers et formations nécessaires.",
                "status": "actif",
            },
        ],
        "lecture_executive": (
            f"Maturité numérique {maturity['score']}/100 — {maturity['niveau']}. "
            f"{len(projects)} projet(s) d'innovation et {len(technologies)} technologie(s) suivis. "
            f"Diagnostic Industrie 4.0 : {diagnostic['score']}/100."
        ),
    }


@router.get("/technologies", summary="Lister les technologies industrielles")
async def list_technologies(
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    _seed_defaults(db, actor=current_user.username)
    rows = db.execute(select(InnovationTechnologyORM).order_by(InnovationTechnologyORM.nom)).scalars().all()
    return [_serialize_technology(row) for row in rows]


@router.post("/technologies", status_code=status.HTTP_201_CREATED)
async def create_technology(
    payload: TechnologyPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if db.execute(
        select(InnovationTechnologyORM).where(InnovationTechnologyORM.code == payload.code.strip().lower())
    ).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Une technologie avec ce code existe déjà.")
    row = InnovationTechnologyORM(
        id=_new_id("TECH"),
        code=payload.code.strip().lower(),
        nom=payload.nom.strip(),
        domaine=payload.domaine,
        description=payload.description,
        niveau_maturite=payload.niveau_maturite,
        secteur_application=payload.secteur_application,
        cout_relatif=payload.cout_relatif,
        complexite=payload.complexite,
        competences_requises=_dump_list(payload.competences_requises),
        infrastructures_requises=_dump_list(payload.infrastructures_requises),
        adoption_nationale_pct=payload.adoption_nationale_pct,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(
        db, actor=current_user.username, action="innovation.technology.create", target=row.id, details=row.code
    )
    db.commit()
    db.refresh(row)
    return _serialize_technology(row)


@router.post("/actors", status_code=status.HTTP_201_CREATED)
async def create_actor(
    payload: ActorPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    row = InnovationActorORM(
        id=_new_id("ACTI"),
        nom=payload.nom,
        type_organisation=payload.type_organisation,
        domaines_expertise=_dump_list(payload.domaines_expertise),
        capacites_techniques=_dump_list(payload.capacites_techniques),
        secteurs_couverts=_dump_list(payload.secteurs_couverts),
        equipements_disponibles=_dump_list(payload.equipements_disponibles),
        province=payload.province,
        contact=payload.contact,
        statut=payload.statut,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(db, actor=current_user.username, action="innovation.actor.create", target=row.id, details=row.nom)
    db.commit()
    db.refresh(row)
    return _serialize_actor(row)


@router.post("/projects", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectPayload,
    current_user: User = Depends(require_roles(*WRITE_ROLES)),
    db: Session = Depends(get_db),
):
    if payload.operateur_id and not db.get(OperateurIndustrielORM, payload.operateur_id):
        raise HTTPException(status_code=404, detail="Opérateur introuvable.")
    if payload.technologie_id and not db.get(InnovationTechnologyORM, payload.technologie_id):
        raise HTTPException(status_code=404, detail="Technologie introuvable.")
    row = InnovationProjectORM(
        id=_new_id("INNP"),
        titre=payload.titre,
        operateur_id=payload.operateur_id,
        technologie_id=payload.technologie_id,
        filiere_code=payload.filiere_code,
        description=payload.description,
        objectif=payload.objectif,
        niveau_maturite=payload.niveau_maturite,
        budget_fcfa=payload.budget_fcfa,
        partenaires=_dump_list(payload.partenaires),
        besoins_financement=payload.besoins_financement,
        resultats_attendus=payload.resultats_attendus,
        risques=_dump_list(payload.risques),
        statut=payload.statut,
        created_by=current_user.username,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(row)
    write_audit_event(
        db, actor=current_user.username, action="innovation.project.create", target=row.id, details=row.titre
    )
    db.commit()
    db.refresh(row)
    return _serialize_project(row)

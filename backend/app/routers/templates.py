"""PNPI · Templates ATI pre-remplis par secteur."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.auth import User, get_current_user

router = APIRouter(prefix="/templates", tags=["Templates"])

# Built-in templates by sector
BUILTIN_TEMPLATES = [
    {
        "id": "tpl-bois-scierie",
        "secteur": "bois",
        "nom": "Scierie industrielle",
        "description": "Transformation primaire du bois · sciage, sechage, rabotage",
        "type_activite": "Exploitation et transformation du bois : sciage, sechage en four, rabotage, traitement anti-termites. Production de planches, chevrons, madriers.",
        "documents_requis": [
            "Permis forestier (CPAET)",
            "Etude d'impact environnemental",
            "Plan d'amenagement durable",
            "Certificat FSC/PEFC (si applicable)",
        ],
    },
    {
        "id": "tpl-bois-contreplaque",
        "secteur": "bois",
        "nom": "Usine de contreplaque",
        "description": "Transformation secondaire · deroulage, collage, pressage",
        "type_activite": "Fabrication de contreplaque et panneaux : deroulage de grumes, collage, pressage a chaud, calibrage. Capacite de production a preciser.",
        "documents_requis": ["Permis forestier", "Norme de qualite panneaux", "Certificat d'origine des bois"],
    },
    {
        "id": "tpl-mines-carriere",
        "secteur": "mines",
        "nom": "Carriere de granulats",
        "description": "Extraction et concassage de materiaux de construction",
        "type_activite": "Exploitation de carriere : extraction de roches, concassage, criblage, production de granulats (gravier, sable, tout-venant). Site a preciser.",
        "documents_requis": ["Permis minier", "Etude d'impact environnemental", "Plan de rehabilitation du site"],
    },
    {
        "id": "tpl-mines-manganese",
        "secteur": "mines",
        "nom": "Transformation de manganese",
        "description": "Enrichissement et transformation du minerai de manganese",
        "type_activite": "Enrichissement du minerai de manganese : lavage, separation gravimetrique, sechage, expedition. Teneur et capacite a preciser.",
        "documents_requis": [
            "Convention miniere",
            "Permis d'exploitation",
            "Etude d'impact",
            "Plan de gestion des residus",
        ],
    },
    {
        "id": "tpl-agro-huile",
        "secteur": "agroalimentaire",
        "nom": "Huilerie de palme",
        "description": "Extraction et raffinage d'huile de palme",
        "type_activite": "Transformation de regimes de palme : sterilisation, egrappage, extraction d'huile brute, clarification, raffinage. Capacite en tonnes/jour a preciser.",
        "documents_requis": ["Titre foncier ou bail", "Norme sanitaire CEMAC", "Certificat RSPO (si applicable)"],
    },
    {
        "id": "tpl-agro-cacao",
        "secteur": "agroalimentaire",
        "nom": "Unite de transformation du cacao",
        "description": "Fermentation, sechage, torrefaction, broyage",
        "type_activite": "Transformation du cacao : fermentation, sechage, torrefaction, broyage, pressage beurre de cacao, poudrage. Origine des feves a preciser.",
        "documents_requis": ["Certificat phytosanitaire", "Norme qualite cacao", "Contrat d'approvisionnement"],
    },
    {
        "id": "tpl-peche-conserverie",
        "secteur": "peche",
        "nom": "Conserverie de thon",
        "description": "Transformation et mise en conserve de produits halieutiques",
        "type_activite": "Transformation de produits de la peche : reception, filetage, cuisson, mise en conserve, sterilisation, etiquetage. Especes et capacite a preciser.",
        "documents_requis": ["Licence de peche", "Agrement sanitaire", "Norme HACCP", "Plan de tracabilite"],
    },
    {
        "id": "tpl-chimie-peinture",
        "secteur": "chimie",
        "nom": "Usine de peintures",
        "description": "Fabrication de peintures et revetements",
        "type_activite": "Fabrication de peintures : melange de pigments, liants, solvants, conditionnement. Gamme de produits et capacite a preciser.",
        "documents_requis": [
            "Fiche de securite des produits",
            "Norme environnementale",
            "Plan de gestion des dechets chimiques",
        ],
    },
    {
        "id": "tpl-btp-ciment",
        "secteur": "btp",
        "nom": "Cimenterie / Unite de broyage",
        "description": "Production de ciment ou unite de broyage de clinker",
        "type_activite": "Production de ciment : broyage de clinker, ajout de gypse et additifs, ensachage. Capacite en tonnes/an et source du clinker a preciser.",
        "documents_requis": [
            "Etude d'impact environnemental",
            "Permis de construire industriel",
            "Norme qualite ciment NF/CEMAC",
        ],
    },
    {
        "id": "tpl-energie-solaire",
        "secteur": "energie",
        "nom": "Centrale solaire",
        "description": "Installation photovoltaique de production d'electricite",
        "type_activite": "Production d'electricite solaire photovoltaique : installation de panneaux, onduleurs, raccordement reseau ou stockage batteries. Puissance crete a preciser.",
        "documents_requis": [
            "Concession energetique",
            "Etude de raccordement SEEG",
            "Etude d'impact",
            "Plan de demantellement",
        ],
    },
]


@router.get("/list")
async def list_templates(
    secteur: str | None = Query(None),
    _: User = Depends(get_current_user),
):
    """List available ATI templates, optionally filtered by sector."""
    templates = BUILTIN_TEMPLATES
    if secteur:
        templates = [t for t in templates if t["secteur"] == secteur.lower()]
    return {
        "count": len(templates),
        "templates": [
            {"id": t["id"], "secteur": t["secteur"], "nom": t["nom"], "description": t["description"]}
            for t in templates
        ],
    }


@router.get("/{template_id}")
async def get_template(
    template_id: str,
    _: User = Depends(get_current_user),
):
    """Get full template details for pre-filling an ATI form."""
    tpl = next((t for t in BUILTIN_TEMPLATES if t["id"] == template_id), None)
    if not tpl:
        raise HTTPException(404, "Template introuvable.")
    return tpl

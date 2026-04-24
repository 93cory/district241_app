"""Base reglementaire integree : references legales gabonaises par secteur.

Source : Code de l'investissement du Gabon (Loi 15/98) + decrets sectoriels.
Citation directe depuis les fiches ATI pour les instructeurs.
"""

# Format : liste d'articles reglementaires pour chaque secteur
REGLEMENTATION_BY_SECTOR: dict[str, list[dict[str, str]]] = {
    "bois": [
        {
            "ref": "Loi 16/01",
            "titre": "Code forestier",
            "article": "Article 247",
            "extrait": "Toute unite de transformation de bois doit disposer d'un plan d'amenagement agree et d'un certificat de legalite des approvisionnements (CLA).",
            "url": "https://www.legigabon.org/forestier",
        },
        {
            "ref": "Decret 2001-77",
            "titre": "Modalites d'exploitation",
            "article": "Article 15",
            "extrait": "Taux minimum de transformation locale : 100% pour l'okoume et le moabi, 75% pour les autres essences exportees.",
            "url": "https://www.legigabon.org/forestier",
        },
        {
            "ref": "Loi 15/98",
            "titre": "Code de l'investissement",
            "article": "Article 32",
            "extrait": "Agrement obligatoire avant toute exploitation industrielle. Instruction dans un delai maximum de 30 jours ouvres.",
            "url": "https://www.legigabon.org/investissement",
        },
    ],
    "mines": [
        {
            "ref": "Loi 037/2018",
            "titre": "Code minier du Gabon",
            "article": "Article 87",
            "extrait": "Obligation de fournir une etude d'impact environnemental, un plan de rehabilitation post-exploitation et un cautionnement environnemental.",
            "url": "https://www.legigabon.org/minier",
        },
        {
            "ref": "Decret 2019-410",
            "titre": "Teneur locale",
            "article": "Article 8",
            "extrait": "Quota minimal de personnel gabonais : 90% pour les postes d'execution, 50% pour l'encadrement des 5 premieres annees.",
            "url": "https://www.legigabon.org/teneur-locale",
        },
    ],
    "agroalimentaire": [
        {
            "ref": "Loi 15/98",
            "titre": "Code de l'investissement",
            "article": "Article 32",
            "extrait": "Agrement ATI obligatoire avant mise en service de toute unite agro-alimentaire.",
            "url": "https://www.legigabon.org/investissement",
        },
        {
            "ref": "Norme CEMAC HACCP",
            "titre": "Hygiene alimentaire",
            "article": "Section 4",
            "extrait": "Respect obligatoire des normes HACCP (CEMAC 2018) : traçabilite totale des lots, plan de nettoyage/desinfection, controles microbiologiques.",
            "url": "https://cemac.int/hygiene-alimentaire",
        },
    ],
    "petrole": [
        {
            "ref": "Loi 002/2019",
            "titre": "Code des hydrocarbures",
            "article": "Article 156",
            "extrait": "Conformite aux standards API et normes MARPOL pour les operations offshore. Plan HSE (Health Safety Environment) annuel obligatoire.",
            "url": "https://www.legigabon.org/hydrocarbures",
        },
    ],
    "btp": [
        {
            "ref": "Loi 15/98",
            "titre": "Code de l'investissement",
            "article": "Article 32",
            "extrait": "Agrement ATI obligatoire pour toute unite de BTP employant plus de 20 personnes.",
            "url": "https://www.legigabon.org/investissement",
        },
        {
            "ref": "Decret BTP",
            "titre": "Plan de prevention des risques",
            "article": "Article 12",
            "extrait": "Obligation d'un plan de prevention des risques professionnels (PPRP) pour tout chantier de plus de 10 ouvriers.",
            "url": "https://www.legigabon.org/btp",
        },
    ],
    "services": [
        {
            "ref": "Loi 15/98",
            "titre": "Code de l'investissement",
            "article": "Article 32",
            "extrait": "Agrement ATI obligatoire pour les prestataires industriels.",
            "url": "https://www.legigabon.org/investissement",
        },
    ],
    "peche": [
        {
            "ref": "Loi 15/2005",
            "titre": "Code de la peche",
            "article": "Article 44",
            "extrait": "Licence obligatoire pour la peche industrielle. Quota de debarquement au port de Port-Gentil : 70% minimum.",
            "url": "https://www.legigabon.org/peche",
        },
    ],
}

# References transversales applicables a tous les secteurs
REGLEMENTATION_TRANSVERSE: list[dict[str, str]] = [
    {
        "ref": "Loi 15/98",
        "titre": "Code de l'investissement",
        "article": "Article 14",
        "extrait": "L'ATI est valide 3 ans. Renouvellement sur demande 90 jours avant expiration. Silence de l'administration vaut acceptation au bout de 60 jours.",
        "url": "https://www.legigabon.org/investissement",
    },
    {
        "ref": "Loi Travail 3/2021",
        "titre": "Code du travail gabonais",
        "article": "Article 8",
        "extrait": "Declaration obligatoire des effectifs et contrats aupres de l'ONE. Respect du SMIG et cotisations CNSS.",
        "url": "https://www.legigabon.org/travail",
    },
]


def get_regulations_for_sector(sector: str) -> list[dict[str, str]]:
    """Retourne les articles reglementaires applicables au secteur + transverses."""
    sector_specific = REGLEMENTATION_BY_SECTOR.get(sector, [])
    return sector_specific + REGLEMENTATION_TRANSVERSE

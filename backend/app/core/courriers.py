"""PNPI · Templates de courriers administratifs pre-rediges.

Utilise par les instructeurs pour generer rapidement les courriers standards :
- demande de piece manquante
- complement d'information
- notification de rejet motive
- notification d'approbation
- relance avant decision

Chaque template supporte l'interpolation de variables {operateur_nom}, {numero_ati}, etc.
"""
from __future__ import annotations

from typing import Dict, List


COURRIER_TEMPLATES: List[Dict[str, str]] = [
    {
        "id": "piece_manquante_statuts",
        "category": "Demande de piece",
        "title": "Demande de piece · Statuts de l'entreprise",
        "subject": "ATI {numero_ati} · Piece manquante : statuts de l'entreprise",
        "body": """Madame, Monsieur,

Dans le cadre de l'instruction de votre demande d'agrement technique industriel
referencee {numero_ati} pour l'operateur {operateur_nom}, nous constatons que
les statuts de l'entreprise, requis par l'article 32 du Code de l'investissement,
n'ont pas ete joints au dossier.

Nous vous prions de bien vouloir deposer cette piece sous quinze (15) jours
ouvrables a compter de la reception du present courrier.

Nous restons a votre disposition pour toute information complementaire.

Cordialement,

{instructeur_nom}
Instructeur · Plateforme Nationale de Pilotage Industriel
Ministere de l'Industrie et de la Transformation Locale""",
    },
    {
        "id": "piece_manquante_plan_site",
        "category": "Demande de piece",
        "title": "Demande de piece · Plan du site",
        "subject": "ATI {numero_ati} · Piece manquante : plan du site",
        "body": """Madame, Monsieur,

Suite a l'examen de votre dossier ATI {numero_ati} (operateur {operateur_nom}),
il apparait que le plan du site industriel (implantation, batiments, voies
d'acces) n'est pas conforme aux specifications du guide d'instruction.

Merci de nous fournir un plan a l'echelle 1/500 mentionnant :
- Les batiments de production et de stockage
- Les acces vehicules et voies d'evacuation
- Les zones de risque et equipements HSE

Delai imparti : quinze (15) jours ouvrables.

Cordialement,

{instructeur_nom}
PNPI · Ministere de l'Industrie""",
    },
    {
        "id": "complement_impact_env",
        "category": "Complement",
        "title": "Complement · Etude d'impact environnemental",
        "subject": "ATI {numero_ati} · Complement demande sur l'etude d'impact",
        "body": """Madame, Monsieur,

Votre dossier ATI {numero_ati} pour {operateur_nom} presente une etude d'impact
environnemental necessitant les complements suivants :

1. Analyse quantitative des rejets atmospheriques (NOx, SOx, particules)
2. Plan de gestion des dechets industriels avec filieres identifiees
3. Mesures compensatoires pour la biodiversite locale
4. Engagement sur le plan de rehabilitation post-exploitation

Merci de transmettre ces elements sous trente (30) jours ouvrables.

Cordialement,

{instructeur_nom}
PNPI · Ministere de l'Industrie""",
    },
    {
        "id": "rejet_dossier_incomplet",
        "category": "Rejet",
        "title": "Rejet · Dossier incomplet",
        "subject": "ATI {numero_ati} · Decision de rejet motivee",
        "body": """Madame, Monsieur,

Apres examen approfondi de votre demande d'agrement technique industriel
{numero_ati} pour l'operateur {operateur_nom}, le comite d'instruction prononce
la decision de REJET motivee pour les raisons suivantes :

- Dossier incomplet malgre les relances du {date_derniere_relance}
- Pieces techniques requises manquantes apres deux rappels

Vous disposez d'un delai de quarante-cinq (45) jours pour former un recours
aupres de la Direction Generale de l'Industrie, ou pour redeposer un nouveau
dossier complet.

Fait a {ville}, le {date_decision}.

{instructeur_nom}
Direction de l'Industrie · PNPI""",
    },
    {
        "id": "rejet_capacite_insuffisante",
        "category": "Rejet",
        "title": "Rejet · Capacite technique insuffisante",
        "subject": "ATI {numero_ati} · Decision de rejet",
        "body": """Madame, Monsieur,

Votre demande d'agrement ATI {numero_ati} (operateur {operateur_nom}) ne peut
etre accordee. Le comite constate que :

- La capacite de production declaree n'est pas en coherence avec les
  equipements presentes lors de l'instruction
- Les ressources humaines qualifiees sont insuffisantes pour garantir
  la continuite et la qualite de production

Vous etes invite a revoir le dimensionnement technique et financier de votre
projet et a redeposer une demande consolidee.

{instructeur_nom}
PNPI · Ministere de l'Industrie""",
    },
    {
        "id": "approbation_standard",
        "category": "Approbation",
        "title": "Approbation · Notification officielle",
        "subject": "ATI {numero_ati} · Agrement technique industriel accorde",
        "body": """Madame, Monsieur,

Nous avons le plaisir de vous informer que l'agrement technique industriel
{numero_ati} a ete accorde a votre entreprise {operateur_nom} par decision
{numero_reference_decision} en date du {date_decision}.

Cet agrement est valable trois (3) ans, soit jusqu'au {date_expiration}.

Vous pouvez telecharger le certificat officiel, horodate et signe
numeriquement, depuis la plateforme PNPI.

Nous vous rappelons que :
- Les inspections de conformite peuvent avoir lieu sans preavis
- Toute modification substantielle de l'activite doit etre declaree
- Le renouvellement doit etre sollicite au moins 90 jours avant expiration

Felicitations et bienvenue dans le registre officiel des operateurs industriels
du Gabon.

{instructeur_nom}
Directeur de l'instruction · PNPI""",
    },
    {
        "id": "relance_decision",
        "category": "Relance",
        "title": "Relance · Dossier en attente de decision",
        "subject": "ATI {numero_ati} · Relance de procedure",
        "body": """Madame, Monsieur,

Nous vous informons que votre dossier ATI {numero_ati} (operateur {operateur_nom})
est en cours d'instruction depuis {age_jours} jours. Nous vous prions de bien
vouloir patienter encore quelques jours pour la finalisation de l'examen par
le comite.

Nous nous engageons a vous notifier une decision dans un delai maximum de
dix (10) jours ouvrables supplementaires.

Cordialement,

{instructeur_nom}
PNPI · Ministere de l'Industrie""",
    },
]


def render(template_id: str, variables: Dict[str, str]) -> Dict[str, str]:
    """Rend le sujet et le corps d'un courrier en interpolant les variables."""
    tpl = next((t for t in COURRIER_TEMPLATES if t["id"] == template_id), None)
    if not tpl:
        raise KeyError(f"Template inconnu : {template_id}")

    # Defaults pour les variables non fournies
    safe_vars = {
        "numero_ati": variables.get("numero_ati", "(numero ATI)"),
        "operateur_nom": variables.get("operateur_nom", "(operateur)"),
        "instructeur_nom": variables.get("instructeur_nom", "(instructeur)"),
        "date_decision": variables.get("date_decision", "(date)"),
        "date_derniere_relance": variables.get("date_derniere_relance", "(date relance)"),
        "date_expiration": variables.get("date_expiration", "(expiration)"),
        "numero_reference_decision": variables.get("numero_reference_decision", "(ref)"),
        "age_jours": str(variables.get("age_jours", "(N)")),
        "ville": variables.get("ville", "Libreville"),
    }

    return {
        "id": tpl["id"],
        "category": tpl["category"],
        "title": tpl["title"],
        "subject": tpl["subject"].format(**safe_vars),
        "body": tpl["body"].format(**safe_vars),
    }

# PNPI — Plan maître des livrables ministériels

Version de travail : V5  
Date : 29 juillet 2026  
Objet : transformer le Livre Blanc métier et le prototype PNPI en livrables présentables, décidables et exploitables.

---

## 1. Principe retenu

Le Livre Blanc reste la source stratégique longue.

Ce dossier `docs/livrables-ministere` devient l’espace de consolidation destiné à produire :

1. un dossier exécutif Word/PDF ;
2. une présentation PowerPoint ;
3. une architecture technique cible ;
4. un plan de développement ;
5. un budget et un plan de ressources ;
6. une note cybersécurité, infrastructure et déploiement ;
7. un cahier des charges ;
8. un conducteur de démonstration.

Objectif : permettre une présentation claire devant le Ministre, le Secrétariat Général, les directions concernées et les partenaires éventuels.

---

## 2. Ordre de production recommandé

| Priorité | Livrable | Objectif | Format cible |
|---:|---|---|---|
| P0 | Dossier exécutif PNPI | Comprendre vite la vision, l’état du prototype et la décision attendue | Word/PDF, 10 à 15 pages |
| P0 | Présentation exécutive | Support oral court pour réunion ministérielle | PPT, 12 à 15 slides |
| P0 | Conducteur de démonstration | Dérouler l’application sans hésitation | Markdown/PDF |
| P1 | Architecture technique cible | Montrer que le projet est industrialisable | Markdown/PDF |
| P1 | Plan de développement | Phases, lots, jalons, responsabilités | Markdown/PDF |
| P1 | Budget & ressources | Estimation réaliste pour cadrage décisionnel | Tableaux Word/PDF |
| P1 | Infrastructure & cybersécurité | Hébergement, sécurité, souveraineté, audit | Markdown/PDF |
| P2 | Cahier des charges | Base de consultation / validation / marché | Word/PDF |
| P2 | Annexes Livre Blanc | Détail métier complet jusqu’aux domaines 25/26+ | Markdown/PDF |

---

## 3. Chaîne de transformation

```text
Livre Blanc métier complet
  │
  ▼
Synthèse stratégique
  │
  ▼
Dossier exécutif Ministre
  │
  ├── Présentation PPT
  ├── Conducteur de démonstration
  ├── Architecture technique
  ├── Plan de développement
  ├── Budget / ressources
  ├── Infrastructure / cybersécurité
  └── Cahier des charges
```

---

## 4. Sources déjà disponibles

### 4.1 Sources projet

- `docs/architecture/master-context.md`
- `docs/architecture/fam-implementation-matrix.md`
- `docs/architecture/backend-overview.md`
- `docs/architecture/frontend-overview.md`
- `docs/architecture/plan-mise-en-prod-j0-j90.md`
- `docs/architecture/risk-register.md`
- `docs/architecture/cible-12-mois.md`
- `docs/strategie/*.md`
- `docs/officiel/*.md`
- `outputs/Note_conceptuelle_PNPI_V4_AGANOR_OGAPI.docx`
- `outputs/Conducteur_demo_Ministre_PNPI_AGANOR_OGAPI.docx`

### 4.2 Sources externes fournies par l’utilisateur

- `C:\Users\Cory\Desktop\PNPI-Dossier-PDF\new\PNPI_Conversation_Master_Codex.md`
- `C:\Users\Cory\Desktop\PNPI-Dossier-PDF\new\PNPI et transformation numérique.pdf`
- nouveaux domaines métier à intégrer progressivement, notamment à partir de la FAM-PPP-001.

---

## 5. État actuel de couverture applicative

La matrice de référence est :

- `docs/architecture/fam-implementation-matrix.md`

À ce stade, le prototype couvre fortement ou partiellement les 20 familles déjà consolidées dans Codex :

- RIN ;
- ATI ;
- Inspection / conformité ;
- Investissements ;
- AGANOR ;
- OGAPI ;
- Zones industrielles ;
- ONI ;
- Gouvernance des données ;
- Documents ;
- Sécurité ;
- Administration / exploitation ;
- Interopérabilité ;
- Analytique / IA ;
- Portail / UX ;
- Géographie / SIG ;
- Filières ;
- Innovation ;
- Capital humain ;
- Durabilité.

Les domaines métier 21 à 25 et la future FAM-PPP-001 doivent être intégrés progressivement dans cette matrice après réception des contenus consolidés.

---

## 6. Parcours de démonstration retenu

Page applicative :

- `/pnpi/presentation`

Séquence de démonstration :

1. Briefing national ;
2. RIN & fiche 360° ;
3. Cycle ATI ;
4. Contrôle terrain ;
5. Observatoire ONI ;
6. Carte & territoires ;
7. Filières stratégiques ;
8. Sécurité & audit.

---

## 7. Décision attendue en réunion

La présentation ne doit pas seulement montrer une application.

Elle doit permettre d’obtenir une orientation claire :

1. validation du principe PNPI comme plateforme nationale de pilotage industriel ;
2. désignation d’un comité métier restreint ;
3. autorisation de cadrage technique et institutionnel ;
4. validation du périmètre prioritaire de la phase 1 ;
5. préparation d’un cahier des charges ou d’une convention de développement ;
6. arbitrage sur l’hébergement, la cybersécurité et l’interopérabilité institutionnelle.

---

## 8. Prochaine action

Produire en premier :

1. `01-dossier-executif-v5.md`
2. `02-presentation-executive-v5.md`
3. `03-conducteur-demo-v5.md`

Ces trois livrables servent de base immédiate pour la prochaine présentation.


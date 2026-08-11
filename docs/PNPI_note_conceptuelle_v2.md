> ⚠️ **Version antérieure (5 mars 2026) — conservée comme trace d'antériorité.**
> Le document à jour et à remettre est `docs/livrables-ministere/01-dossier-executif-v5.md`
> (et son export `outputs/livrables-ministere-v5/PNPI_Livrables_Ministere_V5_2.docx`).
> Ne pas transmettre cette version telle quelle.

# NOTE CONCEPTUELLE OFFICIELLE
## Plateforme Nationale de Pilotage Industriel (PNPI)
### Ministère de l'Industrie et de la Transformation Locale — République Gabonaise

**Version** : 2.0 — Édition Stratégique
**Date** : 26 février 2026
**Classification** : Document de travail institutionnel — Diffusion restreinte
**Statut** : Soumis à validation du COPIL

---

> **Note de cadrage** : Ce document constitue la proposition complète de mise en œuvre de la Plateforme Nationale de Pilotage Industriel (PNPI). Il intègre les orientations stratégiques de la Transition, les benchmarks internationaux, une analyse de retour sur investissement sur 5 ans, et un cadre technique opérationnel. Il est conçu pour permettre une décision éclairée et rapide par les instances compétentes.

---

## RÉSUMÉ EXÉCUTIF

Le Gabon dispose d'une base industrielle parmi les plus structurées d'Afrique centrale, mais son administration industrielle reste l'une des plus fragmentées de la sous-région. Le délai moyen de traitement d'un dossier d'Agrément Technique Industriel (ATI) dépasse **45 à 60 jours**, contre moins de 15 jours dans les pays comparables ayant digitalisé leurs procédures (Rwanda, Sénégal, Maroc).

La Plateforme Nationale de Pilotage Industriel (PNPI) propose de résoudre ce déficit structurel par un système intégré de dépôt, d'instruction, de validation et de pilotage des dossiers industriels.

**Ce que le PNPI apporte concrètement :**
- Réduction des délais de traitement ATI de **60 jours à moins de 15 jours**
- **Traçabilité à 100%** de chaque action sur chaque dossier
- Tableau de bord temps réel permettant au Ministre de **piloter l'appareil industriel national depuis son bureau**
- Élimination structurelle des opportunités de corruption dans le processus d'agrément
- Positionnement du Gabon comme **leader régional CEMAC** de la gouvernance industrielle numérique

**Investissement :** 330–360 M FCFA (CAPEX) + 110–130 M FCFA/an (OPEX)
**Retour sur investissement :** Payback period estimé à **moins de 3 ans**
**ROI économique sur 5 ans :** +65 M FCFA minimum (scénario très conservateur)

---

## TABLE DES MATIÈRES

1. Objet et périmètre
2. Contexte, diagnostic et justification
3. Benchmarks africains de référence
4. Objectifs
5. Périmètre de la Phase 1 — Description détaillée des modules
6. Fonctionnalités clés et valeur ajoutée
7. Architecture technique et sécurité
8. Retour sur investissement et justification économique
9. Budget détaillé
10. Plan de mise en œuvre (12 mois)
11. Indicateurs de performance (KPIs)
12. Gouvernance
13. Cadre légal et conformité
14. Matrice des risques
15. Stratégie de déploiement territorial
16. Décisions attendues
17. Annexes

---

## 1. OBJET ET PÉRIMÈTRE

### 1.1 Objet

La présente note définit le cadre institutionnel, technique, organisationnel, financier et stratégique de la Plateforme Nationale de Pilotage Industriel (PNPI), système d'information souverain destiné à :

1. **Dématérialiser** les démarches prioritaires d'agrément et de suivi industriel
2. **Centraliser** l'ensemble des dossiers industriels dans un registre national unique
3. **Outiller** le Ministère de l'Industrie d'instruments de pilotage fiables et en temps réel
4. **Éliminer** les processus opaques et discrétionnaires qui nuisent à l'attractivité du Gabon
5. **Préparer** l'interopérabilité numérique avec les administrations partenaires (Douanes, DGI, Commerce, ANPI)

### 1.2 Positionnement stratégique

Le PNPI s'inscrit dans trois cadres stratégiques convergents :

- **L'agenda de la Transition (CTRI)** : modernisation de l'État, lutte contre la corruption, reddition de comptes
- **La Stratégie Gabon Digital** : transformation numérique des services publics
- **Les engagements de développement industriel** : diversification économique, création d'emplois, réduction des importations

> Le PNPI n'est pas un projet informatique. C'est un instrument de politique industrielle et de souveraineté économique.

---

## 2. CONTEXTE, DIAGNOSTIC ET JUSTIFICATION

### 2.1 État des lieux quantifié

L'administration industrielle gabonaise présente aujourd'hui les caractéristiques suivantes :

| Indicateur | Situation actuelle | Cible PNPI |
|------------|-------------------|------------|
| Délai moyen de traitement ATI | 45–60 jours | < 15 jours |
| Taux de dossiers complets au 1er dépôt | Estimé à 30–40% | > 80% |
| Traçabilité des décisions | Nulle (registres papier) | 100% |
| Visibilité du Ministère sur le parc industriel | Partielle et non consolidée | Temps réel |
| Coordination entre administrations | Zéro — visites séquentielles non coordonnées | Plateforme partagée |
| Disponibilité des données industrielles pour la décision | Rapports trimestriels tardifs | Tableau de bord permanent |

### 2.2 Les cinq dysfonctionnements structurels

**① Fragmentation des circuits de traitement**
Un dossier ATI implique actuellement des passages successifs dans plusieurs bureaux, sans traçabilité ni délai contractuel. Un opérateur dépose son dossier sans savoir à quelle étape il se trouve ni quand il recevra une réponse.

**② Opacité et discrétionnaire**
L'absence de processus formalisé et numérisé crée des espaces de discrétion qui favorisent les demandes informelles d'accélération. Cela nuit autant à la réputation de l'administration qu'à l'égalité de traitement des opérateurs.

**③ Perte de mémoire institutionnelle**
Les mutations de personnel et les changements politiques entraînent des pertes de dossiers et une reconstruction permanente de l'historique des opérateurs. Une entreprise présente au Gabon depuis 15 ans peut se voir demander des documents déjà fournis plusieurs fois.

**④ Reporting non consolidé**
Le Ministre reçoit des rapports trimestriels produits manuellement, incomplets et souvent obsolètes au moment de leur réception. Il n'existe pas d'outil permettant de piloter l'activité industrielle nationale en temps réel.

**⑤ Multiplication non coordonnée des contrôles**
Un industriel peut recevoir en quelques semaines la visite non coordonnée de l'inspection du travail, de l'inspection de l'environnement, de l'inspection industrielle et des douanes. Chaque visite implique des arrêts de production, des frais et des demandes de documents identiques. Cette situation détériore le climat d'affaires et génère des coûts cachés significatifs.

### 2.3 Le coût du statu quo

La persistance de ces dysfonctionnements génère un coût économique réel, aujourd'hui non mesuré mais estimable :

```
Coût direct pour l'État
──────────────────────────────────────────────────────
Agents dédiés au processus ATI (8–12 agents) :
  10 agents × 500 000 FCFA/mois × 12 = 60 M FCFA/an
Archives physiques, stockage, courriers, déplacements :
  Estimé à 5–8 M FCFA/an
Contentieux administratifs liés aux retards :
  Non mesuré, mais réel

Coût pour l'économie nationale
──────────────────────────────────────────────────────
Sur 200 dossiers ATI traités/an :
  Gain de 30 jours/dossier × 200 dossiers = 6 000 jours
  À 300 000 FCFA de valeur ajoutée/jour/entreprise :
  → 1,8 milliard FCFA de valeur économique bloquée annuellement

Coût en attractivité et en investissements perdus :
  Non quantifiable mais significatif dans un contexte
  de concurrence entre économies CEMAC
```

> **Conclusion** : Le statu quo coûte entre 1,5 et 2 milliards FCFA par an à l'économie gabonaise. Le PNPI représente un investissement de 350 M FCFA, soit moins de 6 mois du coût du statu quo.

### 2.4 La fenêtre d'opportunité de la Transition

Le contexte politique actuel est une fenêtre d'opportunité exceptionnelle :

- La Transition (CTRI) a déclaré la rupture avec les pratiques opaques de l'ancien régime
- La modernisation administrative est un outil de légitimation et de crédibilisation de la Transition
- Les partenaires financiers internationaux (Banque Mondiale, BAD, UE) sont en attente de projets structurants pour mobiliser des financements
- Il existe une pression compétitive régionale : la Côte d'Ivoire, le Cameroun et le Congo Brazzaville lancent leurs propres plateformes industrielles numériques

> **Le PNPI est le projet qui matérialise le mieux la promesse de rupture de la Transition dans le secteur économique.**

---

## 3. BENCHMARKS AFRICAINS DE RÉFÉRENCE

### 3.1 Rwanda — La référence absolue

**Plateforme Irembo** (lancée 2015, opérationnelle depuis 2017)

| Indicateur | Résultat |
|------------|----------|
| Services couverts | 100+ services gouvernementaux |
| Transactions annuelles | 3,5 millions |
| Délai permis de construire | 6 mois → 21 jours |
| Délai agrément industriel (KSEZ) | 28 jours → 3 jours |
| Satisfaction usagers | 95% |
| Réduction coûts administratifs | 40% |
| ROI atteint | 18 mois après déploiement |
| Budget initial | ~1,5 milliard FCFA (2,5M USD) |
| Rang Doing Business | Top 40 africain |

**Leçon pour le Gabon** : Si le Rwanda, sans ressources naturelles, atteint le Top 40 du Doing Business grâce à la digitalisation, le Gabon avec sa base industrielle minière, forestière et agroalimentaire peut atteindre le Top 20 en Afrique. Le PNPI est le premier pas.

### 3.2 Sénégal — Le modèle francophone le plus pertinent

**APIX / Centre de Formalités des Entreprises (CFE numérique)**

- Contexte administratif francophone identique au Gabon
- Création d'entreprise : 58 jours (2005) → **1 jour** (2023)
- La Direction Générale des Industries du Sénégal a déployé un système de suivi des agréments industriels dans le cadre du Plan Sénégal Émergent
- Budget comparable : ~800 M FCFA pour un périmètre plus large

**Leçon pour le Gabon** : Le Sénégal a démontré qu'un système équivalent au PNPI peut être opérationnel en **14 mois** dans un contexte administratif francophone identique.

### 3.3 Maroc — La référence technique pour l'interopérabilité

**CRI (Centres Régionaux d'Investissement) digital + Portail Invest in Morocco**

- Interopérabilité avec **17 administrations** en temps réel
- Création zone industrielle : 18 mois → **4 mois**
- API gouvernementale connectant Ministère de l'Industrie, DGI, douanes, cadastre, registre des entreprises
- Certification et conformité industrielle intégralement en ligne

**Leçon pour le Gabon** : L'interopérabilité n'est pas une promesse lointaine. Le Maroc l'a réalisée en 3 ans. Le PNPI pose les fondations pour que le Gabon suive ce chemin.

### 3.4 Côte d'Ivoire — Le contexte économique le plus proche

**CEPICI (Centre de Promotion des Investissements en Côte d'Ivoire)**

- Digitalisation complète des agréments d'investissement incluant les zones franches
- Réduction de 30% du temps de traitement en 18 mois
- Économie comparable au Gabon (économie de rente en diversification)

**Leçon pour le Gabon** : L'argument "notre contexte est trop spécifique" est infondé. La Côte d'Ivoire, avec des défis similaires, l'a fait.

### 3.5 Mauritanie — La référence souveraineté pour les industries extractives

**MGLL (Mauritania Governance and Licenses for Industry)** — déployé 2022 avec appui Banque Mondiale

- Gestion numérique des licences minières et pétrolières
- **Hébergement local** et formation d'équipes nationales (souveraineté)
- Réduction des délais d'agrément minier de 60 jours à 12 jours

**Leçon pour le Gabon** : Les industries extractives (mines, pétrole, forêt), secteurs sensibles et stratégiques du Gabon, peuvent être pleinement intégrées dans une plateforme souveraine.

---

## 4. OBJECTIFS

### 4.1 Objectif général

Mettre en place un système d'information industriel souverain, sécurisé et interopérable, permettant au Ministère de l'Industrie de piloter l'ensemble des processus d'agrément, de suivi et de conformité industrielle en temps réel, tout en offrant aux opérateurs économiques une expérience administrative de classe mondiale.

### 4.2 Objectifs spécifiques

| # | Objectif | Mesure de succès |
|---|----------|-----------------|
| 1 | Dématérialiser 100% des démarches ATI et des dossiers industriels prioritaires | 0 dossier traité en dehors de la plateforme à M12 |
| 2 | Réduire le délai moyen de traitement ATI de 60 à < 15 jours | Délai mesuré mensuellement sur le tableau de bord |
| 3 | Atteindre > 80% de dossiers complets au premier dépôt | Taux calculé automatiquement par le système |
| 4 | Fournir au Ministre un tableau de bord temps réel sur l'industrie nationale | Tableau de bord opérationnel dès M7 |
| 5 | Tracer 100% des actions sur les dossiers critiques | Audit log exhaustif dès le premier jour |
| 6 | Éliminer les contacts physiques discrétionnaires dans le processus d'agrément | Zéro étape non tracée dans le workflow |
| 7 | Constituer le Dossier Industriel Unique (DIU) pour 100% des opérateurs actifs | Registre complet à M12 |
| 8 | Préparer techniquement l'interopérabilité avec ANPI, DGI, Douanes | API Gateway opérationnel avec stubs à M12 |

---

## 5. PÉRIMÈTRE DE LA PHASE 1 — MODULES DÉTAILLÉS

### Module 1 — Guichet Numérique Unique Industriel

**Ce que c'est :** Le portail de saisie et de dépôt accessible aux opérateurs industriels (entreprises, PME, porteurs de projets) via navigateur web et application mobile.

**Ce que ça fait :**
- Création du compte opérateur avec vérification d'identité (NIFGABON, registre ANPI)
- Saisie guidée du dossier avec formulaires intelligents adaptés au type d'activité
- Upload des pièces justificatives (plans, certifications, bilans, etc.)
- Vérification automatique de complétude en temps réel
- Numéro de dossier unique et accusé de réception électronique
- Suivi de l'avancement dossier par étape (tracking en temps réel)
- Notifications automatiques par email et SMS à chaque changement de statut
- Mode offline pour zones à connectivité limitée (synchronisation différée)

**Valeur ajoutée :** Un opérateur de Franceville ou de Port-Gentil peut déposer son dossier sans se déplacer à Libreville. Le taux de dossiers incomplets passe de ~35% à > 80% grâce aux formulaires intelligents.

### Module 2 — Workflow d'Instruction et de Validation

**Ce que c'est :** Le cœur de la plateforme, côté Ministère. Gestion du circuit complet d'instruction d'un dossier.

**Ce que ça fait :**
- Attribution automatique des dossiers aux agents instructeurs selon la charge de travail
- Séquençage des étapes de validation (pré-instruction, instruction technique, avis juridique, décision)
- Délais réglementaires configurables par type de dossier (SLA)
- Alertes automatiques pour les dossiers proches de la limite délai
- Escalade automatique au supérieur hiérarchique si délai dépassé
- Formulaires de commentaires, demandes de pièces complémentaires et retours structurés
- Validation multi-niveaux avec signature électronique (agent instructeur → chef de service → Directeur)
- Génération automatique des décisions et des agréments en PDF signés

**Valeur ajoutée :** Fin de l'arbitraire. Chaque dossier suit le même chemin, dans les mêmes délais. Le Directeur voit en temps réel tous les dossiers en retard.

### Module 3 — Gestion des Agréments Techniques Industriels (ATI)

**Ce que c'est :** Le module spécialisé pour le processus ATI, avec ses spécificités réglementaires et ses acteurs multiples.

**Ce que ça fait :**
- Formulaires spécifiques ATI par secteur : bois/forêt, mines, agroalimentaire, BTP, services industriels
- Vérification automatique de cohérence entre les données déclarées (superficie, effectifs, équipements) et les bases de données de référence
- Circuit de validation multi-niveaux (Direction Technique, Direction Juridique, Secrétariat Général)
- Génération de l'ATI numérique avec QR code d'authenticité
- Registre public de vérification des ATI (accessible aux tiers : banques, partenaires, clients)
- Alertes automatiques de renouvellement (90, 60, 30 jours avant expiration)
- Historique complet de chaque ATI (modifications, renouvellements, suspensions)

**Valeur ajoutée :** Élimination de la falsification des ATI. Un partenaire ou une banque peut vérifier l'authenticité d'un agrément en scannant le QR code. Fin des agréments contrefaits.

### Module 4 — Dossier Industriel Unique (DIU) et Registre Central

**Ce que c'est :** La mémoire institutionnelle permanente de chaque opérateur industriel au Gabon.

**Ce que c'est :**
- Fiche permanente de chaque entreprise industrielle (identité, historique des dossiers, agréments actifs, incidents)
- Consolidation automatique de tous les documents déposés, jamais perdus, jamais à refournir
- Moteur de recherche avancé (par secteur, région, taille, statut, date)
- Export des données du registre pour les besoins statistiques et décisionnels
- Base de données de référence pour les statistiques industrielles nationales

**Valeur ajoutée :** Fin de la perte de mémoire institutionnelle. Un opérateur qui a soumis ses documents en 2020 n'a pas à les refournir en 2026. Un nouvel agent qui prend en charge un dossier a accès à tout l'historique instantanément.

### Module 5 — Dashboard Ministériel et Business Intelligence

**Ce que c'est :** Le tableau de bord décisionnel pour le Ministre, le Secrétaire Général, les Directeurs et leurs équipes.

**Ce que ça fait :**
- Vue synthétique temps réel : dossiers en cours, délais moyens, taux de traitement
- Cartographie industrielle du Gabon : localisation et statut de toutes les entreprises agréées (par secteur, province, taille)
- Indicateurs sectoriels : évolution des agréments par filière (bois, mines, agroalimentaire, BTP…)
- Suivi des KPIs nationaux : emplois industriels, valeur ajoutée locale, taux de transformation
- Alertes décisionnelles : dossiers critiques, secteurs sous-performants, anomalies
- Rapports automatisés (hebdomadaires, mensuels, annuels) exportables en PDF/Excel
- Prévisions et tendances basées sur les données historiques

**Valeur ajoutée :** Le Ministre peut pour la première fois piloter le secteur industriel national avec des données fiables et actualisées en permanence. Cette visibilité est un outil de politique industrielle, pas seulement de gestion administrative.

### Module 6 — Conformité Post-Agrément et Inspections

**Ce que c'est :** Le suivi de la vie de l'entreprise après l'obtention de l'agrément.

**Ce que ça fait :**
- Calendrier d'inspections programmées automatiquement selon les typologies d'agrément
- Coordination inter-administrations (planification d'inspections conjointes Travail + Environnement + Industrie pour limiter les visites multiples)
- Application mobile pour les inspecteurs terrain : rapport d'inspection géolocalisé, photos, signature
- Suivi des mesures correctives imposées avec délais et alertes
- Tableau de bord de conformité sectorielle (taux d'entreprises conformes par secteur et province)
- Historique des contrôles pour chaque entreprise

**Valeur ajoutée :** L'agrément n'est plus un document qu'on délivre et qu'on oublie. Le système assure le suivi de la conformité dans le temps. C'est une révolution pour la crédibilité du système réglementaire industriel.

### Module 7 — Administration, Sécurité et Audit

**Ce que c'est :** Le panneau de contrôle de la plateforme pour les administrateurs.

**Ce que ça fait :**
- Gestion des utilisateurs et des rôles (RBAC — 5 niveaux d'accès)
- Journal d'audit complet et infalsifiable de toutes les actions
- Gestion des SLA et des workflows
- Configuration des alertes et des notifications
- Tableau de bord de performance technique (disponibilité, temps de réponse)
- Sauvegardes automatiques et procédures de reprise

---

## 6. FONCTIONNALITÉS CLÉS ET VALEUR AJOUTÉE

### 6.1 Intelligence Artificielle — Pré-instruction automatique

**Description :** Un moteur d'analyse documentaire basé sur IA (OCR + NLP) qui traite automatiquement les documents soumis.

**Ce qu'il fait :**
- Lecture et extraction automatique des informations des documents PDF/scans
- Vérification de cohérence entre les données déclarées et les bases de référence
- Calcul d'un score de complétude et d'un score de risque
- Génération d'un rapport de pré-instruction pour l'agent humain en < 2 minutes

**Impact :** Ce qui prend actuellement 3 à 5 jours de vérification manuelle est réduit à 2 minutes de traitement automatique. L'agent se concentre sur l'analyse, pas sur la vérification.

**Technologie :** Modèles NLP open-source (Mistral — développé en France, politiquement acceptable) + OCR Tesseract. Budget additionnel estimé : 15–20 M FCFA.

### 6.2 Signature Électronique à Valeur Juridique

**Description :** Infrastructure PKI (Public Key Infrastructure) pour la signature électronique qualifiée des ATI et décisions officielles.

**Ce que ça apporte :**
- Les ATI délivrés numériquement ont la même valeur juridique que les originaux papier
- Chaque décision est horodatée de manière certifiée et infalsifiable
- Les tiers (banques, partenaires, administrations étrangères) peuvent vérifier l'authenticité instantanément via le QR code
- Élimination du marché des faux agréments et certifications

**Prérequis :** Texte réglementaire donnant valeur juridique à la signature électronique pour les actes administratifs industriels (à préparer en parallèle).

### 6.3 Cartographie Industrielle Géospatiale (GIS)

**Description :** Carte interactive de l'industrie gabonaise en temps réel, accessible au Ministre et aux décideurs.

**Ce qu'elle montre :**
- Localisation de toutes les entreprises agréées (par secteur, province, statut)
- Clusters industriels émergents et déserts industriels
- Flux d'agréments et de renouvellements dans le temps
- Corrélation entre agréments accordés et emplois créés (via données CNSS)

**Valeur stratégique :** Cet outil transforme le PNPI en instrument de politique industrielle. Le Gouvernement dispose pour la première fois d'une vision géographique complète de son parc industriel.

### 6.4 Portail Opérateurs — Expérience Utilisateur Optimisée

**Description :** Interface grand public accessible aux PME avec faible maturité numérique.

**Spécificités :**
- Formulaires guidés pas à pas avec aide contextuelle
- Vérification de complétude en temps réel (l'opérateur sait immédiatement ce qui manque)
- Chat/messagerie directe avec l'agent instructeur (traçable)
- Notifications SMS en français et en langues locales possibles
- Mode offline pour les zones à connectivité limitée

### 6.5 API Gateway — Socle pour l'Interopérabilité Future

**Description :** Architecture technique permettant la connexion progressive avec les systèmes des administrations partenaires.

**Connexions prévues :**
- ANPI-Gabon : vérification automatique du registre des entreprises
- DGI : vérification du statut fiscal des demandeurs
- Douanes (SYDONIA) : vérification des importations d'équipements déclarés
- CNSS : vérification des déclarations sociales
- Cadastre : vérification des localisations industrielles déclarées

**Approche :** Dès la Phase 1, l'API Gateway est construit avec des "stubs" (connecteurs prêts mais non encore activés). L'activation de chaque connexion fait l'objet d'une convention avec l'administration partenaire.

---

## 7. ARCHITECTURE TECHNIQUE ET SÉCURITÉ

### 7.1 Architecture générale

```
┌─────────────────────────────────────────────────────────────────┐
│                     COUCHE PRÉSENTATION                         │
│  Dashboard Web (Next.js)  │  App Mobile (Flutter)  │  Portail   │
│  Ministère / Agents       │  Inspecteurs terrain   │  Opérateurs │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (sécurisée)                    │
│  Rate limiting │ Authentification JWT │ RBAC │ Audit logging    │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────┬────────────────────┬────────────────────────┐
│  Core API        │  IA/NLP Engine     │  Notification Service  │
│  (FastAPI)       │  (Document Parser) │  (Email / SMS)         │
└──────────────────┴────────────────────┴────────────────────────┘
                               │
┌──────────────────┬────────────────────┬────────────────────────┐
│  PostgreSQL      │  Document Store    │  PKI / Signature       │
│  (base de        │  (stockage         │  électronique          │
│   données)       │   fichiers)        │                        │
└──────────────────┴────────────────────┴────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                   API INTEROPÉRABILITÉ                          │
│  ANPI  │  DGI  │  Douanes (SYDONIA)  │  CNSS  │  Cadastre      │
│  (stubs Phase 1 — activation progressive)                       │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Choix technologiques

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Backend API** | FastAPI (Python) | Performance, maturité, écosystème IA/ML, open source |
| **Base de données** | PostgreSQL 16 | Robustesse, ACID, support JSON, open source |
| **Frontend dashboard** | Next.js / React | Standard industrie, SSR, performance |
| **Application mobile** | Flutter | Multi-plateforme (iOS + Android) depuis un seul code |
| **Migrations BDD** | Alembic | Versionnage rigoureux du schéma |
| **Authentification** | JWT + OAuth2 + MFA | Sécurité renforcée, standard international |
| **Conteneurisation** | Docker + Docker Compose | Déploiement reproductible |
| **CI/CD** | GitHub Actions | Automatisation des tests et déploiements |
| **Monitoring** | Stack Prometheus + Grafana | Supervision temps réel |
| **IA documentaire** | LangChain + Mistral (open source) | Souveraineté numérique, pas de dépendance US |

### 7.3 Hébergement souverain

Le PNPI est conçu pour un hébergement sur infrastructure souveraine gabonaise :

- **Option 1 (recommandée)** : Datacenter du Gouvernement Gabonais (si disponible et certifié)
- **Option 2** : Cloud souverain africain (ex. AfricaCloud, Dimension Data Gabon)
- **Option 3** : Infrastructure dédiée hébergée localement avec redondance

> **Principe inviolable** : Les données industrielles stratégiques du Gabon ne transitent sur aucun serveur étranger.

### 7.4 Sécurité — Architecture multi-couches

**Couche d'accès :**
- HTTPS/TLS 1.3 obligatoire
- Authentification multifacteur (MFA) pour tous les agents
- Rate limiting et protection contre les attaques par force brute
- Rôles RBAC à 5 niveaux (Administrateur, Direction, Instructeur, Inspecteur, Opérateur)

**Couche application :**
- Validation stricte de toutes les entrées (protection injection SQL, XSS)
- Tokens JWT avec rotation automatique
- Sessions limitées dans le temps (60 min activité + refresh)
- Chiffrement AES-256 des données sensibles

**Couche données :**
- Journalisation exhaustive et infalsifiable de toutes les actions (audit log)
- Sauvegardes chiffrées quotidiennes (locale + réplication géographique)
- Plan de continuité d'activité (PCA) et de reprise après sinistre (PRA)
- RPO (Recovery Point Objective) : < 24h | RTO (Recovery Time Objective) : < 4h

**Audits de sécurité :**
- Pentest externe annuel obligatoire
- Revue de code sécurité avant chaque mise en production majeure
- Formation cybersécurité des agents (sensibilisation phishing, mots de passe)

---

## 8. RETOUR SUR INVESTISSEMENT ET JUSTIFICATION ÉCONOMIQUE

### 8.1 Tableau de ROI sur 5 ans

```
────────────────────────────────────────────────────────────────
INVESTISSEMENT TOTAL (scénario conservateur)
────────────────────────────────────────────────────────────────
CAPEX (mise en place) :                             340 M FCFA
OPEX an 1 :                                         120 M FCFA
OPEX an 2 :                                         120 M FCFA
OPEX an 3 :                                         120 M FCFA
OPEX an 4 :                                         120 M FCFA
OPEX an 5 :                                         120 M FCFA
─────────────────────────────────────────────────────────────
COÛT TOTAL 5 ANS :                                  940 M FCFA
────────────────────────────────────────────────────────────────

ÉCONOMIES ET VALEUR GÉNÉRÉE (scénario conservateur)
────────────────────────────────────────────────────────────────
Économies directes sur masse salariale processus ATI :
  3-4 agents réaffectés × 500 000 FCFA × 12 mois =  18–24 M FCFA/an
Élimination archives physiques, courriers :            5 M FCFA/an
Réduction contentieux administratifs :                 8 M FCFA/an
─────────────────────────────────────────────────────────────
Sous-total économies directes :                     31–37 M FCFA/an

Valeur économique par accélération des agréments :
  200 dossiers/an × 30 jours gagnés × 300K/jour =
  1,8 Mds FCFA (valeur brute, attributabilité 10%) = 180 M FCFA/an
─────────────────────────────────────────────────────────────
Total valeur annuelle (conservateur) :             211–217 M FCFA/an

────────────────────────────────────────────────────────────────
RÉSULTATS
────────────────────────────────────────────────────────────────
Payback period :   340 M / 217 M = 1,6 an après déploiement
ROI net sur 5 ans :  5 × 217 M - 940 M = +145 M FCFA
ROI % sur 5 ans :    +15% (avant prise en compte de l'impact
                     sur l'attractivité des investissements)
────────────────────────────────────────────────────────────────
```

### 8.2 Impact sur l'attractivité et le classement international

Le PNPI contribue directement à l'amélioration de deux indicateurs internationaux mesurés :

**B-READY (Banque Mondiale, ex-Doing Business) :**
- Indicateur "Obtention des licences d'affaires" directement impacté
- Chaque amélioration de 10 rangs dans ce classement génère en moyenne **2-3% d'IDE supplémentaires** pour les pays d'Afrique subsaharienne
- Pour le Gabon, cela représente potentiellement **50–100 millions USD d'investissements additionnels annuels**

**Mo Ibrahim Index on African Governance :**
- Pilier "Efficacité des services publics" amélioré
- Signal positif pour les investisseurs institutionnels et les agences de notation

> **Formulation pour les décideurs** : "Le coût total du PNPI sur 5 ans est de 940 M FCFA. L'impact potentiel sur l'attraction des IDE représente 50–100 fois cet investissement annuellement. Ce n'est pas une dépense publique. C'est l'investissement à plus fort effet de levier disponible aujourd'hui pour l'économie gabonaise."

### 8.3 Valeur anti-corruption

La valeur de la transparence est difficile à quantifier mais réelle et politiquement significative :

- Chaque étape du processus est horodatée et traçable : fin des "dossiers perdus"
- Fin de l'arbitraire dans les délais : les SLA sont contractuels et publics
- Fin des contacts physiques discrétionnaires : zéro espace pour les sollicitations informelles
- Signal politique fort : la Transition digitalise les procédures comme preuve de rupture

### 8.4 Modalités de financement envisagées

Le PNPI peut mobiliser des financements extérieurs qui réduisent la charge sur le budget national :

| Source | Montant potentiel | Condition |
|--------|------------------|-----------|
| Budget national | 40–50% (~150 M) | Décision COPIL |
| Banque Mondiale / IFC | 20–30% | Dossier "Investment Climate" |
| Union Européenne (PASE/PARCIP) | 15–20% | Éligibilité réforme administrative |
| AFD (modernisation admin. francophone) | 10–15% | Convention bilatérale France-Gabon |
| BAD (Technologies pour l'Afrique - TTA) | 10–15% | Dossier soumis BAD |

> **Conclusion financière** : La part du budget national pourrait être réduite à 150–170 M FCFA si les partenaires financiers sont mobilisés en parallèle. Le PNPI n'est pas une charge budgétaire mais un catalyseur de financement international.

---

## 9. BUDGET DÉTAILLÉ

### 9.1 CAPEX — Décomposition poste par poste

| # | Poste | Description | Montant FCFA |
|---|-------|-------------|--------------|
| 1 | Cadrage et conception | UX/UI, architecture système, spécifications détaillées, maquettes interactives | 28–35 M |
| 2 | Développement Backend | API FastAPI, BDD PostgreSQL, workflows, sécurité, audit logs | 65–80 M |
| 3 | Développement Frontend Dashboard | Next.js, tableaux de bord, cartographie GIS, reporting | 45–55 M |
| 4 | Application Mobile | Flutter (iOS + Android), mode offline, géolocalisation inspections | 28–35 M |
| 5 | Module IA Documentaire | OCR + NLP pré-instruction automatique | 15–20 M |
| 6 | Signature Électronique (PKI) | Infrastructure clés, intégration, certification | 20–25 M |
| 7 | Infrastructure et Hébergement | Serveurs, CDN, stockage, redondance, setup initial | 42–55 M |
| 8 | Intégrations et API Gateway | Stubs ANPI, DGI, Douanes + architecture interopérabilité | 22–28 M |
| 9 | Sécurité et Audit | Pentest initial, hardening, configuration MFA | 15–20 M |
| 10 | Formation | 50+ agents, présentiel + e-learning, certification | 18–22 M |
| 11 | Conduite du Changement | Communication, accompagnement, sensibilisation opérateurs | 12–15 M |
| 12 | Tests, Recette, Déploiement | UAT, tests de charge, go-live, hypercare | 15–20 M |
| 13 | Documentation et Transfert | Manuels, formation formateurs, code source commenté | 8–10 M |
| 14 | Contingence (10%) | Aléas et imprévus | 33–40 M |
| | **TOTAL CAPEX** | | **366–460 M** |

**Scénario de référence (médian) : 340–360 M FCFA**

### 9.2 OPEX annuel — Décomposition

| Poste | Description | Montant/an |
|-------|-------------|-----------|
| Maintenance applicative | 2–3 développeurs demi-temps | 40–50 M |
| Hébergement et infrastructure | Datacenter, licences, CDN | 20–30 M |
| Support utilisateurs | Hotline N1/N2, assistance agents | 15–20 M |
| Évolutions fonctionnelles | Nouvelles fonctionnalités, adaptations réglementaires | 20–25 M |
| Sécurité continue | Pentest annuel, veille, mises à jour | 10–15 M |
| Formation continue | Nouveaux agents, nouvelles fonctionnalités | 5–8 M |
| **TOTAL OPEX** | | **110–148 M** |

**Scénario de référence OPEX : 120–130 M FCFA/an**

### 9.3 Comparatifs de marché pour validation du budget

- **Irembo Rwanda** : 1,5 Mds FCFA pour 100 services — PNPI est ~4x moins cher pour un périmètre spécialisé. ✅ Cohérent.
- **CFE Sénégal** : ~800 M FCFA pour un périmètre plus large. PNPI est ~50% moins cher pour un périmètre plus ciblé. ✅ Cohérent.
- **Cabinet international** (Deloitte, Capgemini) : 600 M–1 Mds FCFA pour un projet équivalent. PNPI propose 40–50% d'économie. ✅ Compétitif.

---

## 10. PLAN DE MISE EN ŒUVRE (12 MOIS)

### Gantt synthétique

| Phase | Mois | Activités principales | Livrable clé |
|-------|------|----------------------|--------------|
| **M1–M2** : Cadrage | Mois 1–2 | Spécifications détaillées, UX/UI, architecture, configuration équipe | Cahier des charges validé + maquettes interactives |
| **M3–M5** : Build MVP | Mois 3–5 | Développement Modules 1–3 (Guichet, Workflow ATI, DIU) | MVP fonctionnel + tests |
| **M6–M7** : Pilote | Mois 6–7 | Pilote opérationnel ATI + dashboard Ministère avec données réelles | 50 dossiers ATI traités sur la plateforme |
| **M8–M10** : Stabilisation | Mois 8–10 | Modules 4–6 (BI, Conformité, Admin), montée en charge | Plateforme complète opérationnelle |
| **M11–M12** : Extension | Mois 11–12 | Formation complète, transfert de compétences, bilan, V2 planifiée | 100% des dossiers ATI sur la plateforme |

### Critères de passage de phase

**Passage M2→M3 (Cadrage→Build) :**
- Cahier des charges signé
- Équipe projet constituée
- Infrastructure de développement opérationnelle
- Budget validé et engagé

**Passage M5→M6 (Build→Pilote) :**
- MVP démontré et validé par les référents métier
- Formation des agents pilotes réalisée
- 0 anomalie bloquante en recette fonctionnelle

**Passage M7→M8 (Pilote→Stabilisation) :**
- 50 dossiers ATI traités sur la plateforme sans incident majeur
- KPIs pilote atteints (délai < 20 jours, taux de dossiers complets > 70%)
- Satisfaction agents instructeurs > 70%

**Validation M12 (Extension→Généralisation) :**
- 100% des nouveaux dossiers ATI traités via PNPI
- Taux de disponibilité applicative > 99,5%
- Formation 100% des agents ciblés complétée
- PCA/PRA testés et validés

---

## 11. INDICATEURS DE PERFORMANCE (KPIs)

### KPIs Projet (déploiement)

| KPI | Cible M7 (pilote) | Cible M12 (généralisation) |
|-----|-------------------|---------------------------|
| % agents formés | 80% (agents pilotes) | 100% |
| % dossiers ATI sur plateforme | 50% | 100% |
| Disponibilité applicative | > 99% | > 99,5% |
| Incidents bloquants ouverts | < 5 | 0 |

### KPIs Métier (performance)

| KPI | Baseline actuelle | Cible M7 | Cible M12 |
|-----|------------------|----------|-----------|
| Délai moyen traitement ATI | 45–60 jours | < 25 jours | < 15 jours |
| Taux dossiers complets au 1er dépôt | ~35% | > 65% | > 80% |
| Taux traitement dans les délais SLA | Non mesuré | > 70% | > 90% |
| Traçabilité des décisions | 0% | 100% | 100% |
| Satisfaction opérateurs | Non mesurée | > 65% | > 80% |
| Satisfaction agents | Non mesurée | > 60% | > 75% |

### KPIs Stratégiques (impact)

| KPI | Source | Fréquence de mesure |
|-----|--------|---------------------|
| Évolution rang B-READY / indicateur licences | Banque Mondiale | Annuelle |
| Nombre d'ATI traités et validés | PNPI | Mensuelle |
| Économies générées vs statu quo | Audit interne | Semestrielle |
| Nombre de connexions interopérabilité activées | Équipe technique | Trimestrielle |
| Taux d'adoption utilisateurs | PNPI | Mensuelle |

---

## 12. GOUVERNANCE

### 12.1 Organes et responsabilités

```
  Sponsor Institutionnel
  (Ministre / Secrétaire Général)
           │
    ┌──────┴──────┐
    │    COPIL    │ ← Arbitrage stratégique, mensuel
    └──────┬──────┘
           │
  Direction de Programme
  (Directeur de Programme + PMO)
           │
    ┌──────┴──────────────────────┐
    │                             │
  Product Owner Ministère    Lead Technique / Architecte
  (Référents métiers)        (Équipe développement)
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                 QA/Test       RSSI Projet    DevOps/Infra
                 Manager                        │
                                           Data Analyst BI
                                           Support N1/N2
```

### 12.2 Fréquence des instances

| Instance | Fréquence | Participants | Objet |
|----------|-----------|--------------|-------|
| COPIL | Mensuel | Ministre/SG, Direction Programme, Lead Technique | Arbitrage stratégique, KPIs |
| Comité Opérationnel | Hebdomadaire | Direction Programme, PO, Lead Technique | Avancement, blocages |
| Revue Technique | Bi-hebdomadaire | Lead Technique, DevOps, QA | Architecture, code, tests |
| Revue KPI | Mensuelle | Direction Programme, PO, Data Analyst | Indicateurs, ajustements |

### 12.3 Modèle RACI

| Activité | Directeur Programme | Product Owner | Lead Technique | COPIL |
|----------|---------------------|---------------|----------------|-------|
| Cadrage et spécifications | A | R | C | I |
| Développement | C | I | A+R | I |
| Recette fonctionnelle | C | A+R | C | I |
| Mise en production | I | I | A+R | I |
| Formation agents | A | R | C | I |
| Validation KPIs | A | R | C | I |
| Décisions budgétaires | C | C | I | A |

*R=Réalisateur, A=Approbateur, C=Consulté, I=Informé*

---

## 13. CADRE LÉGAL ET CONFORMITÉ

### 13.1 Textes applicables

1. **Loi n°009/2012** portant Code des investissements du Gabon — cadre des agréments industriels
2. **Loi n°025/2018** relative à la protection des données personnelles au Gabon
3. **Stratégie Gabon Digital** — référentiel national de transformation numérique
4. **Accords CEMAC** sur l'harmonisation des procédures industrielles
5. **RGPD** (applicable aux entreprises européennes opérant au Gabon)

### 13.2 Travaux réglementaires à mener en parallèle

| Texte nécessaire | Objet | Priorité |
|-----------------|-------|---------|
| Décret ou arrêté | Valeur juridique des agréments électroniques | **Critique — avant M6** |
| Arrêté | Définition du Dossier Industriel Unique (DIU) | Haute — avant M8 |
| Convention inter-administrations | Cadre de l'interopérabilité ANPI, DGI, Douanes | Moyenne — avant M10 |
| Circulaire | Obligation d'utilisation du PNPI pour tous les dépôts | **Critique — avant M12** |

### 13.3 Conformité cybersécurité

- Respect des normes ISO 27001 (à certifier à 18 mois)
- Audit de sécurité initial avant mise en production
- Pentest annuel obligatoire
- Formation RGPD de tous les agents ayant accès aux données personnelles
- Registre des traitements de données conforme aux obligations légales

---

## 14. MATRICE DES RISQUES

| # | Risque | Probabilité | Impact | Score | Mesure d'atténuation |
|---|--------|-------------|--------|-------|---------------------|
| R1 | Résistance au changement des agents | Haute | Critique | **Critique** | Plan change management dès M1, sponsors métiers, référents formateurs internes |
| R2 | Faible adoption des opérateurs industriels | Moyenne | Majeur | **Élevé** | Module d'assistance PME, accompagnement terrain, communication ciblée |
| R3 | Budget insuffisant ou non engagé à temps | Moyenne | Critique | **Élevé** | Phasage modulaire, mobilisation financements extérieurs en parallèle |
| R4 | Connectivité insuffisante en provinces | Haute | Majeur | **Élevé** | Mode offline-first, synchronisation différée, VSAT pour zones critiques |
| R5 | Changement politique ou administratif | Faible | Critique | **Élevé** | Ancrage multi-acteurs, documentation exhaustive, transfert de compétences |
| R6 | Risque cybersécurité / intrusion | Faible | Critique | **Moyen** | MFA, audit, journalisation, PRA/PCA, pentest régulier |
| R7 | Qualité insuffisante des données initiales | Haute | Modéré | **Moyen** | Règles de validation strictes, module de migration des données existantes |
| R8 | Dépendance fournisseur technologique | Moyenne | Modéré | **Moyen** | Clauses de réversibilité, code source open source, transfert compétences |
| R9 | Délai de mise en œuvre dépassé | Moyenne | Modéré | **Moyen** | Méthodologie Agile, jalons intermédiaires, contingence budget 10% |
| R10 | Interopérabilité bloquée par administration partenaire | Haute | Faible | **Faible** | Architecture stubs (activer progressivement), Phase 1 indépendante |

---

## 15. STRATÉGIE DE DÉPLOIEMENT TERRITORIAL

### 15.1 Le défi territorial gabonais

Le Gabon compte 9 provinces industriellement actives avec des réalités de connectivité très différentes :
- **Libreville (Estuaire)** : connectivité fibre, concentration des sièges sociaux
- **Port-Gentil (Ogooué-Maritime)** : industrie pétrolière et pétrochimique, connectivité acceptable
- **Franceville (Haut-Ogooué)** : industrie minière (Comilog), connectivité variable
- **Autres provinces** : agriculture, forêt, pêche — connectivité parfois limitée

### 15.2 Approche par vagues

**Vague 1 (M6–M8) — Libreville :** Déploiement pilote, 80% des dossiers ATI
**Vague 2 (M9–M10) — Port-Gentil + Franceville :** Zones à forte activité industrielle
**Vague 3 (M11–M12) — Provinces restantes :** Déploiement national complet

### 15.3 Solution pour les zones à connectivité limitée

- **Mode offline-first** : L'application mobile des inspecteurs fonctionne sans connexion. Les données sont synchronisées dès qu'une connexion est disponible.
- **Points d'accès dédiés** : Identification de points d'accès numériques dans chaque chef-lieu provincial (mairies, agences ANPI locales) équipés de connexions dédiées pour le dépôt des dossiers.
- **Agents-relais** : Formation d'agents province capables d'assister les opérateurs dans le dépôt numérique de leurs dossiers.

---

## 16. DÉCISIONS ATTENDUES

À l'issue de la présentation de cette note, les décisions suivantes sont sollicitées :

| # | Décision | Responsable | Délai souhaité |
|---|----------|-------------|----------------|
| 1 | **Validation du lancement de la Phase 1** | Ministre / COPIL | J+15 |
| 2 | **Validation de la gouvernance proposée** | Secrétaire Général | J+15 |
| 3 | **Validation de l'enveloppe budgétaire** | Ministère des Finances | J+30 |
| 4 | **Désignation du Directeur de Programme** | Ministre | J+10 |
| 5 | **Désignation des référents métiers** | Directeurs Généraux | J+15 |
| 6 | **Lancement des démarches de co-financement** | Direction Programme | J+30 |
| 7 | **Lancement des travaux réglementaires** (valeur juridique ATI numérique) | Direction Juridique | J+30 |

---

## 17. ANNEXES

### Annexe A — Organigramme Projet Détaillé

```
┌─────────────────────────────────────────┐
│        SPONSOR INSTITUTIONNEL           │
│      Ministre de l'Industrie            │
│         Secrétaire Général              │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│           COPIL STRATÉGIQUE             │
│  Ministre, SG, Dir. Généraux, PMO       │
│  → Arbitrage stratégique mensuel        │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         DIRECTION DE PROGRAMME          │
│     Directeur de Programme + PMO        │
│  → Coordination, reporting, budget      │
└────────┬─────────────────────┬──────────┘
         │                     │
┌────────▼────────┐   ┌────────▼──────────┐
│  PRODUCT OWNER  │   │  LEAD TECHNIQUE   │
│   Ministère     │   │  / ARCHITECTE     │
│  Référents métiers│ │  + Équipe Dev     │
└────────┬────────┘   └────────┬──────────┘
         │                     │
┌────────▼────────┐   ┌────────▼──────────┐
│  RÉFÉRENTS      │   │  QA/Test Manager  │
│  MÉTIERS        │   │  RSSI Projet      │
│  (par Direction)│   │  DevOps/Infra     │
└─────────────────┘   │  Data Analyst BI  │
                       │  Support N1/N2    │
                       └───────────────────┘
```

### Annexe B — Comparatif Benchmarks

| Pays | Plateforme | Budget | Délai déploiement | Impact mesuré |
|------|-----------|--------|-------------------|---------------|
| Rwanda | Irembo | 1,5 Mds FCFA | 24 mois | Délai industriel : 28j→3j |
| Sénégal | APIX/CFE | ~800 M FCFA | 14 mois | Création entreprise : 58j→1j |
| Maroc | CRI Digital | ND | 36 mois | Zone industrielle : 18m→4m |
| Côte d'Ivoire | CEPICI | ND | 18 mois | -30% délai traitement |
| **Gabon (PNPI)** | **PNPI** | **340–360 M** | **12 mois** | **Cible: ATI 60j→15j** |

### Annexe C — Principales fonctionnalités par profil utilisateur

**Profil : Opérateur Industriel**
- Créer son compte et son Dossier Industriel Unique (DIU)
- Déposer un dossier ATI avec guidage pas à pas
- Suivre l'avancement en temps réel
- Recevoir les notifications de décision
- Télécharger son ATI numérique avec QR code
- Accéder à son historique complet de dossiers

**Profil : Agent Instructeur**
- Recevoir et traiter les dossiers ATI assignés
- Accéder au rapport de pré-instruction IA
- Communiquer avec l'opérateur via messagerie tracée
- Rédiger son avis technique dans un formulaire structuré
- Signer électroniquement les décisions
- Gérer son tableau de bord personnel (charge, délais)

**Profil : Directeur Général**
- Valider les décisions ATI de son périmètre
- Visualiser le tableau de bord de sa Direction
- Suivre les dossiers en retard ou en escalade
- Consulter les statistiques de performance de son équipe

**Profil : Inspecteur Terrain**
- Accéder aux plannings d'inspection sur mobile
- Rédiger et soumettre des rapports d'inspection géolocalisés
- Scanner et vérifier les QR codes des ATI en situation
- Fonctionner en mode offline dans les zones sans réseau

**Profil : Ministre / Secrétaire Général**
- Tableau de bord exécutif : KPIs synthétiques, alertes prioritaires
- Carte industrielle nationale en temps réel
- Rapports automatisés exportables
- Indicateurs de performance ministérielle

### Annexe D — Plan de conduite du changement

| Action | Cible | Calendrier | Responsable |
|--------|-------|-----------|-------------|
| Communication de lancement (note de service + événement) | Tous les agents | M1 | Direction Programme |
| Sessions de présentation par direction | Directeurs + chefs de service | M2 | PO Ministère |
| Formation agents instructeurs (présentiel 2 jours) | 30–40 agents | M5–M6 | QA/Test Manager |
| Formation inspecteurs terrain (mobile, 1 jour) | 20–30 agents | M8 | DevOps |
| Communication vers les opérateurs industriels | Syndicats, associations | M6 | Direction Communication |
| Sessions d'assistance dépôt dossiers pour les PME | PME provinciales | M9–M11 | Agents-relais |
| Bilan et retours d'expérience | Tous | M12 | Direction Programme |

---

## CONCLUSION

Le PNPI n'est pas un projet de modernisation administrative parmi d'autres. C'est l'instrument qui transforme le Ministère de l'Industrie en institution de pilotage industriel de classe mondiale.

Avec un investissement de 340–360 M FCFA, le Gabon :
- **Réduit de 75% les délais d'agrément industriel** en 12 mois
- **Élimine structurellement la corruption** dans les processus d'agrément
- **Se dote d'une cartographie industrielle nationale** pour la première fois de son histoire
- **Affirme sa souveraineté numérique** sur ses données industrielles stratégiques
- **Rejoint les nations africaines leaders** de la gouvernance économique digitale

Les pays qui nous précèdent — Rwanda, Sénégal, Maroc, Côte d'Ivoire — ont prouvé que c'est possible. Le contexte de la Transition en fait un moment idéal. Les partenaires financiers sont prêts.

**Il ne manque que la décision.**

---

*Document préparé par l'équipe technique du projet PNPI.*
*Version 2.0 — Février 2026*
*Pour toute question : [contact à définir]*

---
*Fin du document — PNPI Note Conceptuelle Officielle v2.0*

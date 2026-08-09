# PNPI — Conversation Master File for Codex

> Source de continuité consolidée à partir de la conversation ChatGPT.
> Langue principale : français.
> Usage cible : reprise du projet dans Codex sans perdre les décisions, l'architecture métier, les conventions, les domaines déjà définis et la feuille de route.

---

# 1. Règles globales du projet

## 1.1 Positionnement

Le projet principal décrit ici est la **Plateforme Nationale de Pilotage Industriel (PNPI)** du **Ministère de l’Industrie du Gabon**.

L’approche retenue est une **architecture métier / architecture d’entreprise**, inspirée de TOGAF et des pratiques d’architecture publique. Le document ne doit pas dériver prématurément vers une documentation purement logicielle.

La PNPI est pensée comme une plateforme nationale multi-domaines permettant de piloter l’industrie gabonaise à travers les unités industrielles, investissements, autorisations, inspections, zones industrielles, données, interopérabilité, intelligence décisionnelle, géographie, chaînes de valeur, innovation, capital humain et durabilité.

## 1.2 Conventions institutionnelles essentielles

- **AGANOR** reste l’autorité de référence pour la normalisation et la certification selon ses compétences. La PNPI peut intégrer, afficher ou vérifier des informations provenant d’AGANOR mais ne s’y substitue pas.
- **OGAPI** reste l’autorité de référence pour la propriété industrielle. La PNPI peut orienter, interfacer ou consolider des données autorisées sans attribuer elle-même de titres ou droits.
- **DIUN** = identifiant national unique des unités industrielles.
- Lorsqu’une compétence juridique, réglementaire ou institutionnelle n’est pas certaine, utiliser explicitement la mention **« à valider »** au lieu d’inventer un pouvoir.
- La PNPI est un outil de coordination, connaissance, pilotage et aide à la décision. Elle ne transfère pas artificiellement les compétences des autres administrations au Ministère de l’Industrie.

## 1.3 Style documentaire

- Français formel institutionnel.
- Sections numérotées.
- Règles métier avec identifiants stables.
- Diagrammes en blocs de code texte simples.
- Ne pas ajouter d’attributs ou identifiants dans les fences Markdown des diagrammes.

Exemple correct :

```text
Source
  │
  ▼
Traitement
  │
  ▼
Résultat
```

---

# 2. Vision d’ensemble de la PNPI

La PNPI doit constituer un **système national de connaissance, gestion, coordination et pilotage industriel** permettant progressivement de répondre aux questions suivantes :

- Quelles unités industrielles existent au Gabon ?
- Où sont-elles implantées ?
- Quelles autorisations possèdent-elles ?
- Quelles inspections et obligations les concernent ?
- Quels investissements sont en cours ou projetés ?
- Quelles zones industrielles existent et quelles capacités offrent-elles ?
- Quelles données sont disponibles et de quelle qualité ?
- Comment les administrations échangent-elles de manière sécurisée ?
- Quels KPI doivent alimenter le pilotage national ?
- Quelles filières et chaînes de valeur sont structurantes ?
- Où sont les dépendances, maillons manquants et opportunités de transformation locale ?
- Quel est le niveau technologique de l’industrie nationale ?
- Quelles compétences et formations sont nécessaires ?
- Comment améliorer l’efficacité énergétique, l’usage des ressources, la circularité et la résilience ?

La cible est un État capable de passer d’une logique administrative fragmentée à une logique de **pilotage industriel intégré, data-driven, territorial et prospectif**.

---

# 3. Architecture métier — familles fonctionnelles déjà établies

Les familles d’architecture métier (FAM) déjà travaillées dans la conversation sont les suivantes :

1. **FAM-RIN-001**
2. **FAM-ATI-001**
3. **FAM-INS-001**
4. **FAM-INV-001**
5. **FAM-AGN-001**
6. **FAM-OGP-001**
7. **FAM-ZIN-001**
8. **FAM-OBS-001**
9. **FAM-GDO-001**
10. **FAM-DOC-001**
11. **FAM-SEC-001**
12. **FAM-ADM-001**
13. **FAM-INT-001**
14. **FAM-ANA-001**
15. **FAM-PORT-001**
16. **FAM-GEO-001**
17. **FAM-CHA-001**
18. **FAM-INN-001**
19. **FAM-CAP-001**
20. **FAM-DUR-001** — en cours au moment de la demande d’export Markdown.

Les premiers domaines (RIN, ATI, INS, INV, AGN, OGP, ZIN, OBS, GDO, DOC) avaient déjà été réalisés dans des échanges antérieurs et servent de socle. Les domaines détaillés ci-dessous couvrent la partie de la conversation effectivement visible dans ce fil.

---

# 4. FAM-SEC-001 — Sécurité, Résilience et Continuité

## État

Complétée en quatre parties.

## Périmètre couvert

- gouvernance de la sécurité ;
- gestion des identités et accès ;
- sécurité des données ;
- journalisation et audit ;
- cybersécurité ;
- continuité d’activité ;
- PRA ;
- PCA ;
- sauvegardes ;
- gestion de crise ;
- audits ;
- conformité ;
- modèle de maturité ;
- feuille de route de résilience.

## Décision importante

Tous les futurs domaines doivent réutiliser FAM-SEC-001 pour les exigences de confidentialité, IAM, journalisation, sécurité des interfaces, classification et continuité.

---

# 5. FAM-ADM-001 — Administration, Exploitation, Supervision et Maintenance

## État

Complétée en quatre parties.

## Capacités définies

- administration fonctionnelle ;
- administration technique ;
- paramétrage ;
- gestion des organisations ;
- rôles ;
- menus ;
- formulaires ;
- nomenclatures ;
- modèles ;
- versionnement de configuration ;
- journalisation ;
- supervision ;
- monitoring ;
- APIs ;
- bases de données ;
- infrastructure ;
- jobs planifiés ;
- gestion de capacité ;
- alertes ;
- dashboards opérationnels ;
- change management ;
- release management ;
- rollback ;
- CMDB ;
- maintenance corrective / préventive / évolutive ;
- gestion des incidents ;
- gestion des problèmes ;
- service desk ;
- SLA / OLA ;
- base de connaissances ;
- gouvernance d’exploitation ;
- comité d’exploitation ;
- maturité opérationnelle ;
- feuille de route d’exploitation.

---

# 6. FAM-INT-001 — Intégration, Interopérabilité Nationale et Bus de Services

## État

Complétée en quatre parties.

## Partie 1 — Architecture d’intégration

Décisions :

- architecture orientée services ;
- possibilité d’une approche événementielle ;
- ESB / iPaaS selon cible technique ;
- échanges synchrones et asynchrones ;
- gouvernance des messages ;
- traçabilité ;
- gestion des erreurs ;
- référentiels nationaux ;
- usage du DIUN dans les échanges.

## Partie 2 — Gouvernance API

Capacités :

- API Gateway ;
- catalogue de services ;
- contrats API ;
- cycle de vie ;
- versioning ;
- documentation ;
- protocoles et formats ;
- authentification ;
- autorisation ;
- rate limiting ;
- logging ;
- monitoring ;
- publication ;
- dépréciation.

## Partie 3 — Connecteurs et flux nationaux

Capacités :

- connecteurs institutionnels ;
- synchronisation ;
- résolution de conflits ;
- transformation ;
- événements métiers ;
- queues ;
- résilience ;
- gestion d’indisponibilité des partenaires ;
- anomalies ;
- incidents d’interopérabilité ;
- supervision des flux ;
- KPI d’échanges.

## Partie 4 — Gouvernance nationale

Décisions :

- gouvernance commune de l’interopérabilité ;
- conventions d’échange ;
- référentiels partagés ;
- comité d’interopérabilité possible, **à valider** ;
- audits ;
- contrôle de conformité ;
- registre des risques ;
- modèle de maturité en cinq niveaux ;
- feuille de route vers un écosystème national interopérable.

---

# 7. FAM-ANA-001 — Pilotage Stratégique, BI, Analytique et IA

## État

Complétée en quatre parties.

## Vision

Créer une administration industrielle pilotée par la donnée.

## Socle décisionnel

- Data Warehouse PNPI ;
- Data Marts ;
- historisation ;
- métadonnées analytiques ;
- KPI nationaux ;
- tableaux de bord stratégiques ;
- analyses OLAP ;
- analyses géospatiales ;
- alertes décisionnelles ;
- reporting.

## Analytique avancée

- descriptif ;
- diagnostic ;
- prédictif ;
- prescriptif ;
- séries temporelles ;
- corrélations ;
- régressions ;
- segmentation ;
- détection d’anomalies ;
- moteurs de recommandations ;
- simulations prospectives ;
- jumeaux numériques lorsque pertinents.

## IA

- Machine Learning ;
- IA générative pour synthèses, rapports, assistance documentaire ;
- recommandation ;
- détection d’anomalies ;
- prospective ;
- gouvernance de modèles ;
- explicabilité ;
- validation humaine ;
- suivi des performances ;
- détection de biais ;
- model drift ;
- audit des modèles.

## Principe fondamental

Les recommandations IA sont des **aides à la décision**. Elles ne deviennent pas automatiquement des décisions administratives.

---

# 8. FAM-PORT-001 — Portail National, UX, Omnicanalité et Services aux Usagers

## État

Complétée en quatre parties.

## Vision

Mettre en place un **guichet numérique industriel intégré** avec le principe :

**Un besoin → un parcours → un suivi consolidé.**

## Espaces fonctionnels

- espace public ;
- espace entreprise ;
- espace investisseur ;
- espace institutionnel.

## Fonctions majeures

- catalogue de démarches ;
- parcours par besoin ;
- dossier numérique entreprise ;
- DIUN ;
- principe « dites-le-nous une fois » ;
- formulaires intelligents ;
- préremplissage ;
- contrôle avant soumission ;
- brouillons ;
- chronologie de dossier ;
- statuts compréhensibles ;
- notifications ;
- recherche de services ;
- aide contextuelle ;
- mandats ;
- multi-établissements ;
- services mobiles ;
- prise en compte des faibles connectivités ;
- sécurité ;
- prévention de fraude ;
- mesure UX.

## UX et assistance

- tableau de bord personnalisé ;
- « Mon entreprise » ;
- « Mon projet industriel » ;
- centre de notifications unifié ;
- e-mail, SMS, mobile et autres canaux autorisés ;
- centre d’aide ;
- assistant conversationnel ;
- agent IA contextualisé ;
- escalade vers un agent humain ;
- messagerie sécurisée ;
- rendez-vous ;
- satisfaction ;
- design system institutionnel ;
- accessibilité ;
- inclusion numérique.

## Confiance numérique

- coffre-fort numérique ;
- documents réutilisables ;
- validité ;
- versioning ;
- QR de vérification ;
- signature électronique si juridiquement applicable ;
- cachet électronique si applicable ;
- horodatage ;
- preuve de dépôt ;
- preuve de notification ;
- paiements numériques lorsque prévus par les textes ;
- réconciliation ;
- mandats avancés ;
- réclamations ;
- demandes de correction ;
- réexamen ;
- recours ;
- open data ;
- API publiques.

## Gouvernance

- catalogue des services ;
- cycle de vie de service ;
- qualité de service ;
- UX governance ;
- audits d’accessibilité ;
- gouvernance des assistants IA ;
- base de connaissances officielle ;
- contrôle des hallucinations ;
- interdiction de décision autonome par chatbot ;
- maturité en cinq niveaux ;
- feuille de route du portail.

---

# 9. FAM-GEO-001 — Intelligence Territoriale, SIG et Observatoire Géospatial

## État

Complétée en quatre parties.

## Vision

Créer une cartographie industrielle nationale dynamique et un système d’intelligence territoriale.

## Référentiel géospatial

- provinces ;
- départements ;
- communes ;
- localités ;
- zones industrielles ;
- parcelles ;
- axes ;
- infrastructures ;
- coordonnées ;
- emprises.

## Géolocalisation

- rattachement au DIUN ;
- niveaux de précision ;
- validation des coordonnées ;
- source conservée ;
- contrôles de cohérence.

## Cartographies

- unités industrielles ;
- filières ;
- chaînes de valeur ;
- zones industrielles ;
- investissements ;
- emplois ;
- infrastructures ;
- densité ;
- conformité ;
- risques.

## Aide à la localisation des investissements

- analyse multicritère ;
- pondérations ;
- critères éliminatoires ;
- disponibilité foncière ;
- énergie ;
- eau ;
- télécoms ;
- ressources ;
- marchés ;
- main-d’œuvre ;
- infrastructures sociales ;
- logistique ;
- corridors ;
- risques territoriaux ;
- score d’attractivité ;
- comparateur territorial ;
- carte de potentiel ;
- scénarios d’aménagement.

## Observation avancée

- imagerie satellite ;
- imagerie aérienne ;
- télédétection ;
- détection de changements ;
- occupation des zones ;
- comparaison déclaration / observation ;
- alertes géographiques ;
- suivi des projets structurants ;
- collecte terrain ;
- mode hors ligne ;
- IoT lorsque pertinent ;
- atlas industriel national ;
- tableaux de bord géodécisionnels.

## Gouvernance

- catalogue géospatial ;
- métadonnées ;
- standards ouverts lorsque pertinents ;
- interopérabilité ;
- qualité géospatiale ;
- audits ;
- versionnement des cartes ;
- sécurité ;
- généralisation géographique pour le public ;
- réversibilité ;
- maturité géospatiale ;
- feuille de route.

---

# 10. FAM-CHA-001 — Filières, Chaînes de Valeur et Souveraineté Productive

## État

Complétée en quatre parties.

## Vision

Passer d’une lecture « entreprise par entreprise » à une lecture de l’économie productive dans son ensemble.

## Référentiels

- filières ;
- sous-filières ;
- segments ;
- activités ;
- produits ;
- intrants ;
- niveaux de transformation ;
- acteurs ;
- capacités ;
- flux.

## Capacités

- cartographie des chaînes de valeur ;
- maillons ;
- fournisseurs ;
- transformateurs ;
- distributeurs ;
- capacité installée ;
- production effective ;
- taux d’utilisation ;
- goulots d’étranglement ;
- maillons manquants ;
- taux de transformation locale ;
- profondeur de transformation ;
- valeur ajoutée locale ;
- dépendances intersectorielles ;
- annuaire B2B ;
- clusters.

## Souveraineté productive

- besoin national apparent ;
- taux de couverture nationale ;
- dépendance aux importations ;
- dépendance directe et indirecte ;
- produits critiques ;
- concentration géographique des importations ;
- concentration fournisseurs ;
- substitution aux importations ;
- analyse de demande ;
- capacité locale alternative ;
- réserve de capacité ;
- montée en capacité ;
- potentiel régional ;
- résilience ;
- rupture d’approvisionnement ;
- stocks stratégiques lorsque les données existent ;
- dépendance énergétique ;
- dépendance technologique ;
- pièces critiques ;
- sous-traitance locale ;
- contenu local industriel ;
- opportunités d’investissement.

## Compétitivité

- coûts ;
- productivité ;
- énergie ;
- logistique ;
- qualité ;
- technologie ;
- innovation ;
- fournisseurs ;
- marchés ;
- exportations ;
- sophistication des exportations ;
- diversification des marchés ;
- montée en gamme ;
- économie circulaire ;
- symbiose industrielle ;
- services mutualisés ;
- plans stratégiques par filière.

## Gouvernance

- responsables de filière possibles ;
- comités de filière possibles, **à valider** ;
- revue périodique ;
- plans d’action ;
- indicateurs ;
- méthodologies versionnées ;
- confidentialité ;
- coordination institutionnelle ;
- observatoire national des chaînes de valeur ;
- modèle de maturité ;
- feuille de route.

---

# 11. FAM-INN-001 — Innovation Industrielle, R&D, Transfert Technologique et Industrie 4.0

## État

Complétée en quatre parties.

## Vision

Mesurer et améliorer le niveau technologique de l’industrie gabonaise de manière progressive et pragmatique.

## Écosystème innovation

- entreprises ;
- startups ;
- laboratoires ;
- universités ;
- centres techniques ;
- bureaux d’études ;
- intégrateurs ;
- investisseurs ;
- fournisseurs technologiques.

## Référentiels

- acteurs ;
- technologies ;
- projets d’innovation ;
- compétences scientifiques ;
- plateformes techniques ;
- cas d’usage.

## Innovation et R&D

- innovation produit ;
- innovation procédé ;
- innovation organisationnelle ;
- innovation modèle économique ;
- recherche appliquée ;
- développement expérimental ;
- prototypage ;
- pilotes ;
- portefeuille R&D ;
- matching entreprise-laboratoire ;
- challenges industriels ;
- innovation ouverte.

## Transfert technologique

- acquisition ;
- licence ;
- partenariat ;
- formation ;
- assistance technique ;
- co-développement ;
- appropriation locale ;
- transfert de compétences ;
- analyse de dépendance fournisseur ;
- réversibilité ;
- maintenabilité.

## Industrie 4.0

- automatisation ;
- robotisation ;
- cobots ;
- IIoT ;
- capteurs ;
- Edge Computing ;
- IT / OT ;
- SCADA ;
- MES ;
- ERP-MES-OT ;
- données temps réel ;
- OEE/TRS ;
- maintenance corrective/préventive/conditionnelle/prédictive ;
- vision industrielle ;
- IA industrielle ;
- jumeaux numériques ;
- fabrication additive ;
- optimisation énergétique ;
- traçabilité ;
- cybersécurité OT/ICS.

## Principe de modernisation

Priorité aux fondations :

```text
Fiabiliser
  │
  ▼
Numériser
  │
  ▼
Connecter
  │
  ▼
Intégrer
  │
  ▼
Analyser
  │
  ▼
Automatiser / IA
```

## Gouvernance

- portefeuilles de modernisation ;
- diagnostics ;
- historique ;
- modèles de maturité ;
- confidentialité ;
- secret industriel ;
- articulation OGAPI ;
- articulation AGANOR ;
- risques technologiques ;
- gouvernance IT/OT ;
- audits Industrie 4.0 ;
- audit des modèles IA ;
- compétences ;
- feuille de route nationale.

---

# 12. FAM-CAP-001 — Capital Humain Industriel, Compétences et Emploi

## État

Complétée en quatre parties.

## Vision

Créer une **intelligence nationale des compétences industrielles**.

## Référentiels

- familles professionnelles ;
- métiers ;
- spécialités ;
- compétences ;
- niveaux de maîtrise ;
- formations ;
- certifications ;
- établissements.

## Capacités

- cartographie des emplois ;
- profils d’unités ;
- besoins de recrutement ;
- besoins actuels et futurs ;
- métiers en tension ;
- dépendance aux compétences externes ;
- plans de localisation des savoir-faire ;
- besoins de formation ;
- formation initiale ;
- formation continue ;
- requalification ;
- offre de formation ;
- adéquation emploi-formation ;
- partenariats entreprise-formation ;
- stages ;
- apprentissage / alternance lorsque le cadre applicable le permet ;
- matching compétences-besoins ;
- centres de compétences ;
- simulation et formation numérique.

## Prospective

- scénarios emploi-compétences ;
- automatisation ;
- analyse au niveau des tâches ;
- métiers émergents ;
- métiers transformés ;
- exposition technologique ;
- emplois créés par la technologie ;
- besoins liés aux investissements ;
- effet portefeuille d’investissements ;
- savoir-faire critiques ;
- mobilité professionnelle ;
- distance de compétences ;
- reconversion ;
- alertes précoces de pénurie ;
- calendrier inversé de formation ;
- IA pour la prospective ;
- observatoire du capital humain industriel.

## Gouvernance

- coordination emploi-formation-industrie ;
- référentiels versionnés ;
- qualité des données ;
- protection des données personnelles ;
- matching explicable et non décisionnel ;
- audit des modèles prospectifs ;
- backtesting ;
- suivi des politiques de formation ;
- maturité du capital humain ;
- feuille de route nationale.

---

# 13. FAM-DUR-001 — Industrie Durable, Ressources, Circularité et Décarbonation

## État actuel

En cours. Deux parties ont déjà été produites. La partie 3 est la prochaine étape logique.

## Partie 1 — Performance énergétique, eau, matières et ressources

### Vision

Construire un appareil productif capable de produire davantage de valeur tout en améliorant l’usage de l’énergie, de l’eau et des matières.

### Principes

- toutes les consommations sont rattachées à une période et une unité ;
- distinguer mesure, calcul, estimation, déclaration ;
- analyser l’intensité et pas seulement les volumes bruts ;
- ne pas confondre baisse de production et amélioration d’efficacité ;
- respecter les compétences des organismes environnementaux et énergétiques ;
- collecter uniquement les données nécessaires.

### Énergie

- consommation électrique ;
- carburants ;
- gaz ;
- biomasse ;
- renouvelables ;
- intensité énergétique ;
- profils de consommation ;
- dérives ;
- audits énergétiques ;
- modernisation ;
- besoins futurs ;
- résilience énergétique ;
- mix énergétique.

### Eau

- consommation ;
- intensité hydrique ;
- criticité ;
- stress ;
- réutilisation ;
- taux de réutilisation.

### Matières

- matières entrantes ;
- rendement matière ;
- pertes ;
- sous-produits ;
- matières critiques ;
- substitution ;
- bilan matière ;
- efficacité matière.

### Données

- approche progressive par niveaux de détail ;
- qualité ;
- normalisation des unités ;
- facteurs de conversion versionnés ;
- confidentialité ;
- tableaux de bord par unité, filière et territoire.

## Partie 2 — Économie circulaire, déchets, sous-produits et symbioses

### Flux résiduels

- coproduits ;
- sous-produits ;
- rebuts ;
- chutes ;
- déchets ;
- matières secondaires ;
- flux énergétiques valorisables.

### Caractérisation

- volume ;
- fréquence ;
- composition ;
- qualité ;
- humidité ;
- pureté ;
- pouvoir calorifique ;
- dangerosité si applicable ;
- mode de traitement.

### Hiérarchie de gestion

```text
Prévention
  │
  ▼
Réduction
  │
  ▼
Réutilisation
  │
  ▼
Recyclage
  │
  ▼
Autres valorisations
  │
  ▼
Élimination
```

### Symbiose industrielle

- échanges de matières ;
- énergie ;
- eau ;
- infrastructures ;
- logistique ;
- zones éco-industrielles ;
- plateformes de valorisation ;
- matching flux-besoin ;
- analyse de proximité ;
- faisabilité ;
- statuts de symbiose ;
- traçabilité.

### Marketplace potentielle

À un niveau de maturité avancé, un espace professionnel pourrait publier des matières disponibles et des besoins, mais une correspondance numérique ne vaut **jamais** autorisation réglementaire d’usage ou transfert.

### Indicateurs

- taux de valorisation ;
- taux de recyclage ;
- circularité matière ;
- incorporation de matière secondaire ;
- nombre de symbioses ;
- volumes valorisés ;
- investissements circulaires.

## Prochaine étape pour FAM-DUR-001

**Partie 3** doit couvrir :

- décarbonation industrielle ;
- inventaires d’émissions lorsqu’ils sont disponibles ;
- émissions directes et indirectes ;
- intensité carbone ;
- trajectoires de réduction ;
- leviers de décarbonation ;
- efficacité énergétique ;
- électrification ;
- énergies alternatives ;
- technologies bas-carbone ;
- risques physiques liés au climat ;
- risques de transition ;
- vulnérabilité des zones et chaînes industrielles ;
- scénarios climatiques ;
- plans de résilience ;
- investissements de transition ;
- tableaux de bord carbone et climatique.

Une **Partie 4** devra ensuite conclure la FAM avec : gouvernance, maturité, feuille de route, audits, indicateurs, conclusion et transition vers le domaine suivant.

---

# 14. Règles transversales déjà établies

## 14.1 Données

- toutes les données importantes doivent avoir une source ;
- conserver la période de référence ;
- conserver l’unité ;
- distinguer mesuré / déclaré / calculé / estimé ;
- versionner les référentiels et méthodologies ;
- historiser les changements significatifs ;
- éviter le double comptage ;
- gérer les données manquantes explicitement ;
- documenter les indicateurs composites.

## 14.2 Confidentialité

Ne jamais publier sans base appropriée :

- secrets industriels ;
- prix contractuels ;
- volumes commercialement sensibles ;
- relations fournisseur-client confidentielles ;
- procédés propriétaires ;
- données nominatives non nécessaires ;
- informations stratégiques d’infrastructure.

Préférer agrégation, anonymisation, généralisation géographique et cloisonnement par rôles.

## 14.3 IA

- utiliser l’IA comme aide ;
- conserver contrôle humain ;
- documenter les modèles ;
- monitorer performance et dérive ;
- prévenir les biais ;
- rendre les recommandations explicables ;
- distinguer données observées, simulations et prévisions ;
- ne pas laisser un assistant IA rejeter, sanctionner ou autoriser automatiquement un dossier administratif.

## 14.4 Institutionnel

- toujours respecter les compétences légales ;
- utiliser « à valider » lorsque nécessaire ;
- la PNPI peut interfacer les administrations mais ne les remplace pas ;
- AGANOR et OGAPI doivent rester clairement positionnés dans leurs domaines respectifs.

---

# 15. Architecture fonctionnelle consolidée du PNPI

La logique cible peut être représentée ainsi :

```text
                            PNPI
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
  Gestion métier         Gouvernance          Services usagers
        │                    │                    │
        │                    │                    │
        ▼                    ▼                    ▼
 RIN / ATI / INS      Data / Sec / Adm       Portail / Mobile
 INV / ZIN / OBS      Interop / Doc          Assistance / IA
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                      Intelligence nationale
                             │
      ┌──────────────────────┼──────────────────────┐
      ▼                      ▼                      ▼
   Analytique            Géospatial            Chaînes de valeur
      │                      │                      │
      └──────────────────────┼──────────────────────┘
                             ▼
                  Innovation / Capital humain
                             │
                             ▼
                      Industrie durable
```

---

# 16. Stack et orientation technique déjà associées au projet PNPI

Même si le Livre Blanc est d’abord métier, des orientations techniques avaient été évoquées pour le prototype PNPI :

- Backend possible : **NestJS** ;
- ORM : TypeORM ou Prisma selon arbitrage ;
- base relationnelle : **PostgreSQL** ;
- frontend web : **Next.js / React** ;
- authentification : JWT / RBAC, à aligner sur IAM ;
- SIG : solution compatible standards géospatiaux ouverts ;
- BI : solution décisionnelle à sélectionner selon contraintes ;
- APIs : API Gateway + catalogue + versioning ;
- infrastructure : déploiement sécurisé, idéalement compatible avec les exigences de souveraineté ;
- journalisation et audit obligatoires ;
- sauvegardes, PRA, PCA ;
- interopérabilité avec administrations externes ;
- architecture modulaire et progressive.

Le prototype présenté aux décideurs doit rester suffisamment réaliste pour démontrer :

- registre des unités ;
- DIUN ;
- tableau de bord ;
- workflow de dossiers ;
- cartographie ;
- quelques indicateurs ;
- traçabilité ;
- interopérabilité simulée ou réelle selon accès aux partenaires.

---

# 17. Fonctionnalités / concepts déjà réalisés ou décidés pour le prototype et la vision cible

## Identité industrielle

- enregistrement des unités ;
- DIUN ;
- établissements ;
- localisation ;
- statut ;
- filière ;
- documents ;
- historique.

## ATI

- dépôt ;
- pièces ;
- recevabilité ;
- instruction ;
- avis ;
- décision ;
- suivi des délais ;
- traçabilité.

## Inspections

- programmation ;
- missions ;
- constats ;
- non-conformités ;
- actions correctives ;
- suivi ;
- cartographie des contrôles.

## Investissements

- portefeuille ;
- projets ;
- secteur ;
- localisation ;
- montants ;
- statut ;
- besoins fonciers ;
- autorisations ;
- impacts ;
- emplois ;
- compétences ;
- opportunités générées à partir des chaînes de valeur.

## Zones industrielles

- limites ;
- parcelles ;
- occupation ;
- infrastructures ;
- disponibilités ;
- demandes d’implantation ;
- profil de zone ;
- services mutualisés ;
- circularité potentielle.

## Tableau de bord

- KPI nationaux ;
- KPI sectoriels ;
- KPI territoriaux ;
- cartes ;
- alertes ;
- tendances ;
- drill-down ;
- tableaux exécutifs.

---

# 18. Problèmes / risques rencontrés ou identifiés dans la conception

## 18.1 Risque de surdimensionnement

Le périmètre PNPI est très large. Risque de vouloir construire immédiatement tous les modules, IA, SIG, interop, BI, filières, RH, durabilité.

Décision implicite : **architecture ambitieuse, implémentation progressive**.

## 18.2 Risque institutionnel

Plusieurs domaines touchent des compétences partagées ou externes : normalisation, propriété industrielle, environnement, formation, emploi, données douanières, énergie, etc.

Réponse retenue :

- préserver les autorités de référence ;
- intégrer par interopérabilité ;
- utiliser « à valider » quand nécessaire.

## 18.3 Risque de données insuffisantes

Les fonctionnalités prédictives, scores, IA et cartographies avancées dépendent de la qualité des données.

Réponse :

- métadonnées ;
- qualité ;
- niveaux de confiance ;
- distinction mesuré/estimé ;
- développement progressif.

## 18.4 Risque de confidentialité

Les modules chaînes de valeur, innovation, capital humain, ressources et Industrie 4.0 peuvent exposer des informations sensibles.

Réponse :

- minimisation ;
- RBAC ;
- classification ;
- agrégation ;
- journalisation ;
- cloisonnement.

## 18.5 Risque de confusion entre score et décision

De nombreux scores sont envisagés : attractivité territoriale, dépendance, compétitivité, maturité, tension de compétences, circularité, etc.

Règle : **aucun score ne constitue automatiquement une décision administrative ou stratégique**.

---

# 19. Structure suggérée du repository Codex

Codex peut organiser le projet de manière suivante :

```text
pnpi/
├── README.md
├── docs/
│   ├── master-context.md
│   ├── architecture/
│   │   ├── business-architecture.md
│   │   ├── domain-map.md
│   │   └── rules.md
│   ├── fam/
│   │   ├── FAM-RIN-001.md
│   │   ├── FAM-ATI-001.md
│   │   ├── FAM-INS-001.md
│   │   ├── FAM-INV-001.md
│   │   ├── FAM-AGN-001.md
│   │   ├── FAM-OGP-001.md
│   │   ├── FAM-ZIN-001.md
│   │   ├── FAM-OBS-001.md
│   │   ├── FAM-GDO-001.md
│   │   ├── FAM-DOC-001.md
│   │   ├── FAM-SEC-001.md
│   │   ├── FAM-ADM-001.md
│   │   ├── FAM-INT-001.md
│   │   ├── FAM-ANA-001.md
│   │   ├── FAM-PORT-001.md
│   │   ├── FAM-GEO-001.md
│   │   ├── FAM-CHA-001.md
│   │   ├── FAM-INN-001.md
│   │   ├── FAM-CAP-001.md
│   │   └── FAM-DUR-001.md
│   ├── data/
│   ├── interoperability/
│   ├── security/
│   ├── ux/
│   └── roadmap/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── ui/
│   ├── domain/
│   ├── auth/
│   ├── data/
│   └── shared/
└── infrastructure/
```

---

# 20. Instructions directes pour Codex

1. Considérer ce fichier comme **contexte maître** du PNPI.
2. Ne pas supprimer une règle métier sans justification.
3. Conserver la séparation architecture métier / architecture technique.
4. Ne pas inventer des compétences légales. Utiliser « à valider » si nécessaire.
5. AGANOR et OGAPI restent autorités de référence dans leurs domaines.
6. Toute donnée sensible doit être traitée selon minimisation + RBAC + journalisation + classification.
7. Toute IA doit rester explicable et sous contrôle humain pour les décisions sensibles.
8. Les scores et simulations sont des aides à la décision.
9. Les référentiels, règles de calcul, modèles et indicateurs doivent être versionnés.
10. Les modules doivent être construits progressivement, avec un MVP démontrable avant extension complète.

---

# 21. Prochaines étapes immédiates

## 21.1 Livre Blanc

Continuer **FAM-DUR-001 — Partie 3** :

- décarbonation industrielle ;
- inventaires d’émissions ;
- intensité carbone ;
- trajectoires ;
- leviers de réduction ;
- risques climatiques ;
- risques de transition ;
- plans de résilience ;
- investissements de transition ;
- tableaux de bord carbone.

Puis produire **FAM-DUR-001 — Partie 4** :

- gouvernance ;
- audit ;
- maturité ;
- feuille de route ;
- indicateurs ;
- conclusion ;
- transition vers la FAM suivante.

## 21.2 Consolidation documentaire

Après FAM-DUR-001 :

- créer une table des matières globale ;
- normaliser tous les identifiants de règles ;
- vérifier les répétitions ;
- consolider les acteurs institutionnels ;
- produire la matrice FAM ↔ données ↔ acteurs ↔ KPI ↔ interfaces ;
- créer une vue d’architecture globale ;
- créer la roadmap de mise en œuvre.

## 21.3 MVP / prototype

Prioriser un prototype crédible comprenant :

- registre industriel + DIUN ;
- authentification / rôles ;
- unités et établissements ;
- workflow ATI ;
- investissements ;
- zones industrielles ;
- carte SIG ;
- dashboard KPI ;
- audit logs ;
- documents ;
- API de démonstration ;
- quelques interconnexions simulées.

## 21.4 Prototype de présentation institutionnelle

Préparer une démonstration orientée décideur :

1. tableau de bord national ;
2. carte des unités ;
3. fiche unité ;
4. workflow ATI ;
5. investissement ;
6. zone industrielle ;
7. alerte / KPI ;
8. traçabilité ;
9. exemple d’interopérabilité ;
10. exemple d’analyse de filière.

---

# 22. Contexte technique complémentaire provenant des travaux précédents de l’utilisateur

Le projet PNPI s’inscrit dans un environnement où les stacks suivantes sont déjà maîtrisées ou utilisées :

- Flutter ;
- NestJS ;
- TypeORM ;
- Prisma ;
- Django REST ;
- React ;
- Next.js ;
- Supabase ;
- PostgreSQL ;
- SQLite ;
- MySQL ;
- MongoDB ;
- Render ;
- Vercel ;
- Netlify ;
- Docker ;
- Kubernetes ;
- Cloudinary.

Pour PNPI, privilégier une architecture robuste et maintenable plutôt que de multiplier les technologies.

---

# 23. Décisions de design à conserver

- approche modulaire ;
- architecture centrée sur les domaines métier ;
- interfaces institutionnelles par APIs ;
- données historisées ;
- audit systématique des actions sensibles ;
- portal user-centric ;
- langage simple côté usager et terminologie administrative complète côté interne ;
- mobile-first / responsive pour les démarches publiques ;
- prise en compte des faibles débits ;
- géospatial intégré et non accessoire ;
- BI intégrée dès la conception ;
- IA seulement après disponibilité de données fiables ;
- data governance transversale ;
- sécurité by design ;
- interopérabilité nationale comme socle ;
- réversibilité et standards ouverts lorsque pertinents ;
- possibilité d’hébergement souverain ou contrôlé par l’État selon exigences finales.

---

# 24. Résumé de continuité pour reprise immédiate dans Codex

Si Codex doit reprendre sans autre contexte :

1. Le projet est la **PNPI du Ministère de l’Industrie du Gabon**.
2. Le Livre Blanc métier est très avancé : 20 familles environ, jusqu’à FAM-DUR-001 partie 2.
3. La prochaine section à rédiger est **FAM-DUR-001 Partie 3 — décarbonation et résilience climatique**.
4. Ne pas changer les rôles d’AGANOR, OGAPI ou d’autres administrations sans validation.
5. Conserver DIUN comme identifiant national unique des unités industrielles.
6. Toutes les architectures doivent être sécurisées, auditables, interopérables et data-driven.
7. Le MVP ne doit pas chercher à implémenter immédiatement l’ensemble du Livre Blanc.
8. Priorité MVP : registre + DIUN + ATI + investissement + zones + SIG + KPI + audit + documents + APIs.
9. Les domaines avancés IA, chaînes de valeur, capital humain et durabilité doivent être préparés architecturalement mais peuvent être activés par étapes.
10. Produire des livrables directement exploitables, éviter de rester bloqué dans des discussions de stratégie sans sortie concrète.

---

# 25. Fin du contexte maître

Ce fichier doit être enrichi à chaque nouvelle décision importante. Les futures modifications doivent conserver l’historique architectural et éviter les régressions de décisions déjà actées.

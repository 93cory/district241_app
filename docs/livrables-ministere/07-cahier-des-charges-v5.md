# PNPI — Cahier des charges V5

Version de travail : V5  
Objet : base de spécification pour cadrage, validation ou consultation  
Statut : document provisoire à compléter après ateliers métiers.

---

## 1. Objet du cahier des charges

Le présent cahier des charges définit les besoins fonctionnels, techniques, sécuritaires et organisationnels relatifs à la mise en place de la Plateforme Nationale de Pilotage Industriel (PNPI).

La PNPI a pour vocation de fournir au Ministère de l’Industrie un système numérique intégré permettant de :

- connaître l’appareil industriel national ;
- gérer les autorisations ;
- suivre les inspections ;
- produire des statistiques ;
- piloter les investissements ;
- analyser les filières ;
- coordonner les partenaires ;
- sécuriser les décisions ;
- améliorer la gouvernance industrielle.

---

## 2. Contexte

Le Ministère de l’Industrie doit disposer d’un outil permettant de centraliser, fiabiliser et exploiter les données relatives au tissu industriel.

Les procédures actuelles peuvent être fragmentées entre services, dossiers papier, fichiers bureautiques et échanges informels.

La PNPI vise à créer un socle numérique commun.

---

## 3. Objectifs généraux

La solution attendue doit permettre :

1. la constitution d’un référentiel national industriel ;
2. la dématérialisation des autorisations techniques industrielles ;
3. le suivi des inspections et de la conformité ;
4. la collecte et l’analyse des données industrielles ;
5. le suivi des investissements ;
6. la cartographie des unités et zones industrielles ;
7. la production de tableaux de bord ministériels ;
8. l’interopérabilité avec les partenaires ;
9. la sécurité et l’audit des opérations ;
10. la formation et l’accompagnement des utilisateurs.

---

## 4. Périmètre fonctionnel prioritaire

### 4.1 Phase 1 recommandée

La phase 1 doit prioriser :

- RIN ;
- ATI ;
- inspections ;
- ONI ;
- tableaux de bord Ministre ;
- sécurité / audit ;
- administration utilisateurs ;
- documents ;
- exports.

### 4.2 Phase 2

- investissements ;
- zones industrielles ;
- filières ;
- interopérabilité AGANOR/OGAPI ;
- capital humain ;
- durabilité ;
- analytique avancée.

### 4.3 Phase 3

- PPP ;
- marketplace/opportunités ;
- mobile terrain avancé ;
- open data contrôlé ;
- intelligence économique ;
- intégrations nationales élargies.

---

## 5. Exigences fonctionnelles

### 5.1 Référentiel Industriel National

La solution doit permettre :

- créer et gérer les opérateurs industriels ;
- attribuer ou préparer un identifiant unique ;
- gérer l’identité, les contacts, les sites, les activités ;
- consulter une fiche 360° ;
- suivre les autorisations, inspections, documents et risques ;
- historiser les modifications importantes.

### 5.2 Autorisations Techniques Industrielles

La solution doit permettre :

- créer une demande ;
- joindre des pièces ;
- vérifier la complétude ;
- instruire un dossier ;
- demander des compléments ;
- valider hiérarchiquement ;
- signer une décision ;
- approuver ou rejeter ;
- notifier ;
- générer un certificat ;
- vérifier l’authenticité ;
- consulter l’historique.

### 5.3 Inspections et conformité

La solution doit permettre :

- planifier une inspection ;
- générer un ordre de mission ;
- saisir un rapport ;
- ajouter des photos ;
- enregistrer des constats ;
- qualifier les non-conformités ;
- définir des actions correctives ;
- suivre les sanctions ;
- produire un indice de conformité ;
- prioriser les opérateurs à risque.

### 5.4 Observatoire National de l’Industrie

La solution doit permettre :

- collecter des déclarations industrielles ;
- suivre production, emploi, investissement, énergie, export/import ;
- contrôler la cohérence ;
- produire des indicateurs ;
- visualiser les tendances ;
- exporter des données validées.

### 5.5 Investissements industriels

La solution doit permettre :

- enregistrer des projets ;
- suivre montants, promoteurs, secteurs, provinces ;
- suivre emplois prévus et créés ;
- suivre statut, avancement et risques ;
- consolider un portefeuille national.

### 5.6 Filières et chaînes de valeur

La solution doit permettre :

- cartographier les filières ;
- identifier les maillons ;
- suivre les opportunités ;
- analyser la souveraineté productive ;
- relier filières, opérateurs, investissements et territoires.

### 5.7 Partenariats et PPP

La solution devra progressivement permettre :

- cartographier les partenaires ;
- suivre les montages de coopération ;
- identifier les responsabilités ;
- suivre les financements ;
- suivre l’exécution des projets ;
- produire des tableaux de bord de mobilisation des acteurs.

Ce périmètre est à préciser après consolidation de la FAM-PPP-001.

### 5.8 Tableaux de bord

La solution doit proposer :

- dashboard Ministre ;
- dashboard directeur ;
- dashboard instructeur ;
- dashboard inspecteur ;
- espace opérateur ;
- indicateurs nationaux ;
- indicateurs par province ;
- indicateurs par secteur ;
- alertes prioritaires.

---

## 6. Exigences utilisateurs et rôles

Profils cibles :

- administrateur ;
- ministre ;
- directeur ;
- instructeur ;
- inspecteur ;
- opérateur ;
- partenaire autorisé.

Chaque profil doit disposer :

- d’un espace adapté ;
- d’un menu filtré ;
- d’autorisations strictes ;
- de formations adaptées ;
- de journaux d’activité.

Règle :

> un utilisateur ne doit accéder qu’aux données nécessaires à son rôle.

---

## 7. Exigences de sécurité

La solution doit intégrer :

- authentification sécurisée ;
- MFA pour rôles sensibles ;
- RBAC ;
- isolation des données ;
- audit trail ;
- protection CSRF/XSS ;
- contrôle uploads ;
- rate limiting ;
- chiffrement des données sensibles ;
- journalisation des connexions ;
- gestion des sessions ;
- sauvegardes ;
- pentest avant production.

---

## 8. Exigences techniques

La solution doit être :

- web responsive ;
- compatible navigateurs modernes ;
- modulaire ;
- maintenable ;
- documentée ;
- déployable par conteneurs ;
- compatible PostgreSQL/PostGIS ;
- supervisable ;
- testable ;
- extensible par API.

---

## 9. Exigences d’interopérabilité

La solution doit permettre :

- API sécurisées ;
- journal d’échange ;
- import/export contrôlé ;
- conventions de données ;
- connecteurs futurs ;
- séparation des responsabilités institutionnelles.

Partenaires potentiels :

- AGANOR ;
- OGAPI ;
- administrations fiscales ;
- statistiques ;
- ANINF ;
- autres organismes selon validation.

---

## 10. Exigences documentaires

Le projet doit produire :

- dossier exécutif ;
- architecture technique ;
- manuel administrateur ;
- manuel utilisateur ;
- guide opérateur ;
- guide inspecteur ;
- matrice des rôles ;
- plan de formation ;
- plan de déploiement ;
- registre des risques ;
- cahier de recette ;
- rapport de sécurité.

---

## 11. Exigences de formation

La formation doit couvrir :

- profils Ministère ;
- instructeurs ;
- inspecteurs ;
- administrateurs ;
- opérateurs pilotes ;
- partenaires si nécessaire.

Formats :

- présentiel ;
- guides PDF ;
- vidéos courtes ;
- exercices pratiques ;
- FAQ ;
- support post-formation.

---

## 12. Exigences de recette

La recette doit valider :

- connexion ;
- rôles ;
- création opérateur ;
- fiche RIN ;
- création ATI ;
- instruction ATI ;
- approbation/rejet ;
- inspection ;
- rapport ;
- tableau de bord ;
- export ;
- audit ;
- sauvegarde ;
- performance ;
- sécurité.

---

## 13. Critères d’acceptation

La solution sera considérée acceptable si :

- les parcours prioritaires fonctionnent ;
- les rôles sont respectés ;
- les données opérateurs sont isolées ;
- les tableaux de bord affichent des indicateurs cohérents ;
- les actions sensibles sont auditées ;
- les documents sont versionnés ;
- les sauvegardes sont testées ;
- les performances sont acceptables ;
- la formation est réalisée ;
- les anomalies critiques sont corrigées.

---

## 14. Livrables attendus

| Lot | Livrable |
|---|---|
| Cadrage | note de cadrage, planning, matrice acteurs |
| Conception | architecture, modèles données, workflows |
| Développement | application, API, interfaces |
| Données | référentiels, imports, dictionnaire |
| Sécurité | RBAC, audit, pentest, registre risques |
| Déploiement | environnements, sauvegardes, monitoring |
| Formation | guides, sessions, supports |
| Recette | cahier de tests, PV de recette |
| Exploitation | runbook, support, maintenance |

---

## 15. Gouvernance projet

Le projet doit être piloté par :

- un comité de pilotage ;
- un chef de projet ;
- des référents métiers ;
- une équipe technique ;
- un référent sécurité ;
- un référent données ;
- un dispositif de support.

---

## 16. Conclusion

Ce cahier des charges constitue une base de travail.

Il doit être complété après ateliers métiers, arbitrages institutionnels et validation du périmètre prioritaire.


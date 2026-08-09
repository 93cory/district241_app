# Matrice FAM — couverture applicative et priorité de démonstration

> Document vivant — PNPI  
> Source de référence : `docs/architecture/master-context.md`  
> Objectif : relier le Livre Blanc métier à l'état réel du prototype afin de piloter les prochaines implémentations.

---

## 1. Principe de lecture

Cette matrice distingue volontairement :

- la **couverture métier** : le domaine est-il défini dans le Livre Blanc ?
- la **couverture applicative** : existe-t-il déjà dans le code sous forme de page, API, workflow, cockpit ou données ?
- la **priorité démo Ministre** : valeur de présentation institutionnelle à court terme.

Les niveaux utilisés sont :

| Niveau | Signification |
|---|---|
| Fort | Domaine présent, visible, démontrable et relativement cohérent. |
| Moyen | Domaine visible ou partiellement câblé, mais encore incomplet. |
| Faible | Domaine surtout documentaire ou prototype UI, peu intégré aux données. |
| Absent | Domaine non matérialisé de façon exploitable dans l'application. |

---

## 2. Vue synthétique

| # | FAM | Domaine métier | Couverture applicative actuelle | Éléments déjà visibles dans le prototype | Manques principaux | Priorité démo Ministre |
|---:|---|---|---|---|---|---|
| 1 | FAM-RIN-001 | Référentiel Industriel National | Fort | Cockpit RIN, annuaire opérateurs, fiche unité, DIUN conceptuel, pages `/pnpi/rin` et `/pnpi/operateurs`, API fiche 360° consolidée, score 360, synthèse exécutive, risques, décisions possibles, timeline transversale | Gouvernance complète du DIUN, qualité/complétude de données, historisation officielle des versions de fiche | Très haute |
| 2 | FAM-ATI-001 | Autorisations Techniques Industrielles | Fort | Workflow ATI, pièces, historique, statuts, guichet, rôles opérateur/instructeur/directeur/ministre, centre de traitement, règles métier, pré-contrôle documentaire, carte de contrôle ATI, scores préparation/urgence, blocages et prochaines actions | Génération officielle enrichie, registre opposable de notification, moteur de règles administrable complet | Très haute |
| 3 | FAM-INS-001 | Inspection, contrôle et conformité | Fort | Module inspections, ordres de mission, constats, sanctions, actions correctives, INCI, centre de contrôle avec score national, couverture, file de risque, alertes exécutives et recommandations | Planification terrain avancée, calendrier inspecteurs, formulaires mobiles offline | Haute |
| 4 | FAM-INV-001 | Investissements industriels | Moyen à fort | Cockpit `/pnpi/investissements`, portefeuille RIN, montants, emplois prévus, secteurs, provinces, statuts | Cycle complet projet → étude → financement → autorisations → chantier → exploitation | Haute |
| 5 | FAM-AGN-001 | AGANOR / normalisation | Moyen | Espace AGANOR, canal d'échange simulé PNPI↔AGANOR, règles de compétence, demandes d'avis démontrables | Interopérabilité réelle, convention d'échange, validation institutionnelle des statuts | Moyenne |
| 6 | FAM-OGP-001 | OGAPI / propriété industrielle | Moyen | Espace OGAPI, parcours d'orientation propriété industrielle, garde-fous juridiques, cas d'usage innovation/produit | Connecteur réel, statut officiel des titres, convention de partage de données | Moyenne |
| 7 | FAM-ZIN-001 | Zones industrielles | Moyen à fort | Cockpit `/pnpi/zones-industrielles`, sites RIN, opérateurs par province, surface, occupation proxy, énergie sectorielle | Référentiel formel zone → parcelle → infrastructure, disponibilité foncière et services | Haute |
| 8 | FAM-OBS-001 | Observatoire National de l'Industrie | Fort | Cockpit ONI, indicateurs, tendances, tableaux de bord | Industrialisation des sources, qualité statistique, versionnement des indicateurs | Très haute |
| 9 | FAM-GDO-001 | Gouvernance des données | Moyen à fort | Cockpit `/pnpi/data-quality`, score national, contrôles RIN/ATI/ONI/documents, doublons, anomalies, lignage, principes de gouvernance | Catalogue de données administrable, propriétaires métiers, workflows de remédiation et publication officielle | Haute |
| 10 | FAM-DOC-001 | Documents, coffre-fort et preuves | Moyen à fort | Cockpit `/pnpi/documents`, documents ATI, ZIP, versions, couverture des pièces, classification, anomalies, preuves verrouillées | Coffre-fort transverse avec métadonnées enrichies, empreintes cryptographiques, preuves de dépôt/notification opposables | Haute |
| 11 | FAM-SEC-001 | Sécurité, IAM, audit, résilience | Fort | Cockpit SOC `/pnpi/securite`, MFA, audit events, login history, score risque, règles SEC-CYB | PCA/PRA complet côté UI, gestion d'incidents opérationnelle, politiques IAM avancées | Très haute |
| 12 | FAM-ADM-001 | Administration, exploitation, supervision | Moyen à fort | Cockpit `/pnpi/exploitation`, santé DB/cache/disque, comptes, MFA, sessions, sauvegardes, audit, alertes, runbooks, pipeline de changement | CMDB complète, SLA/OLA contractualisés, registre officiel incidents/changements | Moyenne |
| 13 | FAM-INT-001 | Interopérabilité nationale | Moyen à fort | Cockpit `/pnpi/interoperabilite`, catalogue API, DGDI/DGI/MTEPS, AGANOR/OGAPI en protocole cible, conventions, règles de gouvernance, journal d'échanges, readiness par partenaire, scopes, matrice de maturité, risques, roadmap interinstitutionnelle | Journal dédié des échanges externes, bac à sable institutionnel connecté aux partenaires, connecteurs réels, SLA signés | Haute |
| 14 | FAM-ANA-001 | BI, analytique et IA | Moyen à fort | Cockpit `/pnpi/analytique`, API `/pnpi/dashboard/analytics-cockpit`, KPIs, stats avancées, prédictions, alertes IA, secteurs moteurs, provinces à signal fort, sources décisionnelles et recommandations | Entrepôt décisionnel explicite, dictionnaire officiel d'indicateurs, gouvernance IA, modèles prédictifs documentés et jeux d'entraînement versionnés | Haute |
| 15 | FAM-PORT-001 | Portail, UX, omnicanalité | Moyen à fort | Cockpit `/pnpi/portail`, API `/pnpi/dashboard/portal-cockpit`, guichet, parcours par rôle, navigation par rôle, notifications, annonces, messagerie, formations, mobile terrain, plan du site | Audit WCAG complet, mode faible débit/offline industrialisé, bulles d'aide contextuelle, mesure d'adoption par écran et mode démonstration guidé | Très haute |
| 16 | FAM-GEO-001 | SIG et intelligence territoriale | Moyen à fort | Cockpit `/pnpi/geographie`, API `/geo/cockpit`, carte nationale, heatmap, exports GeoJSON, score de géocodage, couverture provinciale, sites, inspections, investissements et priorités territoriales | Référentiel géospatial officiel, limites administratives validées, parcelles/zones formelles, sources coordonnées et couches SIG métier complètes | Haute |
| 17 | FAM-CHA-001 | Filières et chaînes de valeur | Fort | Cockpit filières `/pnpi/filieres`, souveraineté, maturité, profondeur chaîne de valeur, maillons, goulets, opportunités, territoires, détail filière | Données réelles fournisseurs/importations plus fines, plans d'action filière contractualisés, indicateurs validés par comité métier | Très haute |
| 18 | FAM-INN-001 | Innovation et Industrie 4.0 | Fort | Cockpit innovation `/pnpi/innovation`, technologies, projets, acteurs, maturité numérique, diagnostic Industrie 4.0, roadmap, portefeuille R&D, candidats OGAPI, liens AGANOR/OGAPI/capital humain | Diagnostics entreprise terrain, fiches PI réelles OGAPI, plans de normalisation AGANOR, mesures d'impact post-pilote | Haute |
| 19 | FAM-CAP-001 | Capital humain industriel | Moyen à fort | Cockpit `/pnpi/capital-humain`, formations par rôle, emplois RIN/ONI, compétences issues de l'innovation, pipeline emploi, matrice besoins/offre formation, compétences par technologie, plan d'actions ministériel | Référentiel national métiers/compétences validé, enquêtes emploi-formation, matching institutionnel avec organismes de formation | Très haute |
| 20 | FAM-DUR-001 | Industrie durable, circularité, décarbonation | Moyen à fort | Cockpit `/pnpi/durabilite`, page carbone, ODD, énergie ONI, ressources RIN, CO₂ estimé, risques climatiques, taxonomie durable, profils sectoriels, trajectoire carbone, sécurité ressources, opportunités de circularité, plan d’actions ministériel | Données réglementaires réelles, inventaire carbone formel, eau détaillée, symbioses industrielles validées terrain, facteurs d’émission officiels | Très haute |

---

## 3. Priorités recommandées pour la démo institutionnelle

### 3.1 À montrer absolument

1. **Tableau de bord national PNPI** : donne immédiatement la hauteur ministérielle.
2. **RIN / DIUN / fiche unité** : montre que le Ministère connaît le tissu industriel.
3. **Workflow ATI** : prouve la dématérialisation administrative.
4. **ONI / statistiques** : montre la capacité de pilotage par la donnée.
5. **Carte industrielle / géospatial** : très parlant pour un auditoire politique.
6. **Filières et chaînes de valeur** : montre la vision économique et souveraineté productive.
7. **Sécurité SOC** : rassure sur la traçabilité, la souveraineté et le sérieux du système.

### 3.2 À préparer comme modules “vision avancée”

1. **Capital humain industriel** : emploi, compétences, formation, métiers en tension.
2. **Industrie durable** : énergie, eau, circularité, carbone, résilience climatique.
3. **Interopérabilité nationale** : AGANOR, OGAPI et autres administrations, sans substitution juridique.
4. **IA / analytique avancée** : uniquement comme aide à la décision, sous contrôle humain.

---

## 4. Backlog priorisé court terme

| Priorité | Chantier | Résultat attendu |
|---:|---|---|
| P0 | Stabiliser les parcours de démonstration | Une séquence complète sans erreur : connexion → dashboard → RIN → ATI → carte → filières → sécurité. |
| P0 | Vérifier l'isolation par utilisateur | Aucune donnée de progression, formation ou dossier ne doit fuiter entre comptes. |
| P1 | Créer cockpit Capital humain | Vue métier des compétences, formations par rôle, métiers en tension, besoins des investissements. |
| P1 | Créer cockpit Industrie durable | Vue énergie/eau/matières/carbone/circularité avec données de démonstration crédibles. |
| P1 | Renforcer fiche RIN 360° | Une fiche unité doit agréger identité, ATI, inspections, investissements, documents, localisation, risques. |
| P2 | Simuler interopérabilité AGANOR/OGAPI | Afficher des échanges contrôlés, statuts, traces et limites de compétence “à valider”. |
| P2 | Formaliser gouvernance des données | Catalogue, sources, qualité, période, unité, niveau de confiance. |
| P2 | Ajouter runbook de présentation | Script oral + ordre des écrans + comptes de démonstration + scénario de secours. |

---

## 5. Séquence de démonstration proposée

```text
Connexion décideur
  │
  ▼
Tableau de bord national
  │
  ▼
Carte industrielle
  │
  ▼
Fiche unité RIN 360°
  │
  ▼
Cycle ATI complet
  │
  ▼
Inspection / conformité
  │
  ▼
Investissement et zone industrielle
  │
  ▼
Filières et chaînes de valeur
  │
  ▼
Sécurité SOC et audit
  │
  ▼
Vision prochaine étape :
Capital humain + industrie durable + interopérabilité
```

---

## 6. Décisions à conserver

- AGANOR reste l'autorité de référence pour la normalisation et la certification.
- OGAPI reste l'autorité de référence pour la propriété industrielle.
- La PNPI orchestre, consolide, trace et aide à décider ; elle ne remplace pas les autres administrations.
- Le DIUN reste l'identifiant pivot du référentiel industriel.
- Les scores, IA, alertes et recommandations ne sont jamais des décisions administratives automatiques.
- Toute donnée sensible doit être protégée par rôle, minimisation, classification et audit.

---

## 7. Mise à jour du document

Ce document doit être mis à jour après chaque lot significatif :

1. nouvelle API métier ;
2. nouvelle page démontrable ;
3. changement de modèle de données ;
4. arbitrage institutionnel ;
5. ajout d'un domaine du Livre Blanc ;
6. correction majeure de sécurité ou d'isolation des données.

---

*Fin du document.*

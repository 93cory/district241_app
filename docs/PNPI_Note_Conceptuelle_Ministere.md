# NOTE CONCEPTUELLE MINISTERIELLE
## Projet PNPI - Plateforme Nationale de Pilotage Industriel

**Destinataire :** Ministere de l'Industrie et de la Transformation Locale (Republique Gabonaise)  
**Version :** 1.0 (synthese consolidee du projet developpe)  
**Date :** 9 mars 2026

---

## 1. Contexte et probleme

Le Gabon poursuit une trajectoire de diversification economique et de transformation locale, mais le pilotage industriel demeure freine par :
- la fragmentation des donnees entre directions, services et supports papier,
- les delais de traitement heterogenes pour les dossiers industriels (notamment ATI),
- la faible tracabilite des decisions administratives,
- l'absence d'une vision nationale temps reel des operateurs, inspections, alertes et performances.

Le projet PNPI repond a ce deficit structurel en creant une chaine numerique complete : collecte terrain, instruction, validation, audit et pilotage strategique.

## 2. Vision du projet

Faire du PNPI l'instrument souverain de gouvernance industrielle du Gabon : une plateforme unique, securisee et interoperable qui transforme les donnees de terrain en decisions ministerielles mesurables, rapides et transparentes.

## 3. Objectifs principaux

1. Digitaliser le cycle de vie des dossiers industriels (depot, instruction, decision, suivi).
2. Reduire les delais de traitement par un workflow cadre (SLA, transitions controlees, alertes).
3. Assurer la tracabilite complete des actions (audit, historique, journalisation).
4. Outiller le cabinet ministeriel avec des tableaux de bord KPI, previsions et exports institutionnels.
5. Structurer un socle evolutif pour l'extension nationale et regionale.

## 4. Fonctionnalites principales

Le projet deja developpe couvre un perimetre fonctionnel large :

- **Authentification et securite d'acces** : JWT, refresh/revocation, verrouillage temporaire, rate limiting, RBAC (admin, ministere, inspecteur, industriel).
- **Gestion des operateurs industriels** : creation, consultation, statut actif/inactif, fiches detaillees.
- **Workflow ATI complet** : soumission, transitions de statut, affectation instructeur, historique, SLA, QR code et certificat PDF.
- **Inspections de conformite** : creation, mise a jour, detail, rapport PDF.
- **Documents** : upload, listing, telechargement, suppression liee aux dossiers ATI.
- **Pilotage des dossiers** : file de traitement, politique SLA configurable, KPI de backlog, taux d'approbation, mediane de traitement.
- **Dashboard PNPI** : KPI globaux, carte des operateurs, statistiques sectorielles/provinciales, pipeline ATI, tendances mensuelles, recherche.
- **Exports institutionnels** : CSV/PDF (indicateurs, transitions, briefing, recapitulatif).
- **Administration et gouvernance** : gestion utilisateurs, notifications, audit events.
- **Capacites terrain** : application mobile Flutter avec declaration et scan QR, y compris logique offline/synchronisation.

## 5. Architecture technique

Architecture mise en oeuvre en trois couches :

- **Frontend web (Next.js)** : portails ministeriels et operationnels (dashboard, guichet, admin, pilotage, briefing).
- **Backend API (FastAPI)** : coeur metier, securite, workflow, audit, exports, supervision (`/health`, `/metrics`, alerting OPS).
- **Canal mobile (Flutter)** : usage inspecteurs/terrain, consultation et remontee d'information.

Composants d'infrastructure :
- **Base de donnees relationnelle** : PostgreSQL (SQLite possible en local/demo), migrations Alembic.
- **Conteneurisation** : Docker Compose (postgres, backend, frontend).
- **CI/CD** : pipeline GitHub Actions (tests backend, lint/build frontend, E2E Playwright, analyse/tests Flutter, build images).
- **Resilience** : scripts backup/restore, cadre PRA/PCA (RTO cible 4h, RPO cible 1h).

## 6. Technologies utilisees

- **Backend** : Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic, Uvicorn.
- **Securite** : `python-jose`, `passlib/bcrypt`, OAuth2 password flow, RBAC.
- **Frontend web** : Next.js 14, React 18, TypeScript, SWR, Recharts, Leaflet.
- **Mobile** : Flutter (Dart), `mobile_scanner`, `fl_chart`, `http`, `shared_preferences`.
- **Data/exports** : ReportLab (PDF), qrcode, CSV.
- **Qualite** : Pytest, Playwright, Flutter test, ESLint.

## 7. Modele economique

Le PNPI est un **actif public numerique** a dominante institutionnelle. Le modele economique recommande est hybride :

1. **Financement socle Etat** : conception, hebergement souverain, securite, maintenance corrective.
2. **Budget operationnel annualise** : support, exploitation, supervision, evolutions reglementaires.
3. **Co-financement partenarial cible** : appui de bailleurs/programmes de transformation digitale pour accelerer l'extension territoriale.
4. **Monetisation indirecte (impact)** : reduction des delais administratifs, baisse des couts de non-qualite, amelioration du climat des affaires, augmentation de la base productive formelle.

## 8. Cas d'utilisation (snacks, evenements, utilisateurs)

Pour repondre au besoin de terrain et a une logique ecosystemique District241/PNPI, trois families de cas d'usage sont couvertes ou extensibles :

- **Snacks (agro-transformation/petite restauration formalisee)**
  - Enregistrement d'operateurs de petite transformation alimentaire.
  - Suivi des autorisations techniques, pieces de conformite et inspections hygiene.
  - Tracabilite des lots de production pour renforcer la securite sanitaire et la formalisation.

- **Evenements (foires, salons, campagnes de promotion locale)**
  - Planification d'evenements economiques territoriaux.
  - Qualification des participants (operateurs conformes, dossiers a jour).
  - Production de tableaux de bord d'impact (participation, contrats potentiels, secteurs dynamiques).

- **Utilisateurs (administration, inspecteurs, operateurs)**
  - Parcours differencies par role via RBAC.
  - Notifications et alertes ciblees selon responsabilites.
  - Historisation complete des actions pour responsabilisation et controle.

## 9. Roadmap de developpement

### Phase 1 - Consolidation MVP institutionnel (court terme)
- Stabiliser les flux critiques ATI/inspections/pilotage.
- Durcir les tests de non-regression et la supervision en preproduction.
- Generaliser l'usage des exports ministeriels standardises.

### Phase 2 - Industrialisation (moyen terme)
- Renforcer l'interoperabilite (administrations partenaires).
- Etendre la couverture geographique et sectorielle.
- Mettre en place une gouvernance data ministerielle formalisee.

### Phase 3 - Pilotage avance (moyen-long terme)
- Approfondir previsions et aides a la decision.
- Integrer tableaux de bord budgetaires et indicateurs d'impact macro.
- Structurer les modules ecosystemiques (snacks/evenements) comme couches additionnelles.

### Phase 4 - Souverainete et passage a l'echelle (continu)
- Renforcement cyber et gestion des secrets.
- PRA/PCA teste periodiquement.
- Cadre de replication multi-pays Afrique centrale.

## 10. Potentiel d'expansion au Gabon et en Afrique

Au Gabon, le PNPI peut devenir le socle numerique interministeriel de l'industrialisation (industrie, commerce, agriculture, investissement, formation technique).  
En Afrique, le modele est transferable aux pays ayant des enjeux similaires : formalisation, acceleration des agrements, transparence des decisions et pilotage sectoriel.

Facteurs d'expansion :
- architecture API modulaire,
- gouvernance RBAC/audit deja integree,
- capacite multi-canal (web + mobile),
- approche orientee resultats (KPI, SLA, exports officiels).

## 11. Differenciation par rapport aux autres plateformes

Le PNPI se distingue par :
- **orientation ministerielle operationnelle** (pas uniquement un portail declaratif),
- **continuite complete du flux** (guichet -> instruction -> decision -> inspection -> pilotage),
- **tracabilite forte** (audit, historique de transitions, preuves exportables),
- **ancrage souverain** (deploiement local possible, PRA/PCA, role central de l'Etat),
- **double canal web + mobile** adapte au terrain,
- **niveau de maturite deja concret** (APIs, interfaces, tests, CI/CD, dockerisation).

## 12. Conclusion strategique

Au 9 mars 2026, le projet PNPI n'est plus une intention : c'est un socle applicatif fonctionnel et evolutif, deja structure autour des priorites de l'Etat (rapidite, transparence, redevabilite, pilotage par la preuve).

La recommandation strategique est de lancer une trajectoire en trois actes :
1. **Validation institutionnelle et cadrage de deploiement national**,
2. **Mise en production progressive avec pilotes sectoriels/provinciaux**,
3. **Extension ecosystemique et regionale** pour faire du Gabon une reference africaine en gouvernance industrielle numerique.

Le PNPI constitue un levier de souverainete economique, d'amelioration du climat des affaires et de transformation durable de l'action publique industrielle.

# PNPI — Plateforme Nationale de la Politique Industrielle

Ce dépôt héberge la **PNPI** (Plateforme Nationale de la Politique Industrielle), un outil souverain destiné au Ministère de l’Industrie et de la Transformation Locale du Gabon. La plateforme couvre le suivi des unités industrielles, la traçabilité des lots, le pilotage des déclarations de production et l’aide à la décision ministérielle, avec pour objectifs de mesurer la transformation locale, réduire les importations et accélérer la création d’emplois dans les secteurs industriels prioritaires.

## Vision stratégique

- **Souveraineté économique** : piloter la transformation locale du bois, de l’agroalimentaire, de la pêche, du cacao et du manioc.
- **Transformation industrielle** : suivre les unités, valider les déclarations, tracer chaque lot via QR code et automatiser l’Indice National de Transformation Locale.
- **Impact socio-économique** : aligner les politiques sur la création d’emplois, les clusters industriels et la réduction des importations.

## Architecture proposée

### 🔧 Backend (NestJS ou FastAPI + PostgreSQL)

- API RESTful / GraphQL avec JWT + roles (`ministère`, `industriel`, `inspecteur`).
- Contrôleurs par entité : `units`, `declarations`, `batches`, `users`, `logs`.
- Services métiers : gestionnaire de production, générateur de QR, calcul d’indices, prévision.
- Base PostgreSQL avec schéma relationnel (unités, déclarations, lots, utilisateurs, alertes).
- Export PDF/CSV, simulations d’importation, modèle prédictif (prévision de production).
- Logs / audit pour la validation institutionnelle et la lutte contre l’informel.

> *À implémenter dans `backend/` (à créer). Le dossier mobile (présent ici) consomme l’API via JWT.*

Le répertoire `backend/` contient un prototype FastAPI prêt à être branché sur PostgreSQL. Il expose :

- `/auth/token` pour obtenir un JWT (comptes : `ministere`, `industriel`, `inspecteur` avec mots de passe pilotés par variables d’environnement backend).
- Endpoints sécurité (JWT + `require_roles`), unités, déclarations mensuelles, lots traceables, logs et indicateurs stratégiques.
- Le dashboard (`/dashboard/indicators`, `/dashboard/forecast`) est calculé à partir des données stockées (PostgreSQL/SQLite), avec seed initial pour la démo.
- Alertes dynamiques du dashboard : `/dashboard/alerts` (declarations en attente, notifications critiques, ecart import).
- Administration persistante : `/admin/users`, `/admin/notifications`.
- Workflow de moderation inspecteur : `/declarations/{id}/validate`, `/admin/notifications/{id}/read`.
- Exports backend : `/exports/indicators.csv`, `/exports/dashboard.pdf`.
- Frontend administration : page Next.js `/admin` (utilisateurs + notifications).
- Frontend briefing executif : page Next.js `/briefing` (synthese KPI, alertes et plan 30/60/90 jours).
- Mode comite : impression optimisee (`window.print`) avec annexes KPI et pagination (`@media print`).
- Proxy d'exports Next.js : `/api/exports/indicators`, `/api/exports/dashboard-pdf`.
- Proxy admin Next.js : `/api/admin/users`, `/api/admin/notifications` (creation securisee depuis l'UI).
- Proxy moderation Next.js : `/api/admin/declarations/validate`, `/api/admin/notifications/read`.
- Génération de QR par lot (chaîne https://pnpi-gabon/qr/{batchId}) et calcul simplifié de l’Indice National.
- Logs stratégiques pour traçabilité des actions administratives.

Pour lancer l’API (Python 3.12 recommandé) : partir du dossier racine, exécuter

```bash
copy backend\\.env.example backend\\.env
py -3.12 -m venv backend\\.venv312
backend\\.venv312\\Scripts\\python.exe -m pip install -r backend\\requirements.txt
backend\\.venv312\\Scripts\\python.exe -m alembic -c backend\\alembic.ini upgrade head
backend\\.venv312\\Scripts\\python.exe backend\\scripts\\seed_db.py
backend\\.venv312\\Scripts\\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Option script (PowerShell) :
```powershell
.\scripts\setup_backend_env.ps1
```

Migrations (depuis `backend/`) :
```bash
.venv312\\Scripts\\python.exe -m alembic -c alembic.ini upgrade head
.venv312\\Scripts\\python.exe scripts\\seed_db.py
```

Les mocks peuvent être reliés à PostgreSQL/PostGIS via des services à créer (`units`, `batches`, `logs`) et interagir avec Flutter/Next.js en production souveraine.

### 🖥 Frontend Dashboard (React / Next.js)

- Dashboard ministériel avec graphiques (Recharts ou ECharts), carte (Leaflet/Mapbox) et indicateurs sectoriels.
- Tableaux pour emplois, zones industrielles, volume local vs import.
- Administration complète : CRUD unités, lots, utilisateurs, logs.
- Authentification à deux facteurs, notifications, logs.
- Dossier `frontend/` : Next.js App Router + Recharts + SWR pour consommer les endpoints FastAPI (JWT + unités, lots, indicateurs).
- Cartographie initiale : couche Leaflet dynamique (`MapSection.tsx`), à connecter à PostGIS pour des clusters géolocalisés.
- Carte Leaflet replquée (fichier `MapSection.tsx`) + exports CSV/JSON pour les secteurs et lots (`ExportPanel.tsx`).

### 🪟 Lancer le dashboard Next.js

1. `cd frontend`
2. `npm install` (ou `pnpm install`)
3. `npm run dev` pour une version locale.
4. Définir `NEXT_PUBLIC_BACKEND_URL` vers le backend FastAPI (ex. `http://localhost:8000`) et les credentials serveur `PNPI_BACKEND_USERNAME` / `PNPI_BACKEND_PASSWORD`.
5. Copier `frontend/.env.example` vers `frontend/.env.local` puis ajuster les valeurs.

### 📱 Mobile Flutter — présent dans ce dépôt

- Navigation en bas (Dashboard, Unités, Traçabilité, Inspecteurs).
- Écrans :
  - **Dashboard stratégique** : prévisions, cartes, secteurs stratégiques, Indice national.
  - **Unités industrielles** : liste (filtre/Recherche), état, historique.
  - **Traçabilité** : lots avec QR, origine, certifications.
  - **Inspecteurs** : alertes terrain, scan QR code, validation.
- Données simulées (mock) pour guider les prochains développements.
  - `lib/src/data/mock_data.dart`
  - `lib/src/models/`
  - `lib/src/screens/` et `widgets`
- Synchronisation JWT + QR sur mobile : `lib/src/services/api_service.dart`, `InspectorsScreen` ouvre `QrScannerScreen` (mobile_scanner) et `UnitsScreen` déclenche la déclaration mensuelle via le backend.
- Graphiques via `fl_chart`, typographie institutionnelle via `google_fonts`.
- Palette aux couleurs du drapeau gabonais : vert, jaune, bleu.
- Synchronisation JWT via `lib/src/services/api_service.dart`, bascule sur `PNPI_API_URL`, `PNPI_API_USERNAME`, `PNPI_API_PASSWORD` pour pointer vers le backend FastAPI et valider les unités/lots en temps réel.

### 📦 Données & visualisation complémentaires

- Cartographie future : placeholder Mapbox/Leaflet (à remplacer par une couche géospatiale réelle).
- Graphiques interactifs avec `fl_chart` (barres prévisionnelles).
- Indicateurs d’impact (volume transformé, emplois, zones actives).

## Mise en route locale (Flutter mobile)

1. Installer les dépendances : `flutter pub get`.
2. Lancer l’application : `flutter run` (mobile, web ou desktop).
3. Pour connecter l'app mobile au backend, fournir `--dart-define=PNPI_API_URL=http://localhost:8000 --dart-define=PNPI_API_USERNAME=ministere --dart-define=PNPI_API_PASSWORD=...`.
4. Pour cibler un simulateur/dispositif : `flutter run -d <deviceId>`.
5. Mettre à jour les mocks (`lib/src/data/mock_data.dart`) pour refléter les données officielles.

## Stratégie de déploiement

1. **Backend** : Dockeriser et déployer sur VPS ou cloud souverain (ex. OVHcloud, Orange Cloud). Utiliser CI/CD (GitHub Actions) pour orchestrer tests, migrations, génération de QR.
2. **Frontend web** : Hôte Next.js sur CDN sécurisé, activez HTTPS, gestion RBAC.
3. **Mobile** : Build Flutter multi-plateforme, signature institutionnelle (Google Play, Apple App Store, stores privés).
4. **Bases de données** : PostgreSQL haute disponibilité + sauvegardes, réplication en lecture pour dashboards.

## Mode démo rapide (Docker Compose)

Depuis la racine du projet :

```bash
docker compose up --build
```

Services lancés :
- Backend FastAPI : `http://localhost:8000`
- PostgreSQL : `localhost:5432` (db `pnpi`)

Fichiers clés :
- `docker-compose.yml`
- `backend/Dockerfile`

## Tests & extension

- `flutter test` pour valider les widgets et les modèles.
- Ajouter des tests unitaires pour les modèles (calcul d’indices, filtrage).
- Intégrer une suite d’end-to-end (ex. integration_test) pour les flux critiques (login, déclaration, QR).

## Prochaines étapes recommandées

1. Créer le backend NestJS/FastAPI et connecter le mobile via JWT.
2. Générer les QR dynamiques à partir des lots (backend + mobile).
3. Construire le frontend React/Next.js avec les mêmes indicateurs.
4. Ajouter la fonctionnalité de scan QR et saisie terrain en Flutter.
5. Structurer la documentation de déploiement (CI/CD, migration PostgreSQL, monitoring).

Les composants actuels (mock, UI) servent de point d’ancrage pour piloter les travaux futurs avec un ton stratégique : industrialisation, souveraineté, réduction des importations, transformation locale et croissance du PIB non pétrolier.

Consultez également `docs/deployment.md` pour les scripts de CI/CD, les variables d’environnement critiques, les exports mensuels PDF/CSV et les recommandations de monitoring.
Pour la feuille de route d’implémentation et la trame de présentation ministérielle :
- `docs/implementation_roadmap.md`
- `docs/presentation_playbook.md`

## Mise a jour fonctionnelle (2026-02-23)

- Backend:
  - ajout de `GET /field-reports` et `POST /field-reports` pour les declarations terrain inspecteur.
  - migration Alembic `20260223_03` pour la table `field_reports`.
  - ajout de `PATCH /field-reports/{id}/status` et `DELETE /field-reports/{id}` pour le workflow complet de moderation.
  - ajout de `GET /exports/inspectors-briefing.pdf` pour un briefing terrain exportable.
- Mobile Flutter:
  - `InspectorsScreen` envoie les declarations terrain vers le backend (plus seulement snackbar locale).
  - `QrScannerScreen` extrait l'ID lot depuis un QR et consulte `GET /batches/{id}` pour afficher le detail.
- Frontend Next.js:
  - carte Leaflet enrichie avec les rapports terrain (couleur par severite/statut) superposes aux zones industrielles.
  - administration: moderation des rapports terrain (passage en `in_progress`/`closed`, suppression).
  - nouveau proxy d'export: `/api/exports/inspectors-briefing-pdf`.
- Environnement Python:
  - `scripts/setup_backend_env.ps1` applique maintenant les migrations et le seed en plus de creer le venv.

## Mise a jour execution (2026-02-23 - lot securite/exploitation)

- Securite backend:
  - politique mot de passe appliquee sur creation d'utilisateur (`12+`, maj/min/chiffre/special).
  - verrouillage temporaire apres echecs de connexion repetes.
  - tokens refresh avec rotation et revocation (`/auth/refresh`, `/auth/logout`).
  - rate limiting sur auth et routes sensibles.
- Observabilite:
  - middleware `x-request-id`, logs structures, endpoint `/metrics`.
- Gouvernance:
  - politique SLA pilotage configurable via `/pilotage/sla-policy`.
  - enrichissement audit (before/after sur mises a jour workflow).
- Qualite et delivery:
  - script local de controle qualite `scripts/ci_check.ps1`.
  - pipeline CI GitHub Actions (`.github/workflows/ci.yml`).
- Continuite d'activite:
  - scripts backup/restore DB: `scripts/backup_db.ps1`, `scripts/restore_db.ps1`.
  - documentation PRA/PCA: `docs/pra_pca.md`.
  - matrice RBAC: `docs/rbac_matrix.md`.
- Mobile terrain:
  - file hors ligne des rapports inspecteur + synchronisation manuelle.
- Alerte operationnelle:
  - endpoint `POST /ops/alerts/check` (evaluation seuils + webhook ops).
  - script `scripts/check_ops_alerts.ps1` pour declenchement manuel.
  - configuration rapide: `scripts/configure_ops_alerts.ps1` (cree/met a jour `backend/.env`).
- Qualite frontend workflow:
  - suite Playwright E2E workflow: `frontend/tests/e2e/pilotage-workflow.spec.ts`.
  - page cible de test: `/pilotage/e2e`.

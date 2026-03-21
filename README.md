# PNPI — Plateforme Nationale de la Politique Industrielle

Outil souverain du **Ministere de l'Industrie et de la Transformation Locale du Gabon**. La plateforme couvre le cycle complet des Autorisations Temporaires d'Importation (ATI), le suivi des operateurs industriels, les inspections terrain, le pilotage ministeriel et l'aide a la decision, avec pour objectifs de mesurer la transformation locale, reduire les importations et accelerer la creation d'emplois dans les secteurs industriels prioritaires.

---

## Vision strategique

- **Souverainete economique** : piloter la transformation locale du bois, de l'agroalimentaire, de la peche, du cacao et du manioc.
- **Transformation industrielle** : suivre les operateurs, gerer les ATI, tracer chaque lot via QR code et calculer l'Indice National de Transformation Locale.
- **Impact socio-economique** : aligner les politiques sur la creation d'emplois, les clusters industriels et la reduction des importations.

---

## Architecture

### Backend — FastAPI + PostgreSQL/PostGIS

- **Framework** : FastAPI (Python 3.12), async, OpenAPI auto-generee.
- **Base de donnees** : PostgreSQL 16 + PostGIS 3.4, migrations Alembic.
- **16 routers** : `auth`, `totp`, `ati`, `operateurs`, `inspections`, `documents`, `exports`, `pnpi_dashboard`, `pilotage`, `notifications`, `ws`, `admin`, `units`, `geo`, `health`, plus les endpoints legacy (`batches`, `logs`, `field-reports`).
- **WebSocket** : notifications temps reel via `/ws/notifications`.
- **Securite** : JWT + refresh tokens, RBAC (`ministre`, `instructeur`, `operateur`, `admin`), 2FA/TOTP, rate limiting, politique mot de passe, verrouillage apres echecs.
- **Observabilite** : middleware `x-request-id`, logs structures, endpoint `/metrics`, health-check `/health`.

### Frontend — Next.js 14

- **Framework** : Next.js 14 App Router, TypeScript, Tailwind CSS.
- **25+ pages** dont : dashboard PNPI, liste/detail ATI, guichet, operateurs, inspections, mes-dossiers, historique, notifications, stats, briefing, profil, pilotage, admin.
- **Temps reel** : notifications WebSocket, auto-refresh dashboard.
- **Cartographie** : Leaflet avec rapports terrain superposes aux zones industrielles.
- **Exports** : proxy vers CSV/PDF backend.

### Mobile — Flutter

- **27 ecrans** : dashboard, ATI, operateurs, inspections, conformite, QR scanner, alertes, historique, notifications, profil, 2FA, carte, briefing, pilotage, pitch, landing, login, etc.
- **State management** : Provider.
- **Typographie** : `google_fonts` (palette institutionnelle vert/jaune/bleu).
- **Graphiques** : `fl_chart`.
- **Mode hors ligne** : file d'attente des rapports inspecteur + synchronisation manuelle.
- **QR** : scan via `mobile_scanner`, consultation lot en temps reel.

---

## Fonctionnalites par module

### Gestion des ATI
- CRUD complet (creation, lecture, mise a jour, suppression)
- Workflow multi-etapes : soumission, instruction, approbation/rejet, resoumission
- Attribution des dossiers aux instructeurs
- Gestion des documents attaches
- Guichet unique de depot

### Inspections
- CRUD inspections avec photos
- Grille de conformite
- Rapports terrain (field reports) avec workflow de moderation
- Briefing terrain exportable en PDF

### Dashboard & Pilotage
- KPIs : total ATI, ATI en cours, taux d'approbation, delai moyen
- Pipeline par statut
- Tendances temporelles
- Carte geographique (Leaflet/PostGIS)
- Repartition par secteur
- Briefing executif avec plan 30/60/90 jours
- Mode comite (impression optimisee `@media print`)
- SLA configurable (`/pilotage/sla-policy`)

### Securite
- Authentification JWT + refresh tokens avec rotation et revocation
- 2FA / TOTP avec codes de secours
- Politique mot de passe (12+ caracteres, maj/min/chiffre/special)
- Verrouillage temporaire apres echecs repetes
- Rate limiting sur routes sensibles
- Audit trail complet (before/after sur mises a jour workflow)
- RBAC strict par role

### Exports
- CSV : indicateurs, listes ATI
- PDF : dashboard, briefing inspecteur (avec filigrane)
- Export streaming pour grands volumes

### Notifications
- WebSocket temps reel
- Filtres par severite (critique, importante, info)
- Escalade SLA automatique
- Alertes operationnelles configurables (seuils + webhook)

### Administration
- CRUD utilisateurs avec attribution de roles
- Gestion des notifications systeme
- Moderation des rapports terrain

---

## Resume des endpoints API

| Groupe | Endpoints principaux |
|---|---|
| **Auth** | `POST /auth/token`, `POST /auth/refresh`, `POST /auth/logout` |
| **TOTP** | `POST /totp/setup`, `POST /totp/verify`, `POST /totp/backup-codes` |
| **ATI** | `GET/POST /ati`, `GET/PATCH /ati/{id}`, `POST /ati/{id}/assign`, `POST /ati/{id}/resubmit` |
| **Operateurs** | `GET/POST /operateurs`, `GET/PATCH /operateurs/{id}` |
| **Inspections** | `GET/POST /inspections`, `GET/PATCH /inspections/{id}`, `POST /inspections/{id}/photos` |
| **Documents** | `GET/POST /documents`, `GET /documents/{id}/download` |
| **Dashboard** | `GET /pnpi/dashboard`, `GET /pnpi/dashboard/kpis`, `GET /pnpi/dashboard/pipeline` |
| **Pilotage** | `GET /pilotage/dossiers`, `GET/PUT /pilotage/sla-policy` |
| **Exports** | `GET /exports/indicators`, `GET /exports/dashboard.pdf`, `GET /exports/inspectors-briefing.pdf` |
| **Notifications** | `GET /notifications`, `PATCH /notifications/{id}/read` |
| **WebSocket** | `WS /ws/notifications` |
| **Admin** | `GET/POST /admin/users`, `GET/POST /admin/notifications` |
| **Geo** | `GET /geo/zones`, `GET /geo/clusters` |
| **Health** | `GET /health` |
| **Metrics** | `GET /metrics` |
| **Ops** | `POST /ops/alerts/check` |

---

## Mise en route locale

### Prerequis

- Python 3.12+
- Node.js 20+
- Flutter stable
- PostgreSQL 16 + PostGIS 3.4 (ou Docker)
- Git

### Backend

```bash
# Copier la configuration
copy backend\.env.example backend\.env

# Creer le venv et installer les dependances
py -3.12 -m venv backend\.venv312
backend\.venv312\Scripts\python.exe -m pip install -r backend\requirements.txt

# Appliquer les migrations et le seed
backend\.venv312\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head
backend\.venv312\Scripts\python.exe backend\scripts\seed_db.py

# Lancer le serveur
backend\.venv312\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --reload
```

Option script (PowerShell) :
```powershell
.\scripts\setup_backend_env.ps1
```

### Frontend

```bash
cd frontend
cp .env.example .env.local  # ajuster NEXT_PUBLIC_BACKEND_URL, PNPI_BACKEND_USERNAME, PNPI_BACKEND_PASSWORD
npm install
npm run dev
```

### Mobile Flutter

```bash
flutter pub get
flutter run --dart-define=PNPI_API_URL=http://localhost:8000 \
            --dart-define=PNPI_API_USERNAME=ministere \
            --dart-define=PNPI_API_PASSWORD=...
```

Dependances cles : `provider`, `google_fonts`, `fl_chart`, `mobile_scanner`, `leaflet`.

---

## Docker Compose

### Developpement

```bash
docker compose up --build
```

Services lances :
- **PostgreSQL/PostGIS** : `localhost:5432` (db `pnpi`)
- **Backend FastAPI** : `http://localhost:8000`
- **Frontend Next.js** : `http://localhost:3000`

Fichier : `docker-compose.yml`

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

- Images pre-construites depuis GHCR (`ghcr.io/<owner>/pnpi-backend`, `ghcr.io/<owner>/pnpi-frontend`)
- Variables d'environnement via `.env.prod`
- Reseau isole `pnpi-net`, healthchecks, `restart: always`

Fichier : `docker-compose.prod.yml`

---

## CI/CD

### Pipeline CI (`.github/workflows/ci.yml`)

| Job | Description |
|---|---|
| `backend` | Installation deps Python, `pytest tests -q` |
| `frontend` | Installation deps Node, lint, build Next.js |
| `frontend_e2e` | Installation Playwright + Chromium, `npm run test:e2e` |
| `flutter` | `flutter pub get`, `flutter analyze`, `flutter test` |
| `docker` | Build des images Docker backend + frontend |

### Pipeline CD (`.github/workflows/cd.yml`)

- Declenche sur push vers `main` apres validation CI
- Build et push des images Docker vers GitHub Container Registry (GHCR)
- Tags : `latest` + SHA court du commit

---

## Tests

### Backend (pytest)

```bash
cd backend
python -m pytest tests -q
```

Fichiers de tests : `test_api.py`, `test_auth.py`, `test_ati.py`, `test_pnpi_dashboard.py`, `test_inspections.py`, `test_exports.py`.

### Frontend (Playwright E2E)

```bash
cd frontend
npx playwright install --with-deps chromium
npm run test:e2e
```

Suites E2E :
- `tests/e2e/ati-lifecycle.spec.ts` — cycle complet ATI, dashboard KPIs, filtres, pages fonctionnelles, exports, RBAC, 404
- `tests/e2e/auth-2fa.spec.ts` — authentification, login/logout, credentials invalides, protection des routes, session timeout
- `tests/e2e/pilotage-workflow.spec.ts` — workflow pilotage et SLA
- `tests/e2e/pnpi-workflow.spec.ts` — workflow PNPI complet

### Mobile Flutter

```bash
flutter test
```

Tests unitaires des widgets et modeles.

---

## Checklist de deploiement production

- [ ] Configurer `.env.prod` avec des secrets forts (`PNPI_SECRET_KEY`, mots de passe, `POSTGRES_PASSWORD`)
- [ ] Activer HTTPS (reverse proxy Nginx/Caddy avec certificat Let's Encrypt)
- [ ] Configurer PostgreSQL haute disponibilite + sauvegardes regulieres (`scripts/backup_db.ps1`)
- [ ] Verifier la politique mot de passe (12+ caracteres)
- [ ] Activer le rate limiting en production
- [ ] Configurer les webhooks d'alertes operationnelles (`scripts/configure_ops_alerts.ps1`)
- [ ] Configurer la politique SLA via `/pilotage/sla-policy`
- [ ] Verifier les images Docker GHCR et les tags
- [ ] Tester la restauration DB (`scripts/restore_db.ps1`)
- [ ] Valider les tests CI avant merge (`pytest`, `flutter test`, Playwright E2E)
- [ ] Configurer le monitoring (`/health`, `/metrics`)
- [ ] Documenter la matrice RBAC (`docs/rbac_matrix.md`)
- [ ] Consulter le plan de reprise/continuite (`docs/pra_pca.md`)

---

## Documentation complementaire

- `docs/deployment.md` — scripts CI/CD, variables d'environnement, exports mensuels, monitoring
- `docs/implementation_roadmap.md` — feuille de route d'implementation
- `docs/presentation_playbook.md` — trame de presentation ministerielle
- `docs/rbac_matrix.md` — matrice des roles et permissions
- `docs/pra_pca.md` — plan de reprise et continuite d'activite

---

## Scripts utilitaires

| Script | Description |
|---|---|
| `scripts/setup_backend_env.ps1` | Creation venv, installation deps, migrations, seed |
| `scripts/ci_check.ps1` | Controle qualite local (lint, tests, build) |
| `scripts/backup_db.ps1` | Sauvegarde base de donnees |
| `scripts/restore_db.ps1` | Restauration base de donnees |
| `scripts/check_ops_alerts.ps1` | Evaluation manuelle des seuils d'alerte |
| `scripts/configure_ops_alerts.ps1` | Configuration des alertes operationnelles |

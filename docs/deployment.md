# Deploiement souverain PNPI

Ce document synthétise les pratiques de mise en production pour backend (FastAPI), frontend (Next.js) et mobile (Flutter).

## 1) Backend FastAPI

### Variables critiques
- `PNPI_DATABASE_URL`
- `PNPI_SECRET_KEY`
- `PNPI_ENV` (`development`/`production`)
- `PNPI_ADMIN_PASSWORD`
- `PNPI_MINISTERE_PASSWORD`
- `PNPI_INDUSTRIEL_PASSWORD`
- `PNPI_INSPECTEUR_PASSWORD`

### Demarrage
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m alembic -c alembic.ini upgrade head
python scripts/seed_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Securite active
- politique mot de passe (12+, maj/min/chiffre/special),
- verrouillage temporaire après échecs auth,
- refresh token avec rotation/revocation (`/auth/refresh`, `/auth/logout`),
- rate limiting auth/endpoints sensibles.
- verification ops alerting via `POST /ops/alerts/check`.

## 2) Frontend Next.js

### Variables
- `NEXT_PUBLIC_BACKEND_URL`
- `PNPI_BACKEND_USERNAME`
- `PNPI_BACKEND_PASSWORD`

### Build
```bash
cd frontend
npm ci
npm run lint
npm run build
npx playwright install
npm run test:e2e
```

## 3) Mobile Flutter

### Build
- `flutter build apk`
- `flutter build ios`

### Points operationnels
- mode offline inspecteur (file locale des rapports),
- synchronisation manuelle des rapports en attente.

## 4) CI/CD

- Pipeline GitHub Actions: `.github/workflows/ci.yml`.
- Contrôle local unifié: `scripts/ci_check.ps1`.

## 5) Observabilite

- logs structurés avec `x-request-id`,
- `/health` et `/health/detailed`,
- `/metrics` pour compteurs techniques + KPI métier.
- `POST /ops/alerts/check` pour evaluation des seuils et envoi webhook.
- script manuel: `scripts/check_ops_alerts.ps1`.

## 6) Sauvegardes et PRA

- Backup: `scripts/backup_db.ps1`
- Restore: `scripts/restore_db.ps1`
- Procédure PRA/PCA: `docs/pra_pca.md`

## 7) Gouvernance d'acces

- Matrice RBAC: `docs/rbac_matrix.md`.
- Audit trail enrichi sur les actions sensibles.

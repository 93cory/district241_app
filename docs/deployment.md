# Guide de Deploiement PNPI

## Pre-requis

- Docker >= 24.0 et Docker Compose >= 2.20
- PostgreSQL 16 avec PostGIS 3.4 (inclus dans l'image Docker)
- Node.js >= 20 (pour le build frontend hors Docker)
- Python 3.12 (pour le backend hors Docker)
- Certificat SSL (Let's Encrypt ou certificat ministeriel)
- Serveur Linux (Ubuntu 22.04 recommande) avec 4 Go RAM minimum

## Deploiement rapide (Docker Compose)

### 1. Configuration de l'environnement

```bash
cp deploy/env.prod.example .env.prod
nano .env.prod
```

Variables obligatoires :
| Variable | Description | Exemple |
|----------|-------------|---------|
| `PNPI_SECRET_KEY` | Cle JWT (min 32 chars) | `openssl rand -hex 32` |
| `PNPI_DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@postgres:5432/pnpi` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | Generer avec `openssl rand -base64 24` |
| `PNPI_ADMIN_PASSWORD` | Mot de passe admin | Min 12 chars, maj+min+chiffre+special |
| `PNPI_MINISTRE_PASSWORD` | Mot de passe ministre | Idem |
| ... | Tous les mots de passe par role | Conformes a la politique |

### 2. Certificats SSL

```bash
mkdir -p /etc/ssl/pnpi
# Option A: Let's Encrypt
certbot certonly --standalone -d pnpi-gabon.ga
cp /etc/letsencrypt/live/pnpi-gabon.ga/fullchain.pem /etc/ssl/pnpi/cert.pem
cp /etc/letsencrypt/live/pnpi-gabon.ga/privkey.pem /etc/ssl/pnpi/key.pem

# Option B: Certificat ministeriel
# Placer cert.pem et key.pem dans /etc/ssl/pnpi/
```

### 3. Lancement

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Services :
- **Nginx** : ports 80 (redirect) et 443 (HTTPS)
- **Backend** : port 8000 (interne)
- **Frontend** : port 3000 (interne)
- **PostgreSQL** : port 5432 (interne)

### 4. Verification

```bash
# Health check
curl -k https://localhost/health

# Health detaille (authentifie)
curl -k -H "Authorization: Bearer $(curl -s -X POST https://localhost/auth/token \
  -d 'username=admin&password=VOTRE_MOT_DE_PASSE' | jq -r .access_token)" \
  https://localhost/health/detailed
```

## Deploiement hors Docker

### Backend FastAPI

Variables critiques :
- `PNPI_DATABASE_URL`
- `PNPI_SECRET_KEY`
- `PNPI_ENV` (`development`/`production`)
- `PNPI_ADMIN_PASSWORD`
- `PNPI_MINISTRE_PASSWORD`
- `PNPI_OPERATEUR_PASSWORD`
- `PNPI_INSPECTEUR_PASSWORD`

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m alembic -c alembic.ini upgrade head
python scripts/seed_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Securite active :
- politique mot de passe (12+, maj/min/chiffre/special),
- verrouillage temporaire apres echecs auth,
- refresh token avec rotation/revocation (`/auth/refresh`, `/auth/logout`),
- rate limiting auth/endpoints sensibles,
- verification ops alerting via `POST /ops/alerts/check`.

### Frontend Next.js

Variables :
- `NEXT_PUBLIC_BACKEND_URL`
- `PNPI_BACKEND_USERNAME`
- `PNPI_BACKEND_PASSWORD`

```bash
cd frontend
npm ci
npm run lint
npm run build
npx playwright install
npm run test:e2e
```

### Mobile Flutter

```bash
flutter build apk
flutter build ios
```

Points operationnels :
- mode offline inspecteur (file locale des rapports),
- synchronisation manuelle des rapports en attente.

## Mise a jour

```bash
cd /opt/pnpi
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Les migrations Alembic s'executent automatiquement au demarrage du backend.

## Sauvegarde

### Base de donnees

```bash
# Sauvegarde quotidienne (ajouter en crontab)
docker exec pnpi-postgres pg_dump -U pnpi_user pnpi | gzip > /backup/pnpi_$(date +%Y%m%d).sql.gz

# Restauration
gunzip < /backup/pnpi_20260322.sql.gz | docker exec -i pnpi-postgres psql -U pnpi_user pnpi
```

### Fichiers uploades

```bash
docker cp pnpi-backend:/app/uploads /backup/uploads_$(date +%Y%m%d)
```

## Surveillance

- **Logs** : `docker compose -f docker-compose.prod.yml logs -f`
- **Health** : GET /health (public) et /health/detailed (admin)
- **Metriques** : GET /metrics (admin)
- **Analytics** : GET /analytics/usage?days=30 (admin)

## Depannage

| Probleme | Solution |
|----------|----------|
| Backend ne demarre pas | Verifier `.env.prod` (validate_env.py bloque si incomplet) |
| Erreur 502 | `docker compose restart backend` |
| Base inaccessible | `docker compose restart postgres && docker compose restart backend` |
| Certificat expire | Renouveler avec `certbot renew` |
| Espace disque | Nettoyer les uploads anciens et les logs Docker |

## Architecture reseau

```
Internet -> Nginx (443) -> Frontend (3000) / Backend (8000)
                              |
                        PostgreSQL (5432)
```

## CI/CD

Le pipeline `.github/workflows/cd.yml` :
1. Build les images Docker
2. Push vers GitHub Container Registry (ghcr.io)
3. SSH vers le serveur de production
4. Pull les nouvelles images
5. `docker compose up -d`
6. Health check automatique

Pipeline de test : `.github/workflows/ci.yml`
Controle local unifie : `scripts/ci_check.ps1`

## Gouvernance d'acces

- Matrice RBAC : `docs/rbac_matrix.md`
- Audit trail enrichi sur les actions sensibles

## PRA/PCA

- Backup : `scripts/backup_db.ps1`
- Restore : `scripts/restore_db.ps1`
- Procedure PRA/PCA : `docs/pra_pca.md`

# PNPI — Guide de deploiement production

## Prerequis serveur

- Ubuntu 22.04 LTS ou Debian 12
- Docker 24+ et Docker Compose v2
- 4 Go RAM minimum (8 Go recommande)
- 50 Go stockage SSD
- Domaine DNS configure (ex: pnpi-gabon.ga)
- Certificat SSL (Let's Encrypt recommande)

## Etape 1 : Cloner le projet

```bash
git clone https://github.com/ministere-industrie-gabon/pnpi.git /opt/pnpi
cd /opt/pnpi
```

## Etape 2 : Configurer l'environnement

```bash
cp deploy/env.prod.example .env
nano .env
```

Variables obligatoires :
- `PNPI_DATABASE_URL` : URL PostgreSQL
- `PNPI_SECRET_KEY` : cle secrete JWT (min 32 caracteres)
- `PNPI_ADMIN_PASSWORD` : mot de passe admin initial

Variables optionnelles :
- `PNPI_SMTP_HOST/PORT/USER/PASSWORD` : envoi d'emails
- `PNPI_S3_ENDPOINT/BUCKET/ACCESS_KEY/SECRET_KEY` : backups MinIO
- `PNPI_SMS_PROVIDER` : africastalking ou twilio
- `PNPI_VAPID_KEY` : notifications push web
- `PNPI_GRAFANA_PASSWORD` : dashboard Grafana

## Etape 3 : Deployer

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Services deployes :
- **backend** : FastAPI sur port 8000
- **frontend** : Next.js sur port 3000
- **postgres** : PostgreSQL 16 + PostGIS
- **nginx** : reverse proxy SSL sur ports 80/443
- **minio** : stockage S3 sur ports 9000/9001
- **prometheus** : monitoring sur port 9090
- **grafana** : dashboards sur port 3001

## Etape 4 : Initialiser la base

```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_pnpi.py
```

## Etape 5 : Configurer le cron

```bash
crontab deploy/crontab.example
```

Taches planifiees :
- Rapport executif hebdomadaire (lundi 7h)
- Verification SLA (quotidien 8h et 14h)
- Nettoyage tokens (quotidien 3h)
- Backup S3 (quotidien 1h30)
- Backup PostgreSQL (quotidien 2h)

## Etape 6 : Verifier

```bash
curl https://pnpi-gabon.ga/health
curl https://pnpi-gabon.ga/health/status
curl https://pnpi-gabon.ga/status
```

## Maintenance

### Mise a jour

```bash
cd /opt/pnpi
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### Backup manuel

```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/backup_s3.py backup
```

### Restauration

```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/backup_s3.py restore <filename>
```

## Monitoring

- **Prometheus** : https://pnpi-gabon.ga:9090
- **Grafana** : https://pnpi-gabon.ga/grafana (admin / mot de passe configure)
- **API Usage** : https://pnpi-gabon.ga/admin/api-usage (connexion admin requise)
- **Statut public** : https://pnpi-gabon.ga/status

## Securite

- [ ] Changer tous les mots de passe par defaut
- [ ] Configurer le certificat SSL
- [ ] Activer le backup S3
- [ ] Verifier les headers de securite (CSP, HSTS)
- [ ] Configurer les cles API d'integration (DGDI, DGI, MTEPS)
- [ ] Tester la 2FA pour tous les comptes admin
- [ ] Verifier les permissions par role

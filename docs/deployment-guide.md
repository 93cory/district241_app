# PNPI · Guide d'activation du déploiement continu

Ce document décrit la procédure complète pour activer le déploiement automatique de la PNPI sur un serveur de production.

> **État actuel** : le workflow `.github/workflows/cd.yml` est armé mais inerte. Tant que les secrets ne sont pas configurés, chaque push sur `main` déclenche le job `preflight` qui détecte l'absence de secrets et termine sans rien déployer (notice GitHub Actions). Aucun risque de déploiement accidentel.

---

## 1. Provisionner le serveur de production

### Caractéristiques minimales
- 4 vCPU, 8 Go RAM, 80 Go SSD (Linux Ubuntu 22.04 LTS recommandé).
- Adresse IP publique fixe.
- Nom de domaine pointant sur le serveur (ex. `pnpi.industrie.gouv.ga`).

### Hébergeurs adaptés à la souveraineté Gabon / Afrique
- VPS Hetzner Africa, Linode (Lagos), OVH (Dakar / Paris).
- Pour un hébergement strictement souverain : prestataire local agréé par l'ANINF.

### Préparation du serveur
```bash
# Sur le serveur, en root
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git ufw fail2ban

# Créer l'utilisateur de déploiement
adduser --disabled-password --gecos "" pnpi
usermod -aG docker pnpi

# Pare-feu basique
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Cloner le dépôt
sudo -u pnpi git clone https://github.com/93cory/pnpi-gabon.git /opt/pnpi
```

### Clé SSH dédiée au CD
Sur la machine locale (PAS sur le serveur) :
```bash
ssh-keygen -t ed25519 -f ~/.ssh/pnpi_cd -N ""
ssh-copy-id -i ~/.ssh/pnpi_cd.pub pnpi@<DEPLOY_HOST>
```
Garder le contenu de `~/.ssh/pnpi_cd` (clé privée) — il sera collé dans le secret `DEPLOY_SSH_KEY`.

---

## 2. Configurer les secrets GitHub

Dans GitHub → `Settings` → `Secrets and variables` → `Actions` → `New repository secret` :

| Secret | Valeur | Usage |
|---|---|---|
| `DEPLOY_HOST` | IP ou domaine du serveur (ex. `pnpi.industrie.gouv.ga`) | Cible SSH du déploiement |
| `DEPLOY_USER` | `pnpi` (utilisateur créé ci-dessus) | Compte SSH non-root |
| `DEPLOY_SSH_KEY` | Contenu de `~/.ssh/pnpi_cd` (clé privée) | Authentification SSH |
| `GHCR_TOKEN` | Personal Access Token GitHub avec `read:packages` | Pull des images depuis GHCR |

Secrets pour la sauvegarde quotidienne (`backup.yml`) :

| Secret | Valeur | Obligatoire ? |
|---|---|---|
| `PNPI_DATABASE_URL` | `postgresql://pnpi_prod:...@db:5432/pnpi` | Oui |
| `PNPI_S3_ENDPOINT` | URL MinIO ou S3 (ex. `https://s3.eu-west-1.amazonaws.com`) | Oui |
| `PNPI_S3_BUCKET` | Bucket dédié (ex. `pnpi-backups`) | Oui |
| `PNPI_S3_ACCESS_KEY` | Clé d'accès S3 | Oui |
| `PNPI_S3_SECRET_KEY` | Clé secrète S3 | Oui |
| `PNPI_S3_REGION` | Région (ex. `eu-west-1`) | Non (défaut `us-east-1`) |
| `PNPI_BACKUP_RETAIN_DAYS` | Rétention en jours | Non (défaut 30) |

Secrets pour les notifications cron (`cron.yml`) :

| Secret | Valeur | Obligatoire ? |
|---|---|---|
| `PNPI_SMTP_HOST` | Hôte SMTP (ex. `smtp.sendgrid.net`) | Oui pour les e-mails |
| `PNPI_SMTP_PORT` | Port (587 ou 465) | Oui pour les e-mails |
| `PNPI_SMTP_USER` | Utilisateur SMTP | Oui pour les e-mails |
| `PNPI_SMTP_PASSWORD` | Mot de passe ou API key | Oui pour les e-mails |
| `PNPI_SMTP_FROM` | Adresse expéditeur | Oui pour les e-mails |

Secrets pour les notifications push (`push.py`) :

| Secret | Valeur | Obligatoire ? |
|---|---|---|
| `PNPI_VAPID_PUBLIC_KEY` | Clé publique VAPID (base64url) | Oui |
| `PNPI_VAPID_PRIVATE_KEY` | Clé privée VAPID (base64url) | Oui |
| `PNPI_VAPID_SUBJECT` | `mailto:contact@pnpi-gabon.ga` | Non |

> **Générer une paire VAPID** : `pip install py-vapid && vapid --gen` — produit `private_key.pem` et `public_key.pem`. Convertir en base64url avec `pywebpush`.

---

## 3. Configurer l'environnement Docker Compose

Sur le serveur, créer `/opt/pnpi/.env.prod` (ne **jamais** commiter ce fichier) :

```bash
PNPI_ENV=production
PNPI_LOG_LEVEL=INFO
PNPI_LOG_FORMAT=json
PNPI_SECRET_KEY=<générer 64 caractères aléatoires>
PNPI_DATABASE_URL=postgresql+psycopg2://pnpi_prod:<password>@db:5432/pnpi
PNPI_REDIS_URL=redis://redis:6379/0
PNPI_CORS_ALLOW_ORIGINS=https://pnpi.industrie.gouv.ga
PNPI_REQUEST_TIMEOUT_SECONDS=30
PNPI_MAX_UPLOAD_MB=10
PNPI_DB_POOL_SIZE=20
PNPI_VAPID_PUBLIC_KEY=<...>
PNPI_VAPID_PRIVATE_KEY=<...>
PNPI_VAPID_SUBJECT=mailto:contact@pnpi-gabon.ga
NEXT_PUBLIC_BACKEND_URL=https://pnpi.industrie.gouv.ga
ANTHROPIC_API_KEY=<facultatif, pour le chat assistant>
```

---

## 4. Activer HTTPS

```bash
# Sur le serveur
apt install -y certbot python3-certbot-nginx
certbot --nginx -d pnpi.industrie.gouv.ga
# Renouvellement automatique (déjà installé via cron par certbot)
```

---

## 5. Premier déploiement

```bash
# Sur le serveur, en utilisateur pnpi
cd /opt/pnpi
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
docker compose -f docker-compose.prod.yml exec backend python scripts/seed_pnpi.py  # données démo facultatives
```

Vérifier :
- `curl https://pnpi.industrie.gouv.ga/health` → `{"status": "ok"}`
- Connexion sur l'interface avec le compte `admin` initial.

---

## 6. Vérifier que la CD est armée

Une fois les secrets configurés, n'importe quel push sur `main` doit :
1. Faire passer le job `preflight` à `armed=true`.
2. Attendre que la CI complète soit verte (`ci-check`).
3. Construire et pousser les images Docker sur GHCR (`build-and-push`).
4. Se connecter en SSH sur le serveur et faire un `docker compose pull && up -d`.
5. Lancer un `alembic upgrade head` pour les migrations.
6. Vérifier le `/health` final.

Pour un déploiement manuel (rollback, urgence) :
- Onglet `Actions` → `PNPI CD` → `Run workflow` → choisir la branche.

---

## 7. Stratégie zero downtime (option avancée)

Le workflow actuel fait un rolling restart standard. Pour un vrai zero downtime, deux pistes :

### Blue-green via Docker Compose
Maintenir deux stacks (`pnpi-blue`, `pnpi-green`) sur le même serveur, derrière nginx. Le déploiement met à jour la stack inactive, attend `/health`, puis bascule nginx.

### Migration vers Kubernetes
Pour 50+ utilisateurs simultanés, envisager un cluster K3s ou GKE managé. La PNPI est conteneurisée donc compatible sans refactor.

---

## 8. Checklist pré-production

- [ ] Serveur provisionné et durci (firewall, fail2ban, mises à jour automatiques).
- [ ] HTTPS valide et auto-renouvelé.
- [ ] Tous les secrets GitHub ajoutés.
- [ ] Sauvegarde testée sur staging (restauration validée).
- [ ] Cron jobs visibles dans GitHub Actions (`PNPI Cron`, `PNPI Backup`).
- [ ] Audit pentest externe réalisé (cf reco 9.4).
- [ ] DNS configuré + propagation vérifiée.
- [ ] Mot de passe `admin` initial changé après le premier login.
- [ ] Plan de continuité d'activité documenté (qui restaure, comment, en combien de temps).

---

## 9. Désactiver temporairement la CD

Si vous devez geler les déploiements (gel de fin d'année, pentest en cours...) sans toucher au code :
- Onglet `Actions` → `PNPI CD` → `... ` → `Disable workflow`.
- Réactiver de la même manière quand la fenêtre se rouvre.

Aucune modification de code nécessaire.

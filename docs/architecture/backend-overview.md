# PNPI · Architecture backend

**Version** : 1.0 (lot 79.4)
**Periode** : avril 2026
**Audience** : developpeurs backend, architectes, equipe SecOps,
auditeurs ministeriels.

> Ce document est la **carte du territoire backend** de la Plateforme
> Nationale de Pilotage Industriel (PNPI). Il couvre l'organisation
> du code, le modele de donnees, la pile applicative et les patterns
> defensifs a respecter pour intervenir sans regression.

---

## 1. Vue d'ensemble

### 1.1 Stack et runtime

| Composant      | Choix                              | Version   |
|----------------|------------------------------------|-----------|
| Langage        | Python                             | 3.12      |
| Framework HTTP | FastAPI (ASGI)                     | >=0.115   |
| ORM            | SQLAlchemy 2.x                     | >=2.0.36  |
| Migrations     | Alembic                            | >=1.14    |
| Base SQL       | PostgreSQL + PostGIS               | 16 / 3.4  |
| Cache          | Redis (fallback in-memory)         | 5.x       |
| Auth tokens    | python-jose (JWT HS256)            | 3.3       |
| Hash mdp       | passlib + bcrypt                   | 1.7 / 4.0 |
| Chiffrement    | cryptography (Fernet AES-CBC+HMAC) | >=43      |
| Rate limit     | redis (sliding window) + memory    | -         |
| Observabilite  | logging JSON + Prometheus metrics  | -         |

### 1.2 Topologie

```
+------------+        +-------------------+       +-------------+
|  Frontend  |  --->  |  Next.js proxy    |  ---> |  FastAPI    |
| (Next.js)  |        |  (catch-all API)  |       |  ~557 routes|
+------------+        +-------------------+       +------+------+
                                                         |
                                  +----------------------+----------------------+
                                  |                      |                      |
                            +-----v------+        +------v-----+         +------v-----+
                            | PostgreSQL |        |   Redis    |         |   MinIO    |
                            |  + PostGIS |        |   cache    |         |  documents |
                            +------------+        +------------+         +------------+
```

L'app monte avec **environ 557 routes** declarees au lancement.

### 1.3 Middleware stack (ordre d'execution)

```
GZip
 -> CSRF (origin validation)
 -> Timeout (30s)
 -> RequestSizeLimit (10/50 MB)
 -> Metrics (Prometheus)
 -> Correlation (X-Request-ID)
 -> CORS
 -> RateLimiter (par IP/endpoint)
 -> SecurityHeaders (CSP, HSTS, etc.)
```

L'ordre n'est pas anodin : GZip en premier pour decompresser, CSRF avant
le timeout pour rejeter rapidement les requetes hostiles, etc.

---

## 2. Organisation du code

```
backend/app/
  main.py                 # FastAPI app, lifespan, middleware stack,
                          # routes legacy, seeds, boucle SLA en background
  api_v1.py               # Router /api/v1/* (versioning)
  config.py               # Settings (env vars PNPI_*) + validation
  database.py             # SQLAlchemy engine, pool, retry, helpers UTC
  core/                   # 30+ modules transverses (auth, audit, cache,
                          # rate limiter, csrf, sanitize, encryption, ...)
  models/                 # ORM (base.py + core.py + pnpi.py + pilotage.py)
  schemas/                # Pydantic (entree/sortie API + exemples OpenAPI)
  routers/                # 40 modules : un par domaine fonctionnel
  alembic/                # 38 migrations (apres lot 79)
backend/scripts/          # CLI : seed, backup S3, encrypt NIF, smoke tests
backend/tests/            # Pytest (~20 fichiers)
```

---

## 3. Modele de donnees

### 3.1 Tables principales

**Domaine PNPI metier** (`models/pnpi.py`) :

- `operateurs_industriels` : entites economiques. PK `id`, `nif_gabon`
  (clair) + `nif_gabon_encrypted` (Fernet at-rest, lot 79.2).
  Soft delete via `deleted_at`.
- `agrements_ati` : Agrements Techniques Industriels. PK `id`, FK
  `operateur_id`, statut/etape (etat metier), `instructeur_username`,
  `created_by` (operateur proprietaire), SLA en jours.
- `ati_transitions` : audit metier des changements d'etat ATI.
- `ati_appeals` : recours post-rejet (lot 77).
- `ati_comments`, `ati_tags`, `ati_checklist_items`, `ati_reminders` :
  outillage instructeur autour d'un dossier.
- `inspections_conformite` + `inspection_photos` : inspections terrain.
- `documents_dossier` + `document_versions` : pieces ATI.
- `messages`, `announcements`, `polls`, `conventions`, `delegations`,
  `instructor_ratings`, `operator_feedback` : collaboration interne.

**Domaine technique / pilotage** (`models/core.py`, `models/pilotage.py`) :

- `units`, `declarations` : declarations production legacy
  (compatibilite avec la v1 du systeme).
- `trace_batches` : tracabilite avec QR.
- `field_reports` : rapports terrain (mobile inspecteur).
- `user_accounts` : comptes utilisateurs (`username` PK, hash bcrypt,
  TOTP, backup codes, province, lock-out automatique apres 5 echecs).
- `notifications`, `notification_preferences` : push + e-mail.
- `audit_events` : trail securite (actor / action / target / details).
- `login_history` : journal des connexions.
- `refresh_tokens` : rotation et revocation des refresh JWT.
- `push_subscriptions` : Web Push API (lot 76).
- `project_dossiers` : dossiers strategiques (vue ministre).

### 3.2 Contraintes et patterns

- Toutes les `datetime` sont `DateTime(timezone=True)`.
  En SQLite (dev), elles sont stockees naive ; le helper `as_utc()` de
  `app.database` doit etre utilise avant toute comparaison a `now_utc()`.
  C'est un **pattern obligatoire** documente dans `CLAUDE.md`.
- Les FK pointent vers `user_accounts.username` (clef texte) et non un id
  numerique. Choix historique pour faciliter l'audit lisible humain.
- Soft delete : pour l'instant uniquement sur `operateurs_industriels`.
- Index : voir `docs/architecture/backend-perf-audit.md` pour la
  cartographie complete et la migration 38.

### 3.3 Migrations

- 38 migrations sequentielles, format `YYYYMMDD_NN_description.py`.
- L'`alembic_version` est gere automatiquement.
- Les migrations recentes sont :
  - 32 : composite indexes
  - 33 : soft delete operateurs
  - 34 : geo sur photos inspection
  - 35 : push subscriptions
  - 36 : recours ATI
  - **37** : `nif_gabon_encrypted` (lot 79.2)
  - **38** : index perf manquants (lot 79.3)

---

## 4. Modules `core/` (transverses)

| Module                        | Role                                                                  |
|-------------------------------|-----------------------------------------------------------------------|
| `auth.py`                     | JWT (access + refresh), bcrypt, lock-out, fallback fake_users_db dev |
| `audit.py`                    | `write_audit_event()` (toujours commit avec la session courante)     |
| `cache.py`                    | Redis async + fallback dictionnaire in-memory si Redis down          |
| `rate_limiter.py`             | Sliding window (key par IP+endpoint), backed Redis                   |
| `correlation_middleware.py`   | X-Request-ID injecte dans les logs JSON                              |
| `csrf.py`                     | Validation Origin/Referer pour les mutations                         |
| `sanitize.py`                 | XSS scrub + type Pydantic `SanitizedStr`                             |
| `timeout_middleware.py`       | Coupe les requetes >30s avec 504                                     |
| `request_size_limit.py`       | 10 MB body / 50 MB upload                                            |
| `upload_validation.py`        | Mime + magic number + taille                                         |
| `encryption.py` (lot 79)      | Fernet at-rest pour champs sensibles (NIF). MultiFernet rotation.    |
| `webhooks.py`                 | Sortie outbound avec retry exponentiel                              |
| `feature_flags.py`            | Toggles via `PNPI_FF_*` (ex: PNPI_FF_GRAPHQL_API)                    |
| `health_score.py`             | Score sante global 0-100 (uptime, latence, queue, DB)                |
| `error_handlers.py`           | Pydantic 422 -> reponse francisee, 500 capture stack tracee          |
| `logging_config.py`           | Structured JSON logs (production) ou texte (dev)                     |
| `metrics.py`                  | Prometheus middleware + scraping `/metrics`                          |
| `pagination.py`               | `PaginationParams`, `PaginatedResponse` reutilisables                |
| `tenant.py`                   | Filtrage par province (multi-tenant CEMAC future-proof)             |
| `signature.py`                | Signature electronique inspections + certificats                     |
| `scoring.py`                  | Score de conformite operateur                                        |
| `risk_assessment.py`          | Risk profile ATI (delai, criticite secteur, historique)              |
| `decision_engine.py`          | Aide a la decision automatisee (lot 76)                              |

---

## 5. Routers (40 modules)

Regroupes par domaine :

### 5.1 Authentification & comptes
`auth.py` (login/refresh/logout, captcha, change-pwd, login history,
preferences notifications, badges, daily digest), `totp.py` (2FA TOTP +
backup codes), `api_keys.py` (cles longues duree pour integrations).

### 5.2 ATI / dossiers
`ati.py` (CRUD + workflow + helper `check_ati_access`), `documents.py`
(upload/download dossier), `appeals.py` (recours, lot 77),
`conventions.py`, `delegations.py`, `checklists.py`,
`doc_versions.py`, `templates.py`.

### 5.3 Operateurs et pilotage
`operateurs.py` (CRUD, scores, timeline, soft delete, import CSV),
`inspections.py` (rapports terrain + photos geo), `pnpi_dashboard.py`
(KPIs ministre/directeur), `pilotage.py` (vue agreges legacy).

### 5.4 Cartographie & exports
`geo.py` (geocodage Gabon), `heatmap.py` (densite ATI par province),
`exports.py` (CSV/XLSX/PDF), `reports.py` (PDF rapports executifs),
`scheduled_reports.py` (cron des rapports).

### 5.5 Search & discovery
`search.py` (full-text local), `open_data.py` (stats publiques k-anonymity).

### 5.6 Communication
`messages.py` (inbox interne), `notifications.py` (web + push),
`announcements.py`, `feedback.py`, `polls.py`, `chat.py` (assistant LLM).

### 5.7 Administration
`admin.py` (impersonate, backups, raci, simulateur), `health.py`
(liveness/readiness + DB/Redis), `integration.py` & `integration_health.py`
(webhooks externes, surveillance).

### 5.8 Realtime & autres
`ws.py` (WebSocket pour notifications live), `workflows.py` (moteur),
`reminders.py`, `notes.py`, `calendar.py`, `units.py`, `push.py`
(Web Push lot 76), `graphql_api.py` (feature flag, optionnel).

---

## 6. Conventions et patterns defensifs

### 6.1 RBAC

Six roles (`Role` StrEnum dans `core/auth.py`) :
`admin | ministre | directeur | instructeur | inspecteur | operateur`.

- Decorateur unique : `Depends(require_roles(...))`.
- Helper centralise `check_ati_access(ati, current_user)` dans
  `routers/ati.py` : tout endpoint `/pnpi/ati/{id}/*` ouvert a operateur
  doit l'appeler — sinon IDOR. Audit RBAC fait : 108 combos, 0 fuite.
- Operateur voit l'annuaire (raison sociale, secteur, province) sans
  les NIF/effectifs des concurrents (`routers/operateurs.py`).

### 6.2 Datetime UTC

```python
from app.database import as_utc, now_utc

# OK
if as_utc(ati.date_decision) >= now_utc() - timedelta(days=1):
    ...

# KO - crash en SQLite (naive vs aware)
if ati.date_decision >= now_utc():
    ...
```

### 6.3 Roles : ne jamais comparer en direct

```python
# OK
roles = {r.value if hasattr(r, "value") else str(r) for r in current_user.roles}
if "operateur" in roles: ...

# KO - mix Enum vs str selon source (DB / fake_users_db)
if Role.operateur in current_user.roles: ...
```

Helper local `_user_role_values(user)` dans `routers/ati.py` est la
reference.

### 6.4 Audit trail systematique

Toute mutation sensible doit appeler `write_audit_event(db, actor=...,
action=..., target=..., details=...)` dans la meme transaction que la
mutation, **avant le commit**.

### 6.5 Chiffrement at-rest (lot 79.2)

Champ NIF : utiliser `set_nif()` et `nif` (property) sur
`OperateurIndustrielORM`. La colonne `nif_gabon` reste populee en clair
durant la phase de transition. Une migration future supprimera la
colonne en clair une fois 100% des lignes chiffrees (script
`scripts/encrypt_existing_nifs.py`).

---

## 7. Tests et CI

### 7.1 Backend tests

- `pytest` ~20 fichiers, ~93 tests environ.
- `tests/conftest.py` (lot 79.1) :
  - force `PNPI_DATABASE_URL` vers `pnpi-test.db` AVANT import de `app.*`.
  - normalise les mots de passe `*-dev-password` via env vars.
  - reseed `user_accounts` au demarrage de la session pour aligner les
    hashes bcrypt avec les attendus des tests.
- Les tests qui cassent localement (bug DB state pourri) sont stabilises
  par cette fixture session-scoped.

### 7.2 CI

- GitHub Actions : `ci.yml` (lint + test + build) + `cd.yml` (deploy).
- Ruff (`backend/`), Prettier (`frontend/`), pip-audit, npm audit.
- Tests en CI passent toujours (DB fraiche par run), tests locaux
  necessitent la nouvelle conftest pour la meme garantie.

---

## 8. Points de vigilance

| Zone                            | Risque                                          | Mitigation                                                 |
|---------------------------------|-------------------------------------------------|------------------------------------------------------------|
| `routers/ati.py`                | IDOR si on ajoute un endpoint sans helper       | Toujours appeler `check_ati_access(ati, current_user)`     |
| `routers/auth.py`               | Lockout automatique apres 5 echecs              | Reset via admin ou attendre 15 min                         |
| `core/cache.py`                 | Fallback in-memory non partage entre workers    | En prod, exiger Redis (`PNPI_REDIS_URL` defini)            |
| `database.py` engine module     | `engine` cree au load -> bind sur 1 seule URL   | Tests : surcharger `PNPI_DATABASE_URL` avant import        |
| `main.py:seed_user_accounts`    | Insert si vide -> hash fige a la 1ere creation  | Ne jamais s'appuyer sur seed pour aligner mdp en test      |
| `core/encryption.py`            | Cle perdue = donnees illisibles                 | Backup chiffre de la cle dans le secret manager + KMS      |
| `pnpi.py:OperateurIndustrielORM`| Double colonne NIF transitoire                  | Toujours utiliser `set_nif()` jamais `nif_gabon=` direct  |
| `routers/admin.py`              | Impersonate puissant                            | Audit chaque appel ; banner frontend obligatoire           |
| `core/rate_limiter.py`          | Memory backend = bypass entre process          | En prod, Redis obligatoire                                 |
| `models/pnpi.py:datetime`       | Comparaison naive/aware en SQLite               | `as_utc()` systematique avant compare                      |

### 8.1 Mots-cles `grep` utiles

```bash
# Tous les endpoints qui mutent un ATI doivent passer par check_ati_access
rg "check_ati_access" backend/app/routers/

# Tous les endpoints sensibles doivent emettre un audit
rg "write_audit_event" backend/app/routers/

# Comparaisons de datetime (pour traquer les oublis as_utc)
rg "now_utc\(\)\s*[-<>=]" backend/app/

# Toute mutation sur les operateurs doit utiliser set_nif (lot 79.2+)
rg "nif_gabon\s*=" backend/app/

# Le helper require_roles doit couvrir chaque endpoint
rg "@router\.(get|post|put|patch|delete)" backend/app/routers/ -A2 | rg -v "Depends\("
```

---

## 9. Bibliotheques externes critiques

| Lib                | Usage                                       | Risque si remplacee                       |
|--------------------|---------------------------------------------|-------------------------------------------|
| `python-jose`      | JWT encode/decode                           | Compat HS256 + JTI                        |
| `passlib[bcrypt]`  | Hash mots de passe                          | Plages de cost factors a aligner          |
| `cryptography`     | Fernet field encryption + signatures        | Key derivation et format incompatible     |
| `sqlalchemy`       | ORM 2.x (mapped_column declarative)         | Migration vers 2.x deja faite             |
| `alembic`          | Migrations                                  | Ne pas modifier les revisions deja jouees |
| `redis`            | Cache + rate limit                          | Fallback in-memory degrade prod           |
| `httpx`            | Webhooks sortants async                     | Timeouts a verifier                       |
| `pyotp`            | TOTP / 2FA                                  | RFC 6238 strict                           |
| `pywebpush`        | Web Push lot 76                             | VAPID keys a rotater                      |
| `boto3`            | Backups S3 / MinIO                          | Compat S3 v4 sigs                         |
| `reportlab` + `qrcode` | PDF + QR ATI                            | Police Inter doit etre embarquee          |
| `GeoAlchemy2`      | PostGIS geographies                         | Requiert extension postgis activee        |

Si vous touchez l'une de ces libs, declencher un mini smoke-test :

```bash
bash scripts/pre-deploy-check.sh
```

---

## 10. Ressources et liens internes

- Plan de montee de version : `docs/implementation_roadmap.md`
- Recovery / PRA-PCA : `docs/pra_pca.md`
- Audit perf detaille : `docs/architecture/backend-perf-audit.md`
- ADRs : `docs/architecture/adr-001-...`, `adr-002-...`, etc.
- Conventions code : `CLAUDE.md` (racine repo)
- Skills review : `docs/skills-guide.html`

---

**Fin du document.** Pour toute correction, ouvrir une PR `docs:` avec
le numero du lot en cours (ex. `docs: lot 80 — corrige section X`).

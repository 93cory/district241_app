# PNPI — Plateforme Nationale de Pilotage Industriel

## Projet

Application web pour le Ministere de l'Industrie du Gabon. Gestion des Agrements Techniques Industriels (ATI), inspections de conformite, pilotage ministeriel et tracabilite.

## Stack technique

- **Backend** : Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL/PostGIS, Redis
- **Frontend** : Next.js 14, React 18, TypeScript, SWR, Recharts, Leaflet
- **Mobile** : Flutter (app native, FR + EN)
- **Infra** : Docker Compose, Nginx, Redis, Prometheus, Grafana, MinIO (S3)
- **CI/CD** : GitHub Actions (ci.yml + cd.yml), Ruff, Prettier, pip-audit, npm audit

## Structure

```
backend/
  app/
    main.py              # FastAPI app, middleware stack, legacy routes
    api_v1.py            # API v1 router (/api/v1/*)
    config.py            # Settings (env vars PNPI_*) + validation
    database.py          # SQLAlchemy engine, pool, retry
    core/
      auth.py            # JWT, roles, password policies
      audit.py           # Audit trail
      cache.py           # Redis cache + in-memory fallback
      rate_limiter.py    # Redis rate limiter (sliding window)
      logging_config.py  # JSON structured logging
      correlation_middleware.py  # Request correlation IDs
      pagination.py      # PaginationParams + PaginatedResponse
      error_handlers.py  # Global exception handlers
      feature_flags.py   # Env-based feature flags (PNPI_FF_*)
      csrf.py            # CSRF origin validation
      sanitize.py        # XSS sanitization + SanitizedStr type
      timeout_middleware.py     # Request timeout (30s default)
      request_size_limit.py    # Body size limit (10/50 MB)
      upload_validation.py     # File type/size validation
      webhooks.py        # Outbound webhooks with retry
      api_analytics.py   # In-memory API usage analytics
      health_score.py    # Global health score (0-100)
    models/              # ORM (core.py = base, pnpi.py = metier)
    routers/             # 37 endpoint modules
    schemas/             # Pydantic schemas with OpenAPI examples
  alembic/               # 34 migrations
  tests/                 # 18 test files
  scripts/               # cron_tasks.py, seed_pnpi.py, backup_s3.py
frontend/
  src/
    app/
      components/        # 28+ reusable components (MegaNav, ImpersonateBanner, ...)
      api/[...path]/     # Catch-all proxy Next.js -> FastAPI (cf section Proxy)
      pnpi/              # PNPI dashboard pages + guichet operateur
      admin/             # Admin panel (backups, simulateur, raci, ...)
    hooks/               # 9 custom hooks
    lib/                 # API helpers, auth, i18n, role-routing
  tests/e2e/             # 5 Playwright suites
scripts/
  pre-deploy-check.sh    # Pre-deployment verification
```

## Middleware stack (ordre d'execution)

GZip → CSRF → Timeout → RequestSizeLimit → Metrics → Correlation → CORS → Rate Limit + Security Headers

## Commandes

```bash
# Backend
cd backend && pip install -r requirements.txt
python -m pytest tests -q          # Tests (43+ tests)
ruff check app/                    # Lint
ruff format app/                   # Format

# Frontend
cd frontend && npm ci
npm run dev                        # Dev server
npm run build                      # Build prod
npm run lint                       # ESLint
npm run format:check               # Prettier check
npm run test:e2e                   # Playwright E2E

# Docker
docker compose up -d               # Dev (Postgres + Redis + Backend + Frontend)
docker compose -f docker-compose.prod.yml up -d  # Prod

# Pre-deploy
bash scripts/pre-deploy-check.sh   # Lint + tests + build + docker

# Pre-commit hook (a installer une seule fois apres clone)
cd backend && pip install pre-commit && cd .. && pre-commit install
# Lance ruff check + ruff format sur les fichiers backend/app modifies
# avant chaque commit. Evite les echecs CI sur lint / format.
```

## Variables d'environnement

### Requises
- `PNPI_SECRET_KEY` : JWT secret
- `PNPI_DATABASE_URL` : PostgreSQL connection string

### Optionnelles
- `PNPI_REDIS_URL` : Redis URL (fallback in-memory)
- `PNPI_ENV` : development | production
- `PNPI_LOG_LEVEL` : INFO | DEBUG | WARNING
- `PNPI_LOG_FORMAT` : json | text
- `PNPI_CORS_ALLOW_ORIGINS` : Origines CORS (default: http://localhost:3000)
- `PNPI_REQUEST_TIMEOUT_SECONDS` : Timeout requetes (default: 30)
- `PNPI_MAX_UPLOAD_MB` : Taille max documents (default: 10)
- `PNPI_DB_POOL_SIZE` : Pool size (default: 10)
- `PNPI_WEBHOOK_URL` : URL webhook externe
- `PNPI_FF_*` : Feature flags (ex: PNPI_FF_GRAPHQL_API=0)
- `PNPI_ACCESS_TOKEN_EXPIRE_MINUTES` : TTL JWT (default 480 = 8h, match cookie)
- `PNPI_UPLOAD_DIR` : Dossier stockage documents ATI (default `uploads/ati`)
- `NEXT_PUBLIC_BACKEND_URL` : URL backend pour le proxy Next.js (default `http://localhost:8000`)

## Frontend — Composants reutilisables

`Breadcrumbs`, `BriefingAudio`, `ConfirmDialog`, `DataTable`, `EmptyState`,
`ErrorBoundary`, `FilterBar`, `ImpersonateBanner`, `KPICard`, `MegaNav`,
`OfflineBanner`, `Pagination`, `ProgressBar`, `RepubliqueBand`, `SignaturePad`,
`SkeletonLoader`, `StatusBadge`, `Timeline`, `Tooltip`, `VoiceInput`

## Frontend — Hooks custom

`useCopyToClipboard`, `useDebounce`, `useForm`, `useIntersectionObserver`,
`useKeyboardShortcut`, `useLocalStorage`, `useMediaQuery`, `useOnlineStatus`,
`usePagination`

## Proxy Next.js → FastAPI

Le frontend utilise un **catch-all proxy** `frontend/src/app/api/[...path]/route.ts`
qui forward tout `/api/*` vers le backend FastAPI en injectant le Bearer token
depuis le cookie httpOnly `pnpi_access_token`.

- Par defaut : utiliser `fetch("/api/...")` depuis un composant client ou
  `backendRequest("/...")` depuis un Server Component.
- Routes specifiques `/api/auth/*`, `/api/admin/impersonate/*` : priorite sur
  le catch-all, gerent les cookies eux-memes.
- **Ne jamais** appeler `http://localhost:8000/*` en dur cote client : casse
  l'auth et la prod.

## Securite & RBAC — operateur bout-en-bout

**Helper central** `check_ati_access(ati, current_user)` dans
`backend/app/routers/ati.py` — a appeler sur **tous** les endpoints
`/pnpi/ati/{id}/*` et `/pnpi/documents/*` accessibles a l'operateur.

```python
from .ati import check_ati_access  # importable depuis documents.py, etc.

ati = db.get(AgrementTechniqueIndustrielORM, ati_id)
if not ati:
    raise HTTPException(404, "ATI introuvable.")
check_ati_access(ati, current_user)  # 403 si operateur non proprietaire
```

- Roles privilegies (`admin|ministre|directeur|instructeur|inspecteur`) :
  pass-through
- Operateur : acces si `ati.created_by == current_user.username`
- Tout nouvel endpoint `/pnpi/ati/{id}/*` ouvert a `Role.operateur` **doit**
  appeler le helper — sinon IDOR

**Endpoints opera teur** : `GET/POST /pnpi/ati`, `GET/POST /pnpi/ati/{id}`,
`/historique`, `/documents`, `/comments`, `/tags`, `/risk`, `/field-history`,
`/renew`, `/resubmit`, `/product-qr`. Tous protegent via le helper.

**Annuaire operateurs** : liste visible par opérateur mais `nif_gabon` et
`effectif_declare` masques. Detail accessible uniquement pour les operateurs
avec lesquels l'utilisateur a deja interagi (cf `operateurs.py:get_operateur`).

## Patterns defensifs obligatoires

- **Datetime SQLite** : toujours wrapper les datetimes issues de l'ORM avec
  `as_utc()` avant comparaison a `now_utc()` (SQLite stocke naive, compare
  aware = crash). Exemple : `if as_utc(ati.date_decision) >= yesterday`.
- **Array.isArray defensif cote frontend** : `fetch` renvoie parfois un objet
  d'erreur `{detail: ...}` au lieu du tableau attendu. Toujours ecrire :
  ```ts
  .then(data => Array.isArray(data) ? setItems(data) : setItems([]))
  ```
  Jamais `data.items || data || []` : si data est un objet erreur, il passe
  le fallback et crash au `.filter()` suivant.
- **Normalisation roles** : helper `_user_role_values(user)` dans `ati.py`,
  pas d'acces direct a `current_user.roles` (mix enum/string).

## Conventions

- Commits : `feat:`, `fix:`, `docs:` suivi de `lot N —` pour les lots
- Backend : async endpoints, SQLAlchemy ORM, Pydantic schemas
- Frontend : Server Components par defaut, "use client" uniquement si necessaire
- Tests backend : pytest avec conftest.py
- Tests frontend : Playwright E2E
- Migrations : `YYYYMMDD_NN_description.py`
- Langue de l'UI : francais
- Soft delete : `deleted_at` sur operateurs (pattern extensible)
- API versioning : `/api/v1/*` (routes legacy maintenues)

## Skills Claude Code — cf [docs/skills-guide.html](docs/skills-guide.html)

12 skills installes. A utiliser par reflexe :
- **Avant push** : `/security-review` si `auth.py|webhooks.py|sanitize.py|
  upload_validation.py|routers/*.py` modifies
- **Avant commit** : `/simplify` + `/review`
- **Bug sur lib recente** (Alembic, SQLAlchemy 2.x, Next.js 14) :
  mentionner la lib, `context7-mcp` se declenche

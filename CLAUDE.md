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
    routers/             # 37+ endpoint modules
    schemas/             # Pydantic schemas with OpenAPI examples
  alembic/               # 33 migrations
  tests/                 # 12 test files, 43+ tests
  scripts/               # cron_tasks.py, seed_db.py, backup_s3.py
frontend/
  src/
    app/
      components/        # 20+ reusable components
      pnpi/              # PNPI dashboard pages
    hooks/               # 9 custom hooks
    lib/                 # API helpers, auth, i18n
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

## Frontend — Composants reutilisables

`Breadcrumbs`, `ConfirmDialog`, `DataTable`, `EmptyState`, `ErrorBoundary`,
`FilterBar`, `KPICard`, `OfflineBanner`, `Pagination`, `ProgressBar`,
`SkeletonLoader`, `StatusBadge`, `Timeline`, `Tooltip`

## Frontend — Hooks custom

`useCopyToClipboard`, `useDebounce`, `useForm`, `useIntersectionObserver`,
`useKeyboardShortcut`, `useLocalStorage`, `useMediaQuery`, `useOnlineStatus`,
`usePagination`

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

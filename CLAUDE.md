# PNPI — Plateforme Nationale de Pilotage Industriel

## Projet

Application web pour le Ministere de l'Industrie du Gabon. Gestion des Agrements Techniques Industriels (ATI), inspections de conformite, pilotage ministeriel et tracabilite.

## Stack technique

- **Backend** : Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL/PostGIS
- **Frontend** : Next.js 14, React 18, TypeScript, SWR, Recharts, Leaflet
- **Mobile** : Flutter (app native)
- **Infra** : Docker Compose, Nginx, Redis, Prometheus, Grafana, MinIO (S3)
- **CI/CD** : GitHub Actions (ci.yml + cd.yml)

## Structure

```
backend/
  app/
    main.py           # FastAPI app, middleware, legacy routes
    config.py          # Settings (env vars PNPI_*)
    database.py        # SQLAlchemy engine, session
    core/              # Auth, audit, cache, logging, pagination, rate limiting
    models/            # ORM (core.py = base, pnpi.py = metier)
    routers/           # Endpoints modulaires (35+ routers)
    schemas/           # Pydantic schemas
  alembic/             # Migrations DB
  tests/               # pytest
frontend/
  src/
    app/               # Next.js pages et composants
    hooks/             # Custom hooks (usePagination, etc.)
    lib/               # API helpers, auth, i18n
  tests/e2e/           # Playwright
```

## Commandes

```bash
# Backend
cd backend && pip install -r requirements.txt
python -m pytest tests -q          # Tests
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
```

## Variables d'environnement (PNPI_*)

- `PNPI_SECRET_KEY` : JWT secret (requis)
- `PNPI_DATABASE_URL` : PostgreSQL connection string
- `PNPI_REDIS_URL` : Redis URL (optionnel, fallback in-memory)
- `PNPI_ENV` : development | production
- `PNPI_LOG_LEVEL` : INFO | DEBUG | WARNING
- `PNPI_LOG_FORMAT` : json | text
- `PNPI_CORS_ALLOW_ORIGINS` : Origines CORS (default: http://localhost:3000)

## Conventions

- Commits : `feat:`, `fix:`, `docs:` suivi de `lot N —` pour les lots de livraison
- Backend : async endpoints, SQLAlchemy ORM, Pydantic schemas
- Frontend : Server Components par defaut, "use client" uniquement si necessaire
- Tests backend : pytest avec conftest.py (fixtures DB en memoire)
- Tests frontend : Playwright E2E
- Migrations : fichiers nommes `YYYYMMDD_NN_description.py`
- Langue de l'UI : francais

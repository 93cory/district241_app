#!/usr/bin/env bash
# Pre-deployment health check script
# Run before deploying to verify the codebase is ready
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "=== PNPI Pre-Deploy Check ==="
echo ""

# 1. Backend lint
echo -n "[1/6] Backend lint (Ruff)... "
if cd backend && python -m ruff check app/ --quiet 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..

# 2. Backend tests
echo -n "[2/6] Backend tests (pytest)... "
if cd backend && python -m pytest tests -q --tb=no 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..

# 3. Frontend lint
echo -n "[3/6] Frontend lint (ESLint)... "
if cd frontend && npm run lint --silent 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..

# 4. Frontend build
echo -n "[4/6] Frontend build... "
if cd frontend && npm run build --silent 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    ERRORS=$((ERRORS + 1))
fi
cd ..

# 5. Docker build
echo -n "[5/6] Docker images build... "
if docker build -f backend/Dockerfile -t pnpi-backend:pre-check . -q 2>/dev/null && \
   docker build -f frontend/Dockerfile -t pnpi-frontend:pre-check . -q 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}SKIP (Docker not available)${NC}"
fi

# 6. Migration check
echo -n "[6/6] Alembic migration chain... "
if cd backend && python -c "
from alembic.config import Config
from alembic.script import ScriptDirectory
cfg = Config('alembic.ini')
sd = ScriptDirectory.from_config(cfg)
revs = list(sd.walk_revisions())
print(f'{len(revs)} migrations OK')
" 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}SKIP${NC}"
fi
cd ..

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}=== $ERRORS check(s) failed. Fix before deploying. ===${NC}"
    exit 1
else
    echo -e "${GREEN}=== All checks passed. Ready to deploy! ===${NC}"
    exit 0
fi

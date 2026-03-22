#!/bin/bash
# PNPI — Script de demo one-click
# Usage: bash scripts/demo.sh

set -e

echo "=========================================="
echo "  PNPI — Demarrage de la demo"
echo "  Plateforme Nationale de la Politique"
echo "  Industrielle du Gabon"
echo "=========================================="
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker requis. Installez Docker Desktop."; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose requis."; exit 1; }

echo "[1/4] Demarrage des containers..."
docker compose up -d --build

echo "[2/4] Attente de PostgreSQL..."
sleep 5

echo "[3/4] Execution des migrations et seed..."
docker compose exec backend alembic upgrade head 2>/dev/null || echo "  Migrations deja a jour."
docker compose exec backend python scripts/seed_pnpi.py 2>/dev/null || echo "  Seed deja execute."

echo "[4/4] Verification..."
echo ""

# Health check
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
  echo "✅ Backend:  http://localhost:8000"
  echo "   API Docs: http://localhost:8000/docs"
else
  echo "⏳ Backend en cours de demarrage..."
fi

if curl -sf http://localhost:3000 > /dev/null 2>&1; then
  echo "✅ Frontend: http://localhost:3000"
else
  echo "⏳ Frontend en cours de build..."
fi

echo ""
echo "=========================================="
echo "  Comptes de demo :"
echo "  admin     / Demo1234!@#$"
echo "  ministre  / Demo1234!@#$"
echo "  directeur / Demo1234!@#$"
echo "  instructeur / Demo1234!@#$"
echo "  inspecteur  / Demo1234!@#$"
echo "  operateur   / Demo1234!@#$"
echo "=========================================="
echo ""
echo "  Pages publiques :"
echo "  Investisseurs : http://localhost:3000/investors"
echo "  Open Data     : http://localhost:3000/open-data"
echo "  Contact       : http://localhost:3000/contact"
echo "  Statut        : http://localhost:3000/status"
echo "  A propos      : http://localhost:3000/about"
echo "=========================================="
echo ""
echo "Pour arreter : docker compose down"
echo ""

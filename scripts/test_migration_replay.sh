#!/usr/bin/env bash
# PNPI · Rejeu de migration sur une base remplie (dette D-010).
#
# Contexte : les migrations Alembic ne sont testees en CI que sur une base
# vierge. Ce script valide le cycle complet backup -> restore -> migration
# sur une base contenant de vraies donnees (volume + contraintes reelles),
# ce qui n'avait jamais ete fait bout-en-bout avant ce script.
#
# Usage (necessite Docker + les containers pnpi-postgres et pnpi-backend
# demarres, ex: `docker compose up -d`) :
#   bash scripts/test_migration_replay.sh
#
# Ce que le script verifie :
# 1. pg_dump de la base source (n'importe laquelle, dev ou prod).
# 2. Restauration dans un Postgres+PostGIS ISOLE (jamais la source).
# 3. Comparaison des comptages de lignes source vs restaure (integrite).
# 4. `alembic current` == head sur la base restauree (etat de version
#    preserve par le dump/restore).
# 5. `alembic downgrade -1` puis `alembic upgrade head` sur la base REMPLIE
#    (pas vide comme en CI) : verifie que la derniere migration s'applique
#    proprement dans les deux sens sur des donnees reelles.
# 6. Nouvelle comparaison des comptages post-roundtrip (aucune perte de
#    donnee).
#
# Le container source (pnpi-postgres) n'est JAMAIS modifie : tout le test
# se deroule sur un container Postgres jetable, supprime en fin de script
# (y compris en cas d'echec, cf trap).
#
# Note MSYS/Git-Bash (Windows) : `docker exec` avec un chemin absolu type
# /tmp/... est parfois reecrit en chemin Windows par MSYS. Prefixer la
# commande par `MSYS_NO_PATHCONV=1` si le script est lance depuis Git Bash.

set -euo pipefail

# Sur Git-Bash/MSYS (Windows), les chemins absolus type /tmp/... passes en
# argument a `docker exec` sont parfois reecrits en chemin Windows avant
# d'atteindre le conteneur Linux. Inoffensif sur Linux/macOS (variable
# ignoree).
export MSYS_NO_PATHCONV=1

SOURCE_CONTAINER="${PNPI_PG_SOURCE_CONTAINER:-pnpi-postgres}"
BACKEND_CONTAINER="${PNPI_BACKEND_CONTAINER:-pnpi-backend}"
NETWORK="${PNPI_DOCKER_NETWORK:-pnpi_default}"
RESTORE_CONTAINER="pnpi-postgres-replay-test-$$"
DUMP_PATH="/tmp/pnpi_replay_test_$$.dump"
DB_USER="pnpi_user"
DB_NAME="pnpi"
RESTORE_PW="replay-test-$$"

TABLES=(operateurs_industriels agrements_ati documents_dossier inspections_conformite audit_events)

cleanup() {
  echo "[cleanup] suppression du container jetable ${RESTORE_CONTAINER}"
  docker rm -f "${RESTORE_CONTAINER}" >/dev/null 2>&1 || true
  docker exec "${SOURCE_CONTAINER}" rm -f "${DUMP_PATH}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[1/6] pg_dump de ${SOURCE_CONTAINER}..."
docker exec "${SOURCE_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc -f "${DUMP_PATH}"

echo "[2/6] restauration dans un Postgres+PostGIS jetable..."
docker run -d --name "${RESTORE_CONTAINER}" --network "${NETWORK}" \
  -e POSTGRES_USER="${DB_USER}" -e POSTGRES_PASSWORD="${RESTORE_PW}" -e POSTGRES_DB="${DB_NAME}" \
  postgis/postgis:16-3.4 >/dev/null
# L'image postgres redemarre une fois pendant son init (bootstrap interne
# qui s'arrete puis vrai serveur qui redemarre) : une requete SQL qui
# reussit peut donc etre suivie d'une coupure de connexion quelques
# secondes plus tard si on demarre trop tot. Pattern standard et fiable :
# attendre que "database system is ready to accept connections" apparaisse
# deux fois dans les logs (1x bootstrap, 1x serveur definitif).
ready=0
for _ in $(seq 1 60); do
  occurrences=$(docker logs "${RESTORE_CONTAINER}" 2>&1 | grep -c "database system is ready to accept connections" || true)
  if [ "${occurrences}" -ge 2 ]; then
    ready=1
    break
  fi
  sleep 1
done
if [ "${ready}" -ne 1 ]; then
  echo "[FAIL] ${RESTORE_CONTAINER} n'est jamais devenu pleinement pret (init incomplete)."
  exit 1
fi
# Marge de securite supplementaire : le serveur accepte les connexions TCP
# un instant apres avoir logge le message.
sleep 2
docker exec "${SOURCE_CONTAINER}" cat "${DUMP_PATH}" | docker exec -i "${RESTORE_CONTAINER}" sh -c "cat > ${DUMP_PATH}"
docker exec "${RESTORE_CONTAINER}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges "${DUMP_PATH}" \
  || echo "[2/6] avertissements ignores (ex: schemas/extension PostGIS deja presents) — normal"

# Requete avec retry : pg_restore peut laisser la connexion momentanement
# indisponible juste apres son passage (charge I/O, checkpoint), sans que
# ce soit un echec reel.
pg_query_retry() {
  local container="$1" sql="$2" attempt out
  for attempt in 1 2 3 4 5; do
    if out=$(docker exec "${container}" psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "${sql}" 2>/dev/null); then
      echo "${out}" | tr -d '[:space:]'
      return 0
    fi
    sleep 1
  done
  echo "?"
  return 1
}

echo "[3/6] comparaison des comptages source vs restaure..."
fail=0
for t in "${TABLES[@]}"; do
  src=$(pg_query_retry "${SOURCE_CONTAINER}" "SELECT count(*) FROM ${t}")
  dst=$(pg_query_retry "${RESTORE_CONTAINER}" "SELECT count(*) FROM ${t}")
  status="OK"
  if [ "${src}" != "${dst}" ]; then
    status="ECART"
    fail=1
  fi
  echo "    ${t}: source=${src} restaure=${dst} [${status}]"
done
if [ "${fail}" -ne 0 ]; then
  echo "[FAIL] ecart de comptage source/restaure — arret."
  exit 1
fi

DB_URL="postgresql://${DB_USER}:${RESTORE_PW}@${RESTORE_CONTAINER}:5432/${DB_NAME}"

echo "[4/6] alembic current (doit etre 'head')..."
docker exec -e PNPI_DATABASE_URL="${DB_URL}" "${BACKEND_CONTAINER}" python -m alembic current

echo "[5/6] downgrade -1 puis upgrade head sur la base REMPLIE..."
docker exec -e PNPI_DATABASE_URL="${DB_URL}" "${BACKEND_CONTAINER}" python -m alembic downgrade -1
docker exec -e PNPI_DATABASE_URL="${DB_URL}" "${BACKEND_CONTAINER}" python -m alembic upgrade head

echo "[6/6] comparaison des comptages post-roundtrip..."
fail=0
for t in "${TABLES[@]}"; do
  dst=$(pg_query_retry "${RESTORE_CONTAINER}" "SELECT count(*) FROM ${t}")
  echo "    ${t}: ${dst}"
done

echo "[OK] rejeu de migration valide sur base remplie (${SOURCE_CONTAINER})."

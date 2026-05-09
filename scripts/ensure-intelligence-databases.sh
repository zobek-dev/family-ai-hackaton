#!/usr/bin/env bash
# Ensure Postgres has the databases Intelligence expects.
#
# docker-entrypoint-initdb.d only runs when the data volume is empty. Reusing
# an older volume (from before init-db/01-create-databases.sql existed) leaves
# postgres without `intelligence_app`, and the composite container fails
# migrations with: database "intelligence_app" does not exist
#
# Safe to run on every `npm run dev:infra` — no-op when DBs already exist.
set -euo pipefail

CONTAINER="${INTELLIGENCE_PG_CONTAINER:-hackathon-intelligence-notion-postgres-1}"

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: Postgres container '${CONTAINER}' not running." >&2
  exit 1
fi

ensure_db() {
  local db="$1"
  local exists
  exists="$(docker exec "$CONTAINER" psql -U intelligence -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${db}'")" || true
  if [[ "${exists:-}" != "1" ]]; then
    echo "Creating database \"${db}\" (missing — often an older Docker volume predating init-db)."
    docker exec "$CONTAINER" psql -U intelligence -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${db};"
  fi
}

ensure_db intelligence_app
ensure_db intelligence_app_shadow

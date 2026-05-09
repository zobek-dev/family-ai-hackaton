#!/usr/bin/env bash
# Build and run: Postgres + Redis + Intelligence + LangGraph agent + CopilotKit BFF.
#
# Prereqs: Docker Compose v2, repo-root .env with at least GEMINI_API_KEY.
# After first successful `up`, seed Intelligence users so thread creates work:
#   INTELLIGENCE_DEFAULT_ORG_ID=hackathon npm run seed
#
# Frontend: deploy separately (e.g. Vercel). Set build/runtime BFF_URL to your
# public BFF origin, or expose BFF_PUBLISH_HOST_PORT and point the browser there.
#
# Usage:
#   npm run deploy:docker
#   ENV=/path/to/.env bash deployment/scripts/deploy-docker-stack.sh
#   bash deployment/scripts/deploy-docker-stack.sh down
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV:-${ENV_FILE:-$ROOT/.env}}"
cd "${ROOT}/deployment"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing env file: ${ENV_FILE}" >&2
  echo "Copy .env.example to .env and set GEMINI_API_KEY (and optional secrets)." >&2
  exit 1
fi

if [[ $# -eq 0 ]]; then
  set -- up -d --build
fi

exec docker compose \
  --project-directory . \
  --env-file "${ENV_FILE}" \
  -f docker-compose.yml \
  -f docker-compose.stack.yml \
  "$@"

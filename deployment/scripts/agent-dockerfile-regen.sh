#!/usr/bin/env bash
# Regenerate apps/agent/Dockerfile from langgraph.json (after graph / deps edits).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${ROOT}/apps/agent"
exec uv run langgraph dockerfile Dockerfile -c langgraph.json

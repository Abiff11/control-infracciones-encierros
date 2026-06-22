#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.service.yml}"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -z "${ROLLBACK_BACKEND_IMAGE:-}" || -z "${ROLLBACK_FRONTEND_IMAGE:-}" ]]; then
  echo "Define ROLLBACK_BACKEND_IMAGE y ROLLBACK_FRONTEND_IMAGE antes de ejecutar rollback." >&2
  exit 1
fi

cd "$ROOT_DIR"

BACKEND_IMAGE="$ROLLBACK_BACKEND_IMAGE" FRONTEND_IMAGE="$ROLLBACK_FRONTEND_IMAGE" docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --no-build backend frontend

echo "Rollback de aplicacion aplicado. Las migraciones no se revierten automaticamente."

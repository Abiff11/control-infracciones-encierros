#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/intranet/apps/control-infracciones-encierros"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.service.yml}"
ENV_FILE="${ENV_FILE:-.env}"
DB_ENV_FILE="${DB_ENV_FILE:-/opt/intranet/infra/security/control_infracciones.db.env}"

if [[ -z "${ROLLBACK_BACKEND_IMAGE:-}" || -z "${ROLLBACK_FRONTEND_IMAGE:-}" ]]; then
  echo "Define ROLLBACK_BACKEND_IMAGE y ROLLBACK_FRONTEND_IMAGE antes de ejecutar rollback." >&2
  exit 1
fi

cd "$APP_DIR"

test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"
test -f "$DB_ENV_FILE"

BACKEND_IMAGE="$ROLLBACK_BACKEND_IMAGE" FRONTEND_IMAGE="$ROLLBACK_FRONTEND_IMAGE" docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --no-build backend frontend

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Rollback de aplicacion aplicado. Las migraciones no se revierten automaticamente."

#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/intranet/apps/control-infracciones-encierros"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.service.yml}"
ENV_FILE="${ENV_FILE:-.env}"
MIGRATION_CMD="${MIGRATION_CMD:-npm run migration:run:prod}"
DB_ENV_FILE="${DB_ENV_FILE:-/opt/intranet/infra/security/control_infracciones.db.env}"

cd "$APP_DIR"

test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"
test -f "$DB_ENV_FILE"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend sh -lc "$MIGRATION_CMD"

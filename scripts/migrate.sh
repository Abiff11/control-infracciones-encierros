#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.service.yml}"
ENV_FILE="${ENV_FILE:-.env}"
MIGRATION_CMD="${MIGRATION_CMD:-npm run migration:run:prod}"

cd "$ROOT_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend sh -lc "$MIGRATION_CMD"

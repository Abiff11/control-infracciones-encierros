#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/infracciones-api/.env"

test -f "$ENV_FILE"

cd "$ROOT_DIR"

docker compose --env-file "$ENV_FILE" stop postgres_infracciones

#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/intranet/apps/control-infracciones-encierros"
COMPOSE_FILE="docker-compose.service.yml"
ENV_FILE=".env"
TARGET_REF="${1:-origin/main}"

cd "$APP_DIR"

test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"

git status -sb
git fetch origin
git checkout "$TARGET_REF"
git log --oneline -1

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend frontend
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend frontend
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Deploy terminado"

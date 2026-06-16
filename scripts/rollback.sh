#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"

if [[ -z "${ROLLBACK_VERSION:-}" ]]; then
  echo "Define ROLLBACK_VERSION con el tag de imagen al que quieres regresar." >&2
  exit 1
fi

cd "$ROOT_DIR"

APP_VERSION="$ROLLBACK_VERSION" docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --no-build

echo "Rollback de aplicacion aplicado a APP_VERSION=$ROLLBACK_VERSION."
echo "Las migraciones de base de datos no se revierten automaticamente."

#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.service.yml}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
DB_NETWORK="${DB_NETWORK:-intranet_db}"
BACKUP_TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_FILE:-${BACKUP_DIR}/postgres-backup-${BACKUP_TIMESTAMP}.dump}"
MIGRATION_CMD="${MIGRATION_CMD:-npm run migration:run:prod}"
HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT:-180}"

cd "$ROOT_DIR"

test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"

mkdir -p "$BACKUP_DIR"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DB_HOST:?Define DB_HOST en .env}"
: "${DB_PORT:?Define DB_PORT en .env}"
: "${DB_USERNAME:?Define DB_USERNAME en .env}"
: "${DB_DATABASE:?Define DB_DATABASE en .env}"
: "${DB_PASSWORD:?Define DB_PASSWORD en .env}"

echo "Creando respaldo PostgreSQL en $BACKUP_FILE"
docker run --rm \
  --network "$DB_NETWORK" \
  -e PGPASSWORD="$DB_PASSWORD" \
  postgres:16-alpine \
  sh -lc "pg_dump -h \"$DB_HOST\" -p \"$DB_PORT\" -U \"$DB_USERNAME\" -F c \"$DB_DATABASE\"" \
  > "$BACKUP_FILE"

echo "Construyendo imagenes backend/frontend"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend frontend

echo "Ejecutando migraciones TypeORM"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend sh -lc "$MIGRATION_CMD"

echo "Levantando servicios backend/frontend"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend frontend

wait_for_health() {
  local service_name="$1"
  local container_id
  local started_at

  container_id="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$service_name")"
  if [[ -z "$container_id" ]]; then
    echo "No se pudo obtener el contenedor de $service_name" >&2
    exit 1
  fi

  started_at="$(date +%s)"
  while true; do
    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"

    if [[ "$status" == "healthy" ]]; then
      echo "$service_name saludable"
      return 0
    fi

    if [[ "$status" == "running" || "$status" == "created" || "$status" == "starting" || "$status" == "up" ]]; then
      if (( $(date +%s) - started_at > HEALTHCHECK_TIMEOUT )); then
        echo "Timeout esperando healthcheck de $service_name" >&2
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
        exit 1
      fi
      sleep 5
      continue
    fi

    if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
      echo "$service_name no quedo saludable: $status" >&2
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
      exit 1
    fi

    if (( $(date +%s) - started_at > HEALTHCHECK_TIMEOUT )); then
      echo "Timeout esperando healthcheck de $service_name" >&2
      docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
      exit 1
    fi

    sleep 5
  done
}

wait_for_health backend
wait_for_health frontend

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Deploy con migraciones terminado"

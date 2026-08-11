#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/intranet/apps/control-infracciones-encierros"
COMPOSE_FILE="docker-compose.service.yml"
ENV_FILE=".env"
TARGET_REF="${1:-origin/main}"
MIGRATION_CMD="${MIGRATION_CMD:-node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run --transaction none}"
PUBLIC_URL="${PUBLIC_URL:-https://infracciones.sisoaxaca.com}"
DB_ENV_FILE="${DB_ENV_FILE:-/opt/intranet/infra/security/control_infracciones.db.env}"
HEALTHCHECK_TIMEOUT="${HEALTHCHECK_TIMEOUT:-180}"

cd "$APP_DIR"

echo "== Validando archivos requeridos =="
test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"
test -f "$DB_ENV_FILE"

echo "== Validando configuracion Docker y perimetro =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet

echo "== Backup PostgreSQL antes de migraciones =="
if systemctl list-unit-files | grep -q '^intranet-postgres-backup.service'; then
  sudo systemctl start intranet-postgres-backup.service
  systemctl status intranet-postgres-backup.service --no-pager -l | tail -20
elif test -x /opt/intranet/infra/scripts/backup-postgres.sh; then
  /opt/intranet/infra/scripts/backup-postgres.sh
else
  echo "ERROR: No se encontro servicio ni script de backup PostgreSQL." >&2
  exit 1
fi

echo "== Estado Git antes del deploy con migraciones =="
git status -sb

echo "== Sincronizando codigo =="
git fetch origin
git reset --hard "$TARGET_REF"
git clean -fd -e .env -e storage -e uploads -e backups

echo "== Commit desplegado =="
git log --oneline -1

echo "== Construyendo imagenes =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend frontend

echo "== Ejecutando migraciones TypeORM =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm backend sh -lc "$MIGRATION_CMD"

echo "== Levantando servicios =="
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

echo "== Estado Docker Compose =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "== Validando backend health interno =="
docker exec control_infracciones_backend wget -qO- http://127.0.0.1:3104/api/health
echo

echo "== Validando frontend interno =="
docker exec control_infracciones_frontend wget -qO- http://127.0.0.1:8080/healthz >/dev/null
echo "frontend ok"

echo "== Validando proteccion publica Cloudflare Access =="
curl -sI "$PUBLIC_URL" | grep -Ei 'HTTP/|location:|www-authenticate:|server:' || true

echo "== Deploy con migraciones terminado correctamente =="

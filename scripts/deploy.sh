#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/intranet/apps/control-infracciones-encierros"
COMPOSE_FILE="docker-compose.service.yml"
ENV_FILE=".env"
TARGET_REF="${1:-origin/main}"
PUBLIC_URL="${PUBLIC_URL:-https://infracciones.sisoaxaca.com}"
DB_ENV_FILE="${DB_ENV_FILE:-/opt/intranet/infra/security/control_infracciones.db.env}"

cd "$APP_DIR"

echo "== Validando archivos requeridos =="
test -f "$COMPOSE_FILE"
test -f "$ENV_FILE"
test -f "$DB_ENV_FILE"

echo "== Estado Git antes del deploy =="
git status -sb

echo "== Sincronizando codigo =="
git fetch origin
git reset --hard "$TARGET_REF"
git clean -fd -e .env -e storage -e uploads -e backups

echo "== Commit desplegado =="
git log --oneline -1

echo "== Construyendo imagenes =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build backend frontend

echo "== Levantando servicios =="
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d backend frontend

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

echo "== Deploy terminado correctamente =="

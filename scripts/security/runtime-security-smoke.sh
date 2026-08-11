#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

ADMIN_EMAIL="${SECURITY_TEST_ADMIN_EMAIL:?SECURITY_TEST_ADMIN_EMAIL es obligatorio}"
ADMIN_PASSWORD="${SECURITY_TEST_ADMIN_PASSWORD:?SECURITY_TEST_ADMIN_PASSWORD es obligatorio}"
CONSULTA_EMAIL="${SECURITY_TEST_CONSULTA_EMAIL:?SECURITY_TEST_CONSULTA_EMAIL es obligatorio}"
CONSULTA_PASSWORD="${SECURITY_TEST_CONSULTA_PASSWORD:?SECURITY_TEST_CONSULTA_PASSWORD es obligatorio}"

fail() {
  echo "SECURITY_SMOKE_ERROR: $*" >&2
  exit 1
}

expect_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"

  if [[ "$actual" != "$expected" ]]; then
    fail "$label: se esperaba HTTP $expected y se obtuvo HTTP $actual"
  fi
}

assert_header() {
  local file="$1"
  local pattern="$2"
  local label="$3"

  if ! grep -Eiq "$pattern" "$file"; then
    fail "$label: no se encontro el header esperado ($pattern)"
  fi
}

get_csrf_token() {
  local jar="$1"
  local headers="$2"
  local status

  status="$(curl -sS \
    -D "$headers" \
    -o /dev/null \
    -c "$jar" \
    -w '%{http_code}' \
    "$BASE_URL/api/auth/token-check")"
  expect_status "$status" "200" "token-check"

  local token
  token="$(awk '$6 == "cie_csrf_token" { print $7 }' "$jar" | tail -n 1)"
  [[ -n "$token" ]] || fail "token-check no emitio cie_csrf_token"
  printf '%s' "$token"
}

login_user() {
  local email="$1"
  local password="$2"
  local jar="$3"
  local response_file="$4"
  local csrf_token
  csrf_token="$(get_csrf_token "$jar" "$TMP_DIR/token-check.headers")"

  local payload
  payload="$(LOGIN_EMAIL="$email" LOGIN_PASSWORD="$password" node -e '
    process.stdout.write(JSON.stringify({
      email: process.env.LOGIN_EMAIL,
      password: process.env.LOGIN_PASSWORD,
    }));
  ')"

  local status
  status="$(curl -sS \
    -b "$jar" \
    -c "$jar" \
    -H 'Content-Type: application/json' \
    -H "x-csrf-token: $csrf_token" \
    --data "$payload" \
    -o "$response_file" \
    -w '%{http_code}' \
    "$BASE_URL/api/auth/login")"
  expect_status "$status" "200" "login $email"

  node -e '
    const fs = require("node:fs");
    const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    if (!payload.accessToken || typeof payload.accessToken !== "string") {
      process.exit(2);
    }
    process.stdout.write(payload.accessToken);
  ' "$response_file" || fail "login $email no devolvio accessToken"
}

echo "[security-smoke] 1/8 health y headers defensivos"
HEALTH_HEADERS="$TMP_DIR/health.headers"
HEALTH_BODY="$TMP_DIR/health.json"
HEALTH_STATUS="$(curl -sS \
  -D "$HEALTH_HEADERS" \
  -o "$HEALTH_BODY" \
  -w '%{http_code}' \
  "$BASE_URL/api/health")"
expect_status "$HEALTH_STATUS" "200" "health"
assert_header "$HEALTH_HEADERS" '^x-request-id:' 'correlacion requestId'
assert_header "$HEALTH_HEADERS" '^x-content-type-options:[[:space:]]*nosniff' 'X-Content-Type-Options'
assert_header "$HEALTH_HEADERS" '^x-frame-options:[[:space:]]*DENY' 'X-Frame-Options'
assert_header "$HEALTH_HEADERS" '^referrer-policy:[[:space:]]*no-referrer' 'Referrer-Policy'
assert_header "$HEALTH_HEADERS" '^cache-control:[[:space:]]*no-store' 'Cache-Control'
if grep -Eiq '^x-powered-by:' "$HEALTH_HEADERS"; then
  fail 'health expone X-Powered-By'
fi

echo "[security-smoke] 2/8 ruta privada sin JWT -> 401"
UNAUTH_HEADERS="$TMP_DIR/unauth.headers"
UNAUTH_STATUS="$(curl -sS \
  -D "$UNAUTH_HEADERS" \
  -o "$TMP_DIR/unauth.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/usuarios")"
expect_status "$UNAUTH_STATUS" "401" "usuarios sin JWT"
assert_header "$UNAUTH_HEADERS" '^x-request-id:' '401 con requestId'

echo "[security-smoke] 3/8 login sin header CSRF -> 403"
ADMIN_JAR="$TMP_DIR/admin.cookies"
ADMIN_CSRF="$(get_csrf_token "$ADMIN_JAR" "$TMP_DIR/admin-token.headers")"
ADMIN_PAYLOAD="$(LOGIN_EMAIL="$ADMIN_EMAIL" LOGIN_PASSWORD="$ADMIN_PASSWORD" node -e '
  process.stdout.write(JSON.stringify({
    email: process.env.LOGIN_EMAIL,
    password: process.env.LOGIN_PASSWORD,
  }));
')"
MISSING_CSRF_STATUS="$(curl -sS \
  -b "$ADMIN_JAR" \
  -H 'Content-Type: application/json' \
  --data "$ADMIN_PAYLOAD" \
  -o "$TMP_DIR/missing-csrf.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/auth/login")"
expect_status "$MISSING_CSRF_STATUS" "403" "login sin header CSRF"

echo "[security-smoke] 4/8 login valido ADMIN y CONSULTA"
ADMIN_ACCESS_TOKEN="$(login_user "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$ADMIN_JAR" "$TMP_DIR/admin-login.json")"
CONSULTA_JAR="$TMP_DIR/consulta.cookies"
CONSULTA_ACCESS_TOKEN="$(login_user "$CONSULTA_EMAIL" "$CONSULTA_PASSWORD" "$CONSULTA_JAR" "$TMP_DIR/consulta-login.json")"

echo "[security-smoke] 5/8 RBAC CONSULTA -> 403, ADMIN -> 200"
CONSULTA_USERS_STATUS="$(curl -sS \
  -H "Authorization: Bearer $CONSULTA_ACCESS_TOKEN" \
  -o "$TMP_DIR/consulta-users.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/usuarios")"
expect_status "$CONSULTA_USERS_STATUS" "403" "CONSULTA accediendo a usuarios"

ADMIN_USERS_STATUS="$(curl -sS \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -o "$TMP_DIR/admin-users.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/usuarios")"
expect_status "$ADMIN_USERS_STATUS" "200" "ADMIN accediendo a usuarios"

echo "[security-smoke] 6/8 mutacion sin CSRF -> 403; CSRF valido deja pasar al ValidationPipe"
MUTATION_WITHOUT_CSRF_STATUS="$(curl -sS \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  --data '{}' \
  -o "$TMP_DIR/mutation-without-csrf.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/catalogos/regiones")"
expect_status "$MUTATION_WITHOUT_CSRF_STATUS" "403" "mutacion sin CSRF"

MUTATION_WITH_CSRF_STATUS="$(curl -sS \
  -b "$ADMIN_JAR" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $ADMIN_CSRF" \
  --data '{}' \
  -o "$TMP_DIR/mutation-valid-csrf.json" \
  -w '%{http_code}' \
  "$BASE_URL/api/catalogos/regiones")"
expect_status "$MUTATION_WITH_CSRF_STATUS" "400" "mutacion con CSRF valido y body invalido"

echo "[security-smoke] 7/8 rate limit no evadible cambiando X-Forwarded-For"
RATE_LIMIT_SEEN=0
for attempt in $(seq 1 8); do
  SPOOFED_IP="203.0.113.$attempt"
  INVALID_PAYLOAD="$(LOGIN_EMAIL="nobody-${attempt}@example.com" LOGIN_PASSWORD='Credencial-Invalida-2026!' node -e '
    process.stdout.write(JSON.stringify({
      email: process.env.LOGIN_EMAIL,
      password: process.env.LOGIN_PASSWORD,
    }));
  ')"

  STATUS="$(curl -sS \
    -b "$ADMIN_JAR" \
    -H 'Content-Type: application/json' \
    -H "x-csrf-token: $ADMIN_CSRF" \
    -H "X-Forwarded-For: $SPOOFED_IP" \
    --data "$INVALID_PAYLOAD" \
    -o "$TMP_DIR/rate-limit-${attempt}.json" \
    -w '%{http_code}' \
    "$BASE_URL/api/auth/login")"

  if [[ "$STATUS" == "429" ]]; then
    RATE_LIMIT_SEEN=1
    break
  fi

  if [[ "$STATUS" != "401" ]]; then
    fail "intento invalido $attempt: se esperaba 401 o 429 y se obtuvo $STATUS"
  fi
done

[[ "$RATE_LIMIT_SEEN" == "1" ]] || fail 'no se alcanzo 429; X-Forwarded-For pudo evadir el rate limit o el limite no esta activo'

echo "[security-smoke] 8/8 auditoria correlacionada de eventos de seguridad"
sleep 1
node <<'NODE'
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  await client.connect();
  const result = await client.query(`
    SELECT accion, severity, request_id, http_method, request_path
    FROM auditoria
    WHERE entidad = 'SEGURIDAD'
    ORDER BY id_auditoria ASC
  `);
  await client.end();

  const requiredActions = new Map([
    ['AUTHENTICATION_REJECTED', 'MEDIUM'],
    ['AUTHORIZATION_REJECTED', 'MEDIUM'],
    ['CSRF_REJECTED', 'HIGH'],
    ['RATE_LIMIT_REJECTED', 'HIGH'],
  ]);

  for (const [action, severity] of requiredActions) {
    const row = result.rows.find((item) => item.accion === action);
    if (!row) {
      throw new Error(`No se persistio el evento ${action}`);
    }
    if (row.severity !== severity) {
      throw new Error(`${action} tiene severity ${row.severity}; se esperaba ${severity}`);
    }
    if (!row.request_id || !row.http_method || !row.request_path) {
      throw new Error(`${action} no tiene correlacion HTTP completa`);
    }
  }

  console.log(`Eventos SEGURIDAD persistidos: ${result.rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE

echo '[security-smoke] OK: controles runtime verificados'

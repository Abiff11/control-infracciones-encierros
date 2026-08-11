const baseUrl = process.env.SECURITY_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail =
  process.env.SECURITY_TEST_ADMIN_EMAIL ?? 'security-admin@example.com';
const adminPassword = process.env.SECURITY_TEST_ADMIN_PASSWORD;
const consultaEmail =
  process.env.SECURITY_TEST_CONSULTA_EMAIL ?? 'security-consulta@example.com';
const consultaPassword = process.env.SECURITY_TEST_CONSULTA_PASSWORD;

if (!adminPassword || !consultaPassword) {
  throw new Error(
    'SECURITY_TEST_ADMIN_PASSWORD y SECURITY_TEST_CONSULTA_PASSWORD son obligatorios.',
  );
}

const CSRF_COOKIE_NAME = 'cie_csrf_token';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertStatus(response, expected, label) {
  assert(
    response.status === expected,
    `${label}: se esperaba HTTP ${expected} y se obtuvo ${response.status}`,
  );
}

function assertSuccess(response, label) {
  assert(
    response.status >= 200 && response.status < 300,
    `${label}: se esperaba respuesta 2xx y se obtuvo ${response.status}`,
  );
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

function extractCookie(headers, cookieName) {
  const prefix = `${cookieName}=`;

  for (const setCookie of getSetCookies(headers)) {
    const pair = setCookie.split(';', 1)[0] ?? '';
    if (pair.startsWith(prefix)) {
      return decodeURIComponent(pair.slice(prefix.length));
    }
  }

  return null;
}

function csrfCookieHeader(csrfToken) {
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(csrfToken)}`;
}

async function responseJson(response, label) {
  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label}: la respuesta no contiene JSON valido: ${text}`);
  }
}

function assertRequestId(response, label) {
  const requestId = response.headers.get('x-request-id');
  assert(requestId && requestId.length >= 16, `${label}: falta X-Request-Id`);
}

async function prepareCsrf(label) {
  const response = await fetch(`${baseUrl}/api/auth/token-check`);
  assertStatus(response, 200, `${label} token-check`);
  assertRequestId(response, `${label} token-check`);

  const csrfToken = extractCookie(response.headers, CSRF_COOKIE_NAME);
  assert(csrfToken, `${label}: token-check no emitio cookie CSRF`);

  return csrfToken;
}

async function login(email, password, csrfToken, label) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: csrfCookieHeader(csrfToken),
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.status < 200 || response.status >= 300) {
    const body = await response.text();
    const retryAfter = response.headers.get('retry-after');
    throw new Error(
      `${label} login: HTTP ${response.status}; retry-after=${retryAfter ?? 'none'}; body=${body}`,
    );
  }

  assertRequestId(response, `${label} login`);

  const payload = await responseJson(response, `${label} login`);
  assert(
    typeof payload.accessToken === 'string' && payload.accessToken.length > 20,
    `${label}: login no devolvio accessToken`,
  );

  return payload.accessToken;
}

async function authGet(path, token) {
  return fetch(`${baseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

async function main() {
  console.log('== Security smoke: headers y superficie publica ==');
  const health = await fetch(`${baseUrl}/api/health`);
  assertStatus(health, 200, 'health');
  assertRequestId(health, 'health');
  assert(
    health.headers.get('x-content-type-options')?.toLowerCase() === 'nosniff',
    'health: falta X-Content-Type-Options nosniff',
  );
  assert(
    health.headers.get('x-frame-options')?.toUpperCase() === 'DENY',
    'health: falta X-Frame-Options DENY',
  );
  assert(
    health.headers.get('referrer-policy')?.toLowerCase() === 'no-referrer',
    'health: falta Referrer-Policy no-referrer',
  );
  assert(
    health.headers.get('cache-control')?.toLowerCase().includes('no-store'),
    'health: falta Cache-Control no-store',
  );
  assert(
    health.headers.get('permissions-policy')?.includes('camera=()'),
    'health: falta Permissions-Policy esperado',
  );
  assert(
    !health.headers.has('x-powered-by'),
    'health: X-Powered-By no debe exponerse',
  );

  console.log('== Security smoke: deny-by-default ==');
  const anonymousPrivate = await fetch(`${baseUrl}/api/usuarios`);
  assertStatus(anonymousPrivate, 401, 'ruta privada anonima');
  assertRequestId(anonymousPrivate, 'ruta privada anonima');

  console.log('== Security smoke: CSRF en login ==');
  const csrfRejected = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assertStatus(csrfRejected, 403, 'login sin CSRF');
  assertRequestId(csrfRejected, 'login sin CSRF');

  console.log('== Security smoke: autenticacion ADMIN ==');
  const adminCsrf = await prepareCsrf('admin');
  const adminToken = await login(
    adminEmail,
    adminPassword,
    adminCsrf,
    'admin',
  );

  const adminPrivate = await authGet('/api/usuarios?limit=5', adminToken);
  assertStatus(adminPrivate, 200, 'ADMIN sobre /usuarios');

  console.log('== Security smoke: RBAC ==');
  const consultaCsrf = await prepareCsrf('consulta');
  const consultaToken = await login(
    consultaEmail,
    consultaPassword,
    consultaCsrf,
    'consulta',
  );
  const forbiddenAdminRoute = await authGet('/api/usuarios', consultaToken);
  assertStatus(forbiddenAdminRoute, 403, 'CONSULTA sobre /usuarios');
  assertRequestId(forbiddenAdminRoute, 'CONSULTA sobre /usuarios');

  console.log('== Security smoke: CSRF en mutaciones autenticadas ==');
  const mutationWithoutCsrf = await fetch(`${baseUrl}/api/catalogos/regiones`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
    },
    body: '{}',
  });
  assertStatus(mutationWithoutCsrf, 403, 'mutacion autenticada sin CSRF');
  assertRequestId(mutationWithoutCsrf, 'mutacion autenticada sin CSRF');

  const mutationWithCsrf = await fetch(`${baseUrl}/api/catalogos/regiones`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      'content-type': 'application/json',
      cookie: csrfCookieHeader(adminCsrf),
      'x-csrf-token': adminCsrf,
    },
    body: '{}',
  });
  assertStatus(
    mutationWithCsrf,
    400,
    'mutacion con CSRF valido y body invalido',
  );
  assertRequestId(mutationWithCsrf, 'mutacion con CSRF valido');

  console.log('== Security smoke: login rate limiting y X-Forwarded-For ==');
  const attackCsrf = await prepareCsrf('rate-limit');
  let rateLimited = false;

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: csrfCookieHeader(attackCsrf),
        'x-csrf-token': attackCsrf,
        'x-forwarded-for': `203.0.113.${attempt}`,
      },
      body: JSON.stringify({
        email: `unknown-${attempt}@example.com`,
        password: 'credencial-invalida-suficientemente-larga',
      }),
    });

    if (response.status === 429) {
      rateLimited = true;
      assertRequestId(response, 'rate limit');
      break;
    }

    assertStatus(response, 401, `login invalido intento ${attempt}`);
  }

  assert(
    rateLimited,
    'El login rate limiter no respondio 429; X-Forwarded-For pudo evadir el limite',
  );

  console.log('== Security smoke: observabilidad ==');
  await new Promise((resolve) => setTimeout(resolve, 500));
  const auditResponse = await authGet(
    '/api/auditoria?entidad=SEGURIDAD&limit=100',
    adminToken,
  );
  assertStatus(auditResponse, 200, 'auditoria de seguridad');
  const auditPayload = await responseJson(auditResponse, 'auditoria de seguridad');
  const auditItems = Array.isArray(auditPayload.items) ? auditPayload.items : [];
  const expectedAudit = new Map([
    ['AUTHENTICATION_REJECTED', 'MEDIUM'],
    ['AUTHORIZATION_REJECTED', 'MEDIUM'],
    ['CSRF_REJECTED', 'HIGH'],
    ['RATE_LIMIT_REJECTED', 'HIGH'],
  ]);

  for (const [expectedAction, expectedSeverity] of expectedAudit) {
    const item = auditItems.find((entry) => entry?.accion === expectedAction);
    assert(item, `Auditoria no contiene ${expectedAction}`);
    assert(
      item.severity === expectedSeverity,
      `${expectedAction}: severity ${item.severity}; se esperaba ${expectedSeverity}`,
    );
    assert(
      item.requestId || item.request_id,
      `${expectedAction}: falta requestId de correlacion`,
    );
  }

  console.log('== Security smoke: revocacion de sesion ==');
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${adminToken}`,
      cookie: csrfCookieHeader(adminCsrf),
      'x-csrf-token': adminCsrf,
    },
  });
  assertSuccess(logoutResponse, 'logout ADMIN');

  const revokedTokenResponse = await authGet('/api/usuarios', adminToken);
  assertStatus(revokedTokenResponse, 401, 'access token revocado');

  console.log('SECURITY_SMOKE_OK');
}

main().catch((error) => {
  console.error('SECURITY_SMOKE_FAILED');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

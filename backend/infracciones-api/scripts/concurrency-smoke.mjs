import { isDeepStrictEqual } from 'node:util';

import argon2 from 'argon2';
import pg from 'pg';

const { Client } = pg;

const baseUrl =
  process.env.CONCURRENCY_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const adminEmail =
  process.env.CONCURRENCY_TEST_ADMIN_EMAIL ?? 'concurrency-admin-a@example.com';
const adminPassword = process.env.CONCURRENCY_TEST_ADMIN_PASSWORD;
const secondAdminEmail =
  process.env.CONCURRENCY_TEST_SECOND_ADMIN_EMAIL ??
  'concurrency-admin-b@example.com';
const secondAdminPassword = process.env.CONCURRENCY_TEST_SECOND_ADMIN_PASSWORD;
const CSRF_COOKIE_NAME = 'cie_csrf_token';

if (!adminPassword || !secondAdminPassword) {
  throw new Error(
    'CONCURRENCY_TEST_ADMIN_PASSWORD y CONCURRENCY_TEST_SECOND_ADMIN_PASSWORD son obligatorios.',
  );
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function prepareCsrf(label) {
  const response = await fetch(`${baseUrl}/api/auth/token-check`);
  assert(response.status === 200, `${label}: token-check HTTP ${response.status}`);

  const token = extractCookie(response.headers, CSRF_COOKIE_NAME);
  assert(token, `${label}: token-check no emitio cookie CSRF`);
  return token;
}

async function login(email, password, label) {
  const csrfToken = await prepareCsrf(label);
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: csrfCookieHeader(csrfToken),
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseResponse(response);

  assert(
    response.status >= 200 && response.status < 300,
    `${label}: login HTTP ${response.status}: ${JSON.stringify(payload)}`,
  );
  assert(
    typeof payload?.accessToken === 'string',
    `${label}: login sin accessToken`,
  );

  return { token: payload.accessToken, csrfToken };
}

function authHeaders(actor, includeJson = false) {
  const headers = {
    authorization: `Bearer ${actor.token}`,
    cookie: csrfCookieHeader(actor.csrfToken),
    'x-csrf-token': actor.csrfToken,
  };

  if (includeJson) {
    headers['content-type'] = 'application/json';
  }

  return headers;
}

async function authGet(actor, path) {
  return fetch(`${baseUrl}${path}`, {
    headers: authHeaders(actor),
  });
}

async function authPost(actor, path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: authHeaders(actor, true),
    body: JSON.stringify(body),
  });
}

function dbClient() {
  return new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
}

async function seedSecondAdmin(client) {
  const role = await client.query(
    `SELECT id_rol FROM rol WHERE nombre_rol = 'ADMIN' LIMIT 1`,
  );
  assert(role.rowCount === 1, 'No existe el rol ADMIN');

  const passwordHash = await argon2.hash(secondAdminPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await client.query(
    `
      INSERT INTO usuarios (
        id_rol,
        nombre_usuario,
        email,
        password_hash,
        activo,
        auth_session_version,
        refresh_token_hash,
        refresh_token_expires_at,
        failed_login_attempts,
        locked_until,
        last_login_at,
        password_changed_at
      ) VALUES ($1, $2, $3, $4, TRUE, 0, NULL, NULL, 0, NULL, NULL, NOW())
      ON CONFLICT (email) DO UPDATE SET
        id_rol = EXCLUDED.id_rol,
        nombre_usuario = EXCLUDED.nombre_usuario,
        password_hash = EXCLUDED.password_hash,
        activo = TRUE,
        auth_session_version = usuarios.auth_session_version + 1,
        refresh_token_hash = NULL,
        refresh_token_expires_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL,
        password_changed_at = NOW()
    `,
    [role.rows[0].id_rol, 'Concurrency Admin B', secondAdminEmail, passwordHash],
  );
}

async function readFixtureIds(client) {
  const queries = {
    idSexo: `SELECT id_sexo AS id FROM sexo ORDER BY id_sexo LIMIT 1`,
    idClaseVehiculo: `SELECT id_clase_vehiculo AS id FROM clase_vehiculo ORDER BY id_clase_vehiculo LIMIT 1`,
    idLineaVehiculo: `SELECT id_linea_vehiculo AS id FROM linea_vehiculo ORDER BY id_linea_vehiculo LIMIT 1`,
    idServicio: `SELECT id_servicio AS id FROM servicio ORDER BY id_servicio LIMIT 1`,
    idDelegacion: `SELECT id_delegacion AS id FROM delegacion ORDER BY id_delegacion LIMIT 1`,
    idTipoProcedimiento: `SELECT id_tipo_procedimiento AS id FROM tipo_procedimiento WHERE clave_tipo_procedimiento = 'INFRACCION' LIMIT 1`,
    idEstatusInfraccion: `SELECT id_estatus_infraccion AS id FROM estatus_infraccion WHERE nombre_estatus = 'CAPTURADA' LIMIT 1`,
    idMotivo: `SELECT id_motivo AS id FROM motivo ORDER BY id_motivo LIMIT 1`,
    idEncierro: `SELECT id_encierro AS id FROM encierro ORDER BY id_encierro LIMIT 1`,
  };

  const ids = {};
  for (const [key, sql] of Object.entries(queries)) {
    const result = await client.query(sql);
    assert(result.rowCount === 1, `No se pudo resolver ${key}`);
    ids[key] = Number(result.rows[0].id);
    assert(Number.isInteger(ids[key]) && ids[key] > 0, `${key} no es valido`);
  }

  return ids;
}

async function createInfraccion(actor, ids) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const response = await authPost(actor, '/api/infracciones', {
    infractor: {
      idSexo: ids.idSexo,
      nombre: 'CONCURRENCIA',
      apellidoPaterno: 'PRUEBA',
    },
    vehiculo: {
      idClaseVehiculo: ids.idClaseVehiculo,
      idLineaVehiculo: ids.idLineaVehiculo,
      idServicio: ids.idServicio,
      placas: `CONC-${suffix}`.slice(0, 20),
      color: 'PRUEBA',
    },
    lugarInfraccion: {
      municipio: `MUNICIPIO CONCURRENCIA ${suffix}`,
    },
    infraccion: {
      idDelegacion: ids.idDelegacion,
      idTipoProcedimiento: ids.idTipoProcedimiento,
      idEstatusInfraccion: ids.idEstatusInfraccion,
      folioInfraccion: `CONC-${suffix}`,
      fechaInfraccion: '2026-08-12',
      horaInfraccion: '12:00:00',
      motivos: [ids.idMotivo],
    },
  });
  const payload = await parseResponse(response);

  assert(
    response.status >= 200 && response.status < 300,
    `crear infraccion: HTTP ${response.status}: ${JSON.stringify(payload)}`,
  );

  const idInfraccion = Number(payload?.infraccion?.idInfraccion);
  assert(Number.isInteger(idInfraccion) && idInfraccion > 0, 'Respuesta sin idInfraccion');

  return { idInfraccion, suffix };
}

async function runRace(label, requestA, requestB) {
  const responses = await Promise.all([requestA(), requestB()]);
  const details = await Promise.all(
    responses.map(async (response) => ({
      status: response.status,
      payload: await parseResponse(response),
    })),
  );

  const successes = details.filter(
    (result) => result.status >= 200 && result.status < 300,
  );
  const conflicts = details.filter(
    (result) => result.status === 400 || result.status === 409,
  );

  assert(
    successes.length === 1 && conflicts.length === 1,
    `${label}: se esperaba 1 exito y 1 conflicto; recibido ${JSON.stringify(details)}`,
  );

  console.log(
    `${label}: ${details.map((result) => result.status).join(' / ')}`,
  );

  return successes[0].payload;
}

async function assertSingleRow(client, sql, values, label, idColumn) {
  const result = await client.query(sql, values);
  const total = Number(result.rows[0]?.total ?? 0);

  assert(total === 1, `${label}: se esperaban 1 registro y existen ${total}`);

  const id = Number(result.rows[0]?.[idColumn]);
  assert(Number.isInteger(id) && id > 0, `${label}: id no valido`);
  return id;
}

async function runParallelReads(actorA, actorB) {
  const latencies = await Promise.all(
    Array.from({ length: 50 }, async (_, index) => {
      const actor = index % 2 === 0 ? actorA : actorB;
      const startedAt = performance.now();
      const response = await authGet(actor, '/api/infracciones?limit=10');
      const elapsed = performance.now() - startedAt;

      if (response.status !== 200) {
        const payload = await parseResponse(response);
        throw new Error(
          `lectura concurrente ${index + 1}: HTTP ${response.status}: ${JSON.stringify(payload)}`,
        );
      }

      return elapsed;
    }),
  );

  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.ceil(sorted.length * 0.5) - 1] ?? 0;
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
  const max = sorted.at(-1) ?? 0;

  console.log(
    `50 lecturas paralelas OK | p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms max=${max.toFixed(1)}ms`,
  );
}

async function readPaymentState(client, idInfraccion) {
  const { rows } = await client.query(
    `
      SELECT i.folio_infraccion AS folio,
        i.id_estatus_infraccion AS "statusId",
        e.nombre_estatus AS status,
        (SELECT COUNT(*)::int FROM pago_infraccion p
          WHERE p.id_infraccion = i.id_infraccion) AS payments,
        (SELECT COUNT(*)::int FROM pago_concepto pc
          JOIN pago_infraccion p ON p.id_pago_infraccion = pc.id_pago_infraccion
          WHERE p.id_infraccion = i.id_infraccion) AS "conceptLinks",
        (SELECT COUNT(*)::int FROM infraccion_movimiento m
          WHERE m.id_infraccion = i.id_infraccion
            AND m.accion = 'PAGO_REGISTRADO') AS movements,
        (SELECT COUNT(*)::int FROM auditoria a
          WHERE a.accion = 'PAGO_REGISTRADO' AND a.entidad = 'pagos'
            AND a.despues_json ->> 'idInfraccion' = i.id_infraccion::text) AS audits
      FROM infracciones i
      JOIN estatus_infraccion e USING (id_estatus_infraccion)
      WHERE i.id_infraccion = $1
    `,
    [idInfraccion],
  );

  assert(
    rows.length === 1,
    'No se encontro el expediente de prueba en PostgreSQL',
  );
  return rows[0];
}

async function assertCommittedPayment(client, idInfraccion, conceptCount) {
  const { status, payments, conceptLinks, movements, audits } =
    await readPaymentState(client, idInfraccion);
  const actual = { status, payments, conceptLinks, movements, audits };
  const expected = {
    status: 'PAGADA',
    payments: 1,
    conceptLinks: conceptCount,
    movements: 1,
    audits: 1,
  };
  assert(
    isDeepStrictEqual(actual, expected),
    `Pago incompleto: ${JSON.stringify(actual)}`,
  );
}

function isDisposablePaymentDatabase() {
  return (
    process.env.NODE_ENV === 'test' &&
    process.env.DB_HOST === '127.0.0.1' &&
    new URL(baseUrl).hostname === '127.0.0.1' &&
    (/^control_infracciones_pagos_test_[a-z0-9]+$/.test(
      process.env.DB_DATABASE ?? '',
    ) ||
      (process.env.GITHUB_ACTIONS === 'true' &&
        process.env.DB_DATABASE === 'control_infracciones_db'))
  );
}

async function runPaymentRollbackCase(client, actor, ids, stage) {
  const { idInfraccion, suffix } = await createInfraccion(actor, ids);
  const before = await readPaymentState(client, idInfraccion);
  assert(
    before.folio === `CONC-${suffix}` && before.status === 'CAPTURADA',
    'La API y el cliente SQL deben apuntar al mismo expediente de prueba',
  );

  const newKey = `ROLLBACK-NEW-${suffix}`;
  const inactiveKey = `ROLLBACK-INACTIVE-${suffix}`;
  const {
    rows: [inactive],
  } = await client.query(
    'INSERT INTO concepto_pago (clave_concepto, activo) VALUES ($1, FALSE) RETURNING id_concepto_pago',
    [inactiveKey],
  );
  const payload = {
    idInfraccion,
    folioLineaCaptura: `ROLLBACK-${suffix}`,
    conceptos: [
      { claveConcepto: newKey, monto: '50.50' },
      { claveConcepto: inactiveKey, monto: '49.50' },
    ],
  };

  const faults = {
    conceptos: [
      'pago_concepto',
      `id_concepto_pago <> ${inactive.id_concepto_pago}`,
    ],
    estatus: [
      'infracciones',
      `id_infraccion <> ${idInfraccion} OR id_estatus_infraccion = ${before.statusId}`,
    ],
    movimiento: [
      'infraccion_movimiento',
      `id_infraccion <> ${idInfraccion} OR accion <> 'PAGO_REGISTRADO'`,
    ],
    auditoria: [
      'auditoria',
      `accion <> 'PAGO_REGISTRADO' OR entidad <> 'pagos' OR despues_json ->> 'idInfraccion' IS DISTINCT FROM '${idInfraccion}'`,
    ],
  };
  const [table, condition] = faults[stage];
  const constraint = `payment_rollback_fixture_${idInfraccion}`;
  await client.query(
    `ALTER TABLE ${table} ADD CONSTRAINT ${constraint} CHECK (${condition}) NOT VALID`,
  );
  try {
    const response = await authPost(actor, '/api/pagos', payload);
    const body = await parseResponse(response);
    assert(
      response.status === 500,
      `${stage}: se esperaba HTTP 500: ${JSON.stringify(body)}`,
    );
  } finally {
    await client.query(`ALTER TABLE ${table} DROP CONSTRAINT ${constraint}`);
  }

  const after = await readPaymentState(client, idInfraccion);
  const { rows: catalog } = await client.query(
    'SELECT clave_concepto, activo FROM concepto_pago WHERE clave_concepto = ANY($1)',
    [[newKey, inactiveKey]],
  );
  assert(
    isDeepStrictEqual(after, before) &&
      isDeepStrictEqual(catalog, [
        { clave_concepto: inactiveKey, activo: false },
      ]),
    `${stage}: persistieron cambios tras el error: ${JSON.stringify({ after, catalog })}`,
  );

  const retry = await authPost(actor, '/api/pagos', payload);
  const payment = await parseResponse(retry);
  assert(
    retry.status === 201,
    `${stage}: reintento HTTP ${retry.status}: ${JSON.stringify(payment)}`,
  );
  assert(
    payment.folioLineaCaptura === payload.folioLineaCaptura &&
      payment.monto === '100.00' &&
      isDeepStrictEqual(
        payment.conceptos.map(({ conceptoPago, monto, orden }) => [
          conceptoPago.claveConcepto,
          conceptoPago.activo,
          monto,
          orden,
        ]),
        [
          [newKey, true, '50.50', 1],
          [inactiveKey, true, '49.50', 2],
        ],
      ),
    `${stage}: respuesta de pago inesperada`,
  );
  await assertCommittedPayment(client, idInfraccion, 2);
  console.log(`rollback de pago (${stage}) y reintento: OK`);
}

async function runPaymentRollbackCases(client, actor, ids) {
  const failures = [];
  for (const stage of ['conceptos', 'estatus', 'movimiento', 'auditoria']) {
    try {
      await runPaymentRollbackCase(client, actor, ids, stage);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  assert(failures.length === 0, failures.join('\n'));
}

async function main() {
  assert(
    isDisposablePaymentDatabase(),
    'El smoke requiere NODE_ENV=test, API y PostgreSQL en 127.0.0.1 y una base desechable (control_infracciones_pagos_test_* en local).',
  );
  const client = dbClient();
  await client.connect();

  try {
    await seedSecondAdmin(client);
    const ids = await readFixtureIds(client);

    const actorA = await login(adminEmail, adminPassword, 'admin A');
    const actorB = await login(secondAdminEmail, secondAdminPassword, 'admin B');

    await runPaymentRollbackCases(client, actorA, ids);

    await runParallelReads(actorA, actorB);

    const { idInfraccion, suffix } = await createInfraccion(actorA, ids);

    await runRace(
      'retencion concurrente',
      () =>
        authPost(actorA, '/api/encierros/retenciones', {
          idInfraccion,
          idEncierro: ids.idEncierro,
          recibidoPor: 'ADMIN A',
          folioResguardo: `RES-${suffix}`,
          estadoIngreso: 'INGRESADO',
        }),
      () =>
        authPost(actorB, '/api/encierros/retenciones', {
          idInfraccion,
          idEncierro: ids.idEncierro,
          recibidoPor: 'ADMIN B',
          folioResguardo: `RES-${suffix}`,
          estadoIngreso: 'INGRESADO',
        }),
    );

    const idRetencionVehiculo = await assertSingleRow(
      client,
      `SELECT COUNT(*)::int AS total, MIN(id_retencion_vehiculo)::int AS id FROM retencion_vehiculo WHERE id_infraccion = $1`,
      [idInfraccion],
      'retencion',
      'id',
    );

    await runRace(
      'pago concurrente',
      () =>
        authPost(actorA, '/api/pagos', {
          idInfraccion,
          folioLineaCaptura: `LC-${suffix}`,
          conceptos: [{ claveConcepto: 'CONCURRENCY', monto: '100.00' }],
        }),
      () =>
        authPost(actorB, '/api/pagos', {
          idInfraccion,
          folioLineaCaptura: `LC-${suffix}`,
          conceptos: [{ claveConcepto: 'CONCURRENCY', monto: '100.00' }],
        }),
    );

    const idPagoInfraccion = await assertSingleRow(
      client,
      `SELECT COUNT(*)::int AS total, MIN(id_pago_infraccion)::int AS id FROM pago_infraccion WHERE folio_linea_captura = $1`,
      [`LC-${suffix}`],
      'pago',
      'id',
    );

    await assertCommittedPayment(client, idInfraccion, 1);

    await runRace(
      'liberacion concurrente',
      () =>
        authPost(actorA, '/api/liberaciones', {
          idInfraccion,
          idPagoInfraccion,
          folioLiberacion: `LIB-${suffix}`,
          liberadoPor: 'ADMIN A',
          nombreRecibeLiberacion: 'PRUEBA CONCURRENCIA',
        }),
      () =>
        authPost(actorB, '/api/liberaciones', {
          idInfraccion,
          idPagoInfraccion,
          folioLiberacion: `LIB-${suffix}`,
          liberadoPor: 'ADMIN B',
          nombreRecibeLiberacion: 'PRUEBA CONCURRENCIA',
        }),
    );

    const idLiberacionVehiculo = await assertSingleRow(
      client,
      `SELECT COUNT(*)::int AS total, MIN(id_liberacion_vehiculo)::int AS id FROM liberacion_vehiculo WHERE folio_liberacion = $1`,
      [`LIB-${suffix}`],
      'liberacion',
      'id',
    );

    await runRace(
      'salida concurrente',
      () =>
        authPost(actorA, '/api/encierros/salidas', {
          idRetencionVehiculo,
          idLiberacionVehiculo,
          validadoPor: 'ADMIN A',
          personaRecibeVehiculo: 'PRUEBA CONCURRENCIA',
          estadoSalida: 'ENTREGADO',
        }),
      () =>
        authPost(actorB, '/api/encierros/salidas', {
          idRetencionVehiculo,
          idLiberacionVehiculo,
          validadoPor: 'ADMIN B',
          personaRecibeVehiculo: 'PRUEBA CONCURRENCIA',
          estadoSalida: 'ENTREGADO',
        }),
    );

    await assertSingleRow(
      client,
      `SELECT COUNT(*)::int AS total, MIN(id_salida_vehiculo)::int AS id FROM salida_vehiculo WHERE id_retencion_vehiculo = $1`,
      [idRetencionVehiculo],
      'salida',
      'id',
    );

    const statusResult = await client.query(
      `
        SELECT e.nombre_estatus
        FROM infracciones i
        INNER JOIN estatus_infraccion e
          ON e.id_estatus_infraccion = i.id_estatus_infraccion
        WHERE i.id_infraccion = $1
      `,
      [idInfraccion],
    );
    assert(
      statusResult.rows[0]?.nombre_estatus === 'VEHICULO_ENTREGADO',
      `Estado final inesperado: ${statusResult.rows[0]?.nombre_estatus ?? 'sin estado'}`,
    );

    const movementResult = await client.query(
      `
        SELECT accion, COUNT(*)::int AS total
        FROM infraccion_movimiento
        WHERE id_infraccion = $1
          AND accion = ANY($2)
        GROUP BY accion
      `,
      [idInfraccion, ['PAGO_REGISTRADO', 'LIBERACION_GENERADA', 'VEHICULO_ENTREGADO']],
    );
    const movementCounts = new Map(
      movementResult.rows.map((row) => [row.accion, Number(row.total)]),
    );

    for (const action of [
      'PAGO_REGISTRADO',
      'LIBERACION_GENERADA',
      'VEHICULO_ENTREGADO',
    ]) {
      assert(
        movementCounts.get(action) === 1,
        `${action}: se esperaba exactamente 1 movimiento y existen ${movementCounts.get(action) ?? 0}`,
      );
    }

    const paymentAfterExit = await authPost(actorA, '/api/pagos', {
      idInfraccion,
      folioLineaCaptura: `LC-POST-SALIDA-${suffix}`,
      conceptos: [{ claveConcepto: 'CONCURRENCY', monto: '25.00' }],
    });
    await parseResponse(paymentAfterExit);
    assert(
      paymentAfterExit.status === 201,
      `pago posterior a la salida: HTTP ${paymentAfterExit.status}`,
    );
    const { status, movements, audits } = await readPaymentState(
      client,
      idInfraccion,
    );
    const {
      rows: [lastPaymentMovement],
    } = await client.query(
      `
        SELECT e.nombre_estatus AS status
        FROM infraccion_movimiento m
        JOIN estatus_infraccion e USING (id_estatus_infraccion)
        WHERE m.id_infraccion = $1 AND m.accion = 'PAGO_REGISTRADO'
        ORDER BY m.id_infraccion_movimiento DESC
        LIMIT 1
      `,
      [idInfraccion],
    );
    assert(
      status === 'VEHICULO_ENTREGADO' &&
        lastPaymentMovement?.status === status &&
        movements === 2 &&
        audits === 2,
      'El pago posterior debe registrar movimiento y auditoria y conservar la entrega',
    );
    console.log('Pago posterior a la salida conserva VEHICULO_ENTREGADO');

    console.log('CONCURRENCY_SMOKE_OK');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('CONCURRENCY_SMOKE_FAILED');
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

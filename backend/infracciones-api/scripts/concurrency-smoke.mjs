import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import argon2 from 'argon2';
import pg from 'pg';
import XLSX from 'xlsx';

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

async function seedTestActor(client, actor) {
  const role = await client.query(
    'SELECT id_rol FROM rol WHERE nombre_rol = $1',
    [actor.role],
  );
  assert(role.rowCount === 1, `No existe el rol ${actor.role}`);

  const passwordHash = await argon2.hash(actor.password, {
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
    [role.rows[0].id_rol, actor.label, actor.email, passwordHash],
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
  const placas = `CONC-${suffix}`.slice(0, 20);
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
      placas,
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

  return { idInfraccion, suffix, placas };
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

async function postCreated(actor, endpoint, payload) {
  const response = await authPost(actor, endpoint, payload);
  const result = await parseResponse(response);
  assert(
    response.status === 201,
    `${endpoint}: HTTP ${response.status}: ${JSON.stringify(result)}`,
  );
  return result;
}

async function createRetainedInfraccion(actor, ids) {
  const infraccion = await createInfraccion(actor, ids);
  const retencion = await postCreated(actor, '/api/encierros/retenciones', {
    idInfraccion: infraccion.idInfraccion,
    idEncierro: ids.idEncierro,
    recibidoPor: 'PRUEBA DE ROLLBACK',
  });
  return { ...infraccion, idRetencionVehiculo: retencion.idRetencionVehiculo };
}

async function readOperationState(client, fixture, operation) {
  const { idInfraccion, idRetencionVehiculo } = fixture;
  const { movement, audit, auditKey } = operation;
  const auditId =
    auditKey === 'idRetencionVehiculo' ? idRetencionVehiculo : idInfraccion;
  const {
    rows: [state],
  } = await client.query(
    `
      SELECT i.folio_infraccion AS folio, e.nombre_estatus AS status,
        (SELECT id_solventacion_sin_pago FROM solventacion_sin_pago
          WHERE id_infraccion = i.id_infraccion) AS solventacion,
        (SELECT id_liberacion_vehiculo FROM liberacion_vehiculo
          WHERE id_infraccion = i.id_infraccion) AS liberacion,
        (SELECT jsonb_build_object(
                  'id', s.id_salida_vehiculo, 'liberacion', s.id_liberacion_vehiculo,
                  'modalidad', s.modalidad_salida, 'folioPresentado', s.folio_liberacion_presentado)
          FROM salida_vehiculo s WHERE s.id_retencion_vehiculo = $2) AS salida,
        ARRAY(SELECT me.nombre_estatus FROM infraccion_movimiento m
          JOIN estatus_infraccion me USING (id_estatus_infraccion)
          WHERE m.id_infraccion = i.id_infraccion AND m.accion = $3
          ORDER BY m.id_infraccion_movimiento) AS movements,
        (SELECT COUNT(*)::int FROM auditoria a
          WHERE a.accion = $4 AND a.despues_json ->> $5::text = $6::text) AS audits
      FROM infracciones i
      JOIN estatus_infraccion e USING (id_estatus_infraccion)
      WHERE i.id_infraccion = $1
    `,
    [idInfraccion, idRetencionVehiculo, movement, audit, auditKey, auditId],
  );
  assert(
    state?.folio === `CONC-${fixture.suffix}`,
    'La API y PostgreSQL deben usar el mismo expediente de prueba',
  );
  return state;
}

async function assertOperationRollback(client, actor, fixture, operation) {
  const { audit, auditKey, endpoint, payload, expectedStatus } = operation;
  const before = await readOperationState(client, fixture, operation);
  const auditId =
    auditKey === 'idRetencionVehiculo'
      ? fixture.idRetencionVehiculo
      : fixture.idInfraccion;
  const constraint = client.escapeIdentifier(
    `operation_rollback_fixture_${fixture.idInfraccion}`,
  );
  await client.query(
    `ALTER TABLE auditoria ADD CONSTRAINT ${constraint}
      CHECK (accion <> ${client.escapeLiteral(audit)}
        OR despues_json ->> ${client.escapeLiteral(auditKey)}
          IS DISTINCT FROM ${client.escapeLiteral(String(auditId))}) NOT VALID`,
  );
  try {
    const response = await authPost(actor, endpoint, payload);
    const result = await parseResponse(response);
    assert(
      response.status === 500,
      `${audit}: se esperaba HTTP 500: ${JSON.stringify(result)}`,
    );
  } finally {
    await client.query(`ALTER TABLE auditoria DROP CONSTRAINT ${constraint}`);
  }

  const after = await readOperationState(client, fixture, operation);
  assert(
    isDeepStrictEqual(after, before),
    `${audit}: persistieron cambios tras fallar la auditoria: ${JSON.stringify({ before, after })}`,
  );

  const response = await postCreated(actor, endpoint, payload);
  const committed = await readOperationState(client, fixture, operation);
  assert(
    committed.status === expectedStatus &&
      isDeepStrictEqual(committed.movements, [
        ...before.movements,
        expectedStatus,
      ]) &&
      committed.audits === before.audits + 1,
    `${audit}: el reintento no guardo estatus, movimiento y auditoria: ${JSON.stringify(committed)}`,
  );
  return { response, committed };
}

function noPaymentPayload(idInfraccion) {
  return {
    idInfraccion,
    motivo: 'Solventacion de prueba sin linea de captura',
  };
}

async function testNoPaymentRollback(client, actor, ids) {
  const fixture = await createRetainedInfraccion(actor, ids);
  const { response, committed } = await assertOperationRollback(
    client,
    actor,
    fixture,
    {
      movement: 'NO_APLICA_PAGO',
      audit: 'NO_APLICA_PAGO',
      auditKey: 'idInfraccion',
      endpoint: '/api/pagos/no-aplica',
      payload: noPaymentPayload(fixture.idInfraccion),
      expectedStatus: 'SOLVENTADA_SIN_PAGO',
    },
  );
  assert(
    committed.solventacion === response.idSolventacionSinPago &&
      response.infraccion.idInfraccion === fixture.idInfraccion,
    'El reintento debe guardar y devolver la solventacion del expediente',
  );
}

async function testReleaseRollback(client, actor, ids, yardActor) {
  const fixture = await createRetainedInfraccion(actor, ids);
  const { idInfraccion, idRetencionVehiculo, suffix, placas } = fixture;
  const folioLiberacion = `LIB-ROLLBACK-${suffix}`;
  const earlyExit = yardActor
    ? await postCreated(yardActor, '/api/encierros/salidas/anticipadas', {
        idRetencionVehiculo,
        folioLiberacionPresentado: folioLiberacion,
        placasCotejadas: placas,
        datosVehiculoCotejados: {},
        autorizacionDocumentalVerificada: true,
        nombrePropietarioDeclarado: 'PERSONA DE PRUEBA',
        validadoPor: 'ENCIERRO DE PRUEBA',
        personaRecibeVehiculo: 'PERSONA DE PRUEBA',
      })
    : null;
  const solventacion = await postCreated(
    actor,
    '/api/pagos/no-aplica',
    noPaymentPayload(idInfraccion),
  );
  const payload = {
    idInfraccion,
    folioLiberacion,
    liberadoPor: 'PRUEBA DE ROLLBACK',
  };
  const operation = {
    movement: 'LIBERACION_GENERADA',
    audit: 'LIBERACION_GENERADA',
    auditKey: 'idInfraccion',
    endpoint: '/api/liberaciones',
    payload,
    expectedStatus: earlyExit ? 'VEHICULO_ENTREGADO' : 'LIBERACION_GENERADA',
  };

  if (earlyExit) {
    const before = await readOperationState(client, fixture, operation);
    assert(
      before.salida?.liberacion === null &&
        before.status === 'VEHICULO_ENTREGADO',
      'La salida anticipada debe existir sin liberacion electronica',
    );
    const mismatch = await authPost(actor, operation.endpoint, {
      ...payload,
      folioLiberacion: `OTRO-${suffix}`,
    });
    await parseResponse(mismatch);
    assert(
      mismatch.status === 400,
      'Debe rechazarse la conciliacion con un folio discordante',
    );
    assert(
      isDeepStrictEqual(
        await readOperationState(client, fixture, operation),
        before,
      ),
      'El folio discordante cambio el expediente',
    );
  }

  const { response, committed } = await assertOperationRollback(
    client,
    actor,
    fixture,
    operation,
  );
  assert(
    committed.liberacion === response.idLiberacionVehiculo &&
      response.solventacionSinPago.idSolventacionSinPago ===
        solventacion.idSolventacionSinPago,
    'La liberacion debe quedar respaldada por la solventacion sin pago',
  );
  if (earlyExit) {
    assert(
      isDeepStrictEqual(committed.salida, {
        id: earlyExit.idSalidaVehiculo,
        liberacion: response.idLiberacionVehiculo,
        modalidad: 'ANTICIPADA',
        folioPresentado: folioLiberacion,
      }),
      'La conciliacion debe vincular la misma salida anticipada y conservar su folio',
    );
  }
}

async function testExitRollback(client, actor, ids) {
  const fixture = await createRetainedInfraccion(actor, ids);
  const { idInfraccion, idRetencionVehiculo, suffix } = fixture;
  await postCreated(
    actor,
    '/api/pagos/no-aplica',
    noPaymentPayload(idInfraccion),
  );
  const liberacion = await postCreated(actor, '/api/liberaciones', {
    idInfraccion,
    folioLiberacion: `LIB-ROLLBACK-${suffix}`,
    liberadoPor: 'PRUEBA DE ROLLBACK',
  });
  const { response, committed } = await assertOperationRollback(
    client,
    actor,
    fixture,
    {
      movement: 'VEHICULO_ENTREGADO',
      audit: 'SALIDA_ENCIERRO_REGISTRADA',
      auditKey: 'idRetencionVehiculo',
      endpoint: '/api/encierros/salidas',
      payload: {
        idRetencionVehiculo,
        idLiberacionVehiculo: liberacion.idLiberacionVehiculo,
        validadoPor: 'PRUEBA DE ROLLBACK',
        personaRecibeVehiculo: 'PERSONA DE PRUEBA',
        estadoSalida: 'ENTREGADO',
      },
      expectedStatus: 'VEHICULO_ENTREGADO',
    },
  );
  assert(
    committed.salida?.id === response.idSalidaVehiculo &&
      committed.salida.liberacion === liberacion.idLiberacionVehiculo &&
      committed.salida.modalidad === 'ORDINARIA',
    'El reintento debe guardar una salida ordinaria vinculada a la liberacion',
  );
}

async function runOperationRollbackCases(client, actor, ids) {
  const yard = {
    role: 'ENCIERRO',
    label: 'Encierro de prueba',
    email: `concurrency-yard-${randomUUID()}@example.test`,
    password: randomUUID(),
  };
  await seedTestActor(client, yard);
  const yardActor = await login(yard.email, yard.password, yard.label);
  const cases = [
    ['No aplica pago', () => testNoPaymentRollback(client, actor, ids)],
    ['liberacion', () => testReleaseRollback(client, actor, ids)],
    ['salida ordinaria', () => testExitRollback(client, actor, ids)],
    [
      'conciliacion de salida anticipada',
      () => testReleaseRollback(client, actor, ids, yardActor),
    ],
  ];
  const failures = [];
  for (const [label, test] of cases) {
    try {
      await test();
      console.log(`rollback de ${label} y reintento: OK`);
    } catch (error) {
      failures.push(
        `${label}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  assert(failures.length === 0, failures.join('\n'));
}


const E2E_REPORT_FIELDS = [
  'folioInfraccion',
  'estatusInfraccionNombre',
  'pagoAccion',
  'tienePago',
  'idPagoInfraccion',
  'montoPagado',
  'pagoResumen',
  'estadoOperativo',
  'validacionPagoEncierro',
];

async function readOperationalStage(actor, fixture, expected) {
  const { idInfraccion, suffix } = fixture;
  const detailResponse = await authGet(
    actor,
    `/api/infracciones/${idInfraccion}/detalle`,
  );
  const detail = await parseResponse(detailResponse);
  assert(
    detailResponse.status === 200,
    `E2E ${expected.label}: detalle HTTP ${detailResponse.status}: ${JSON.stringify(detail)}`,
  );

  const listResponse = await authGet(
    actor,
    `/api/infracciones?folioInfraccion=${encodeURIComponent(`CONC-${suffix}`)}`,
  );
  const list = await parseResponse(listResponse);
  assert(
    listResponse.status === 200 && list?.meta?.total === 1 &&
      list?.data?.length === 1,
    `E2E ${expected.label}: listado inconsistente: HTTP ${listResponse.status}: ${JSON.stringify(list)}`,
  );

  const item = list.data[0];
  const context = `E2E ${expected.label} / infraccion ${idInfraccion}`;
  assert(
    detail.infraccion?.idInfraccion === idInfraccion &&
      item.idInfraccion === idInfraccion &&
      detail.infraccion.folioInfraccion === `CONC-${suffix}`,
    `${context}: detalle y listado no corresponden al mismo expediente`,
  );
  assert(
    detail.estatusInfraccion.nombreEstatus === expected.status &&
      item.estatusInfraccion.nombreEstatus === expected.status,
    `${context}: estatus de detalle/listado distintos a ${expected.status}`,
  );
  assert(
    Boolean(detail.retencionVehiculo) === expected.retencion &&
      Boolean(item.retencion) === expected.retencion &&
      detail.pagos.length === 0 &&
      item.pago.tienePago === false &&
      detail.liberaciones.length === expected.liberaciones &&
      item.liberacion.tieneLiberacion === (expected.liberaciones > 0) &&
      detail.salidas.length === expected.salidas &&
      item.salida.tieneSalida === (expected.salidas > 0),
    `${context}: pagos, retencion, liberacion o salida incongruentes`,
  );
  assert(
    item.pago.tieneSolventacionSinPago === expected.solventada,
    `${context}: bandera de solventacion sin pago inesperada`,
  );

  return { detail, item };
}

async function readOperationalExcel(actor, fixture, stage) {
  const response = await authPost(actor, '/api/infracciones/reportes/excel', {
    idInfracciones: [fixture.idInfraccion],
    campos: E2E_REPORT_FIELDS,
  });
  if (response.status !== 200) {
    const errorBody = await parseResponse(response);
    throw new Error(
      `E2E ${stage}: Excel HTTP ${response.status}: ${JSON.stringify(errorBody)}`,
    );
  }
  assert(
    response.headers.get('content-type')?.includes('spreadsheetml.sheet'),
    `E2E ${stage}: el servidor no respondio con un XLSX`,
  );

  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.subarray(0, 2).toString() === 'PK', `E2E ${stage}: XLSX invalido`);
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  const worksheet = workbook.Sheets.Infracciones;
  assert(worksheet, `E2E ${stage}: falta la hoja Infracciones`);
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: '',
  });
  assert(
    rows.length === 2,
    `E2E ${stage}: se esperaba una sola infraccion en Excel, obtenido ${rows.length - 1}`,
  );
  const cells = Object.fromEntries(
    E2E_REPORT_FIELDS.map((field, index) => [
      field,
      String(rows[1][index] ?? ''),
    ]),
  );
  assert(
    cells.folioInfraccion === `CONC-${fixture.suffix}`,
    `E2E ${stage}: XLSX exporto otro expediente`,
  );

  return cells;
}

function collectExcelDifferences(stage, cells, expected, problems) {
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (cells[field] !== expectedValue) {
      problems.push(
        `${stage} / ${field}: esperado ${JSON.stringify(expectedValue)}, recibido ${JSON.stringify(cells[field])}`,
      );
    }
  }
}

async function runOperationalE2e(client, actor, ids) {
  // La prueba utiliza exclusivamente la API y la base desechable del workflow.
  const fixture = await createInfraccion(actor, ids);
  const { idInfraccion, suffix } = fixture;
  const expectedZeroPayment = {
    tienePago: 'Sin pago',
    idPagoInfraccion: 'Sin informacion registrada',
    montoPagado: 'Sin informacion registrada',
  };
  const problems = [];

  await readOperationalStage(actor, fixture, {
    label: 'captura',
    status: 'CAPTURADA',
    retencion: false,
    solventada: false,
    liberaciones: 0,
    salidas: 0,
  });

  const retencion = await postCreated(actor, '/api/encierros/retenciones', {
    idInfraccion,
    idEncierro: ids.idEncierro,
    recibidoPor: 'E2E OPERATIVO',
    folioResguardo: `RES-E2E-${suffix}`,
    estadoIngreso: 'INGRESADO',
  });
  assert(Number(retencion.idRetencionVehiculo) > 0, 'E2E: retencion sin ID');
  const retained = await readOperationalStage(actor, fixture, {
    label: 'retencion',
    status: 'CAPTURADA',
    retencion: true,
    solventada: false,
    liberaciones: 0,
    salidas: 0,
  });
  assert(
    retained.detail.retencionVehiculo.idRetencionVehiculo ===
      retencion.idRetencionVehiculo,
    'E2E: expediente contiene otra retencion',
  );

  const solventacion = await postCreated(actor, '/api/pagos/no-aplica', {
    idInfraccion,
    motivo: 'Solventacion E2E documentada; no se registro pago',
  });
  assert(Number(solventacion.idSolventacionSinPago) > 0, 'E2E: solventacion sin ID');
  await readOperationalStage(actor, fixture, {
    label: 'solventacion',
    status: 'SOLVENTADA_SIN_PAGO',
    retencion: true,
    solventada: true,
    liberaciones: 0,
    salidas: 0,
  });
  collectExcelDifferences(
    'solventacion',
    await readOperationalExcel(actor, fixture, 'solventacion'),
    {
      estatusInfraccionNombre: 'SOLVENTADA_SIN_PAGO',
      ...expectedZeroPayment,
      pagoAccion: 'Solventada sin pago',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'Solventada, pendiente de liberacion',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo en encierro',
    },
    problems,
  );

  const liberacion = await postCreated(actor, '/api/liberaciones', {
    idInfraccion,
    idSolventacionSinPago: solventacion.idSolventacionSinPago,
    folioLiberacion: `LIB-E2E-${suffix}`,
    liberadoPor: 'E2E OPERATIVO',
  });
  assert(Number(liberacion.idLiberacionVehiculo) > 0, 'E2E: liberacion sin ID');
  const released = await readOperationalStage(actor, fixture, {
    label: 'liberacion',
    status: 'LIBERACION_GENERADA',
    retencion: true,
    solventada: true,
    liberaciones: 1,
    salidas: 0,
  });
  assert(
    released.detail.liberaciones[0].idLiberacionVehiculo ===
      liberacion.idLiberacionVehiculo,
    'E2E: detalle contiene otra liberacion',
  );
  collectExcelDifferences(
    'liberacion',
    await readOperationalExcel(actor, fixture, 'liberacion'),
    {
      estatusInfraccionNombre: 'LIBERACION_GENERADA',
      ...expectedZeroPayment,
      pagoAccion: 'Solventada sin pago',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'LIBERADO_PENDIENTE_SALIDA',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo en encierro',
    },
    problems,
  );

  const salida = await postCreated(actor, '/api/encierros/salidas', {
    idRetencionVehiculo: retencion.idRetencionVehiculo,
    idLiberacionVehiculo: liberacion.idLiberacionVehiculo,
    validadoPor: 'E2E OPERATIVO',
    personaRecibeVehiculo: 'PROPIETARIO E2E',
    estadoSalida: 'ENTREGADO',
  });
  assert(Number(salida.idSalidaVehiculo) > 0, 'E2E: salida sin ID');
  const delivered = await readOperationalStage(actor, fixture, {
    label: 'salida',
    status: 'VEHICULO_ENTREGADO',
    retencion: true,
    solventada: true,
    liberaciones: 1,
    salidas: 1,
  });
  assert(
    delivered.detail.salidas[0].idSalidaVehiculo === salida.idSalidaVehiculo,
    'E2E: detalle contiene otra salida',
  );
  collectExcelDifferences(
    'salida',
    await readOperationalExcel(actor, fixture, 'salida'),
    {
      estatusInfraccionNombre: 'VEHICULO_ENTREGADO',
      ...expectedZeroPayment,
      pagoAccion: 'Solventada sin pago',
      pagoResumen: 'Solventada sin pago',
      estadoOperativo: 'VEHICULO_ENTREGADO',
      validacionPagoEncierro: 'Solventada sin pago | Vehiculo entregado',
    },
    problems,
  );

  const [payments, solventaciones] = await Promise.all([
    client.query(
      'SELECT COUNT(*)::int AS total FROM pago_infraccion WHERE id_infraccion = $1',
      [idInfraccion],
    ),
    client.query(
      'SELECT COUNT(*)::int AS total FROM solventacion_sin_pago WHERE id_infraccion = $1',
      [idInfraccion],
    ),
  ]);
  const paymentCount = Number(payments.rows[0]?.total);
  const noPaymentCount = Number(solventaciones.rows[0]?.total);
  assert(
    paymentCount === 0 && noPaymentCount === 1,
    'E2E: la solventacion creo pagos o duplico el respaldo administrativo',
  );
  const { rows: releaseBacking } = await client.query(
    `SELECT id_pago_infraccion AS "idPago",
            id_solventacion_sin_pago AS "idSolventacion"
     FROM liberacion_vehiculo WHERE id_liberacion_vehiculo = $1`,
    [liberacion.idLiberacionVehiculo],
  );
  assert(
    releaseBacking.length === 1 &&
      releaseBacking[0].idPago === null &&
      Number(releaseBacking[0].idSolventacion) === solventacion.idSolventacionSinPago,
    'E2E: la liberacion no conserva el respaldo exclusivo de solventacion',
  );
  const movements = delivered.detail.movimientos.map((movement) => movement.accion);
  for (const action of ['NO_APLICA_PAGO', 'LIBERACION_GENERADA', 'VEHICULO_ENTREGADO']) {
    assert(movements.includes(action), `E2E: falta movimiento ${action}`);
  }

  assert(
    problems.length === 0,
    `E2E: el XLSX no conserva la solventacion durante el flujo completo:\n${problems.join('\n')}`,
  );
  console.log('FLUJO_EXPEDIENTE_E2E_OK');
}

async function main() {
  assert(
    isDisposablePaymentDatabase(),
    'El smoke requiere NODE_ENV=test, API y PostgreSQL en 127.0.0.1 y una base desechable (control_infracciones_pagos_test_* en local).',
  );
  const client = dbClient();
  await client.connect();

  try {
    await seedTestActor(client, {
      role: 'ADMIN',
      label: 'Concurrency Admin B',
      email: secondAdminEmail,
      password: secondAdminPassword,
    });
    const ids = await readFixtureIds(client);

    const actorA = await login(adminEmail, adminPassword, 'admin A');
    const actorB = await login(secondAdminEmail, secondAdminPassword, 'admin B');

    await runPaymentRollbackCases(client, actorA, ids);
    await runOperationRollbackCases(client, actorA, ids);

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

    await runOperationalE2e(client, actorA, ids);
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

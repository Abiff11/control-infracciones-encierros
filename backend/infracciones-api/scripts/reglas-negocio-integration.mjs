import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import pg from 'pg';

const { Client } = pg;
const apiRoot = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const databasePrefix = 'control_infracciones_reglas_test_';
const csrfCookieName = 'cie_csrf_token';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function loadLocalConfig() {
  const file = path.join(apiRoot, '.env');
  try {
    return dotenv.parse(readFileSync(file));
  } catch {
    return {};
  }
}

function assertSafeEnvironment(config) {
  assert(process.env.NODE_ENV === 'test', 'NODE_ENV debe ser test');
  assert(config.host === '127.0.0.1', 'DB_HOST debe ser 127.0.0.1');
  assert(Number.isInteger(config.port) && config.port > 0, 'DB_PORT invalido');
  assert(config.user && config.password, 'Faltan credenciales PostgreSQL locales');
}

async function freeLocalPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert(address && typeof address === 'object', 'No se pudo reservar puerto');
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

function runNpm(args, env) {
  const result = spawnSync(npmCommand, args, {
    cwd: apiRoot,
    env,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
      .trim()
      .split(/\r?\n/)
      .slice(-30)
      .join('\n');
    throw new Error(`${npmCommand} ${args.join(' ')} fallo:\n${output}`);
  }
}

async function waitForApi(apiProcess, baseUrl, logs) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (apiProcess.exitCode !== null) {
      throw new Error(`La API termino durante el inicio:\n${logs.join('')}`);
    }
    const response = await fetch(`${baseUrl}/api/health`).catch(() => null);
    if (response?.ok) return;
    await delay(250);
  }
  throw new Error(`La API no quedo saludable:\n${logs.join('')}`);
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

function extractCookie(headers, name) {
  const prefix = `${name}=`;
  for (const setCookie of getSetCookies(headers)) {
    const pair = setCookie.split(';', 1)[0] ?? '';
    if (pair.startsWith(prefix)) return decodeURIComponent(pair.slice(prefix.length));
  }
  return null;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function login(baseUrl, email, password) {
  const tokenCheck = await fetch(`${baseUrl}/api/auth/token-check`);
  assert(tokenCheck.status === 200, `token-check HTTP ${tokenCheck.status}`);
  const csrfToken = extractCookie(tokenCheck.headers, csrfCookieName);
  assert(csrfToken, 'token-check no emitio cookie CSRF');
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: `${csrfCookieName}=${encodeURIComponent(csrfToken)}`,
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await parseResponse(response);
  assert(response.ok, `login HTTP ${response.status}: ${JSON.stringify(payload)}`);
  return { accessToken: payload.accessToken, csrfToken };
}

async function authPost(baseUrl, actor, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${actor.accessToken}`,
      'content-type': 'application/json',
      cookie: `${csrfCookieName}=${encodeURIComponent(actor.csrfToken)}`,
      'x-csrf-token': actor.csrfToken,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await parseResponse(response) };
}

async function seedActor(client, actor) {
  const role = await client.query('SELECT id_rol FROM rol WHERE nombre_rol = $1', [
    actor.role,
  ]);
  assert(role.rowCount === 1, `No existe el rol ${actor.role}`);
  const passwordHash = await argon2.hash(actor.password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await client.query(
    `INSERT INTO usuarios (
       id_rol, nombre_usuario, email, password_hash, activo,
       auth_session_version, failed_login_attempts, password_changed_at
     ) VALUES ($1, $2, $3, $4, TRUE, 0, 0, NOW())`,
    [role.rows[0].id_rol, actor.label, actor.email, passwordHash],
  );
}

async function readFixtureIds(client) {
  const queries = {
    idSexo: 'SELECT id_sexo AS id FROM sexo ORDER BY id_sexo LIMIT 1',
    idClaseVehiculo:
      'SELECT id_clase_vehiculo AS id FROM clase_vehiculo ORDER BY id_clase_vehiculo LIMIT 1',
    idLineaVehiculo:
      'SELECT id_linea_vehiculo AS id FROM linea_vehiculo ORDER BY id_linea_vehiculo LIMIT 1',
    idServicio: 'SELECT id_servicio AS id FROM servicio ORDER BY id_servicio LIMIT 1',
    idDelegacion:
      'SELECT id_delegacion AS id FROM delegacion ORDER BY id_delegacion LIMIT 1',
    idTipoProcedimiento:
      "SELECT id_tipo_procedimiento AS id FROM tipo_procedimiento WHERE clave_tipo_procedimiento = 'INFRACCION' LIMIT 1",
    idEstatusInfraccion:
      "SELECT id_estatus_infraccion AS id FROM estatus_infraccion WHERE nombre_estatus = 'CAPTURADA' LIMIT 1",
    idMotivo: 'SELECT id_motivo AS id FROM motivo ORDER BY id_motivo LIMIT 1',
    idEncierro: 'SELECT id_encierro AS id FROM encierro ORDER BY id_encierro LIMIT 1',
  };
  const ids = {};
  for (const [key, sql] of Object.entries(queries)) {
    const result = await client.query(sql);
    assert(result.rowCount === 1, `No se pudo resolver ${key}`);
    ids[key] = Number(result.rows[0].id);
  }
  return ids;
}

function infraccionPayload(ids, suffix, overrides = {}) {
  return {
    infractor: {
      idSexo: ids.idSexo,
      nombre: `REGLAS-${suffix}`,
      apellidoPaterno: 'PRUEBA',
    },
    vehiculo: {
      idClaseVehiculo: ids.idClaseVehiculo,
      idLineaVehiculo: ids.idLineaVehiculo,
      idServicio: ids.idServicio,
      placas: `R-${suffix}`.slice(0, 20),
      color: 'PRUEBA',
    },
    lugarInfraccion: { municipio: `MUNICIPIO-${suffix}` },
    infraccion: {
      idDelegacion: ids.idDelegacion,
      idTipoProcedimiento: ids.idTipoProcedimiento,
      idEstatusInfraccion: ids.idEstatusInfraccion,
      folioInfraccion: `RN-${suffix}`,
      fechaInfraccion: '2026-11-23',
      horaInfraccion: '10:00:00',
      motivos: [ids.idMotivo],
      ...overrides,
    },
  };
}

async function countRows(client, table, where = '', values = []) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total FROM ${table}${where ? ` WHERE ${where}` : ''}`,
    values,
  );
  return Number(result.rows[0].total);
}

async function assertOperationalCounts(client, expected, label) {
  for (const [table, total] of Object.entries(expected)) {
    const actual = await countRows(client, table);
    assert(actual === total, `${label}: ${table} cambio de ${total} a ${actual}`);
  }
}

async function captureCounts(client) {
  const tables = [
    'infracciones',
    'infractor',
    'vehiculo',
    'infraccion_motivo',
    'retencion_vehiculo',
    'pago_infraccion',
    'pago_concepto',
    'infraccion_movimiento',
    'auditoria',
  ];
  const counts = {};
  for (const table of tables) counts[table] = await countRows(client, table);
  return counts;
}

function assertHttp(result, expected, label) {
  assert(
    result.status === expected,
    `${label}: HTTP ${result.status}, esperado ${expected}: ${JSON.stringify(result.body)}`,
  );
}

async function runCases(client, baseUrl, actor, ids) {
  const evidence = [];
  const sequentialSuffix = `DUP-${randomBytes(4).toString('hex')}`;
  const original = await authPost(
    baseUrl,
    actor,
    '/api/infracciones',
    infraccionPayload(ids, sequentialSuffix),
  );
  assertHttp(original, 201, 'captura inicial');
  const beforeDuplicate = await captureCounts(client);
  const duplicate = await authPost(
    baseUrl,
    actor,
    '/api/infracciones',
    infraccionPayload(ids, `${sequentialSuffix}-OTRO`, {
      folioInfraccion: `RN-${sequentialSuffix}`,
    }),
  );
  assertHttp(duplicate, 409, 'folio duplicado detectado por servicio');
  await assertOperationalCounts(client, beforeDuplicate, 'folio duplicado por servicio');
  evidence.push(['folio duplicado servicio', 409, null, 'sin cambios', 'aprobado']);

  await client.query(`
    CREATE OR REPLACE FUNCTION reglas_test_delay_infraccion()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_sleep(0.5);
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER reglas_test_delay_infraccion
    BEFORE INSERT ON infracciones
    FOR EACH ROW EXECUTE FUNCTION reglas_test_delay_infraccion();
  `);
  const raceSuffix = `RACE-${randomBytes(4).toString('hex')}`;
  let raceResults;
  try {
    raceResults = await Promise.all([
      authPost(
        baseUrl,
        actor,
        '/api/infracciones',
        infraccionPayload(ids, `${raceSuffix}-A`, { folioInfraccion: `RN-${raceSuffix}` }),
      ),
      authPost(
        baseUrl,
        actor,
        '/api/infracciones',
        infraccionPayload(ids, `${raceSuffix}-B`, { folioInfraccion: `RN-${raceSuffix}` }),
      ),
    ]);
  } finally {
    await client.query('DROP TRIGGER IF EXISTS reglas_test_delay_infraccion ON infracciones');
    await client.query('DROP FUNCTION IF EXISTS reglas_test_delay_infraccion()');
  }
  const raceStatuses = raceResults.map((result) => result.status).sort();
  assert(
    JSON.stringify(raceStatuses) === JSON.stringify([201, 409]),
    `colision unica HTTP inesperada: ${JSON.stringify(raceResults)}`,
  );
  const raceRows = await countRows(client, 'infracciones', 'folio_infraccion = $1', [
    `RN-${raceSuffix}`,
  ]);
  const raceInfractors = await countRows(client, 'infractor', 'nombre LIKE $1', [
    `REGLAS-${raceSuffix}%`,
  ]);
  assert(raceRows === 1 && raceInfractors === 1, 'La colision unica dejo relaciones parciales');
  evidence.push(['colision indice unico', 409, '23505', 'una transaccion revertida', 'aprobado']);

  const invalidCases = [
    {
      label: 'motivo inexistente',
      route: '/api/infracciones',
      body: infraccionPayload(ids, `MOT-${randomBytes(3).toString('hex')}`, {
        motivos: [2147483647],
      }),
      status: 404,
    },
    {
      label: 'encierro inexistente',
      route: '/api/infracciones',
      body: infraccionPayload(ids, `ENC-${randomBytes(3).toString('hex')}`, {
        idEncierro: 2147483647,
      }),
      status: 404,
    },
    {
      label: 'infraccion inexistente en retencion',
      route: '/api/encierros/retenciones',
      body: {
        idInfraccion: 2147483647,
        idEncierro: ids.idEncierro,
        recibidoPor: 'PRUEBA 4B',
      },
      status: 404,
    },
  ];
  for (const testCase of invalidCases) {
    const before = await captureCounts(client);
    const result = await authPost(baseUrl, actor, testCase.route, testCase.body);
    assertHttp(result, testCase.status, testCase.label);
    await assertOperationalCounts(client, before, testCase.label);
    evidence.push([testCase.label, testCase.status, null, 'sin cambios', 'aprobado']);
  }

  const paymentFixture = await authPost(
    baseUrl,
    actor,
    '/api/infracciones',
    infraccionPayload(ids, `PAY-${randomBytes(3).toString('hex')}`),
  );
  assertHttp(paymentFixture, 201, 'expediente para montos');
  const idInfraccion = Number(paymentFixture.body?.infraccion?.idInfraccion);
  assert(Number.isInteger(idInfraccion), 'Respuesta sin idInfraccion para montos');
  const moneyCases = [
    ['texto', 'abc'],
    ['negativo', '-1.00'],
    ['cero', '0'],
    ['tres decimales', '1.234'],
    ['formato invalido', '12,34'],
  ];
  for (const [label, monto] of moneyCases) {
    const before = await captureCounts(client);
    const result = await authPost(baseUrl, actor, '/api/pagos', {
      idInfraccion,
      folioLineaCaptura: `MONTO-${label}-${randomBytes(2).toString('hex')}`,
      conceptos: [{ claveConcepto: '4B', monto }],
    });
    assertHttp(result, 400, `monto ${label}`);
    await assertOperationalCounts(client, before, `monto ${label}`);
    evidence.push([`monto ${label}`, 400, null, 'sin cambios', 'aprobado']);
  }

  const validPaymentFolio = `PAGO-4B-${randomBytes(4).toString('hex')}`;
  const validPayment = await authPost(baseUrl, actor, '/api/pagos', {
    idInfraccion,
    folioLineaCaptura: validPaymentFolio,
    conceptos: [{ claveConcepto: '4B-VALIDO', monto: '10.00' }],
  });
  assertHttp(validPayment, 201, 'pago valido para SQLSTATE');
  const actorRow = await client.query('SELECT id_usuario FROM usuarios WHERE email = $1', [
    'reglas-4b@example.test',
  ]);
  const beforeUniqueViolation = await captureCounts(client);
  let uniqueSqlState = null;
  try {
    await client.query(
      `INSERT INTO pago_infraccion
       (id_infraccion, id_usuario_registra_pago, folio_linea_captura, monto,
        monto_infraccion, dias_piso_cobrados, monto_dias_piso, fecha_pago)
       VALUES ($1, $2, $3, 10, 10, 0, 0, NOW())`,
      [idInfraccion, actorRow.rows[0].id_usuario, validPaymentFolio],
    );
  } catch (error) {
    uniqueSqlState = error.code;
  }
  assert(uniqueSqlState === '23505', `SQLSTATE unico inesperado: ${uniqueSqlState}`);
  await assertOperationalCounts(
    client,
    beforeUniqueViolation,
    'violacion unica directa',
  );
  evidence.push(['violacion unica directa', null, '23505', 'sentencia revertida', 'aprobado']);

  const beforeForeignKeyViolation = await captureCounts(client);
  let foreignKeySqlState = null;
  try {
    await client.query(
      `INSERT INTO retencion_vehiculo
       (id_infraccion, id_encierro, fecha_ingreso, recibido_por)
       VALUES (2147483647, $1, NOW(), 'PRUEBA 4B')`,
      [ids.idEncierro],
    );
  } catch (error) {
    foreignKeySqlState = error.code;
  }
  assert(foreignKeySqlState === '23503', `SQLSTATE FK inesperado: ${foreignKeySqlState}`);
  await assertOperationalCounts(
    client,
    beforeForeignKeyViolation,
    'violacion FK directa',
  );
  evidence.push(['violacion FK directa', null, '23503', 'sentencia revertida', 'aprobado']);

  for (const [scenario, http, sqlstate, changes, result] of evidence) {
    console.log(
      `4B | ${scenario} | HTTP=${http ?? 'N/A'} | SQLSTATE=${sqlstate ?? 'N/A'} | ${changes} | ${result}`,
    );
  }
  console.log('REGLAS_NEGOCIO_INTEGRATION_OK');
}

async function main() {
  const local = loadLocalConfig();
  const config = {
    host: process.env.DB_HOST ?? local.DB_HOST,
    port: Number(process.env.DB_PORT ?? local.DB_PORT),
    user: process.env.DB_USERNAME ?? local.DB_USERNAME,
    password: process.env.DB_PASSWORD ?? local.DB_PASSWORD,
  };
  assertSafeEnvironment(config);
  const database = `${databasePrefix}${randomBytes(6).toString('hex')}`;
  assert(new RegExp(`^${databasePrefix}[a-f0-9]{12}$`).test(database), 'Nombre de base inseguro');
  const port = await freeLocalPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const admin = new Client({ ...config, database: 'postgres' });
  const apiLogs = [];
  let apiProcess;
  let databaseCreated = false;
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${database}`);
    databaseCreated = true;
    const actor = {
      role: 'ADMIN',
      label: 'Reglas 4B',
      email: 'reglas-4b@example.test',
      password: randomBytes(24).toString('hex'),
    };
    const env = {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DB_HOST: config.host,
      DB_PORT: String(config.port),
      DB_USERNAME: config.user,
      DB_PASSWORD: config.password,
      DB_DATABASE: database,
      DB_SYNCHRONIZE: 'false',
      DB_LOGGING: 'false',
      JWT_SECRET: randomBytes(32).toString('hex'),
      CSRF_SECRET: randomBytes(32).toString('hex'),
      THROTTLE_DEFAULT_LIMIT: '1000',
      THROTTLE_READ_LIMIT: '1000',
      THROTTLE_WRITE_LIMIT: '1000',
      THROTTLE_AUTH_LIMIT: '100',
    };
    runNpm(['run', 'migration:run'], env);
    runNpm(['run', 'migration:revert'], env);
    runNpm(['run', 'migration:run'], env);
    runNpm(['run', 'seed:initial'], env);
    const client = new Client({ ...config, database });
    await client.connect();
    try {
      await seedActor(client, actor);
      const ids = await readFixtureIds(client);
      apiProcess = spawn(process.execPath, ['dist/main.js'], {
        cwd: apiRoot,
        env,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      apiProcess.stdout.on('data', (chunk) => apiLogs.push(chunk.toString()));
      apiProcess.stderr.on('data', (chunk) => apiLogs.push(chunk.toString()));
      await waitForApi(apiProcess, baseUrl, apiLogs);
      const session = await login(baseUrl, actor.email, actor.password);
      await runCases(client, baseUrl, session, ids);
    } finally {
      await client.end();
    }
  } finally {
    if (apiProcess && apiProcess.exitCode === null) {
      const closed = new Promise((resolve) => apiProcess.once('close', resolve));
      apiProcess.kill();
      await closed;
    }
    if (databaseCreated) {
      assert(database.startsWith(databasePrefix), 'Se rechazo DROP DATABASE por nombre inseguro');
      await admin.query(`DROP DATABASE ${database} WITH (FORCE)`);
      console.log(`Base desechable eliminada: ${database}`);
    }
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

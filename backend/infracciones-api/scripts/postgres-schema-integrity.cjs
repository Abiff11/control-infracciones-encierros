const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const tables = [
  'infracciones',
  'retencion_vehiculo',
  'pago_infraccion',
  'concepto_pago',
  'pago_concepto',
  'solventacion_sin_pago',
  'liberacion_vehiculo',
  'salida_vehiculo',
  'infraccion_movimiento',
  'auditoria',
];

const uniqueKeys = {
  infracciones: [['folio_infraccion']],
  retencion_vehiculo: [['id_infraccion']],
  pago_infraccion: [['folio_linea_captura']],
  concepto_pago: [['clave_concepto']],
  pago_concepto: [['id_pago_infraccion', 'id_concepto_pago']],
  solventacion_sin_pago: [['id_infraccion']],
  liberacion_vehiculo: [['folio_liberacion']],
  salida_vehiculo: [['id_retencion_vehiculo']],
};

const checks = {
  pago_concepto: [
    'CHK_pago_concepto_monto_positivo',
    'CHK_pago_concepto_orden_positivo',
  ],
  solventacion_sin_pago: ['chk_solventacion_sin_pago_motivo'],
  liberacion_vehiculo: ['chk_liberacion_respaldo_pago_o_solventacion'],
  salida_vehiculo: [
    'CHK_salida_vehiculo_modalidad',
    'CHK_salida_anticipada_respaldo',
  ],
};

function assertDisposableDatabase() {
  const { NODE_ENV, DB_HOST, DB_DATABASE, DB_SYNCHRONIZE, GITHUB_ACTIONS } =
    process.env;
  assert(
    NODE_ENV === 'test' &&
      ['localhost', '127.0.0.1'].includes(DB_HOST) &&
      DB_SYNCHRONIZE === 'false' &&
      (/^control_infracciones_esquema_test_[a-z0-9]+$/.test(
        DB_DATABASE ?? '',
      ) ||
        (GITHUB_ACTIONS === 'true' &&
          DB_DATABASE === 'control_infracciones_db')),
    'Usa NODE_ENV=test, DB_SYNCHRONIZE=false y PostgreSQL local desechable.',
  );
}

async function assertSchema(dataSource, runner) {
  const physicalTables = await runner.getTables(tables);
  const differences = [];
  const { driver } = dataSource;

  for (const name of tables) {
    const table = physicalTables.find((item) => item.name === name);
    assert(table, `Falta la tabla ${name}`);
    const metadata = dataSource.entityMetadatas.find(
      (item) => item.tableName === name,
    );
    assert(metadata, `Falta la entidad de ${name}`);

    assert.deepEqual(
      table.columns.map((column) => column.name).sort(),
      metadata.columns.map((column) => column.databaseName).sort(),
      `Columnas divergentes en ${name}`,
    );

    for (const column of metadata.columns) {
      const actual = table.findColumnByName(column.databaseName);
      const label = `${name}.${column.databaseName}`;
      assert.equal(
        actual.type,
        driver.normalizeType(column),
        `Tipo de ${label}`,
      );
      assert.equal(actual.length, column.length, `Longitud de ${label}`);
      assert.equal(actual.precision, column.precision, `Precision de ${label}`);
      if (column.scale !== undefined) {
        assert.equal(actual.scale, column.scale, `Escala de ${label}`);
      }
      assert.equal(
        actual.isNullable,
        column.isNullable,
        `Nulabilidad de ${label}`,
      );
      assert.equal(
        actual.isPrimary,
        column.isPrimary,
        `Llave primaria de ${label}`,
      );
      assert.equal(
        actual.isGenerated,
        column.isGenerated,
        `Generacion de ${label}`,
      );

      // PostgreSQL can retain CURRENT_TIMESTAMP while TypeORM normalizes it to now().
      const matchingDatetimeDefault =
        typeof actual.default === 'string' &&
        typeof column.default === 'function' &&
        driver.normalizeDatetimeFunction(actual.default) ===
          driver.normalizeDefault(column);
      if (
        !actual.isGenerated &&
        !matchingDatetimeDefault &&
        !driver.defaultEqual(column, actual)
      ) {
        differences.push(
          `${label}: PostgreSQL=${actual.default ?? '(sin default)'}, TypeORM=${driver.normalizeDefault(column) ?? '(sin default)'}`,
        );
      }
    }

    for (const foreignKey of metadata.foreignKeys) {
      const expectedDelete =
        name === 'pago_concepto' &&
        isDeepStrictEqual(foreignKey.columnNames, ['id_pago_infraccion'])
          ? 'CASCADE'
          : 'RESTRICT';
      assert(
        table.foreignKeys.some(
          (actual) =>
            actual.onUpdate === 'CASCADE' &&
            actual.onDelete === expectedDelete &&
            isDeepStrictEqual(actual.columnNames, foreignKey.columnNames) &&
            actual.referencedTableName ===
              foreignKey.referencedEntityMetadata.tableName &&
            isDeepStrictEqual(
              actual.referencedColumnNames,
              foreignKey.referencedColumnNames,
            ),
        ),
        `Llave foranea ausente o con acciones distintas en ${name}(${foreignKey.columnNames.join(', ')})`,
      );
    }

    const uniqueConstraints = [
      ...table.uniques,
      ...table.indices.filter((index) => index.isUnique && !index.where),
    ];
    for (const columns of uniqueKeys[name] ?? []) {
      assert(
        uniqueConstraints.some((item) =>
          isDeepStrictEqual([...item.columnNames].sort(), [...columns].sort()),
        ),
        `Falta unicidad en ${name}(${columns.join(', ')})`,
      );
    }

    for (const check of checks[name] ?? []) {
      assert(
        table.checks.some((item) => item.name === check),
        `Falta ${check}`,
      );
    }
  }

  const invalidConstraints = await runner.query(
    `SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relnamespace = current_schema()::regnamespace
        AND t.relname = ANY($1) AND NOT c.convalidated`,
    [tables],
  );
  assert.deepEqual(
    invalidConstraints,
    [],
    'Hay restricciones fisicas sin validar',
  );
  const invalidIndexes = await runner.query(
    `SELECT indexrelid::regclass::text AS name
      FROM pg_index i
      JOIN pg_class t ON t.oid = i.indrelid
      WHERE t.relnamespace = current_schema()::regnamespace
        AND t.relname = ANY($1) AND i.indisunique AND NOT i.indisvalid`,
    [tables],
  );
  assert.deepEqual(invalidIndexes, [], 'Hay indices unicos invalidos');
  assert.equal(differences.length, 0, differences.join('\n'));
  console.log(`Esquema verificado para ${tables.length} tablas operativas`);
}

async function createFixture(runner) {
  const suffix = randomUUID().slice(0, 12);
  const cases = ['PAGO', 'SIN-PAGO', 'ANTICIPADA'].map(
    (caseName) => `ESQUEMA-${caseName}-${suffix}`,
  );

  const rows = await runner.query(
    `WITH
      actor AS (
        INSERT INTO usuarios (id_rol, nombre_usuario, email, password_hash, activo)
        SELECT id_rol, 'Prueba de esquema', $1, 'cuenta de prueba inactiva', FALSE
        FROM rol WHERE nombre_rol = 'ADMIN' RETURNING id_usuario
      ),
      zona AS (
        INSERT INTO region (nombre_region) VALUES ($2) RETURNING id_region
      ),
      delegacion_prueba AS (
        INSERT INTO delegacion (id_region, nombre_delegacion)
        SELECT id_region, $2 FROM zona RETURNING id_delegacion
      ),
      sitio AS (
        INSERT INTO lugar_infraccion (nombre_lugar_infraccion)
        VALUES ($2) RETURNING id_lugar_infraccion
      ),
      persona AS (
        INSERT INTO infractor (id_sexo, nombre)
        SELECT MIN(id_sexo), $2 FROM sexo RETURNING id_infractor
      ),
      clase AS (
        INSERT INTO clase_vehiculo (nombre_clase_vehiculo) VALUES ($2)
        RETURNING id_clase_vehiculo
      ),
      marca AS (
        INSERT INTO marca_vehiculo (nombre_marca_vehiculo) VALUES ($2)
        RETURNING id_marca_vehiculo
      ),
      linea AS (
        INSERT INTO linea_vehiculo (id_marca_vehiculo, nombre_linea_vehiculo)
        SELECT id_marca_vehiculo, $2 FROM marca RETURNING id_linea_vehiculo
      ),
      servicio_prueba AS (
        INSERT INTO servicio (nombre_servicio) VALUES ($2) RETURNING id_servicio
      ),
      auto AS (
        INSERT INTO vehiculo (id_clase_vehiculo, id_linea_vehiculo, id_servicio)
        SELECT id_clase_vehiculo, id_linea_vehiculo, id_servicio
        FROM clase, linea, servicio_prueba RETURNING id_vehiculo
      ),
      encierro_prueba AS (
        INSERT INTO encierro (nombre_encierro) VALUES ($2) RETURNING id_encierro
      ),
      expedientes AS (
        INSERT INTO infracciones (
          id_infractor, id_delegacion, id_vehiculo, id_lugar_infraccion,
          id_tipo_procedimiento, id_estatus_infraccion, id_usuario_captura,
          folio_infraccion, fecha_infraccion, hora_infraccion
        )
        SELECT id_infractor, id_delegacion, id_vehiculo, id_lugar_infraccion,
          id_tipo_procedimiento, id_estatus_infraccion, id_usuario,
          folio, CURRENT_DATE, LOCALTIME
        FROM persona, delegacion_prueba, auto, sitio, tipo_procedimiento,
          estatus_infraccion, actor, unnest($3::text[]) AS folio
        WHERE clave_tipo_procedimiento = 'INFRACCION' AND nombre_estatus = 'CAPTURADA'
        RETURNING id_infraccion, folio_infraccion
      )
      SELECT * FROM expedientes, actor, encierro_prueba`,
    [`schema-${suffix}@example.test`, `ESQUEMA-${suffix}`, cases],
  );
  assert.equal(
    rows.length,
    cases.length,
    'Deben crearse los tres expedientes de prueba',
  );
  return cases.map((folio) =>
    rows.find((row) => row.folio_infraccion === folio),
  );
}

async function assertRejected(runner, sql, params, code, constraint) {
  await runner.startTransaction();
  try {
    await assert.rejects(runner.query(sql, params), {
      code,
      ...(constraint && { constraint }),
    });
  } finally {
    await runner.rollbackTransaction();
  }
}

async function assertMovementAndAudit(runner, fixture, paymentId) {
  const [movement] = await runner.query(
    `INSERT INTO infraccion_movimiento
      (id_infraccion, id_estatus_infraccion, id_usuario, accion, fecha_movimiento)
      SELECT $1, id_estatus_infraccion, $2, 'PAGO_REGISTRADO', now()
      FROM estatus_infraccion WHERE nombre_estatus = 'PAGADA'
      RETURNING id_infraccion, accion`,
    [fixture.id_infraccion, fixture.id_usuario],
  );
  assert.deepEqual(movement, {
    id_infraccion: fixture.id_infraccion,
    accion: 'PAGO_REGISTRADO',
  });

  const payload = {
    idPagoInfraccion: paymentId,
    idInfraccion: fixture.id_infraccion,
  };
  const [audit] = await runner.query(
    `INSERT INTO auditoria (id_usuario, accion, entidad, entidad_id, despues_json)
      VALUES ($1, 'PAGO_REGISTRADO', 'pagos', $2, $3)
      RETURNING entidad_id, despues_json`,
    [fixture.id_usuario, String(paymentId), payload],
  );
  assert.deepEqual(audit, {
    entidad_id: String(paymentId),
    despues_json: payload,
  });
}

async function assertDatabaseBehavior(runner) {
  await runner.startTransaction();
  try {
    const [paid, exempt, early] = await createFixture(runner);

    const hold = `INSERT INTO retencion_vehiculo
      (id_infraccion, id_encierro, fecha_ingreso, recibido_por)
      VALUES ($1, $2, now(), 'TEST') RETURNING id_retencion_vehiculo`;
    const [ordinaryHold] = await runner.query(hold, [
      paid.id_infraccion,
      paid.id_encierro,
    ]);
    const [earlyHold] = await runner.query(hold, [
      early.id_infraccion,
      early.id_encierro,
    ]);
    await assertRejected(
      runner,
      hold,
      [paid.id_infraccion, paid.id_encierro],
      '23505',
      'uq_retencion_vehiculo_id_infraccion',
    );

    const payment = `INSERT INTO pago_infraccion
      (id_infraccion, id_usuario_registra_pago, folio_linea_captura, monto, fecha_pago)
      VALUES ($1, $2, $3, 50.00, now())
      RETURNING id_pago_infraccion, monto_infraccion, dias_piso_cobrados, monto_dias_piso`;
    const receipt = `P-${paid.folio_infraccion}`;
    const [paidRecord] = await runner.query(payment, [
      paid.id_infraccion,
      paid.id_usuario,
      receipt,
    ]);
    assert.equal(paidRecord.monto_infraccion, '0.00');
    assert.equal(paidRecord.dias_piso_cobrados, 0);
    assert.equal(paidRecord.monto_dias_piso, '0.00');
    await assertRejected(
      runner,
      payment,
      [paid.id_infraccion, paid.id_usuario, receipt],
      '23505',
      'uq_pago_infraccion_folio_linea_captura',
    );
    await assertRejected(
      runner,
      payment,
      [-1, paid.id_usuario, 'ESQUEMA-FK'],
      '23503',
    );

    const [concept] = await runner.query(
      'INSERT INTO concepto_pago (clave_concepto) VALUES ($1) RETURNING id_concepto_pago',
      [paid.folio_infraccion],
    );
    const linkConcept = `INSERT INTO pago_concepto (id_pago_infraccion, id_concepto_pago, monto, orden)
      VALUES ($1, $2, $3, $4)`;
    const conceptIds = [
      paidRecord.id_pago_infraccion,
      concept.id_concepto_pago,
    ];
    await assertRejected(
      runner,
      linkConcept,
      [...conceptIds, 0, 1],
      '23514',
      'CHK_pago_concepto_monto_positivo',
    );
    await assertRejected(
      runner,
      linkConcept,
      [...conceptIds, 50, 0],
      '23514',
      'CHK_pago_concepto_orden_positivo',
    );
    await runner.query(linkConcept, [...conceptIds, 50, 1]);
    await assertRejected(
      runner,
      linkConcept,
      [...conceptIds, 50, 2],
      '23505',
      'UQ_pago_concepto_id_pago_id_concepto',
    );

    const waiver = `INSERT INTO solventacion_sin_pago (id_infraccion, id_usuario_registra, motivo)
      VALUES ($1, $2, $3) RETURNING id_solventacion_sin_pago, fecha_solventacion`;
    const waiverIds = [exempt.id_infraccion, exempt.id_usuario];
    await assertRejected(
      runner,
      waiver,
      [...waiverIds, '   '],
      '23514',
      'chk_solventacion_sin_pago_motivo',
    );
    const [exemption] = await runner.query(waiver, [
      ...waiverIds,
      'Prueba de integridad',
    ]);
    assert(
      exemption.fecha_solventacion instanceof Date,
      'Debe aplicarse el default de solventacion',
    );
    await assertRejected(
      runner,
      waiver,
      [...waiverIds, 'Duplicado'],
      '23505',
      'uq_solventacion_sin_pago_id_infraccion',
    );

    const release = `INSERT INTO liberacion_vehiculo (
        id_infraccion, id_usuario_libera, id_pago_infraccion, id_solventacion_sin_pago,
        folio_liberacion, fecha_liberacion, liberado_por
      ) VALUES ($1, $2, $3, $4, $5, now(), 'TEST') RETURNING id_liberacion_vehiculo`;
    await assertRejected(
      runner,
      release,
      [paid.id_infraccion, paid.id_usuario, null, null, 'ESQUEMA-SIN-RESPALDO'],
      '23514',
      'chk_liberacion_respaldo_pago_o_solventacion',
    );
    await assertRejected(
      runner,
      release,
      [
        paid.id_infraccion,
        paid.id_usuario,
        paidRecord.id_pago_infraccion,
        exemption.id_solventacion_sin_pago,
        'ESQUEMA-DOBLE-RESPALDO',
      ],
      '23514',
      'chk_liberacion_respaldo_pago_o_solventacion',
    );
    const [paidRelease] = await runner.query(release, [
      paid.id_infraccion,
      paid.id_usuario,
      paidRecord.id_pago_infraccion,
      null,
      paid.folio_infraccion,
    ]);
    await runner.query(release, [
      exempt.id_infraccion,
      exempt.id_usuario,
      null,
      exemption.id_solventacion_sin_pago,
      exempt.folio_infraccion,
    ]);

    const exit = `INSERT INTO salida_vehiculo (
        id_retencion_vehiculo, id_liberacion_vehiculo, id_usuario_valida_salida,
        fecha_salida, validado_por, persona_recibe_vehiculo, estado_salida,
        modalidad_salida, folio_liberacion_presentado, placas_cotejadas,
        datos_vehiculo_cotejados, autorizacion_documental_verificada
      ) VALUES ($1, $2, $3, now(), 'TEST', 'TEST', 'ENTREGADO', $4, $5, $6, $7, $8)`;
    await assertRejected(
      runner,
      exit,
      [
        ordinaryHold.id_retencion_vehiculo,
        null,
        paid.id_usuario,
        'ORDINARIA',
        null,
        null,
        null,
        null,
      ],
      '23514',
      'CHK_salida_anticipada_respaldo',
    );
    const ordinaryExit = [
      ordinaryHold.id_retencion_vehiculo,
      paidRelease.id_liberacion_vehiculo,
      paid.id_usuario,
      'ORDINARIA',
      null,
      null,
      null,
      null,
    ];
    await runner.query(exit, ordinaryExit);
    await assertRejected(
      runner,
      exit,
      ordinaryExit,
      '23505',
      'uq_salida_vehiculo_id_retencion_vehiculo',
    );

    const earlyFields = [
      earlyHold.id_retencion_vehiculo,
      null,
      early.id_usuario,
      'ANTICIPADA',
      early.folio_infraccion,
      'TEST',
      {},
      true,
    ];
    await assertRejected(
      runner,
      exit,
      [...earlyFields.slice(0, -1), false],
      '23514',
      'CHK_salida_anticipada_respaldo',
    );
    await runner.query(exit, earlyFields);
    const [secondEarlyHold] = await runner.query(hold, [
      exempt.id_infraccion,
      exempt.id_encierro,
    ]);
    const duplicateFolio = [
      secondEarlyHold.id_retencion_vehiculo,
      null,
      early.id_usuario,
      'ANTICIPADA',
      ` ${early.folio_infraccion.toLowerCase()} `,
      'TEST',
      {},
      true,
    ];
    await assertRejected(
      runner,
      exit,
      duplicateFolio,
      '23505',
      'uq_salida_folio_liberacion_presentado',
    );

    await assertMovementAndAudit(runner, paid, paidRecord.id_pago_infraccion);
    console.log(
      'Validacion PostgreSQL de FK, unicidad, CHECK y defaults aprobada',
    );
  } finally {
    await runner.rollbackTransaction();
  }
}

async function main() {
  assertDisposableDatabase();
  const dataSource = require('../dist/database/data-source').default;
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();

  try {
    await assertSchema(dataSource, runner);
    await assertDatabaseBehavior(runner);
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

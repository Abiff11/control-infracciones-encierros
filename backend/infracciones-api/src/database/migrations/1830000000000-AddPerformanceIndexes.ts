import { MigrationInterface, QueryRunner } from 'typeorm';

const PERFORMANCE_INDEXES = [
  '"IDX_infracciones_fecha_estatus"',
  '"IDX_infracciones_delegacion_fecha"',
  '"IDX_infracciones_estatus_delegacion_fecha"',
  '"IDX_infracciones_tipo_fecha"',
  '"IDX_infracciones_fecha_hora_id"',
  '"IDX_infracciones_anio_fecha"',
  '"GIN_infracciones_folio_trgm"',
  '"GIN_infracciones_clave_policia_trgm"',
  '"IDX_vehiculo_serie"',
  '"IDX_vehiculo_motor"',
  '"GIN_vehiculo_placas_trgm"',
  '"GIN_vehiculo_serie_trgm"',
  '"GIN_vehiculo_motor_trgm"',
  '"IDX_infractor_apellidos_nombre"',
  '"GIN_infractor_nombre_trgm"',
  '"GIN_infractor_apellido_paterno_trgm"',
  '"GIN_infractor_apellido_materno_trgm"',
  '"GIN_infractor_licencia_trgm"',
  '"IDX_retencion_vehiculo_encierro_infraccion"',
  '"IDX_retencion_vehiculo_infraccion_fecha"',
  '"IDX_pago_infraccion_infraccion_fecha"',
  '"IDX_liberacion_vehiculo_infraccion_fecha"',
  '"IDX_salida_vehiculo_retencion_fecha"',
  '"IDX_movimiento_infraccion_fecha"',
];

export class AddPerformanceIndexes1830000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_fecha_estatus"
      ON "infracciones" ("fecha_infraccion" DESC, "id_estatus_infraccion")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_delegacion_fecha"
      ON "infracciones" ("id_delegacion", "fecha_infraccion" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_estatus_delegacion_fecha"
      ON "infracciones" (
        "id_estatus_infraccion",
        "id_delegacion",
        "fecha_infraccion" DESC,
        "id_infraccion" DESC
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_tipo_fecha"
      ON "infracciones" ("id_tipo_procedimiento", "fecha_infraccion" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_fecha_hora_id"
      ON "infracciones" (
        "fecha_infraccion" DESC,
        "hora_infraccion" DESC,
        "id_infraccion" DESC
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infracciones_anio_fecha"
      ON "infracciones" (EXTRACT(YEAR FROM "fecha_infraccion"))
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infracciones_folio_trgm"
      ON "infracciones" USING gin ("folio_infraccion" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infracciones_clave_policia_trgm"
      ON "infracciones" USING gin ("clave_policia" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehiculo_serie"
      ON "vehiculo" ("serie")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vehiculo_motor"
      ON "vehiculo" ("motor")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_vehiculo_placas_trgm"
      ON "vehiculo" USING gin ("placas" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_vehiculo_serie_trgm"
      ON "vehiculo" USING gin ("serie" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_vehiculo_motor_trgm"
      ON "vehiculo" USING gin ("motor" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_infractor_apellidos_nombre"
      ON "infractor" ("apellido_paterno", "apellido_materno", "nombre")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infractor_nombre_trgm"
      ON "infractor" USING gin ("nombre" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infractor_apellido_paterno_trgm"
      ON "infractor" USING gin ("apellido_paterno" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infractor_apellido_materno_trgm"
      ON "infractor" USING gin ("apellido_materno" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "GIN_infractor_licencia_trgm"
      ON "infractor" USING gin ("licencia" gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_retencion_vehiculo_encierro_infraccion"
      ON "retencion_vehiculo" ("id_encierro", "id_infraccion")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_retencion_vehiculo_infraccion_fecha"
      ON "retencion_vehiculo" ("id_infraccion", "fecha_ingreso" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pago_infraccion_infraccion_fecha"
      ON "pago_infraccion" ("id_infraccion", "fecha_pago" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_liberacion_vehiculo_infraccion_fecha"
      ON "liberacion_vehiculo" ("id_infraccion", "fecha_liberacion" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_salida_vehiculo_retencion_fecha"
      ON "salida_vehiculo" ("id_retencion_vehiculo", "fecha_salida" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_movimiento_infraccion_fecha"
      ON "infraccion_movimiento" ("id_infraccion", "fecha_movimiento" ASC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const indexName of PERFORMANCE_INDEXES) {
      await queryRunner.query(`DROP INDEX IF EXISTS ${indexName}`);
    }
  }
}

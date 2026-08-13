import { type MigrationInterface, type QueryRunner } from 'typeorm';

interface DuplicateRow {
  key: string | number | null;
  total: string | number;
}

export class AddConcurrencyIntegrityConstraints1920000000000 implements MigrationInterface {
  name = 'AddConcurrencyIntegrityConstraints1920000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.assertNoDuplicates(
      queryRunner,
      'retencion_vehiculo.id_infraccion',
      `
        SELECT id_infraccion AS key, COUNT(*) AS total
        FROM retencion_vehiculo
        GROUP BY id_infraccion
        HAVING COUNT(*) > 1
        LIMIT 10
      `,
    );
    await this.assertNoDuplicates(
      queryRunner,
      'salida_vehiculo.id_retencion_vehiculo',
      `
        SELECT id_retencion_vehiculo AS key, COUNT(*) AS total
        FROM salida_vehiculo
        GROUP BY id_retencion_vehiculo
        HAVING COUNT(*) > 1
        LIMIT 10
      `,
    );
    await this.assertNoDuplicates(
      queryRunner,
      'pago_infraccion.folio_linea_captura',
      `
        SELECT folio_linea_captura AS key, COUNT(*) AS total
        FROM pago_infraccion
        WHERE folio_linea_captura IS NOT NULL
        GROUP BY folio_linea_captura
        HAVING COUNT(*) > 1
        LIMIT 10
      `,
    );
    await this.assertNoDuplicates(
      queryRunner,
      'liberacion_vehiculo.folio_liberacion',
      `
        SELECT folio_liberacion AS key, COUNT(*) AS total
        FROM liberacion_vehiculo
        WHERE folio_liberacion IS NOT NULL
        GROUP BY folio_liberacion
        HAVING COUNT(*) > 1
        LIMIT 10
      `,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_retencion_vehiculo_id_infraccion"
      ON "retencion_vehiculo" ("id_infraccion")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_salida_vehiculo_id_retencion_vehiculo"
      ON "salida_vehiculo" ("id_retencion_vehiculo")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_pago_infraccion_folio_linea_captura"
      ON "pago_infraccion" ("folio_linea_captura")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "uq_liberacion_vehiculo_folio_liberacion"
      ON "liberacion_vehiculo" ("folio_liberacion")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "uq_liberacion_vehiculo_folio_liberacion"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "uq_pago_infraccion_folio_linea_captura"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "uq_salida_vehiculo_id_retencion_vehiculo"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "uq_retencion_vehiculo_id_infraccion"`,
    );
  }

  private async assertNoDuplicates(
    queryRunner: QueryRunner,
    label: string,
    sql: string,
  ): Promise<void> {
    const rows = (await queryRunner.query(sql)) as DuplicateRow[];

    if (rows.length === 0) {
      return;
    }

    const sample = rows
      .map((row) => `${String(row.key)} (${String(row.total)})`)
      .join(', ');

    throw new Error(
      `No se puede aplicar la restriccion unica ${label}: existen duplicados. Ejemplos: ${sample}`,
    );
  }
}

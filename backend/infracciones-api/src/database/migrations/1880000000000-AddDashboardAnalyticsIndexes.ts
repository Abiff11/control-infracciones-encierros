import { MigrationInterface, QueryRunner } from 'typeorm';

const INDEXES = [
  'idx_pago_concepto_concepto_pago_cover',
  'idx_pago_infraccion_dashboard_fecha_cover',
  'idx_retencion_dashboard_latest_encierro',
] as const;

export class AddDashboardAnalyticsIndexes1880000000000
  implements MigrationInterface
{
  name = 'AddDashboardAnalyticsIndexes1880000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pago_concepto_concepto_pago_cover
      ON pago_concepto (id_concepto_pago, id_pago_infraccion)
      INCLUDE (monto)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pago_infraccion_dashboard_fecha_cover
      ON pago_infraccion (fecha_pago DESC, id_infraccion, id_pago_infraccion)
      INCLUDE (monto)
    `);

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retencion_dashboard_latest_encierro
      ON retencion_vehiculo (id_infraccion, id_retencion_vehiculo DESC)
      INCLUDE (id_encierro, fecha_ingreso)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const indexName of [...INDEXES].reverse()) {
      await queryRunner.query(
        `DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`,
      );
    }
  }
}

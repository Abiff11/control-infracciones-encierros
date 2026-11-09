import { type MigrationInterface, type QueryRunner } from 'typeorm';

const TABLE = 'salida_vehiculo';
const CHECK_MODALIDAD = 'CHK_salida_vehiculo_modalidad';
const CHECK_RESPALDO = 'CHK_salida_anticipada_respaldo';
const UNIQUE_FOLIO = 'uq_salida_folio_liberacion_presentado';

interface SalidaSinLiberacionRow {
  idSalidaVehiculo: number;
}

export class EnableEarlyVehicleExit1980000000000
  implements MigrationInterface
{
  name = 'EnableEarlyVehicleExit1980000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      ALTER COLUMN "id_liberacion_vehiculo" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      ADD COLUMN "modalidad_salida" VARCHAR(20) NOT NULL DEFAULT 'ORDINARIA',
      ADD COLUMN "folio_liberacion_presentado" VARCHAR(50) NULL,
      ADD COLUMN "placas_cotejadas" VARCHAR(30) NULL,
      ADD COLUMN "datos_vehiculo_cotejados" JSONB NULL,
      ADD COLUMN "nombre_propietario_declarado" VARCHAR(150) NULL,
      ADD COLUMN "autorizacion_documental_verificada" BOOLEAN NULL,
      ADD COLUMN "referencia_documento_liberacion" VARCHAR(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      ADD CONSTRAINT "${CHECK_MODALIDAD}"
      CHECK ("modalidad_salida" IN ('ORDINARIA', 'ANTICIPADA'))
    `);

    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      ADD CONSTRAINT "${CHECK_RESPALDO}"
      CHECK (
        ("modalidad_salida" = 'ORDINARIA'
          AND "id_liberacion_vehiculo" IS NOT NULL)
        OR
        ("modalidad_salida" = 'ANTICIPADA'
          AND "folio_liberacion_presentado" IS NOT NULL
          AND BTRIM("folio_liberacion_presentado") <> ''
          AND "placas_cotejadas" IS NOT NULL
          AND BTRIM("placas_cotejadas") <> ''
          AND "datos_vehiculo_cotejados" IS NOT NULL
          AND "autorizacion_documental_verificada" IS TRUE)
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "${UNIQUE_FOLIO}"
      ON "${TABLE}" (UPPER(BTRIM("folio_liberacion_presentado")))
      WHERE "folio_liberacion_presentado" IS NOT NULL
        AND BTRIM("folio_liberacion_presentado") <> ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const pendientes = (await queryRunner.query(`
      SELECT "id_salida_vehiculo" AS "idSalidaVehiculo"
      FROM "${TABLE}"
      WHERE "id_liberacion_vehiculo" IS NULL
         OR "modalidad_salida" = 'ANTICIPADA'
         OR "folio_liberacion_presentado" IS NOT NULL
         OR "placas_cotejadas" IS NOT NULL
         OR "datos_vehiculo_cotejados" IS NOT NULL
         OR "nombre_propietario_declarado" IS NOT NULL
         OR "autorizacion_documental_verificada" IS NOT NULL
         OR "referencia_documento_liberacion" IS NOT NULL
      LIMIT 1
    `)) as SalidaSinLiberacionRow[];

    if (pendientes.length > 0) {
      throw new Error(
        'No se puede revertir la migracion: hay salidas anticipadas o datos de cotejo. ' +
          'La reversion descartaria evidencia; conserva la migracion aplicada.',
      );
    }

    await queryRunner.query(`DROP INDEX IF EXISTS "${UNIQUE_FOLIO}"`);
    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      DROP CONSTRAINT IF EXISTS "${CHECK_RESPALDO}",
      DROP CONSTRAINT IF EXISTS "${CHECK_MODALIDAD}"
    `);
    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      ALTER COLUMN "id_liberacion_vehiculo" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "${TABLE}"
      DROP COLUMN "referencia_documento_liberacion",
      DROP COLUMN "autorizacion_documental_verificada",
      DROP COLUMN "nombre_propietario_declarado",
      DROP COLUMN "datos_vehiculo_cotejados",
      DROP COLUMN "placas_cotejadas",
      DROP COLUMN "folio_liberacion_presentado",
      DROP COLUMN "modalidad_salida"
    `);
  }
}

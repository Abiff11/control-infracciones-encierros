import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Observaciones detectadas durante una entrega fisica anticipada.
 * Se agrega una tabla nueva; no modifica expedientes existentes.
 */
export class AddObservacionesExpediente1990000000000
  implements MigrationInterface
{
  name = 'AddObservacionesExpediente1990000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "observacion_expediente" (
        "id_observacion" SERIAL PRIMARY KEY,
        "id_infraccion" INTEGER NOT NULL,
        "id_salida_vehiculo" INTEGER NOT NULL,
        "id_usuario_reporta" INTEGER NOT NULL,
        "campo_observado" VARCHAR(30) NOT NULL,
        "valor_original" VARCHAR(150) NOT NULL,
        "valor_reportado" VARCHAR(150) NOT NULL,
        "motivo_reporte" TEXT NOT NULL,
        "referencia_evidencia" VARCHAR(255) NOT NULL,
        "estatus" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        "fecha_reporte" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "id_usuario_resuelve" INTEGER NULL,
        "resolucion" TEXT NULL,
        "fecha_resolucion" TIMESTAMPTZ NULL,
        CONSTRAINT "fk_observacion_infraccion"
          FOREIGN KEY ("id_infraccion") REFERENCES "infracciones" ("id_infraccion")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_observacion_salida"
          FOREIGN KEY ("id_salida_vehiculo") REFERENCES "salida_vehiculo" ("id_salida_vehiculo")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_observacion_usuario_reporta"
          FOREIGN KEY ("id_usuario_reporta") REFERENCES "usuarios" ("id_usuario")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_observacion_usuario_resuelve"
          FOREIGN KEY ("id_usuario_resuelve") REFERENCES "usuarios" ("id_usuario")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_observacion_campo"
          CHECK ("campo_observado" IN ('COLOR', 'ANIO_MODELO')),
        CONSTRAINT "chk_observacion_estado"
          CHECK ("estatus" IN ('PENDIENTE', 'EN_REVISION', 'CORREGIDA', 'RECHAZADA')),
        CONSTRAINT "chk_observacion_motivo"
          CHECK (BTRIM("motivo_reporte") <> '' AND BTRIM("referencia_evidencia") <> '')
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_observacion_salida_campo"
      ON "observacion_expediente" ("id_salida_vehiculo", "campo_observado")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_observacion_estado_fecha"
      ON "observacion_expediente" ("estatus", "fecha_reporte" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_observacion_infraccion"
      ON "observacion_expediente" ("id_infraccion")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(`
      SELECT "id_observacion"
      FROM "observacion_expediente"
      LIMIT 1
    `)) as Array<{ id_observacion: number }>;

    if (rows.length > 0) {
      throw new Error(
        'No se puede revertir: existen observaciones de expedientes. ' +
          'Revertir descartaria el historial y su evidencia.',
      );
    }

    await queryRunner.query('DROP TABLE "observacion_expediente"');
  }
}

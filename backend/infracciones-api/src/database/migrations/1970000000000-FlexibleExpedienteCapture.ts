import { MigrationInterface, QueryRunner } from 'typeorm';

const FALLBACK_VALUE = 'NO ESPECIFICADO';
const FALLBACK_MOTIVO = 'SIN_DATO';
const FALLBACK_MOTIVO_DESCRIPCION = 'SIN MOTIVO ESPECIFICADO';

export class FlexibleExpedienteCapture1970000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE infracciones
      ADD COLUMN tipo_documento_referencia VARCHAR(30) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE infracciones
      ADD COLUMN folio_documento_referencia VARCHAR(50) NULL
    `);

    await queryRunner.query(`
      UPDATE infracciones
      SET
        tipo_documento_referencia = 'PARTE_INFORMATIVO',
        folio_documento_referencia = TRIM(num_parte_informativo)
      WHERE num_parte_informativo IS NOT NULL
        AND TRIM(num_parte_informativo) <> ''
        AND tipo_documento_referencia IS NULL
    `);

    await queryRunner.query(
      `INSERT INTO sexo (nombre_sexo)
       VALUES ('SE IGNORA')
       ON CONFLICT (nombre_sexo) DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO servicio (nombre_servicio)
       VALUES ($1)
       ON CONFLICT (nombre_servicio) DO NOTHING`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `INSERT INTO clase_vehiculo (nombre_clase_vehiculo)
       VALUES ($1)
       ON CONFLICT (nombre_clase_vehiculo) DO NOTHING`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `INSERT INTO marca_vehiculo (nombre_marca_vehiculo)
       VALUES ($1)
       ON CONFLICT (nombre_marca_vehiculo) DO NOTHING`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `INSERT INTO linea_vehiculo (id_marca_vehiculo, nombre_linea_vehiculo)
       SELECT id_marca_vehiculo, $1
       FROM marca_vehiculo
       WHERE nombre_marca_vehiculo = $2
       ON CONFLICT (id_marca_vehiculo, nombre_linea_vehiculo) DO NOTHING`,
      [FALLBACK_VALUE, FALLBACK_VALUE],
    );
    await queryRunner.query(
      `INSERT INTO motivo (nombre_motivo, descripcion_motivo)
       VALUES ($1, $2)
       ON CONFLICT (nombre_motivo) DO NOTHING`,
      [FALLBACK_MOTIVO, FALLBACK_MOTIVO_DESCRIPCION],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE infracciones
      DROP COLUMN IF EXISTS folio_documento_referencia
    `);
    await queryRunner.query(`
      ALTER TABLE infracciones
      DROP COLUMN IF EXISTS tipo_documento_referencia
    `);

    await queryRunner.query(
      `DELETE FROM motivo
       WHERE nombre_motivo = $1
         AND NOT EXISTS (
           SELECT 1
           FROM infraccion_motivo im
           WHERE im.id_motivo = motivo.id_motivo
         )`,
      [FALLBACK_MOTIVO],
    );
    await queryRunner.query(
      `DELETE FROM linea_vehiculo lv
       USING marca_vehiculo mv
       WHERE lv.id_marca_vehiculo = mv.id_marca_vehiculo
         AND lv.nombre_linea_vehiculo = $1
         AND mv.nombre_marca_vehiculo = $1
         AND NOT EXISTS (
           SELECT 1
           FROM vehiculo v
           WHERE v.id_linea_vehiculo = lv.id_linea_vehiculo
         )`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `DELETE FROM marca_vehiculo mv
       WHERE mv.nombre_marca_vehiculo = $1
         AND NOT EXISTS (
           SELECT 1
           FROM linea_vehiculo lv
           WHERE lv.id_marca_vehiculo = mv.id_marca_vehiculo
         )`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `DELETE FROM clase_vehiculo cv
       WHERE cv.nombre_clase_vehiculo = $1
         AND NOT EXISTS (
           SELECT 1
           FROM vehiculo v
           WHERE v.id_clase_vehiculo = cv.id_clase_vehiculo
         )`,
      [FALLBACK_VALUE],
    );
    await queryRunner.query(
      `DELETE FROM servicio s
       WHERE s.nombre_servicio = $1
         AND NOT EXISTS (
           SELECT 1
           FROM vehiculo v
           WHERE v.id_servicio = s.id_servicio
         )`,
      [FALLBACK_VALUE],
    );
  }
}

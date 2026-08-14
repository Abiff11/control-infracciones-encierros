import { type MigrationInterface, type QueryRunner } from 'typeorm';

interface TipoProcedimientoRow {
  idTipoProcedimiento: number;
}

const CANONICAL_CLAVE = 'INFRACCION_SIN_RETENCION';
const CANONICAL_NOMBRE = 'INFRACCION SIN RETENCION';
const LEGACY_CLAVES = [
  'INFRACCION_SIN_DETENCION_DE_VEHICULO',
  'INFRACCION_SIN_DETENCION_DE_VEHÍCULO',
] as const;
const LEGACY_NOMBRES = [
  'INFRACCION SIN DETENCION DE VEHICULO',
  'INFRACCION SIN DETENCION DE VEHÍCULO',
] as const;

export class NormalizeLegacyTipoProcedimiento1930000000000
  implements MigrationInterface
{
  name = 'NormalizeLegacyTipoProcedimiento1930000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const canonicalRows = (await queryRunner.query(
      `
        SELECT id_tipo_procedimiento AS "idTipoProcedimiento"
        FROM tipo_procedimiento
        WHERE clave_tipo_procedimiento = $1
           OR nombre_tipo_procedimiento = $2
        ORDER BY id_tipo_procedimiento ASC
      `,
      [CANONICAL_CLAVE, CANONICAL_NOMBRE],
    )) as TipoProcedimientoRow[];

    if (canonicalRows.length !== 1) {
      throw new Error(
        `Se esperaba exactamente un tipo canonico ${CANONICAL_CLAVE}; encontrados: ${canonicalRows.length}`,
      );
    }

    const canonicalId = canonicalRows[0].idTipoProcedimiento;
    const legacyRows = (await queryRunner.query(
      `
        SELECT id_tipo_procedimiento AS "idTipoProcedimiento"
        FROM tipo_procedimiento
        WHERE id_tipo_procedimiento <> $1
          AND (
            clave_tipo_procedimiento = ANY($2::varchar[])
            OR nombre_tipo_procedimiento = ANY($3::varchar[])
          )
        ORDER BY id_tipo_procedimiento ASC
      `,
      [canonicalId, [...LEGACY_CLAVES], [...LEGACY_NOMBRES]],
    )) as TipoProcedimientoRow[];

    for (const legacyRow of legacyRows) {
      await queryRunner.query(
        `
          UPDATE infracciones
          SET id_tipo_procedimiento = $1
          WHERE id_tipo_procedimiento = $2
        `,
        [canonicalId, legacyRow.idTipoProcedimiento],
      );

      await queryRunner.query(
        `
          UPDATE tipo_procedimiento
          SET activo = false,
              es_tipo_expediente = false
          WHERE id_tipo_procedimiento = $1
        `,
        [legacyRow.idTipoProcedimiento],
      );
    }
  }

  public async down(): Promise<void> {
    // La normalizacion puede reasignar expedientes al tipo canonico. No existe
    // una forma segura de distinguir despues cuales pertenecian al tipo legado,
    // por lo que una reversa automatica podria corromper datos historicos.
    // El rollback de produccion debe realizarse restaurando el backup previo.
  }
}

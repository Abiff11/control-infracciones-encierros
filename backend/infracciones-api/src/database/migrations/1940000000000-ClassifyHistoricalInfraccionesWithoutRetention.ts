import { type MigrationInterface, type QueryRunner } from 'typeorm';

interface TipoProcedimientoRow {
  idTipoProcedimiento: number;
  claveTipoProcedimiento: string;
}

const CLAVE_INFRACCION = 'INFRACCION';
const CLAVE_INFRACCION_SIN_RETENCION = 'INFRACCION_SIN_RETENCION';

export class ClassifyHistoricalInfraccionesWithoutRetention1940000000000
  implements MigrationInterface
{
  name = 'ClassifyHistoricalInfraccionesWithoutRetention1940000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = (await queryRunner.query(
      `
        SELECT
          id_tipo_procedimiento AS "idTipoProcedimiento",
          clave_tipo_procedimiento AS "claveTipoProcedimiento"
        FROM tipo_procedimiento
        WHERE clave_tipo_procedimiento = ANY($1::varchar[])
      `,
      [[CLAVE_INFRACCION, CLAVE_INFRACCION_SIN_RETENCION]],
    )) as TipoProcedimientoRow[];

    const infraccion = rows.find(
      (row) => row.claveTipoProcedimiento === CLAVE_INFRACCION,
    );
    const sinRetencion = rows.find(
      (row) => row.claveTipoProcedimiento === CLAVE_INFRACCION_SIN_RETENCION,
    );

    if (!infraccion || !sinRetencion) {
      throw new Error(
        `No se pudieron resolver los tipos ${CLAVE_INFRACCION} y ${CLAVE_INFRACCION_SIN_RETENCION}`,
      );
    }

    await queryRunner.query(
      `
        UPDATE infracciones i
        SET id_tipo_procedimiento = $1
        WHERE i.id_tipo_procedimiento = $2
          AND NOT EXISTS (
            SELECT 1
            FROM retencion_vehiculo rv
            WHERE rv.id_infraccion = i.id_infraccion
          )
      `,
      [sinRetencion.idTipoProcedimiento, infraccion.idTipoProcedimiento],
    );
  }

  public async down(): Promise<void> {
    // Esta migracion clasifica datos historicos usando la ausencia de una
    // retencion vehicular. Despues de aplicada no existe una forma segura de
    // distinguir que expedientes provenian de la carga historica y cuales se
    // capturaron expresamente como sin retencion. El rollback debe realizarse
    // restaurando el backup previo a la migracion.
  }
}

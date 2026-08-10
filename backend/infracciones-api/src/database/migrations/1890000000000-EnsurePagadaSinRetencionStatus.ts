import { MigrationInterface, QueryRunner } from 'typeorm';

const ESTATUS_PAGADA_SIN_RETENCION = 'PAGADA_SIN_RETENCION';

export class EnsurePagadaSinRetencionStatus1890000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO estatus_infraccion (nombre_estatus)
       VALUES ($1)
       ON CONFLICT (nombre_estatus) DO NOTHING`,
      [ESTATUS_PAGADA_SIN_RETENCION],
    );
  }

  public async down(): Promise<void> {
    // Se conserva el estatus para no eliminar un catalogo que pueda estar
    // referenciado por expedientes ya pagados sin retencion.
  }
}

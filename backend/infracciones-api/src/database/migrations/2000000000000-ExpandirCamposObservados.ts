import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Amplia las observaciones de cotejo sin alterar los registros existentes.
 * La correccion de los datos sensibles sigue siendo un procedimiento separado.
 */
export class ExpandirCamposObservados2000000000000 implements MigrationInterface {
  name = 'ExpandirCamposObservados2000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "observacion_expediente"
        DROP CONSTRAINT "chk_observacion_campo",
        ADD CONSTRAINT "chk_observacion_campo"
          CHECK ("campo_observado" IN (
            'PLACAS', 'MARCA', 'LINEA', 'CLASE', 'COLOR',
            'ANIO_MODELO', 'ESTADO_PLACAS', 'SERIE', 'MOTOR'
          ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const count = (await queryRunner.query(`
      SELECT COUNT(*)::int AS total FROM "observacion_expediente"
      WHERE "campo_observado" NOT IN ('COLOR', 'ANIO_MODELO')
    `)) as Array<{ total: number }>;
    if (Number(count[0]?.total) > 0) {
      throw new Error(
        'No se puede revertir: existen observaciones en los nuevos campos. ' +
        'Debe conservarse el historial de cotejo.',
      );
    }
    await queryRunner.query(`
      ALTER TABLE "observacion_expediente"
        DROP CONSTRAINT "chk_observacion_campo",
        ADD CONSTRAINT "chk_observacion_campo"
          CHECK ("campo_observado" IN ('COLOR', 'ANIO_MODELO'))
    `);
  }
}

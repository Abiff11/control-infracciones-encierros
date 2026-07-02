import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const TABLE_PAGO = 'pago_infraccion';
const TABLE_LIBERACION = 'liberacion_vehiculo';
const TIPO_VEHICULO_SIN_INFRACCION = 'VEHICULO_SIN_INFRACCION';

export class AddExpedienteVehiculoPagoPiso1810000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns(TABLE_PAGO, [
      new TableColumn({
        name: 'monto_infraccion',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'dias_piso_cobrados',
        type: 'int',
        isNullable: false,
        default: 0,
      }),
      new TableColumn({
        name: 'monto_dias_piso',
        type: 'decimal',
        precision: 10,
        scale: 2,
        isNullable: false,
        default: 0,
      }),
    ]);

    await queryRunner.query(`
      UPDATE ${TABLE_PAGO}
      SET monto_infraccion = monto
      WHERE monto_infraccion = 0
    `);

    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ALTER COLUMN nombre_recibe_liberacion DROP NOT NULL
    `);

    await queryRunner.query(
      `INSERT INTO tipo_procedimiento (nombre_tipo_procedimiento)
       VALUES ($1)
       ON CONFLICT (nombre_tipo_procedimiento) DO NOTHING`,
      [TIPO_VEHICULO_SIN_INFRACCION],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ALTER COLUMN nombre_recibe_liberacion SET NOT NULL
    `);

    await queryRunner.dropColumn(TABLE_PAGO, 'monto_dias_piso');
    await queryRunner.dropColumn(TABLE_PAGO, 'dias_piso_cobrados');
    await queryRunner.dropColumn(TABLE_PAGO, 'monto_infraccion');

    await queryRunner.query(
      `DELETE FROM tipo_procedimiento WHERE nombre_tipo_procedimiento = $1`,
      [TIPO_VEHICULO_SIN_INFRACCION],
    );
  }
}

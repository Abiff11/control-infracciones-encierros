import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const VEHICULO_TABLE = 'vehiculo';
const COLUMN_NAME = 'sitio_servicio_publico';

export class AlterVehiculoSitioServicioPublico1810000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      VEHICULO_TABLE,
      COLUMN_NAME,
      new TableColumn({
        name: COLUMN_NAME,
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      VEHICULO_TABLE,
      COLUMN_NAME,
      new TableColumn({
        name: COLUMN_NAME,
        type: 'varchar',
        length: '80',
        isNullable: true,
      }),
    );
  }
}

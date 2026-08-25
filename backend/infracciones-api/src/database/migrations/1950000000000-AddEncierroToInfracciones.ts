import {
  type MigrationInterface,
  type QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const INFRACCIONES_TABLE = 'infracciones';
const ENCIERRO_TABLE = 'encierro';
const FK_INFRACCIONES_ENCIERRO =
  'FK_infracciones_id_encierro_encierro_id_encierro';
const IDX_INFRACCIONES_ENCIERRO = 'IDX_infracciones_id_encierro';

export class AddEncierroToInfracciones1950000000000
  implements MigrationInterface
{
  name = 'AddEncierroToInfracciones1950000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      INFRACCIONES_TABLE,
      new TableColumn({
        name: 'id_encierro',
        type: 'int',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_ENCIERRO,
        columnNames: ['id_encierro'],
        referencedTableName: ENCIERRO_TABLE,
        referencedColumnNames: ['id_encierro'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_ENCIERRO,
        columnNames: ['id_encierro'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_ENCIERRO);

    const infraccionesTable = await queryRunner.getTable(INFRACCIONES_TABLE);
    const foreignKey = infraccionesTable?.foreignKeys.find(
      (candidate) => candidate.name === FK_INFRACCIONES_ENCIERRO,
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey(INFRACCIONES_TABLE, foreignKey);
    }

    await queryRunner.dropColumn(INFRACCIONES_TABLE, 'id_encierro');
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const TABLE_NAME = 'infraccion_motivo';

const FK_INFRACCION_MOTIVO_INFRACCION =
  'FK_infraccion_motivo_id_infraccion_infracciones_id_infraccion';
const FK_INFRACCION_MOTIVO_MOTIVO =
  'FK_infraccion_motivo_id_motivo_motivo_id_motivo';

const IDX_INFRACCION_MOTIVO_INFRACCION = 'IDX_infraccion_motivo_id_infraccion';
const IDX_INFRACCION_MOTIVO_MOTIVO = 'IDX_infraccion_motivo_id_motivo';

const UQ_INFRACCION_MOTIVO = 'UQ_infraccion_motivo_id_infraccion_id_motivo';

export class CreateInfraccionMotivo1750000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_NAME,
        columns: [
          {
            name: 'id_infraccion_motivo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_motivo',
            type: 'int',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: UQ_INFRACCION_MOTIVO,
            columnNames: ['id_infraccion', 'id_motivo'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      TABLE_NAME,
      new TableForeignKey({
        name: FK_INFRACCION_MOTIVO_INFRACCION,
        columnNames: ['id_infraccion'],
        referencedTableName: 'infracciones',
        referencedColumnNames: ['id_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      TABLE_NAME,
      new TableForeignKey({
        name: FK_INFRACCION_MOTIVO_MOTIVO,
        columnNames: ['id_motivo'],
        referencedTableName: 'motivo',
        referencedColumnNames: ['id_motivo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_INFRACCION_MOTIVO_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_INFRACCION_MOTIVO_MOTIVO,
        columnNames: ['id_motivo'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, IDX_INFRACCION_MOTIVO_MOTIVO);
    await queryRunner.dropIndex(TABLE_NAME, IDX_INFRACCION_MOTIVO_INFRACCION);

    const table = await queryRunner.getTable(TABLE_NAME);
    const foreignKeys = [
      FK_INFRACCION_MOTIVO_MOTIVO,
      FK_INFRACCION_MOTIVO_INFRACCION,
    ];

    for (const foreignKeyName of foreignKeys) {
      const foreignKey = table?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_NAME, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_NAME);
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const TABLE_NAME = 'infraccion_movimiento';

const FK_MOVIMIENTO_INFRACCION =
  'FK_infraccion_movimiento_id_infraccion_infracciones_id_infraccion';
const FK_MOVIMIENTO_ESTATUS =
  'FK_infraccion_movimiento_id_estatus_infraccion_estatus_infraccion_id_estatus_infraccion';
const FK_MOVIMIENTO_USUARIO =
  'FK_infraccion_movimiento_id_usuario_usuarios_id_usuario';

const IDX_MOVIMIENTO_INFRACCION = 'IDX_infraccion_movimiento_id_infraccion';
const IDX_MOVIMIENTO_ESTATUS = 'IDX_infraccion_movimiento_id_estatus_infraccion';
const IDX_MOVIMIENTO_USUARIO = 'IDX_infraccion_movimiento_id_usuario';
const IDX_MOVIMIENTO_FECHA = 'IDX_infraccion_movimiento_fecha_movimiento';

export class CreateInfraccionMovimiento1790000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_NAME,
        columns: [
          {
            name: 'id_infraccion_movimiento',
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
            name: 'id_estatus_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_usuario',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'accion',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'fecha_movimiento',
            type: 'timestamp',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(TABLE_NAME, [
      new TableForeignKey({
        name: FK_MOVIMIENTO_INFRACCION,
        columnNames: ['id_infraccion'],
        referencedTableName: 'infracciones',
        referencedColumnNames: ['id_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_MOVIMIENTO_ESTATUS,
        columnNames: ['id_estatus_infraccion'],
        referencedTableName: 'estatus_infraccion',
        referencedColumnNames: ['id_estatus_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_MOVIMIENTO_USUARIO,
        columnNames: ['id_usuario'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_MOVIMIENTO_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_MOVIMIENTO_ESTATUS,
        columnNames: ['id_estatus_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_MOVIMIENTO_USUARIO,
        columnNames: ['id_usuario'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_MOVIMIENTO_FECHA,
        columnNames: ['fecha_movimiento'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, IDX_MOVIMIENTO_FECHA);
    await queryRunner.dropIndex(TABLE_NAME, IDX_MOVIMIENTO_USUARIO);
    await queryRunner.dropIndex(TABLE_NAME, IDX_MOVIMIENTO_ESTATUS);
    await queryRunner.dropIndex(TABLE_NAME, IDX_MOVIMIENTO_INFRACCION);

    const movementTable = await queryRunner.getTable(TABLE_NAME);
    const foreignKeys = [
      FK_MOVIMIENTO_USUARIO,
      FK_MOVIMIENTO_ESTATUS,
      FK_MOVIMIENTO_INFRACCION,
    ];

    for (const foreignKeyName of foreignKeys) {
      const foreignKey = movementTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_NAME, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_NAME);
  }
}

import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

const TABLE_NAME = 'pago_infraccion';

const FK_PAGO_INFRACCION_INFRACCION = 'FK_pago_infraccion_id_infraccion_infracciones_id_infraccion';
const FK_PAGO_INFRACCION_USUARIO =
  'FK_pago_infraccion_id_usuario_registra_pago_usuarios_id_usuario';

const IDX_PAGO_INFRACCION_INFRACCION = 'IDX_pago_infraccion_id_infraccion';
const IDX_PAGO_INFRACCION_USUARIO = 'IDX_pago_infraccion_id_usuario_registra_pago';
const IDX_PAGO_INFRACCION_FOLIO = 'IDX_pago_infraccion_folio_pago';
const IDX_PAGO_INFRACCION_FECHA = 'IDX_pago_infraccion_fecha_pago';

export class CreatePagoInfraccion1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_NAME,
        columns: [
          {
            name: 'id_pago_infraccion',
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
            name: 'id_usuario_registra_pago',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'folio_pago',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'monto',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'fecha_pago',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      TABLE_NAME,
      new TableForeignKey({
        name: FK_PAGO_INFRACCION_INFRACCION,
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
        name: FK_PAGO_INFRACCION_USUARIO,
        columnNames: ['id_usuario_registra_pago'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_PAGO_INFRACCION_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_PAGO_INFRACCION_USUARIO,
        columnNames: ['id_usuario_registra_pago'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_PAGO_INFRACCION_FOLIO,
        columnNames: ['folio_pago'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_NAME,
      new TableIndex({
        name: IDX_PAGO_INFRACCION_FECHA,
        columnNames: ['fecha_pago'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_NAME, IDX_PAGO_INFRACCION_FECHA);
    await queryRunner.dropIndex(TABLE_NAME, IDX_PAGO_INFRACCION_FOLIO);
    await queryRunner.dropIndex(TABLE_NAME, IDX_PAGO_INFRACCION_USUARIO);
    await queryRunner.dropIndex(TABLE_NAME, IDX_PAGO_INFRACCION_INFRACCION);

    const table = await queryRunner.getTable(TABLE_NAME);
    const foreignKeys = [FK_PAGO_INFRACCION_USUARIO, FK_PAGO_INFRACCION_INFRACCION];

    for (const foreignKeyName of foreignKeys) {
      const foreignKey = table?.foreignKeys.find((candidate) => candidate.name === foreignKeyName);
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_NAME, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_NAME);
  }
}

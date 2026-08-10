import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableCheck,
  TableForeignKey,
  TableIndex,
  TableUnique,
} from 'typeorm';

const TABLE_CONCEPTO_PAGO = 'concepto_pago';
const TABLE_PAGO_CONCEPTO = 'pago_concepto';

const UQ_CONCEPTO_CLAVE = 'UQ_concepto_pago_clave_concepto';
const UQ_PAGO_CONCEPTO = 'UQ_pago_concepto_id_pago_id_concepto';
const FK_PAGO_CONCEPTO_PAGO =
  'FK_pago_concepto_id_pago_infraccion_pago_infraccion_id_pago_infraccion';
const FK_PAGO_CONCEPTO_CONCEPTO =
  'FK_pago_concepto_id_concepto_pago_concepto_pago_id_concepto_pago';
const IDX_PAGO_CONCEPTO_PAGO = 'IDX_pago_concepto_id_pago_infraccion';
const IDX_PAGO_CONCEPTO_CONCEPTO = 'IDX_pago_concepto_id_concepto_pago';
const CHK_PAGO_CONCEPTO_MONTO = 'CHK_pago_concepto_monto_positivo';
const CHK_PAGO_CONCEPTO_ORDEN = 'CHK_pago_concepto_orden_positivo';

export class CreatePagoConceptos1860000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_CONCEPTO_PAGO,
        columns: [
          {
            name: 'id_concepto_pago',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'clave_concepto',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'activo',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
        ],
        uniques: [
          new TableUnique({
            name: UQ_CONCEPTO_CLAVE,
            columnNames: ['clave_concepto'],
          }),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: TABLE_PAGO_CONCEPTO,
        columns: [
          {
            name: 'id_pago_concepto',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_pago_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_concepto_pago',
            type: 'int',
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
            name: 'orden',
            type: 'int',
            isNullable: false,
          },
        ],
        uniques: [
          new TableUnique({
            name: UQ_PAGO_CONCEPTO,
            columnNames: ['id_pago_infraccion', 'id_concepto_pago'],
          }),
        ],
        checks: [
          new TableCheck({
            name: CHK_PAGO_CONCEPTO_MONTO,
            expression: 'monto > 0',
          }),
          new TableCheck({
            name: CHK_PAGO_CONCEPTO_ORDEN,
            expression: 'orden > 0',
          }),
        ],
      }),
    );

    await queryRunner.createForeignKeys(TABLE_PAGO_CONCEPTO, [
      new TableForeignKey({
        name: FK_PAGO_CONCEPTO_PAGO,
        columnNames: ['id_pago_infraccion'],
        referencedTableName: 'pago_infraccion',
        referencedColumnNames: ['id_pago_infraccion'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_PAGO_CONCEPTO_CONCEPTO,
        columnNames: ['id_concepto_pago'],
        referencedTableName: TABLE_CONCEPTO_PAGO,
        referencedColumnNames: ['id_concepto_pago'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndices(TABLE_PAGO_CONCEPTO, [
      new TableIndex({
        name: IDX_PAGO_CONCEPTO_PAGO,
        columnNames: ['id_pago_infraccion'],
      }),
      new TableIndex({
        name: IDX_PAGO_CONCEPTO_CONCEPTO,
        columnNames: ['id_concepto_pago'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(TABLE_PAGO_CONCEPTO);
    await queryRunner.dropTable(TABLE_CONCEPTO_PAGO);
  }
}

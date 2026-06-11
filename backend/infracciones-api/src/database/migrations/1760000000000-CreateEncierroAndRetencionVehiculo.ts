import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

const ENCIERRO_TABLE = 'encierro';
const RETENCION_VEHICULO_TABLE = 'retencion_vehiculo';

const UQ_ENCIERRO_NOMBRE = 'UQ_encierro_nombre_encierro';

const FK_RETENCION_VEHICULO_INFRACCION =
  'FK_retencion_vehiculo_id_infraccion_infracciones_id_infraccion';
const FK_RETENCION_VEHICULO_ENCIERRO = 'FK_retencion_vehiculo_id_encierro_encierro_id_encierro';

const IDX_RETENCION_VEHICULO_INFRACCION = 'IDX_retencion_vehiculo_id_infraccion';
const IDX_RETENCION_VEHICULO_ENCIERRO = 'IDX_retencion_vehiculo_id_encierro';
const IDX_RETENCION_VEHICULO_FECHA_INGRESO = 'IDX_retencion_vehiculo_fecha_ingreso';
const IDX_RETENCION_VEHICULO_FOLIO_RESGUARDO = 'IDX_retencion_vehiculo_folio_resguardo';

export class CreateEncierroAndRetencionVehiculo1760000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: ENCIERRO_TABLE,
        columns: [
          {
            name: 'id_encierro',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_encierro',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: UQ_ENCIERRO_NOMBRE,
            columnNames: ['nombre_encierro'],
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: RETENCION_VEHICULO_TABLE,
        columns: [
          {
            name: 'id_retencion_vehiculo',
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
            name: 'id_encierro',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fecha_ingreso',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'recibido_por',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'folio_resguardo',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'observaciones_ingreso',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estado_ingreso',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      RETENCION_VEHICULO_TABLE,
      new TableForeignKey({
        name: FK_RETENCION_VEHICULO_INFRACCION,
        columnNames: ['id_infraccion'],
        referencedTableName: 'infracciones',
        referencedColumnNames: ['id_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      RETENCION_VEHICULO_TABLE,
      new TableForeignKey({
        name: FK_RETENCION_VEHICULO_ENCIERRO,
        columnNames: ['id_encierro'],
        referencedTableName: ENCIERRO_TABLE,
        referencedColumnNames: ['id_encierro'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      RETENCION_VEHICULO_TABLE,
      new TableIndex({
        name: IDX_RETENCION_VEHICULO_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      RETENCION_VEHICULO_TABLE,
      new TableIndex({
        name: IDX_RETENCION_VEHICULO_ENCIERRO,
        columnNames: ['id_encierro'],
      }),
    );

    await queryRunner.createIndex(
      RETENCION_VEHICULO_TABLE,
      new TableIndex({
        name: IDX_RETENCION_VEHICULO_FECHA_INGRESO,
        columnNames: ['fecha_ingreso'],
      }),
    );

    await queryRunner.createIndex(
      RETENCION_VEHICULO_TABLE,
      new TableIndex({
        name: IDX_RETENCION_VEHICULO_FOLIO_RESGUARDO,
        columnNames: ['folio_resguardo'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(RETENCION_VEHICULO_TABLE, IDX_RETENCION_VEHICULO_FOLIO_RESGUARDO);
    await queryRunner.dropIndex(RETENCION_VEHICULO_TABLE, IDX_RETENCION_VEHICULO_FECHA_INGRESO);
    await queryRunner.dropIndex(RETENCION_VEHICULO_TABLE, IDX_RETENCION_VEHICULO_ENCIERRO);
    await queryRunner.dropIndex(RETENCION_VEHICULO_TABLE, IDX_RETENCION_VEHICULO_INFRACCION);

    const retencionVehiculoTable = await queryRunner.getTable(RETENCION_VEHICULO_TABLE);
    const retencionVehiculoForeignKeys = [
      FK_RETENCION_VEHICULO_ENCIERRO,
      FK_RETENCION_VEHICULO_INFRACCION,
    ];

    for (const foreignKeyName of retencionVehiculoForeignKeys) {
      const foreignKey = retencionVehiculoTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(RETENCION_VEHICULO_TABLE, foreignKey);
      }
    }

    await queryRunner.dropTable(RETENCION_VEHICULO_TABLE);
    await queryRunner.dropTable(ENCIERRO_TABLE);
  }
}

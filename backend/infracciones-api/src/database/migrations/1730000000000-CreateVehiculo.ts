import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

const VEHICULO_TABLE = 'vehiculo';

const FK_VEHICULO_CLASE = 'FK_vehiculo_id_clase_vehiculo_clase_vehiculo_id_clase_vehiculo';
const FK_VEHICULO_LINEA = 'FK_vehiculo_id_linea_vehiculo_linea_vehiculo_id_linea_vehiculo';
const FK_VEHICULO_SERVICIO = 'FK_vehiculo_id_servicio_servicio_id_servicio';

const IDX_VEHICULO_CLASE = 'IDX_vehiculo_id_clase_vehiculo';
const IDX_VEHICULO_LINEA = 'IDX_vehiculo_id_linea_vehiculo';
const IDX_VEHICULO_SERVICIO = 'IDX_vehiculo_id_servicio';
const IDX_VEHICULO_PLACAS = 'IDX_vehiculo_placas';

export class CreateVehiculo1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: VEHICULO_TABLE,
        columns: [
          {
            name: 'id_vehiculo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_clase_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_linea_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_servicio',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'anio_modelo',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'sitio_servicio_publico',
            type: 'varchar',
            length: '80',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'placas',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'estado_placas',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'serie',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'motor',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      VEHICULO_TABLE,
      new TableForeignKey({
        name: FK_VEHICULO_CLASE,
        columnNames: ['id_clase_vehiculo'],
        referencedTableName: 'clase_vehiculo',
        referencedColumnNames: ['id_clase_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      VEHICULO_TABLE,
      new TableForeignKey({
        name: FK_VEHICULO_LINEA,
        columnNames: ['id_linea_vehiculo'],
        referencedTableName: 'linea_vehiculo',
        referencedColumnNames: ['id_linea_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      VEHICULO_TABLE,
      new TableForeignKey({
        name: FK_VEHICULO_SERVICIO,
        columnNames: ['id_servicio'],
        referencedTableName: 'servicio',
        referencedColumnNames: ['id_servicio'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      VEHICULO_TABLE,
      new TableIndex({
        name: IDX_VEHICULO_CLASE,
        columnNames: ['id_clase_vehiculo'],
      }),
    );

    await queryRunner.createIndex(
      VEHICULO_TABLE,
      new TableIndex({
        name: IDX_VEHICULO_LINEA,
        columnNames: ['id_linea_vehiculo'],
      }),
    );

    await queryRunner.createIndex(
      VEHICULO_TABLE,
      new TableIndex({
        name: IDX_VEHICULO_SERVICIO,
        columnNames: ['id_servicio'],
      }),
    );

    await queryRunner.createIndex(
      VEHICULO_TABLE,
      new TableIndex({
        name: IDX_VEHICULO_PLACAS,
        columnNames: ['placas'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(VEHICULO_TABLE, IDX_VEHICULO_PLACAS);
    await queryRunner.dropIndex(VEHICULO_TABLE, IDX_VEHICULO_SERVICIO);
    await queryRunner.dropIndex(VEHICULO_TABLE, IDX_VEHICULO_LINEA);
    await queryRunner.dropIndex(VEHICULO_TABLE, IDX_VEHICULO_CLASE);

    const vehiculoTable = await queryRunner.getTable(VEHICULO_TABLE);
    const vehiculoClaseForeignKey = vehiculoTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_VEHICULO_CLASE,
    );
    const vehiculoLineaForeignKey = vehiculoTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_VEHICULO_LINEA,
    );
    const vehiculoServicioForeignKey = vehiculoTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_VEHICULO_SERVICIO,
    );

    if (vehiculoClaseForeignKey) {
      await queryRunner.dropForeignKey(VEHICULO_TABLE, vehiculoClaseForeignKey);
    }

    if (vehiculoLineaForeignKey) {
      await queryRunner.dropForeignKey(VEHICULO_TABLE, vehiculoLineaForeignKey);
    }

    if (vehiculoServicioForeignKey) {
      await queryRunner.dropForeignKey(VEHICULO_TABLE, vehiculoServicioForeignKey);
    }

    await queryRunner.dropTable(VEHICULO_TABLE);
  }
}

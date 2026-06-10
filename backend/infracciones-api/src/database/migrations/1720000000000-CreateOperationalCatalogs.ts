import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

const SERVICE_TABLE = 'servicio';
const VEHICLE_CLASS_TABLE = 'clase_vehiculo';
const VEHICLE_BRAND_TABLE = 'marca_vehiculo';
const VEHICLE_LINE_TABLE = 'linea_vehiculo';
const PROCEDURE_TYPE_TABLE = 'tipo_procedimiento';
const OPERATION_TABLE = 'operativo';
const INCIDENT_PLACE_TABLE = 'lugar_infraccion';
const REASON_TABLE = 'motivo';

const FK_VEHICLE_LINE_BRAND = 'FK_linea_vehiculo_id_marca_vehiculo_marca_vehiculo_id_marca_vehiculo';

export class CreateOperationalCatalogs1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: SERVICE_TABLE,
        columns: [
          {
            name: 'id_servicio',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_servicio',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: VEHICLE_CLASS_TABLE,
        columns: [
          {
            name: 'id_clase_vehiculo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_clase_vehiculo',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: VEHICLE_BRAND_TABLE,
        columns: [
          {
            name: 'id_marca_vehiculo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_marca_vehiculo',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: VEHICLE_LINE_TABLE,
        columns: [
          {
            name: 'id_linea_vehiculo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_marca_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nombre_linea_vehiculo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'UQ_linea_vehiculo_id_marca_vehiculo_nombre_linea_vehiculo',
            columnNames: ['id_marca_vehiculo', 'nombre_linea_vehiculo'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      VEHICLE_LINE_TABLE,
      new TableForeignKey({
        name: FK_VEHICLE_LINE_BRAND,
        columnNames: ['id_marca_vehiculo'],
        referencedTableName: VEHICLE_BRAND_TABLE,
        referencedColumnNames: ['id_marca_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: PROCEDURE_TYPE_TABLE,
        columns: [
          {
            name: 'id_tipo_procedimiento',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_tipo_procedimiento',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: OPERATION_TABLE,
        columns: [
          {
            name: 'id_operativo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_operativo',
            type: 'varchar',
            length: '120',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: INCIDENT_PLACE_TABLE,
        columns: [
          {
            name: 'id_lugar_infraccion',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_lugar_infraccion',
            type: 'varchar',
            length: '200',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: REASON_TABLE,
        columns: [
          {
            name: 'id_motivo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_motivo',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const lineTable = await queryRunner.getTable(VEHICLE_LINE_TABLE);
    const lineForeignKey = lineTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_VEHICLE_LINE_BRAND,
    );
    if (lineForeignKey) {
      await queryRunner.dropForeignKey(VEHICLE_LINE_TABLE, lineForeignKey);
    }

    await queryRunner.dropTable(VEHICLE_LINE_TABLE);
    await queryRunner.dropTable(REASON_TABLE);
    await queryRunner.dropTable(INCIDENT_PLACE_TABLE);
    await queryRunner.dropTable(OPERATION_TABLE);
    await queryRunner.dropTable(PROCEDURE_TYPE_TABLE);
    await queryRunner.dropTable(VEHICLE_BRAND_TABLE);
    await queryRunner.dropTable(VEHICLE_CLASS_TABLE);
    await queryRunner.dropTable(SERVICE_TABLE);
  }
}

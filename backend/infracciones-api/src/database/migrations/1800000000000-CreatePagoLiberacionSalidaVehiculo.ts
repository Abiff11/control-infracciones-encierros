import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const TABLE_PAGO = 'pago_infraccion';
const TABLE_LIBERACION = 'liberacion_vehiculo';
const TABLE_SALIDA = 'salida_vehiculo';

const FK_PAGO_INFRACCION =
  'FK_pago_infraccion_id_infraccion_infracciones_id_infraccion';
const FK_PAGO_USUARIO =
  'FK_pago_infraccion_id_usuario_registra_pago_usuarios_id_usuario';

const FK_LIBERACION_INFRACCION =
  'FK_liberacion_vehiculo_id_infraccion_infracciones_id_infraccion';
const FK_LIBERACION_PAGO =
  'FK_liberacion_vehiculo_id_pago_infraccion_pago_infraccion_id_pago_infraccion';
const FK_LIBERACION_USUARIO =
  'FK_liberacion_vehiculo_id_usuario_libera_usuarios_id_usuario';

const FK_SALIDA_RETENCION =
  'FK_salida_vehiculo_id_retencion_vehiculo_retencion_vehiculo_id_retencion_vehiculo';
const FK_SALIDA_LIBERACION =
  'FK_salida_vehiculo_id_liberacion_vehiculo_liberacion_vehiculo_id_liberacion_vehiculo';
const FK_SALIDA_USUARIO =
  'FK_salida_vehiculo_id_usuario_valida_salida_usuarios_id_usuario';

const IDX_PAGO_INFRACCION = 'IDX_pago_infraccion_id_infraccion';
const IDX_PAGO_USUARIO = 'IDX_pago_infraccion_id_usuario_registra_pago';
const IDX_PAGO_FECHA = 'IDX_pago_infraccion_fecha_pago';

const IDX_LIBERACION_INFRACCION = 'IDX_liberacion_vehiculo_id_infraccion';
const IDX_LIBERACION_PAGO = 'IDX_liberacion_vehiculo_id_pago_infraccion';
const IDX_LIBERACION_USUARIO = 'IDX_liberacion_vehiculo_id_usuario_libera';
const IDX_LIBERACION_FECHA = 'IDX_liberacion_vehiculo_fecha_liberacion';

const IDX_SALIDA_RETENCION = 'IDX_salida_vehiculo_id_retencion_vehiculo';
const IDX_SALIDA_LIBERACION = 'IDX_salida_vehiculo_id_liberacion_vehiculo';
const IDX_SALIDA_USUARIO = 'IDX_salida_vehiculo_id_usuario_valida_salida';
const IDX_SALIDA_FECHA = 'IDX_salida_vehiculo_fecha_salida';

export class CreatePagoLiberacionSalidaVehiculo1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_PAGO,
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

    await queryRunner.createForeignKeys(TABLE_PAGO, [
      new TableForeignKey({
        name: FK_PAGO_INFRACCION,
        columnNames: ['id_infraccion'],
        referencedTableName: 'infracciones',
        referencedColumnNames: ['id_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_PAGO_USUARIO,
        columnNames: ['id_usuario_registra_pago'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      TABLE_PAGO,
      new TableIndex({
        name: IDX_PAGO_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_PAGO,
      new TableIndex({
        name: IDX_PAGO_USUARIO,
        columnNames: ['id_usuario_registra_pago'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_PAGO,
      new TableIndex({
        name: IDX_PAGO_FECHA,
        columnNames: ['fecha_pago'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: TABLE_LIBERACION,
        columns: [
          {
            name: 'id_liberacion_vehiculo',
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
            name: 'id_pago_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_usuario_libera',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'folio_liberacion',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'fecha_liberacion',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'liberado_por',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'nombre_recibe_liberacion',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'observacion',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(TABLE_LIBERACION, [
      new TableForeignKey({
        name: FK_LIBERACION_INFRACCION,
        columnNames: ['id_infraccion'],
        referencedTableName: 'infracciones',
        referencedColumnNames: ['id_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_LIBERACION_PAGO,
        columnNames: ['id_pago_infraccion'],
        referencedTableName: TABLE_PAGO,
        referencedColumnNames: ['id_pago_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_LIBERACION_USUARIO,
        columnNames: ['id_usuario_libera'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      TABLE_LIBERACION,
      new TableIndex({
        name: IDX_LIBERACION_INFRACCION,
        columnNames: ['id_infraccion'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_LIBERACION,
      new TableIndex({
        name: IDX_LIBERACION_PAGO,
        columnNames: ['id_pago_infraccion'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_LIBERACION,
      new TableIndex({
        name: IDX_LIBERACION_USUARIO,
        columnNames: ['id_usuario_libera'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_LIBERACION,
      new TableIndex({
        name: IDX_LIBERACION_FECHA,
        columnNames: ['fecha_liberacion'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: TABLE_SALIDA,
        columns: [
          {
            name: 'id_salida_vehiculo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_retencion_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_liberacion_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_usuario_valida_salida',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fecha_salida',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'validado_por',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'persona_recibe_vehiculo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'observaciones_salida',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estado_salida',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(TABLE_SALIDA, [
      new TableForeignKey({
        name: FK_SALIDA_RETENCION,
        columnNames: ['id_retencion_vehiculo'],
        referencedTableName: 'retencion_vehiculo',
        referencedColumnNames: ['id_retencion_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_SALIDA_LIBERACION,
        columnNames: ['id_liberacion_vehiculo'],
        referencedTableName: TABLE_LIBERACION,
        referencedColumnNames: ['id_liberacion_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_SALIDA_USUARIO,
        columnNames: ['id_usuario_valida_salida'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      TABLE_SALIDA,
      new TableIndex({
        name: IDX_SALIDA_RETENCION,
        columnNames: ['id_retencion_vehiculo'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_SALIDA,
      new TableIndex({
        name: IDX_SALIDA_LIBERACION,
        columnNames: ['id_liberacion_vehiculo'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_SALIDA,
      new TableIndex({
        name: IDX_SALIDA_USUARIO,
        columnNames: ['id_usuario_valida_salida'],
      }),
    );
    await queryRunner.createIndex(
      TABLE_SALIDA,
      new TableIndex({
        name: IDX_SALIDA_FECHA,
        columnNames: ['fecha_salida'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(TABLE_SALIDA, IDX_SALIDA_FECHA);
    await queryRunner.dropIndex(TABLE_SALIDA, IDX_SALIDA_USUARIO);
    await queryRunner.dropIndex(TABLE_SALIDA, IDX_SALIDA_LIBERACION);
    await queryRunner.dropIndex(TABLE_SALIDA, IDX_SALIDA_RETENCION);

    const salidaTable = await queryRunner.getTable(TABLE_SALIDA);
    for (const foreignKeyName of [
      FK_SALIDA_USUARIO,
      FK_SALIDA_LIBERACION,
      FK_SALIDA_RETENCION,
    ]) {
      const foreignKey = salidaTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_SALIDA, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_SALIDA);

    await queryRunner.dropIndex(TABLE_LIBERACION, IDX_LIBERACION_FECHA);
    await queryRunner.dropIndex(TABLE_LIBERACION, IDX_LIBERACION_USUARIO);
    await queryRunner.dropIndex(TABLE_LIBERACION, IDX_LIBERACION_PAGO);
    await queryRunner.dropIndex(TABLE_LIBERACION, IDX_LIBERACION_INFRACCION);

    const liberacionTable = await queryRunner.getTable(TABLE_LIBERACION);
    for (const foreignKeyName of [
      FK_LIBERACION_USUARIO,
      FK_LIBERACION_PAGO,
      FK_LIBERACION_INFRACCION,
    ]) {
      const foreignKey = liberacionTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_LIBERACION, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_LIBERACION);

    await queryRunner.dropIndex(TABLE_PAGO, IDX_PAGO_FECHA);
    await queryRunner.dropIndex(TABLE_PAGO, IDX_PAGO_USUARIO);
    await queryRunner.dropIndex(TABLE_PAGO, IDX_PAGO_INFRACCION);

    const pagoTable = await queryRunner.getTable(TABLE_PAGO);
    for (const foreignKeyName of [FK_PAGO_USUARIO, FK_PAGO_INFRACCION]) {
      const foreignKey = pagoTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_PAGO, foreignKey);
      }
    }

    await queryRunner.dropTable(TABLE_PAGO);
  }
}

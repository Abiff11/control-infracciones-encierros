import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const TABLE_IMPORTACION = 'importacion_infracciones';
const TABLE_ERROR = 'importacion_infraccion_error';

const FK_IMPORTACION_REGION =
  'FK_importacion_infracciones_id_region_region_id_region';
const FK_IMPORTACION_DELEGACION =
  'FK_importacion_infracciones_id_delegacion_default_delegacion_id_delegacion';
const FK_IMPORTACION_USUARIO =
  'FK_importacion_infracciones_creado_por_usuario_id_usuarios_id_usuario';
const FK_ERROR_IMPORTACION =
  'FK_importacion_infraccion_error_id_importacion_infracciones_importacion';

export class CreateImportacionInfracciones1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: TABLE_IMPORTACION,
        columns: [
          {
            name: 'id_importacion_infracciones',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'anio',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_region',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_delegacion_default',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'nombre_archivo',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'nombre_hoja',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'total_filas',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'filas_validas',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'filas_importadas',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'filas_con_error',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'filas_omitidas',
            type: 'int',
            isNullable: false,
            default: 0,
          },
          {
            name: 'estado',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'modo_duplicados',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'crear_catalogos_faltantes',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'crear_delegaciones_faltantes',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'creado_por_usuario_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'fecha_creacion',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'fecha_importacion',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys(TABLE_IMPORTACION, [
      new TableForeignKey({
        name: FK_IMPORTACION_REGION,
        columnNames: ['id_region'],
        referencedTableName: 'region',
        referencedColumnNames: ['id_region'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_IMPORTACION_DELEGACION,
        columnNames: ['id_delegacion_default'],
        referencedTableName: 'delegacion',
        referencedColumnNames: ['id_delegacion'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: FK_IMPORTACION_USUARIO,
        columnNames: ['creado_por_usuario_id'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createIndex(
      TABLE_IMPORTACION,
      new TableIndex({
        name: 'IDX_importacion_infracciones_anio',
        columnNames: ['anio'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_IMPORTACION,
      new TableIndex({
        name: 'IDX_importacion_infracciones_estado',
        columnNames: ['estado'],
      }),
    );

    await queryRunner.createIndex(
      TABLE_IMPORTACION,
      new TableIndex({
        name: 'IDX_importacion_infracciones_id_region',
        columnNames: ['id_region'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: TABLE_ERROR,
        columns: [
          {
            name: 'id_importacion_infraccion_error',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_importacion_infracciones',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'numero_fila',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'tipo',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'campo',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'valor',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mensaje',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'raw_row',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'fecha_creacion',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      TABLE_ERROR,
      new TableForeignKey({
        name: FK_ERROR_IMPORTACION,
        columnNames: ['id_importacion_infracciones'],
        referencedTableName: TABLE_IMPORTACION,
        referencedColumnNames: ['id_importacion_infracciones'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      TABLE_ERROR,
      new TableIndex({
        name: 'IDX_importacion_infraccion_error_importacion',
        columnNames: ['id_importacion_infracciones'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const errorTable = await queryRunner.getTable(TABLE_ERROR);
    const errorForeignKey = errorTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_ERROR_IMPORTACION,
    );
    if (errorForeignKey) {
      await queryRunner.dropForeignKey(TABLE_ERROR, errorForeignKey);
    }
    await queryRunner.dropTable(TABLE_ERROR);

    const importacionTable = await queryRunner.getTable(TABLE_IMPORTACION);
    for (const foreignKeyName of [
      FK_IMPORTACION_USUARIO,
      FK_IMPORTACION_DELEGACION,
      FK_IMPORTACION_REGION,
    ]) {
      const foreignKey = importacionTable?.foreignKeys.find(
        (foreignKey) => foreignKey.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(TABLE_IMPORTACION, foreignKey);
      }
    }

    await queryRunner.dropIndex(
      TABLE_IMPORTACION,
      'IDX_importacion_infracciones_id_region',
    );
    await queryRunner.dropIndex(
      TABLE_IMPORTACION,
      'IDX_importacion_infracciones_estado',
    );
    await queryRunner.dropIndex(
      TABLE_IMPORTACION,
      'IDX_importacion_infracciones_anio',
    );
    await queryRunner.dropTable(TABLE_IMPORTACION);
  }
}

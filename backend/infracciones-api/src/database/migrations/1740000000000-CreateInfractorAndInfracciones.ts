import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const INFRACTOR_TABLE = 'infractor';
const INFRACCIONES_TABLE = 'infracciones';

const FK_INFRACTOR_SEXO = 'FK_infractor_id_sexo_sexo_id_sexo';

const FK_INFRACCIONES_INFRACTOR =
  'FK_infracciones_id_infractor_infractor_id_infractor';
const FK_INFRACCIONES_DELEGACION =
  'FK_infracciones_id_delegacion_delegacion_id_delegacion';
const FK_INFRACCIONES_VEHICULO =
  'FK_infracciones_id_vehiculo_vehiculo_id_vehiculo';
const FK_INFRACCIONES_LUGAR =
  'FK_infracciones_id_lugar_infraccion_lugar_infraccion_id_lugar_infraccion';
const FK_INFRACCIONES_TIPO_PROCEDIMIENTO =
  'FK_infracciones_id_tipo_procedimiento_tipo_procedimiento_id_tipo_procedimiento';
const FK_INFRACCIONES_OPERATIVO =
  'FK_infracciones_id_operativo_operativo_id_operativo';
const FK_INFRACCIONES_ESTATUS =
  'FK_infracciones_id_estatus_infraccion_estatus_infraccion_id_estatus_infraccion';
const FK_INFRACCIONES_USUARIO =
  'FK_infracciones_id_usuario_captura_usuarios_id_usuario';

const IDX_INFRACTOR_SEXO = 'IDX_infractor_id_sexo';
const IDX_INFRACTOR_CURP = 'IDX_infractor_curp';
const IDX_INFRACTOR_LICENCIA = 'IDX_infractor_licencia';

const IDX_INFRACCIONES_INFRACTOR = 'IDX_infracciones_id_infractor';
const IDX_INFRACCIONES_DELEGACION = 'IDX_infracciones_id_delegacion';
const IDX_INFRACCIONES_VEHICULO = 'IDX_infracciones_id_vehiculo';
const IDX_INFRACCIONES_ESTATUS = 'IDX_infracciones_id_estatus_infraccion';
const IDX_INFRACCIONES_USUARIO = 'IDX_infracciones_id_usuario_captura';
const IDX_INFRACCIONES_FECHA = 'IDX_infracciones_fecha_infraccion';
const IDX_INFRACCIONES_FOLIO = 'IDX_infracciones_folio_infraccion';

export class CreateInfractorAndInfracciones1740000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: INFRACTOR_TABLE,
        columns: [
          {
            name: 'id_infractor',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_sexo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nombre',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'apellido_paterno',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'apellido_materno',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'licencia',
            type: 'varchar',
            length: '30',
            isNullable: true,
          },
          {
            name: 'curp',
            type: 'varchar',
            length: '18',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      INFRACTOR_TABLE,
      new TableForeignKey({
        name: FK_INFRACTOR_SEXO,
        columnNames: ['id_sexo'],
        referencedTableName: 'sexo',
        referencedColumnNames: ['id_sexo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      INFRACTOR_TABLE,
      new TableIndex({
        name: IDX_INFRACTOR_SEXO,
        columnNames: ['id_sexo'],
      }),
    );

    await queryRunner.createIndex(
      INFRACTOR_TABLE,
      new TableIndex({
        name: IDX_INFRACTOR_CURP,
        columnNames: ['curp'],
      }),
    );

    await queryRunner.createIndex(
      INFRACTOR_TABLE,
      new TableIndex({
        name: IDX_INFRACTOR_LICENCIA,
        columnNames: ['licencia'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: INFRACCIONES_TABLE,
        columns: [
          {
            name: 'id_infraccion',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_infractor',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_delegacion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_vehiculo',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_lugar_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_tipo_procedimiento',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_operativo',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'id_estatus_infraccion',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'id_usuario_captura',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'folio_infraccion',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'fecha_infraccion',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'hora_infraccion',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'observaciones',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'clave_policia',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'num_parte_informativo',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
        uniques: [
          {
            name: 'UQ_infracciones_folio_infraccion',
            columnNames: ['folio_infraccion'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_INFRACTOR,
        columnNames: ['id_infractor'],
        referencedTableName: INFRACTOR_TABLE,
        referencedColumnNames: ['id_infractor'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_DELEGACION,
        columnNames: ['id_delegacion'],
        referencedTableName: 'delegacion',
        referencedColumnNames: ['id_delegacion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_VEHICULO,
        columnNames: ['id_vehiculo'],
        referencedTableName: 'vehiculo',
        referencedColumnNames: ['id_vehiculo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_LUGAR,
        columnNames: ['id_lugar_infraccion'],
        referencedTableName: 'lugar_infraccion',
        referencedColumnNames: ['id_lugar_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_TIPO_PROCEDIMIENTO,
        columnNames: ['id_tipo_procedimiento'],
        referencedTableName: 'tipo_procedimiento',
        referencedColumnNames: ['id_tipo_procedimiento'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_OPERATIVO,
        columnNames: ['id_operativo'],
        referencedTableName: 'operativo',
        referencedColumnNames: ['id_operativo'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_ESTATUS,
        columnNames: ['id_estatus_infraccion'],
        referencedTableName: 'estatus_infraccion',
        referencedColumnNames: ['id_estatus_infraccion'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      INFRACCIONES_TABLE,
      new TableForeignKey({
        name: FK_INFRACCIONES_USUARIO,
        columnNames: ['id_usuario_captura'],
        referencedTableName: 'usuarios',
        referencedColumnNames: ['id_usuario'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_INFRACTOR,
        columnNames: ['id_infractor'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_DELEGACION,
        columnNames: ['id_delegacion'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_VEHICULO,
        columnNames: ['id_vehiculo'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_ESTATUS,
        columnNames: ['id_estatus_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_USUARIO,
        columnNames: ['id_usuario_captura'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_FECHA,
        columnNames: ['fecha_infraccion'],
      }),
    );

    await queryRunner.createIndex(
      INFRACCIONES_TABLE,
      new TableIndex({
        name: IDX_INFRACCIONES_FOLIO,
        columnNames: ['folio_infraccion'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_FOLIO);
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_FECHA);
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_USUARIO);
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_ESTATUS);
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_VEHICULO);
    await queryRunner.dropIndex(
      INFRACCIONES_TABLE,
      IDX_INFRACCIONES_DELEGACION,
    );
    await queryRunner.dropIndex(INFRACCIONES_TABLE, IDX_INFRACCIONES_INFRACTOR);

    const infraccionesTable = await queryRunner.getTable(INFRACCIONES_TABLE);
    const infraccionesForeignKeys = [
      FK_INFRACCIONES_INFRACTOR,
      FK_INFRACCIONES_DELEGACION,
      FK_INFRACCIONES_VEHICULO,
      FK_INFRACCIONES_LUGAR,
      FK_INFRACCIONES_TIPO_PROCEDIMIENTO,
      FK_INFRACCIONES_OPERATIVO,
      FK_INFRACCIONES_ESTATUS,
      FK_INFRACCIONES_USUARIO,
    ];

    for (const foreignKeyName of infraccionesForeignKeys) {
      const foreignKey = infraccionesTable?.foreignKeys.find(
        (candidate) => candidate.name === foreignKeyName,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey(INFRACCIONES_TABLE, foreignKey);
      }
    }

    await queryRunner.dropTable(INFRACCIONES_TABLE);

    await queryRunner.dropIndex(INFRACTOR_TABLE, IDX_INFRACTOR_LICENCIA);
    await queryRunner.dropIndex(INFRACTOR_TABLE, IDX_INFRACTOR_CURP);
    await queryRunner.dropIndex(INFRACTOR_TABLE, IDX_INFRACTOR_SEXO);

    const infractorTable = await queryRunner.getTable(INFRACTOR_TABLE);
    const infractorForeignKey = infractorTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_INFRACTOR_SEXO,
    );
    if (infractorForeignKey) {
      await queryRunner.dropForeignKey(INFRACTOR_TABLE, infractorForeignKey);
    }

    await queryRunner.dropTable(INFRACTOR_TABLE);
  }
}

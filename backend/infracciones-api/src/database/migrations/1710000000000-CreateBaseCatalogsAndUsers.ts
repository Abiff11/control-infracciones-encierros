import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

const ROLES_TABLE = 'rol';
const USERS_TABLE = 'usuarios';
const STATUS_TABLE = 'estatus_infraccion';
const SEX_TABLE = 'sexo';
const REGION_TABLE = 'region';
const DELEGATION_TABLE = 'delegacion';

const FK_USERS_ROLE = 'FK_usuarios_id_rol_rol_id_rol';
const FK_DELEGATION_REGION = 'FK_delegacion_id_region_region_id_region';

export class CreateBaseCatalogsAndUsers1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: ROLES_TABLE,
        columns: [
          {
            name: 'id_rol',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_rol',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: STATUS_TABLE,
        columns: [
          {
            name: 'id_estatus_infraccion',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_estatus',
            type: 'varchar',
            length: '50',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: SEX_TABLE,
        columns: [
          {
            name: 'id_sexo',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_sexo',
            type: 'varchar',
            length: '30',
            isNullable: false,
            isUnique: true,
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: REGION_TABLE,
        columns: [
          {
            name: 'id_region',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'nombre_region',
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
        name: USERS_TABLE,
        columns: [
          {
            name: 'id_usuario',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_rol',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nombre_usuario',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'activo',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      USERS_TABLE,
      new TableForeignKey({
        name: FK_USERS_ROLE,
        columnNames: ['id_rol'],
        referencedTableName: ROLES_TABLE,
        referencedColumnNames: ['id_rol'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: DELEGATION_TABLE,
        columns: [
          {
            name: 'id_delegacion',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'id_region',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'nombre_delegacion',
            type: 'varchar',
            length: '120',
            isNullable: false,
          },
        ],
        uniques: [
          {
            name: 'UQ_delegacion_id_region_nombre_delegacion',
            columnNames: ['id_region', 'nombre_delegacion'],
          },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      DELEGATION_TABLE,
      new TableForeignKey({
        name: FK_DELEGATION_REGION,
        columnNames: ['id_region'],
        referencedTableName: REGION_TABLE,
        referencedColumnNames: ['id_region'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.query(
      `INSERT INTO "${ROLES_TABLE}" ("nombre_rol") VALUES
        ('ADMIN'),
        ('SECCION_PRIMERA'),
        ('INFRACCIONES'),
        ('LIBERACIONES'),
        ('ENCIERRO'),
        ('CONSULTA')`,
    );

    await queryRunner.query(
      `INSERT INTO "${STATUS_TABLE}" ("nombre_estatus") VALUES
        ('CAPTURADA'),
        ('VEHICULO_RETENIDO'),
        ('PENDIENTE_PAGO'),
        ('PAGADA'),
        ('LIBERACION_GENERADA'),
        ('SALIDA_VALIDADA'),
        ('VEHICULO_ENTREGADO'),
        ('CANCELADA')`,
    );

    await queryRunner.query(
      `INSERT INTO "${SEX_TABLE}" ("nombre_sexo") VALUES
        ('MASCULINO'),
        ('FEMENINO'),
        ('NO ESPECIFICADO')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usersTable = await queryRunner.getTable(USERS_TABLE);
    const usersForeignKey = usersTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_USERS_ROLE,
    );
    if (usersForeignKey) {
      await queryRunner.dropForeignKey(USERS_TABLE, usersForeignKey);
    }

    await queryRunner.dropTable(USERS_TABLE);

    const delegationTable = await queryRunner.getTable(DELEGATION_TABLE);
    const delegationForeignKey = delegationTable?.foreignKeys.find(
      (foreignKey) => foreignKey.name === FK_DELEGATION_REGION,
    );
    if (delegationForeignKey) {
      await queryRunner.dropForeignKey(DELEGATION_TABLE, delegationForeignKey);
    }

    await queryRunner.dropTable(DELEGATION_TABLE);
    await queryRunner.dropTable(STATUS_TABLE);
    await queryRunner.dropTable(SEX_TABLE);
    await queryRunner.dropTable(ROLES_TABLE);
    await queryRunner.dropTable(REGION_TABLE);
  }
}

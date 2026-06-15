import { type MigrationInterface, type QueryRunner } from 'typeorm';

const TABLE_NAME = 'vehiculo';

export class AlterVehiculoTextFields1820000000000 implements MigrationInterface {
  name = 'AlterVehiculoTextFields1820000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "color" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "placas" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "estado_placas" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "serie" TYPE text`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "motor" TYPE text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "motor" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "serie" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "estado_placas" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "placas" TYPE character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "${TABLE_NAME}" ALTER COLUMN "color" TYPE character varying(20)`,
    );
  }
}

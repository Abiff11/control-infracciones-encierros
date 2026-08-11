import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddAuthSessionVersion1900000000000 implements MigrationInterface {
  name = 'AddAuthSessionVersion1900000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "auth_session_version" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "auth_session_version"`,
    );
  }
}

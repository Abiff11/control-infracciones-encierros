import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecurityAppHardening1782170000000 implements MigrationInterface {
  name = 'SecurityAppHardening1782170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        ADD COLUMN IF NOT EXISTS "failed_login_attempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "refresh_token_hash" character varying(255),
        ADD COLUMN IF NOT EXISTS "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "locked_until" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auth_login_attempts" (
        "id_auth_login_attempt" SERIAL NOT NULL,
        "email" character varying(150) NOT NULL,
        "id_usuario" integer,
        "success" boolean NOT NULL DEFAULT false,
        "reason" character varying(100),
        "ip" character varying(80),
        "user_agent" character varying(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_login_attempts" PRIMARY KEY ("id_auth_login_attempt")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "auth_login_attempts"');
    await queryRunner.query(`
      ALTER TABLE "usuarios"
        DROP COLUMN IF EXISTS "refresh_token_expires_at",
        DROP COLUMN IF EXISTS "refresh_token_hash",
        DROP COLUMN IF EXISTS "password_changed_at",
        DROP COLUMN IF EXISTS "last_login_at",
        DROP COLUMN IF EXISTS "locked_until",
        DROP COLUMN IF EXISTS "failed_login_attempts"
    `);
  }
}

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSecurityAuditMetadata1910000000000
  implements MigrationInterface
{
  name = 'AddSecurityAuditMetadata1910000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "severity" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "request_id" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "http_method" varchar(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "request_path" varchar(512)`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" ADD COLUMN IF NOT EXISTS "user_agent" varchar(512)`,
    );

    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_auditoria_entidad_created_at"
      ON "auditoria" ("entidad", "created_at" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_auditoria_severity_created_at"
      ON "auditoria" ("severity", "created_at" DESC)
      WHERE "severity" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_auditoria_request_id"
      ON "auditoria" ("request_id")
      WHERE "request_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_auditoria_request_id"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_auditoria_severity_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_auditoria_entidad_created_at"`,
    );

    await queryRunner.query(
      `ALTER TABLE "auditoria" DROP COLUMN IF EXISTS "user_agent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" DROP COLUMN IF EXISTS "request_path"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" DROP COLUMN IF EXISTS "http_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" DROP COLUMN IF EXISTS "request_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auditoria" DROP COLUMN IF EXISTS "severity"`,
    );
  }
}

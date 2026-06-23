import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditoriaTable1782170001000 implements MigrationInterface {
  name = 'AuditoriaTable1782170001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "auditoria" (
        "id_auditoria" SERIAL NOT NULL,
        "id_usuario" integer,
        "accion" character varying(80) NOT NULL,
        "entidad" character varying(100) NOT NULL,
        "entidad_id" character varying(100),
        "antes_json" jsonb,
        "despues_json" jsonb,
        "ip" character varying(80),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auditoria" PRIMARY KEY ("id_auditoria")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "auditoria"');
  }
}

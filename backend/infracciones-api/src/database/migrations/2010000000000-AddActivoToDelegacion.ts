import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddActivoToDelegacion2010000000000 implements MigrationInterface {
  name = 'AddActivoToDelegacion2010000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "delegacion"
        ADD COLUMN "activo" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // El CLI usa --transaction none. Proteger la comprobacion y el DDL
    // en la misma transaccion para no perder estados inactivos.
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        'LOCK TABLE "delegacion" IN ACCESS EXCLUSIVE MODE',
      );
      const rows = (await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM "delegacion" WHERE "activo" = false
        ) AS "hayInactivas"
      `)) as Array<{ hayInactivas: boolean }>;
      if (rows[0]?.hayInactivas) {
        throw new Error(
          'No se puede revertir: existen delegaciones inactivas.',
        );
      }
      await queryRunner.query(
        'ALTER TABLE "delegacion" DROP COLUMN "activo"',
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }
  }
}

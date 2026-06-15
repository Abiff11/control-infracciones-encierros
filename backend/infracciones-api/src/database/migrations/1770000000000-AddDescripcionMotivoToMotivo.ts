import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const MOTIVO_TABLE = 'motivo';
const DESCRIPCION_COLUMN = 'descripcion_motivo';

export class AddDescripcionMotivoToMotivo1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(MOTIVO_TABLE);
    const column = table?.findColumnByName(DESCRIPCION_COLUMN);

    if (!column) {
      await queryRunner.addColumn(
        MOTIVO_TABLE,
        new TableColumn({
          name: DESCRIPCION_COLUMN,
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(
      `UPDATE ${MOTIVO_TABLE} SET ${DESCRIPCION_COLUMN} = nombre_motivo WHERE ${DESCRIPCION_COLUMN} IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE ${MOTIVO_TABLE} ALTER COLUMN ${DESCRIPCION_COLUMN} SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(MOTIVO_TABLE);
    const column = table?.findColumnByName(DESCRIPCION_COLUMN);

    if (column) {
      await queryRunner.dropColumn(MOTIVO_TABLE, column);
    }
  }
}

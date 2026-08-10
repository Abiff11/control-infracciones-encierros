import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLE_PAGO = 'pago_infraccion';
const OLD_COLUMN = 'folio_pago';
const NEW_COLUMN = 'folio_linea_captura';

export class RenameFolioPagoToLineaCaptura1870000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(TABLE_PAGO);
    const oldColumn = table?.findColumnByName(OLD_COLUMN);
    const newColumn = table?.findColumnByName(NEW_COLUMN);

    if (newColumn) {
      return;
    }

    if (!oldColumn) {
      throw new Error(
        `No se encontro ${TABLE_PAGO}.${OLD_COLUMN} para renombrarla`,
      );
    }

    await queryRunner.renameColumn(TABLE_PAGO, OLD_COLUMN, NEW_COLUMN);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable(TABLE_PAGO);
    const oldColumn = table?.findColumnByName(OLD_COLUMN);
    const newColumn = table?.findColumnByName(NEW_COLUMN);

    if (oldColumn) {
      return;
    }

    if (!newColumn) {
      throw new Error(
        `No se encontro ${TABLE_PAGO}.${NEW_COLUMN} para revertir el nombre`,
      );
    }

    await queryRunner.renameColumn(TABLE_PAGO, NEW_COLUMN, OLD_COLUMN);
  }
}

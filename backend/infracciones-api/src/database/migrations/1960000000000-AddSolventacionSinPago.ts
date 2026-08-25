import { MigrationInterface, QueryRunner } from 'typeorm';

const ESTATUS_SOLVENTADA_SIN_PAGO = 'SOLVENTADA_SIN_PAGO';
const TABLE_SOLVENTACION = 'solventacion_sin_pago';
const TABLE_LIBERACION = 'liberacion_vehiculo';
const FK_SOLVENTACION_INFRACCION =
  'FK_solventacion_sin_pago_id_infraccion_infracciones_id_infraccion';
const FK_SOLVENTACION_USUARIO =
  'FK_solventacion_sin_pago_id_usuario_registra_usuarios_id_usuario';
const FK_LIBERACION_SOLVENTACION =
  'FK_liberacion_id_solventacion_sin_pago_solventacion_sin_pago';
const CHK_LIBERACION_RESPALDO = 'CHK_liberacion_respaldo_pago_o_solventacion';

export class AddSolventacionSinPago1960000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${TABLE_SOLVENTACION} (
        id_solventacion_sin_pago SERIAL PRIMARY KEY,
        id_infraccion INT NOT NULL,
        id_usuario_registra INT NOT NULL,
        motivo TEXT NOT NULL,
        fecha_solventacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ${FK_SOLVENTACION_INFRACCION}
          FOREIGN KEY (id_infraccion)
          REFERENCES infracciones(id_infraccion)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT ${FK_SOLVENTACION_USUARIO}
          FOREIGN KEY (id_usuario_registra)
          REFERENCES usuarios(id_usuario)
          ON UPDATE CASCADE
          ON DELETE RESTRICT,
        CONSTRAINT UQ_solventacion_sin_pago_id_infraccion UNIQUE (id_infraccion),
        CONSTRAINT CHK_solventacion_sin_pago_motivo CHECK (length(trim(motivo)) > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_solventacion_sin_pago_fecha_solventacion
      ON ${TABLE_SOLVENTACION}(fecha_solventacion)
    `);

    await queryRunner.query(
      `INSERT INTO estatus_infraccion (nombre_estatus)
       VALUES ($1)
       ON CONFLICT (nombre_estatus) DO NOTHING`,
      [ESTATUS_SOLVENTADA_SIN_PAGO],
    );

    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ALTER COLUMN id_pago_infraccion DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ADD COLUMN id_solventacion_sin_pago INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ADD CONSTRAINT ${FK_LIBERACION_SOLVENTACION}
      FOREIGN KEY (id_solventacion_sin_pago)
      REFERENCES ${TABLE_SOLVENTACION}(id_solventacion_sin_pago)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_liberacion_id_solventacion_sin_pago
      ON ${TABLE_LIBERACION}(id_solventacion_sin_pago)
    `);

    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ADD CONSTRAINT ${CHK_LIBERACION_RESPALDO}
      CHECK (
        (id_pago_infraccion IS NOT NULL AND id_solventacion_sin_pago IS NULL)
        OR
        (id_pago_infraccion IS NULL AND id_solventacion_sin_pago IS NOT NULL)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      DROP CONSTRAINT IF EXISTS ${CHK_LIBERACION_RESPALDO}
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS IDX_liberacion_id_solventacion_sin_pago
    `);
    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      DROP CONSTRAINT IF EXISTS ${FK_LIBERACION_SOLVENTACION}
    `);
    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      DROP COLUMN IF EXISTS id_solventacion_sin_pago
    `);
    await queryRunner.query(`
      ALTER TABLE ${TABLE_LIBERACION}
      ALTER COLUMN id_pago_infraccion SET NOT NULL
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS ${TABLE_SOLVENTACION}`);
    await queryRunner.query(
      `DELETE FROM estatus_infraccion e
       WHERE e.nombre_estatus = $1
         AND NOT EXISTS (
           SELECT 1
           FROM infracciones i
           WHERE i.id_estatus_infraccion = e.id_estatus_infraccion
         )`,
      [ESTATUS_SOLVENTADA_SIN_PAGO],
    );
  }
}

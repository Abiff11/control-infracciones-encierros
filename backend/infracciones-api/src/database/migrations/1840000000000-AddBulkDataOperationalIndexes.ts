import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBulkDataOperationalIndexes1840000000000
  implements MigrationInterface
{
  name = 'AddBulkDataOperationalIndexes1840000000000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await this.createIndex(
      queryRunner,
      'idx_infracciones_fecha_id',
      'infracciones',
      'fecha_infraccion DESC, id_infraccion DESC',
    );
    await this.createIndex(
      queryRunner,
      'idx_infracciones_delegacion_fecha',
      'infracciones',
      'id_delegacion, fecha_infraccion DESC, id_infraccion DESC',
    );
    await this.createIndex(
      queryRunner,
      'idx_infracciones_estatus_fecha',
      'infracciones',
      'id_estatus_infraccion, fecha_infraccion DESC, id_infraccion DESC',
    );
    await this.createIndex(
      queryRunner,
      'idx_infracciones_tipo_fecha',
      'infracciones',
      'id_tipo_procedimiento, fecha_infraccion DESC, id_infraccion DESC',
    );
    await this.createIndex(queryRunner, 'idx_infracciones_vehiculo', 'infracciones', 'id_vehiculo');
    await this.createIndex(queryRunner, 'idx_infracciones_infractor', 'infracciones', 'id_infractor');
    await this.createIndex(queryRunner, 'idx_infracciones_usuario_captura', 'infracciones', 'id_usuario_captura');
    await this.createIndex(queryRunner, 'idx_infracciones_operativo', 'infracciones', 'id_operativo');

    await this.createGinTrgmIndex(queryRunner, 'idx_infracciones_folio_trgm', 'infracciones', 'folio_infraccion');
    await this.createGinTrgmIndex(queryRunner, 'idx_infracciones_clave_policia_trgm', 'infracciones', 'clave_policia');
    await this.createGinTrgmIndex(queryRunner, 'idx_infracciones_num_parte_trgm', 'infracciones', 'num_parte_informativo');

    await this.createIndex(queryRunner, 'idx_vehiculo_clase', 'vehiculo', 'id_clase_vehiculo');
    await this.createIndex(queryRunner, 'idx_vehiculo_linea', 'vehiculo', 'id_linea_vehiculo');
    await this.createIndex(queryRunner, 'idx_vehiculo_servicio', 'vehiculo', 'id_servicio');
    await this.createGinTrgmIndex(queryRunner, 'idx_vehiculo_placas_trgm', 'vehiculo', 'placas');
    await this.createGinTrgmIndex(queryRunner, 'idx_vehiculo_serie_trgm', 'vehiculo', 'serie');
    await this.createGinTrgmIndex(queryRunner, 'idx_vehiculo_motor_trgm', 'vehiculo', 'motor');
    await this.createGinTrgmIndex(queryRunner, 'idx_vehiculo_color_trgm', 'vehiculo', 'color');

    await this.createIndex(queryRunner, 'idx_infractor_sexo', 'infractor', 'id_sexo');
    await this.createGinTrgmIndex(queryRunner, 'idx_infractor_nombre_trgm', 'infractor', 'nombre');
    await this.createGinTrgmIndex(queryRunner, 'idx_infractor_apellido_paterno_trgm', 'infractor', 'apellido_paterno');
    await this.createGinTrgmIndex(queryRunner, 'idx_infractor_apellido_materno_trgm', 'infractor', 'apellido_materno');
    await this.createGinTrgmIndex(queryRunner, 'idx_infractor_licencia_trgm', 'infractor', 'licencia');
    await this.createGinTrgmIndex(queryRunner, 'idx_infractor_curp_trgm', 'infractor', 'curp');

    await this.createIndex(queryRunner, 'idx_retencion_infraccion_fecha', 'retencion_vehiculo', 'id_infraccion, fecha_ingreso DESC, id_retencion_vehiculo DESC');
    await this.createIndex(queryRunner, 'idx_retencion_encierro_fecha', 'retencion_vehiculo', 'id_encierro, fecha_ingreso DESC, id_retencion_vehiculo DESC');
    await this.createGinTrgmIndex(queryRunner, 'idx_retencion_folio_resguardo_trgm', 'retencion_vehiculo', 'folio_resguardo');

    await this.createIndex(queryRunner, 'idx_pago_infraccion_fecha', 'pago_infraccion', 'id_infraccion, fecha_pago DESC, id_pago_infraccion DESC');
    await this.createIndex(queryRunner, 'idx_pago_fecha', 'pago_infraccion', 'fecha_pago DESC, id_pago_infraccion DESC');
    await this.createGinTrgmIndex(queryRunner, 'idx_pago_folio_trgm', 'pago_infraccion', 'folio_pago');

    await this.createIndex(queryRunner, 'idx_liberacion_infraccion_fecha', 'liberacion_vehiculo', 'id_infraccion, fecha_liberacion DESC, id_liberacion_vehiculo DESC');
    await this.createIndex(queryRunner, 'idx_salida_retencion_fecha', 'salida_vehiculo', 'id_retencion_vehiculo, fecha_salida DESC, id_salida_vehiculo DESC');

    await this.createIndex(queryRunner, 'idx_infraccion_motivo_infraccion', 'infraccion_motivo', 'id_infraccion, id_infraccion_motivo');
    await this.createIndex(queryRunner, 'idx_infraccion_motivo_motivo', 'infraccion_motivo', 'id_motivo');

    await this.createIndex(queryRunner, 'idx_delegacion_region_nombre', 'delegacion', 'id_region, nombre_delegacion');
    await this.createIndex(queryRunner, 'idx_linea_marca_nombre', 'linea_vehiculo', 'id_marca_vehiculo, nombre_linea_vehiculo');
    await this.createIndex(queryRunner, 'idx_importacion_anio_estado', 'importacion_infracciones', 'anio, estado');
    await this.createIndex(queryRunner, 'idx_importacion_error_importacion_fila', 'importacion_infraccion_error', 'id_importacion_infracciones, numero_fila');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      'idx_importacion_error_importacion_fila',
      'idx_importacion_anio_estado',
      'idx_linea_marca_nombre',
      'idx_delegacion_region_nombre',
      'idx_infraccion_motivo_motivo',
      'idx_infraccion_motivo_infraccion',
      'idx_salida_retencion_fecha',
      'idx_liberacion_infraccion_fecha',
      'idx_pago_folio_trgm',
      'idx_pago_fecha',
      'idx_pago_infraccion_fecha',
      'idx_retencion_folio_resguardo_trgm',
      'idx_retencion_encierro_fecha',
      'idx_retencion_infraccion_fecha',
      'idx_infractor_curp_trgm',
      'idx_infractor_licencia_trgm',
      'idx_infractor_apellido_materno_trgm',
      'idx_infractor_apellido_paterno_trgm',
      'idx_infractor_nombre_trgm',
      'idx_infractor_sexo',
      'idx_vehiculo_color_trgm',
      'idx_vehiculo_motor_trgm',
      'idx_vehiculo_serie_trgm',
      'idx_vehiculo_placas_trgm',
      'idx_vehiculo_servicio',
      'idx_vehiculo_linea',
      'idx_vehiculo_clase',
      'idx_infracciones_num_parte_trgm',
      'idx_infracciones_clave_policia_trgm',
      'idx_infracciones_folio_trgm',
      'idx_infracciones_operativo',
      'idx_infracciones_usuario_captura',
      'idx_infracciones_infractor',
      'idx_infracciones_vehiculo',
      'idx_infracciones_tipo_fecha',
      'idx_infracciones_estatus_fecha',
      'idx_infracciones_delegacion_fecha',
      'idx_infracciones_fecha_id',
    ];

    for (const indexName of indexes) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
    }
  }

  private async createIndex(
    queryRunner: QueryRunner,
    indexName: string,
    tableName: string,
    columns: string,
  ): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`,
    );
  }

  private async createGinTrgmIndex(
    queryRunner: QueryRunner,
    indexName: string,
    tableName: string,
    columnName: string,
  ): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ON ${tableName} USING gin (${columnName} gin_trgm_ops)`,
    );
  }
}

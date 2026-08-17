import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import type { AdminAuditContext } from './infracciones-admin.service';
import type { EliminarOperacionAdminDto } from './dto/eliminar-operacion-admin.dto';

export type AdminOperacionTipo = 'PAGO' | 'LIBERACION' | 'SALIDA' | 'RETENCION';

interface PagoRow {
  idPagoInfraccion: number;
  folioLineaCaptura: string;
  monto: string;
  fechaPago: Date | string;
  observaciones: string | null;
}

interface LiberacionRow {
  idLiberacionVehiculo: number;
  idPagoInfraccion: number;
  folioLiberacion: string;
  fechaLiberacion: Date | string;
}

interface SalidaRow {
  idSalidaVehiculo: number;
  idRetencionVehiculo: number;
  idLiberacionVehiculo: number;
  fechaSalida: Date | string;
  estadoSalida: string;
}

interface RetencionRow {
  idRetencionVehiculo: number;
  idEncierro: number;
  fechaIngreso: Date | string;
  folioResguardo: string | null;
  estadoIngreso: string | null;
}

export interface AdminOperacionEliminadaResult {
  tipo: AdminOperacionTipo;
  idOperacion: number;
  eliminado: true;
  dependenciasEliminadas: {
    pagos: number;
    liberaciones: number;
    salidas: number;
    retenciones: number;
  };
}

@Injectable()
export class InfraccionesAdminOperacionesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  eliminarOperacion(
    idInfraccion: number,
    tipo: AdminOperacionTipo,
    idOperacion: number,
    dto: EliminarOperacionAdminDto,
    audit: AdminAuditContext,
  ): Promise<AdminOperacionEliminadaResult> {
    return this.dataSource.transaction(async (manager) => {
      switch (tipo) {
        case 'PAGO':
          return this.eliminarPago(
            manager,
            idInfraccion,
            idOperacion,
            dto,
            audit,
          );
        case 'LIBERACION':
          return this.eliminarLiberacion(
            manager,
            idInfraccion,
            idOperacion,
            dto,
            audit,
          );
        case 'SALIDA':
          return this.eliminarSalida(
            manager,
            idInfraccion,
            idOperacion,
            dto,
            audit,
          );
        case 'RETENCION':
          return this.eliminarRetencion(
            manager,
            idInfraccion,
            idOperacion,
            dto,
            audit,
          );
      }
    });
  }

  private async eliminarPago(
    manager: EntityManager,
    idInfraccion: number,
    idPago: number,
    dto: EliminarOperacionAdminDto,
    audit: AdminAuditContext,
  ): Promise<AdminOperacionEliminadaResult> {
    const pago = await this.oneOrFail<PagoRow>(
      manager,
      `
        SELECT
          id_pago_infraccion AS "idPagoInfraccion",
          folio_linea_captura AS "folioLineaCaptura",
          monto,
          fecha_pago AS "fechaPago",
          observaciones
        FROM pago_infraccion
        WHERE id_pago_infraccion = $1
          AND id_infraccion = $2
        LIMIT 1
      `,
      [idPago, idInfraccion],
      'El pago indicado no pertenece a esta infraccion',
    );

    const liberaciones = await this.queryRows<LiberacionRow>(
      manager,
      `
        SELECT
          id_liberacion_vehiculo AS "idLiberacionVehiculo",
          id_pago_infraccion AS "idPagoInfraccion",
          folio_liberacion AS "folioLiberacion",
          fecha_liberacion AS "fechaLiberacion"
        FROM liberacion_vehiculo
        WHERE id_infraccion = $1
          AND id_pago_infraccion = $2
        ORDER BY id_liberacion_vehiculo ASC
      `,
      [idInfraccion, idPago],
    );
    const idLiberaciones = liberaciones.map((item) => item.idLiberacionVehiculo);
    const salidas =
      idLiberaciones.length > 0
        ? await this.queryRows<SalidaRow>(
            manager,
            `
              SELECT
                id_salida_vehiculo AS "idSalidaVehiculo",
                id_retencion_vehiculo AS "idRetencionVehiculo",
                id_liberacion_vehiculo AS "idLiberacionVehiculo",
                fecha_salida AS "fechaSalida",
                estado_salida AS "estadoSalida"
              FROM salida_vehiculo
              WHERE id_liberacion_vehiculo = ANY($1::int[])
              ORDER BY id_salida_vehiculo ASC
            `,
            [idLiberaciones],
          )
        : [];

    this.assertDependencyConfirmation(
      dto,
      liberaciones.length,
      salidas.length,
      'el pago',
    );

    if (idLiberaciones.length > 0) {
      await manager.query(
        'DELETE FROM salida_vehiculo WHERE id_liberacion_vehiculo = ANY($1::int[])',
        [idLiberaciones],
      );
      await manager.query(
        'DELETE FROM liberacion_vehiculo WHERE id_liberacion_vehiculo = ANY($1::int[])',
        [idLiberaciones],
      );
    }
    await manager.query('DELETE FROM pago_concepto WHERE id_pago_infraccion = $1', [
      idPago,
    ]);
    await manager.query(
      'DELETE FROM pago_infraccion WHERE id_pago_infraccion = $1 AND id_infraccion = $2',
      [idPago, idInfraccion],
    );

    const result = this.result('PAGO', idPago, {
      pagos: 1,
      liberaciones: liberaciones.length,
      salidas: salidas.length,
      retenciones: 0,
    });
    await this.registrarAuditoria(manager, audit, dto, idInfraccion, result, {
      pago,
      liberaciones,
      salidas,
    });
    return result;
  }

  private async eliminarLiberacion(
    manager: EntityManager,
    idInfraccion: number,
    idLiberacion: number,
    dto: EliminarOperacionAdminDto,
    audit: AdminAuditContext,
  ): Promise<AdminOperacionEliminadaResult> {
    const liberacion = await this.oneOrFail<LiberacionRow>(
      manager,
      `
        SELECT
          id_liberacion_vehiculo AS "idLiberacionVehiculo",
          id_pago_infraccion AS "idPagoInfraccion",
          folio_liberacion AS "folioLiberacion",
          fecha_liberacion AS "fechaLiberacion"
        FROM liberacion_vehiculo
        WHERE id_liberacion_vehiculo = $1
          AND id_infraccion = $2
        LIMIT 1
      `,
      [idLiberacion, idInfraccion],
      'La liberacion indicada no pertenece a esta infraccion',
    );
    const salidas = await this.queryRows<SalidaRow>(
      manager,
      `
        SELECT
          id_salida_vehiculo AS "idSalidaVehiculo",
          id_retencion_vehiculo AS "idRetencionVehiculo",
          id_liberacion_vehiculo AS "idLiberacionVehiculo",
          fecha_salida AS "fechaSalida",
          estado_salida AS "estadoSalida"
        FROM salida_vehiculo
        WHERE id_liberacion_vehiculo = $1
        ORDER BY id_salida_vehiculo ASC
      `,
      [idLiberacion],
    );
    this.assertDependencyConfirmation(dto, 0, salidas.length, 'la liberacion');

    await manager.query(
      'DELETE FROM salida_vehiculo WHERE id_liberacion_vehiculo = $1',
      [idLiberacion],
    );
    await manager.query(
      'DELETE FROM liberacion_vehiculo WHERE id_liberacion_vehiculo = $1 AND id_infraccion = $2',
      [idLiberacion, idInfraccion],
    );

    const result = this.result('LIBERACION', idLiberacion, {
      pagos: 0,
      liberaciones: 1,
      salidas: salidas.length,
      retenciones: 0,
    });
    await this.registrarAuditoria(manager, audit, dto, idInfraccion, result, {
      liberacion,
      salidas,
    });
    return result;
  }

  private async eliminarSalida(
    manager: EntityManager,
    idInfraccion: number,
    idSalida: number,
    dto: EliminarOperacionAdminDto,
    audit: AdminAuditContext,
  ): Promise<AdminOperacionEliminadaResult> {
    const salida = await this.oneOrFail<SalidaRow>(
      manager,
      `
        SELECT
          s.id_salida_vehiculo AS "idSalidaVehiculo",
          s.id_retencion_vehiculo AS "idRetencionVehiculo",
          s.id_liberacion_vehiculo AS "idLiberacionVehiculo",
          s.fecha_salida AS "fechaSalida",
          s.estado_salida AS "estadoSalida"
        FROM salida_vehiculo s
        INNER JOIN retencion_vehiculo r
          ON r.id_retencion_vehiculo = s.id_retencion_vehiculo
        WHERE s.id_salida_vehiculo = $1
          AND r.id_infraccion = $2
        LIMIT 1
      `,
      [idSalida, idInfraccion],
      'La salida indicada no pertenece a esta infraccion',
    );

    await manager.query('DELETE FROM salida_vehiculo WHERE id_salida_vehiculo = $1', [
      idSalida,
    ]);

    const result = this.result('SALIDA', idSalida, {
      pagos: 0,
      liberaciones: 0,
      salidas: 1,
      retenciones: 0,
    });
    await this.registrarAuditoria(manager, audit, dto, idInfraccion, result, {
      salida,
    });
    return result;
  }

  private async eliminarRetencion(
    manager: EntityManager,
    idInfraccion: number,
    idRetencion: number,
    dto: EliminarOperacionAdminDto,
    audit: AdminAuditContext,
  ): Promise<AdminOperacionEliminadaResult> {
    const retencion = await this.oneOrFail<RetencionRow>(
      manager,
      `
        SELECT
          id_retencion_vehiculo AS "idRetencionVehiculo",
          id_encierro AS "idEncierro",
          fecha_ingreso AS "fechaIngreso",
          folio_resguardo AS "folioResguardo",
          estado_ingreso AS "estadoIngreso"
        FROM retencion_vehiculo
        WHERE id_retencion_vehiculo = $1
          AND id_infraccion = $2
        LIMIT 1
      `,
      [idRetencion, idInfraccion],
      'La retencion indicada no pertenece a esta infraccion',
    );
    const salidas = await this.queryRows<SalidaRow>(
      manager,
      `
        SELECT
          id_salida_vehiculo AS "idSalidaVehiculo",
          id_retencion_vehiculo AS "idRetencionVehiculo",
          id_liberacion_vehiculo AS "idLiberacionVehiculo",
          fecha_salida AS "fechaSalida",
          estado_salida AS "estadoSalida"
        FROM salida_vehiculo
        WHERE id_retencion_vehiculo = $1
        ORDER BY id_salida_vehiculo ASC
      `,
      [idRetencion],
    );
    this.assertDependencyConfirmation(dto, 0, salidas.length, 'la retencion');

    await manager.query(
      'DELETE FROM salida_vehiculo WHERE id_retencion_vehiculo = $1',
      [idRetencion],
    );
    await manager.query(
      'DELETE FROM retencion_vehiculo WHERE id_retencion_vehiculo = $1 AND id_infraccion = $2',
      [idRetencion, idInfraccion],
    );

    const result = this.result('RETENCION', idRetencion, {
      pagos: 0,
      liberaciones: 0,
      salidas: salidas.length,
      retenciones: 1,
    });
    await this.registrarAuditoria(manager, audit, dto, idInfraccion, result, {
      retencion,
      salidas,
    });
    return result;
  }

  private assertDependencyConfirmation(
    dto: EliminarOperacionAdminDto,
    liberaciones: number,
    salidas: number,
    label: string,
  ): void {
    if (liberaciones + salidas === 0 || dto.confirmarDependencias === true) {
      return;
    }

    const parts = [
      liberaciones > 0 ? `${liberaciones} liberacion(es)` : null,
      salidas > 0 ? `${salidas} salida(s)` : null,
    ].filter(Boolean);
    throw new BadRequestException(
      `Para eliminar ${label} tambien deben eliminarse ${parts.join(' y ')}. Confirma la eliminacion de dependencias.`,
    );
  }

  private result(
    tipo: AdminOperacionTipo,
    idOperacion: number,
    dependenciasEliminadas: AdminOperacionEliminadaResult['dependenciasEliminadas'],
  ): AdminOperacionEliminadaResult {
    return {
      tipo,
      idOperacion,
      eliminado: true,
      dependenciasEliminadas,
    };
  }

  private async oneOrFail<T>(
    manager: EntityManager,
    sql: string,
    parameters: readonly unknown[],
    message: string,
  ): Promise<T> {
    const rows = await this.queryRows<T>(manager, sql, parameters);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(message);
    }
    return row;
  }

  private async queryRows<T>(
    manager: EntityManager,
    sql: string,
    parameters: readonly unknown[] = [],
  ): Promise<T[]> {
    const result: unknown = await manager.query(sql, [...parameters]);
    if (!Array.isArray(result)) {
      throw new Error('La consulta administrativa no devolvio un arreglo de filas');
    }
    return result as T[];
  }

  private async registrarAuditoria(
    manager: EntityManager,
    audit: AdminAuditContext,
    dto: EliminarOperacionAdminDto,
    idInfraccion: number,
    result: AdminOperacionEliminadaResult,
    before: unknown,
  ): Promise<void> {
    const antesJson = sanitizeAuditPayload({
      motivoEliminacion: dto.motivoEliminacion,
      operacion: result.tipo,
      registro: before,
    });
    const despuesJson = sanitizeAuditPayload({
      eliminado: true,
      motivoEliminacion: dto.motivoEliminacion,
      operacion: result.tipo,
      dependenciasEliminadas: result.dependenciasEliminadas,
    });

    await manager.query(
      `
        INSERT INTO auditoria (
          id_usuario,
          accion,
          entidad,
          entidad_id,
          antes_json,
          despues_json,
          ip,
          severity,
          request_id,
          http_method,
          request_path,
          user_agent
        ) VALUES (
          $1, 'OPERACION_ELIMINADA_ADMIN', 'infracciones', $2, $3::jsonb, $4::jsonb,
          $5, 'CRITICAL', $6, $7, $8, $9
        )
      `,
      [
        audit.idUsuario,
        String(idInfraccion),
        JSON.stringify(antesJson ?? null),
        JSON.stringify(despuesJson ?? null),
        this.truncate(audit.ip, 80),
        this.truncate(audit.requestId, 64),
        this.truncate(audit.httpMethod?.toUpperCase(), 10),
        this.truncate(audit.requestPath, 512),
        this.truncate(audit.userAgent, 512),
      ],
    );
  }

  private truncate(
    value: string | null | undefined,
    maxLength: number,
  ): string | null {
    if (!value) {
      return null;
    }
    return value.slice(0, maxLength);
  }
}

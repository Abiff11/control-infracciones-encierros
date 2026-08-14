import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import {
  AdminActualizarExpedienteDto,
  AdminActualizarPagoDto,
  EliminarInfraccionAdminDto,
} from './dto/admin-expediente.dto';

export interface AdminAuditContext {
  idUsuario: number;
  ip?: string | null;
  requestId?: string | null;
  httpMethod?: string | null;
  requestPath?: string | null;
  userAgent?: string | null;
}

interface CoreSnapshot {
  idInfraccion: number;
  idInfractor: number;
  idVehiculo: number;
  idLugarInfraccion: number;
  idDelegacion: number;
  idTipoProcedimiento: number;
  idEstatusInfraccion: number;
  idOperativo: number | null;
  folioInfraccion: string;
  fechaInfraccion: string;
  horaInfraccion: string;
  observaciones: string | null;
  clavePolicia: string | null;
  numParteInformativo: string | null;
  idSexo: number;
  nombre: string;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  licencia: string | null;
  curp: string | null;
  idClaseVehiculo: number;
  idLineaVehiculo: number;
  idServicio: number;
  anioModelo: number | null;
  sitioServicioPublico: string | null;
  color: string | null;
  placas: string | null;
  estadoPlacas: string | null;
  serie: string | null;
  motor: string | null;
  nombreLugarInfraccion: string;
}

interface PagoSnapshot {
  idPagoInfraccion: number;
  folioLineaCaptura: string;
  monto: string;
  montoInfraccion: string;
  diasPisoCobrados: number;
  montoDiasPiso: string;
  fechaPago: Date | string;
  observaciones: string | null;
  conceptos: Array<{
    idPagoConcepto: number;
    claveConcepto: string;
    monto: string;
    orden: number;
  }>;
}

export interface AdminExpedienteSnapshot {
  infraccion: CoreSnapshot;
  motivos: number[];
  retencion: Record<string, unknown> | null;
  pagos: PagoSnapshot[];
  liberaciones: Array<Record<string, unknown>>;
  salidas: Array<Record<string, unknown>>;
}

interface TipoProcedimientoReglasRow {
  nombreTipoProcedimiento: string;
  activo: boolean;
  esTipoExpediente: boolean;
  requiereFolioInfraccion: boolean;
  requiereNumParteInformativo: boolean;
  requiereMotivos: boolean;
  permiteRetencion: boolean;
  folioInfraccion: string;
  numParteInformativo: string | null;
}

interface IdRow {
  id: number;
}

@Injectable()
export class InfraccionesAdminService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  getEditableSnapshot(idInfraccion: number): Promise<AdminExpedienteSnapshot> {
    return this.dataSource.transaction((manager) =>
      this.loadSnapshot(manager, idInfraccion),
    );
  }

  async actualizarExpediente(
    idInfraccion: number,
    dto: AdminActualizarExpedienteDto,
    audit: AdminAuditContext,
  ): Promise<AdminExpedienteSnapshot> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const before = await this.loadSnapshot(manager, idInfraccion);

        await this.aplicarInfraccion(manager, idInfraccion, dto, before);
        await this.aplicarInfractor(manager, dto, before);
        await this.aplicarVehiculo(manager, dto, before);
        await this.aplicarLugar(manager, idInfraccion, dto);
        await this.aplicarRetencion(manager, idInfraccion, dto);
        await this.aplicarPagos(manager, idInfraccion, dto.pagos ?? []);
        await this.aplicarLiberaciones(
          manager,
          idInfraccion,
          dto.liberaciones ?? [],
        );
        await this.aplicarSalidas(manager, idInfraccion, dto.salidas ?? []);
        await this.validarReglasExpediente(manager, idInfraccion);

        const after = await this.loadSnapshot(manager, idInfraccion);
        await this.registrarAuditoria(manager, {
          ...audit,
          accion: 'INFRACCION_EDITADA_ADMIN',
          entidadId: idInfraccion,
          severity: 'HIGH',
          antesJson: {
            motivoEdicion: dto.motivoEdicion,
            expediente: before,
          },
          despuesJson: {
            motivoEdicion: dto.motivoEdicion,
            expediente: after,
          },
        });

        return after;
      });
    } catch (error) {
      this.rethrowDatabaseConflict(error);
      throw error;
    }
  }

  async eliminarExpediente(
    idInfraccion: number,
    dto: EliminarInfraccionAdminDto,
    audit: AdminAuditContext,
  ): Promise<{
    idInfraccion: number;
    folioInfraccion: string;
    eliminado: true;
    relacionesEliminadas: Record<string, number>;
  }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const before = await this.loadSnapshot(manager, idInfraccion);
        if (before.infraccion.folioInfraccion !== dto.folioConfirmacion) {
          throw new BadRequestException(
            'El folio de confirmacion no coincide con la infraccion seleccionada',
          );
        }

        const counts = {
          salidas: before.salidas.length,
          liberaciones: before.liberaciones.length,
          pagos: before.pagos.length,
          retenciones: before.retencion ? 1 : 0,
          movimientos: await this.countByInfraccion(
            manager,
            'infraccion_movimiento',
            idInfraccion,
          ),
          motivos: before.motivos.length,
        };

        await manager.query(
          `
            DELETE FROM salida_vehiculo
            WHERE id_retencion_vehiculo IN (
              SELECT id_retencion_vehiculo
              FROM retencion_vehiculo
              WHERE id_infraccion = $1
            )
               OR id_liberacion_vehiculo IN (
              SELECT id_liberacion_vehiculo
              FROM liberacion_vehiculo
              WHERE id_infraccion = $1
            )
          `,
          [idInfraccion],
        );
        await manager.query(
          'DELETE FROM liberacion_vehiculo WHERE id_infraccion = $1',
          [idInfraccion],
        );
        await manager.query(
          'DELETE FROM pago_infraccion WHERE id_infraccion = $1',
          [idInfraccion],
        );
        await manager.query(
          'DELETE FROM retencion_vehiculo WHERE id_infraccion = $1',
          [idInfraccion],
        );
        await manager.query(
          'DELETE FROM infraccion_movimiento WHERE id_infraccion = $1',
          [idInfraccion],
        );
        await manager.query(
          'DELETE FROM infraccion_motivo WHERE id_infraccion = $1',
          [idInfraccion],
        );
        await manager.query('DELETE FROM infracciones WHERE id_infraccion = $1', [
          idInfraccion,
        ]);

        await manager.query(
          `
            DELETE FROM infractor
            WHERE id_infractor = $1
              AND NOT EXISTS (
                SELECT 1 FROM infracciones WHERE id_infractor = $1
              )
          `,
          [before.infraccion.idInfractor],
        );
        await manager.query(
          `
            DELETE FROM vehiculo
            WHERE id_vehiculo = $1
              AND NOT EXISTS (
                SELECT 1 FROM infracciones WHERE id_vehiculo = $1
              )
          `,
          [before.infraccion.idVehiculo],
        );

        const severity =
          counts.salidas + counts.liberaciones + counts.pagos + counts.retenciones >
          0
            ? 'CRITICAL'
            : 'HIGH';

        await this.registrarAuditoria(manager, {
          ...audit,
          accion: 'INFRACCION_ELIMINADA_ADMIN',
          entidadId: idInfraccion,
          severity,
          antesJson: {
            motivoEliminacion: dto.motivoEliminacion,
            expediente: before,
          },
          despuesJson: {
            eliminado: true,
            motivoEliminacion: dto.motivoEliminacion,
            relacionesEliminadas: counts,
          },
        });

        return {
          idInfraccion,
          folioInfraccion: before.infraccion.folioInfraccion,
          eliminado: true,
          relacionesEliminadas: counts,
        };
      });
    } catch (error) {
      this.rethrowDatabaseConflict(error);
      throw error;
    }
  }

  private async aplicarInfraccion(
    manager: EntityManager,
    idInfraccion: number,
    dto: AdminActualizarExpedienteDto,
    before: AdminExpedienteSnapshot,
  ): Promise<void> {
    const patch = dto.infraccion;
    if (!patch) {
      return;
    }

    if (patch.idDelegacion !== undefined) {
      await this.assertExists(
        manager,
        'delegacion',
        'id_delegacion',
        patch.idDelegacion,
        'delegacion',
      );
    }
    if (patch.idTipoProcedimiento !== undefined) {
      await this.assertExists(
        manager,
        'tipo_procedimiento',
        'id_tipo_procedimiento',
        patch.idTipoProcedimiento,
        'tipo de procedimiento',
      );
    }
    if (patch.idEstatusInfraccion !== undefined) {
      await this.assertExists(
        manager,
        'estatus_infraccion',
        'id_estatus_infraccion',
        patch.idEstatusInfraccion,
        'estatus de infraccion',
      );
    }
    if (patch.idOperativo !== undefined && patch.idOperativo !== null) {
      await this.assertExists(
        manager,
        'operativo',
        'id_operativo',
        patch.idOperativo,
        'operativo',
      );
    }

    if (patch.folioInfraccion !== undefined) {
      const duplicate = (await manager.query(
        `
          SELECT id_infraccion AS id
          FROM infracciones
          WHERE UPPER(folio_infraccion) = UPPER($1)
            AND id_infraccion <> $2
          LIMIT 1
        `,
        [patch.folioInfraccion, idInfraccion],
      )) as IdRow[];
      if (duplicate.length > 0) {
        throw new ConflictException(
          'Ya existe otra infraccion con el folio indicado',
        );
      }
    }

    await this.updateTable(manager, 'infracciones', 'id_infraccion', idInfraccion, {
      id_delegacion: patch.idDelegacion,
      id_tipo_procedimiento: patch.idTipoProcedimiento,
      id_estatus_infraccion: patch.idEstatusInfraccion,
      id_operativo: patch.idOperativo,
      folio_infraccion: patch.folioInfraccion,
      fecha_infraccion: patch.fechaInfraccion,
      hora_infraccion: patch.horaInfraccion,
      observaciones: patch.observaciones,
      clave_policia: patch.clavePolicia,
      num_parte_informativo: patch.numParteInformativo,
    });

    if (patch.motivos !== undefined) {
      const uniqueMotivos = [...new Set(patch.motivos)];
      if (uniqueMotivos.length > 0) {
        const rows = (await manager.query(
          'SELECT id_motivo AS id FROM motivo WHERE id_motivo = ANY($1::int[])',
          [uniqueMotivos],
        )) as IdRow[];
        if (rows.length !== uniqueMotivos.length) {
          throw new BadRequestException(
            'Uno o mas motivos seleccionados no existen',
          );
        }
      }

      await manager.query(
        'DELETE FROM infraccion_motivo WHERE id_infraccion = $1',
        [idInfraccion],
      );
      for (const idMotivo of uniqueMotivos) {
        await manager.query(
          `
            INSERT INTO infraccion_motivo (id_infraccion, id_motivo)
            VALUES ($1, $2)
          `,
          [idInfraccion, idMotivo],
        );
      }
    }

    if (
      patch.idTipoProcedimiento !== undefined &&
      patch.idTipoProcedimiento !== before.infraccion.idTipoProcedimiento
    ) {
      await this.validarReglasExpediente(manager, idInfraccion);
    }
  }

  private async aplicarInfractor(
    manager: EntityManager,
    dto: AdminActualizarExpedienteDto,
    before: AdminExpedienteSnapshot,
  ): Promise<void> {
    const patch = dto.infractor;
    if (!patch) {
      return;
    }

    if (patch.idSexo !== undefined) {
      await this.assertExists(manager, 'sexo', 'id_sexo', patch.idSexo, 'sexo');
    }

    await this.updateTable(
      manager,
      'infractor',
      'id_infractor',
      before.infraccion.idInfractor,
      {
        id_sexo: patch.idSexo,
        nombre: patch.nombre,
        apellido_paterno: patch.apellidoPaterno,
        apellido_materno: patch.apellidoMaterno,
        licencia: patch.licencia,
        curp: patch.curp,
      },
    );
  }

  private async aplicarVehiculo(
    manager: EntityManager,
    dto: AdminActualizarExpedienteDto,
    before: AdminExpedienteSnapshot,
  ): Promise<void> {
    const patch = dto.vehiculo;
    if (!patch) {
      return;
    }

    if (patch.idClaseVehiculo !== undefined) {
      await this.assertExists(
        manager,
        'clase_vehiculo',
        'id_clase_vehiculo',
        patch.idClaseVehiculo,
        'clase de vehiculo',
      );
    }
    if (patch.idLineaVehiculo !== undefined) {
      await this.assertExists(
        manager,
        'linea_vehiculo',
        'id_linea_vehiculo',
        patch.idLineaVehiculo,
        'linea de vehiculo',
      );
    }
    if (patch.idServicio !== undefined) {
      await this.assertExists(
        manager,
        'servicio',
        'id_servicio',
        patch.idServicio,
        'servicio',
      );
    }

    await this.updateTable(
      manager,
      'vehiculo',
      'id_vehiculo',
      before.infraccion.idVehiculo,
      {
        id_clase_vehiculo: patch.idClaseVehiculo,
        id_linea_vehiculo: patch.idLineaVehiculo,
        id_servicio: patch.idServicio,
        anio_modelo: patch.anioModelo,
        sitio_servicio_publico: patch.sitioServicioPublico,
        color: patch.color,
        placas: patch.placas,
        estado_placas: patch.estadoPlacas,
        serie: patch.serie,
        motor: patch.motor,
      },
    );
  }

  private async aplicarLugar(
    manager: EntityManager,
    idInfraccion: number,
    dto: AdminActualizarExpedienteDto,
  ): Promise<void> {
    if (!dto.lugarInfraccion) {
      return;
    }

    const nombre = dto.lugarInfraccion.nombreLugarInfraccion.trim();
    const rows = (await manager.query(
      `
        SELECT id_lugar_infraccion AS id
        FROM lugar_infraccion
        WHERE nombre_lugar_infraccion = $1
        LIMIT 1
      `,
      [nombre],
    )) as IdRow[];

    let idLugar = rows[0]?.id;
    if (!idLugar) {
      const inserted = (await manager.query(
        `
          INSERT INTO lugar_infraccion (nombre_lugar_infraccion)
          VALUES ($1)
          RETURNING id_lugar_infraccion AS id
        `,
        [nombre],
      )) as IdRow[];
      idLugar = inserted[0]?.id;
    }

    if (!idLugar) {
      throw new BadRequestException('No se pudo resolver el lugar de infraccion');
    }

    await this.updateTable(manager, 'infracciones', 'id_infraccion', idInfraccion, {
      id_lugar_infraccion: idLugar,
    });
  }

  private async aplicarRetencion(
    manager: EntityManager,
    idInfraccion: number,
    dto: AdminActualizarExpedienteDto,
  ): Promise<void> {
    const patch = dto.retencion;
    if (!patch) {
      return;
    }

    await this.assertOwnedRecord(
      manager,
      'retencion_vehiculo',
      'id_retencion_vehiculo',
      patch.idRetencionVehiculo,
      idInfraccion,
      'retencion',
    );
    if (patch.idEncierro !== undefined) {
      await this.assertExists(
        manager,
        'encierro',
        'id_encierro',
        patch.idEncierro,
        'encierro',
      );
    }

    await this.updateTable(
      manager,
      'retencion_vehiculo',
      'id_retencion_vehiculo',
      patch.idRetencionVehiculo,
      {
        id_encierro: patch.idEncierro,
        fecha_ingreso:
          patch.fechaIngreso === undefined
            ? undefined
            : normalizeDate(patch.fechaIngreso),
        recibido_por: patch.recibidoPor,
        folio_resguardo: patch.folioResguardo,
        observaciones_ingreso: patch.observacionesIngreso,
        estado_ingreso: patch.estadoIngreso,
      },
    );
  }

  private async aplicarPagos(
    manager: EntityManager,
    idInfraccion: number,
    pagos: AdminActualizarPagoDto[],
  ): Promise<void> {
    for (const patch of pagos) {
      await this.assertOwnedRecord(
        manager,
        'pago_infraccion',
        'id_pago_infraccion',
        patch.idPagoInfraccion,
        idInfraccion,
        'pago',
      );

      if (patch.folioLineaCaptura !== undefined) {
        const duplicate = (await manager.query(
          `
            SELECT id_pago_infraccion AS id
            FROM pago_infraccion
            WHERE folio_linea_captura = $1
              AND id_pago_infraccion <> $2
            LIMIT 1
          `,
          [patch.folioLineaCaptura, patch.idPagoInfraccion],
        )) as IdRow[];
        if (duplicate.length > 0) {
          throw new ConflictException(
            'Ya existe otro pago con la linea de captura indicada',
          );
        }
      }

      let monto: string | undefined;
      if (patch.conceptos !== undefined) {
        const claves = new Set<string>();
        let cents = 0;
        for (const concepto of patch.conceptos) {
          const clave = concepto.claveConcepto.trim().toUpperCase();
          if (claves.has(clave)) {
            throw new BadRequestException(
              `La clave de concepto ${clave} esta repetida en el pago`,
            );
          }
          claves.add(clave);
          const parsed = Number(concepto.monto);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            throw new BadRequestException(
              `El monto del concepto ${clave} debe ser mayor a cero`,
            );
          }
          cents += Math.round(parsed * 100);
        }
        monto = (cents / 100).toFixed(2);
      }

      await this.updateTable(
        manager,
        'pago_infraccion',
        'id_pago_infraccion',
        patch.idPagoInfraccion,
        {
          folio_linea_captura: patch.folioLineaCaptura,
          fecha_pago:
            patch.fechaPago === undefined ? undefined : normalizeDate(patch.fechaPago),
          observaciones: patch.observaciones,
          monto,
        },
      );

      if (patch.conceptos !== undefined) {
        await manager.query(
          'DELETE FROM pago_concepto WHERE id_pago_infraccion = $1',
          [patch.idPagoInfraccion],
        );

        for (const [index, concepto] of patch.conceptos.entries()) {
          const clave = concepto.claveConcepto.trim().toUpperCase();
          const conceptRows = (await manager.query(
            `
              INSERT INTO concepto_pago (clave_concepto, activo)
              VALUES ($1, TRUE)
              ON CONFLICT (clave_concepto)
              DO UPDATE SET activo = TRUE
              RETURNING id_concepto_pago AS id
            `,
            [clave],
          )) as IdRow[];
          const idConcepto = conceptRows[0]?.id;
          if (!idConcepto) {
            throw new BadRequestException(
              `No se pudo resolver la clave de concepto ${clave}`,
            );
          }

          await manager.query(
            `
              INSERT INTO pago_concepto (
                id_pago_infraccion,
                id_concepto_pago,
                monto,
                orden
              ) VALUES ($1, $2, $3, $4)
            `,
            [
              patch.idPagoInfraccion,
              idConcepto,
              Number(concepto.monto).toFixed(2),
              index + 1,
            ],
          );
        }
      }
    }
  }

  private async aplicarLiberaciones(
    manager: EntityManager,
    idInfraccion: number,
    liberaciones: NonNullable<AdminActualizarExpedienteDto['liberaciones']>,
  ): Promise<void> {
    for (const patch of liberaciones) {
      await this.assertOwnedRecord(
        manager,
        'liberacion_vehiculo',
        'id_liberacion_vehiculo',
        patch.idLiberacionVehiculo,
        idInfraccion,
        'liberacion',
      );

      if (patch.folioLiberacion !== undefined) {
        const duplicate = (await manager.query(
          `
            SELECT id_liberacion_vehiculo AS id
            FROM liberacion_vehiculo
            WHERE folio_liberacion = $1
              AND id_liberacion_vehiculo <> $2
            LIMIT 1
          `,
          [patch.folioLiberacion, patch.idLiberacionVehiculo],
        )) as IdRow[];
        if (duplicate.length > 0) {
          throw new ConflictException(
            'Ya existe otra liberacion con el folio indicado',
          );
        }
      }

      await this.updateTable(
        manager,
        'liberacion_vehiculo',
        'id_liberacion_vehiculo',
        patch.idLiberacionVehiculo,
        {
          folio_liberacion: patch.folioLiberacion,
          fecha_liberacion:
            patch.fechaLiberacion === undefined
              ? undefined
              : normalizeDate(patch.fechaLiberacion),
          liberado_por: patch.liberadoPor,
          nombre_recibe_liberacion: patch.nombreRecibeLiberacion,
          observacion: patch.observacion,
        },
      );
    }
  }

  private async aplicarSalidas(
    manager: EntityManager,
    idInfraccion: number,
    salidas: NonNullable<AdminActualizarExpedienteDto['salidas']>,
  ): Promise<void> {
    for (const patch of salidas) {
      const rows = (await manager.query(
        `
          SELECT s.id_salida_vehiculo AS id
          FROM salida_vehiculo s
          INNER JOIN retencion_vehiculo r
            ON r.id_retencion_vehiculo = s.id_retencion_vehiculo
          WHERE s.id_salida_vehiculo = $1
            AND r.id_infraccion = $2
          LIMIT 1
        `,
        [patch.idSalidaVehiculo, idInfraccion],
      )) as IdRow[];
      if (rows.length === 0) {
        throw new BadRequestException(
          'La salida indicada no pertenece a esta infraccion',
        );
      }

      await this.updateTable(
        manager,
        'salida_vehiculo',
        'id_salida_vehiculo',
        patch.idSalidaVehiculo,
        {
          fecha_salida:
            patch.fechaSalida === undefined
              ? undefined
              : normalizeDate(patch.fechaSalida),
          validado_por: patch.validadoPor,
          persona_recibe_vehiculo: patch.personaRecibeVehiculo,
          observaciones_salida: patch.observacionesSalida,
          estado_salida: patch.estadoSalida,
        },
      );
    }
  }

  private async validarReglasExpediente(
    manager: EntityManager,
    idInfraccion: number,
  ): Promise<void> {
    const rows = (await manager.query(
      `
        SELECT
          tp.nombre_tipo_procedimiento AS "nombreTipoProcedimiento",
          tp.activo,
          tp.es_tipo_expediente AS "esTipoExpediente",
          tp.requiere_folio_infraccion AS "requiereFolioInfraccion",
          tp.requiere_num_parte_informativo AS "requiereNumParteInformativo",
          tp.requiere_motivos AS "requiereMotivos",
          tp.permite_retencion AS "permiteRetencion",
          i.folio_infraccion AS "folioInfraccion",
          i.num_parte_informativo AS "numParteInformativo"
        FROM infracciones i
        INNER JOIN tipo_procedimiento tp
          ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
        WHERE i.id_infraccion = $1
        LIMIT 1
      `,
      [idInfraccion],
    )) as TipoProcedimientoReglasRow[];
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Infraccion ${idInfraccion} no encontrada`);
    }
    if (!row.activo || !row.esTipoExpediente) {
      throw new BadRequestException(
        `El tipo de procedimiento ${row.nombreTipoProcedimiento} no puede usarse como expediente activo`,
      );
    }
    if (row.requiereFolioInfraccion && !row.folioInfraccion?.trim()) {
      throw new BadRequestException(
        'El folio de infraccion es obligatorio para el tipo seleccionado',
      );
    }
    if (row.requiereNumParteInformativo && !row.numParteInformativo?.trim()) {
      throw new BadRequestException(
        'El numero de parte informativo es obligatorio para el tipo seleccionado',
      );
    }

    const motivoCount = await this.countByInfraccion(
      manager,
      'infraccion_motivo',
      idInfraccion,
    );
    if (row.requiereMotivos && motivoCount === 0) {
      throw new BadRequestException(
        'Debes conservar al menos un motivo para el tipo seleccionado',
      );
    }

    const retencionCount = await this.countByInfraccion(
      manager,
      'retencion_vehiculo',
      idInfraccion,
    );
    if (!row.permiteRetencion && retencionCount > 0) {
      throw new BadRequestException(
        'No puedes cambiar a un tipo sin retencion mientras exista un ingreso a encierro',
      );
    }
  }

  private async loadSnapshot(
    manager: EntityManager,
    idInfraccion: number,
  ): Promise<AdminExpedienteSnapshot> {
    const coreRows = (await manager.query(
      `
        SELECT
          i.id_infraccion AS "idInfraccion",
          i.id_infractor AS "idInfractor",
          i.id_vehiculo AS "idVehiculo",
          i.id_lugar_infraccion AS "idLugarInfraccion",
          i.id_delegacion AS "idDelegacion",
          i.id_tipo_procedimiento AS "idTipoProcedimiento",
          i.id_estatus_infraccion AS "idEstatusInfraccion",
          i.id_operativo AS "idOperativo",
          i.folio_infraccion AS "folioInfraccion",
          i.fecha_infraccion AS "fechaInfraccion",
          i.hora_infraccion AS "horaInfraccion",
          i.observaciones,
          i.clave_policia AS "clavePolicia",
          i.num_parte_informativo AS "numParteInformativo",
          inf.id_sexo AS "idSexo",
          inf.nombre,
          inf.apellido_paterno AS "apellidoPaterno",
          inf.apellido_materno AS "apellidoMaterno",
          inf.licencia,
          inf.curp,
          v.id_clase_vehiculo AS "idClaseVehiculo",
          v.id_linea_vehiculo AS "idLineaVehiculo",
          v.id_servicio AS "idServicio",
          v.anio_modelo AS "anioModelo",
          v.sitio_servicio_publico AS "sitioServicioPublico",
          v.color,
          v.placas,
          v.estado_placas AS "estadoPlacas",
          v.serie,
          v.motor,
          l.nombre_lugar_infraccion AS "nombreLugarInfraccion"
        FROM infracciones i
        INNER JOIN infractor inf ON inf.id_infractor = i.id_infractor
        INNER JOIN vehiculo v ON v.id_vehiculo = i.id_vehiculo
        INNER JOIN lugar_infraccion l
          ON l.id_lugar_infraccion = i.id_lugar_infraccion
        WHERE i.id_infraccion = $1
        LIMIT 1
      `,
      [idInfraccion],
    )) as CoreSnapshot[];
    const core = coreRows[0];
    if (!core) {
      throw new NotFoundException(`Infraccion ${idInfraccion} no encontrada`);
    }

    const motivoRows = (await manager.query(
      `
        SELECT id_motivo AS id
        FROM infraccion_motivo
        WHERE id_infraccion = $1
        ORDER BY id_infraccion_motivo ASC
      `,
      [idInfraccion],
    )) as IdRow[];

    const retencionRows = (await manager.query(
      `
        SELECT
          id_retencion_vehiculo AS "idRetencionVehiculo",
          id_encierro AS "idEncierro",
          fecha_ingreso AS "fechaIngreso",
          recibido_por AS "recibidoPor",
          folio_resguardo AS "folioResguardo",
          observaciones_ingreso AS "observacionesIngreso",
          estado_ingreso AS "estadoIngreso"
        FROM retencion_vehiculo
        WHERE id_infraccion = $1
        ORDER BY id_retencion_vehiculo ASC
        LIMIT 1
      `,
      [idInfraccion],
    )) as Array<Record<string, unknown>>;

    const pagos = (await manager.query(
      `
        SELECT
          id_pago_infraccion AS "idPagoInfraccion",
          folio_linea_captura AS "folioLineaCaptura",
          monto,
          monto_infraccion AS "montoInfraccion",
          dias_piso_cobrados AS "diasPisoCobrados",
          monto_dias_piso AS "montoDiasPiso",
          fecha_pago AS "fechaPago",
          observaciones
        FROM pago_infraccion
        WHERE id_infraccion = $1
        ORDER BY id_pago_infraccion ASC
      `,
      [idInfraccion],
    )) as PagoSnapshot[];

    for (const pago of pagos) {
      pago.conceptos = (await manager.query(
        `
          SELECT
            pc.id_pago_concepto AS "idPagoConcepto",
            cp.clave_concepto AS "claveConcepto",
            pc.monto,
            pc.orden
          FROM pago_concepto pc
          INNER JOIN concepto_pago cp
            ON cp.id_concepto_pago = pc.id_concepto_pago
          WHERE pc.id_pago_infraccion = $1
          ORDER BY pc.orden ASC, pc.id_pago_concepto ASC
        `,
        [pago.idPagoInfraccion],
      )) as PagoSnapshot['conceptos'];
    }

    const liberaciones = (await manager.query(
      `
        SELECT
          id_liberacion_vehiculo AS "idLiberacionVehiculo",
          id_pago_infraccion AS "idPagoInfraccion",
          folio_liberacion AS "folioLiberacion",
          fecha_liberacion AS "fechaLiberacion",
          liberado_por AS "liberadoPor",
          nombre_recibe_liberacion AS "nombreRecibeLiberacion",
          observacion
        FROM liberacion_vehiculo
        WHERE id_infraccion = $1
        ORDER BY id_liberacion_vehiculo ASC
      `,
      [idInfraccion],
    )) as Array<Record<string, unknown>>;

    const salidas = (await manager.query(
      `
        SELECT
          s.id_salida_vehiculo AS "idSalidaVehiculo",
          s.id_retencion_vehiculo AS "idRetencionVehiculo",
          s.id_liberacion_vehiculo AS "idLiberacionVehiculo",
          s.fecha_salida AS "fechaSalida",
          s.validado_por AS "validadoPor",
          s.persona_recibe_vehiculo AS "personaRecibeVehiculo",
          s.observaciones_salida AS "observacionesSalida",
          s.estado_salida AS "estadoSalida"
        FROM salida_vehiculo s
        INNER JOIN retencion_vehiculo r
          ON r.id_retencion_vehiculo = s.id_retencion_vehiculo
        WHERE r.id_infraccion = $1
        ORDER BY s.id_salida_vehiculo ASC
      `,
      [idInfraccion],
    )) as Array<Record<string, unknown>>;

    return {
      infraccion: core,
      motivos: motivoRows.map((row) => Number(row.id)),
      retencion: retencionRows[0] ?? null,
      pagos,
      liberaciones,
      salidas,
    };
  }

  private async assertExists(
    manager: EntityManager,
    table: string,
    idColumn: string,
    id: number,
    label: string,
  ): Promise<void> {
    const rows = (await manager.query(
      `SELECT 1 FROM "${table}" WHERE "${idColumn}" = $1 LIMIT 1`,
      [id],
    )) as unknown[];
    if (rows.length === 0) {
      throw new BadRequestException(`El ${label} seleccionado no existe`);
    }
  }

  private async assertOwnedRecord(
    manager: EntityManager,
    table: string,
    idColumn: string,
    id: number,
    idInfraccion: number,
    label: string,
  ): Promise<void> {
    const rows = (await manager.query(
      `
        SELECT 1
        FROM "${table}"
        WHERE "${idColumn}" = $1
          AND id_infraccion = $2
        LIMIT 1
      `,
      [id, idInfraccion],
    )) as unknown[];
    if (rows.length === 0) {
      throw new BadRequestException(
        `El registro de ${label} indicado no pertenece a esta infraccion`,
      );
    }
  }

  private async updateTable(
    manager: EntityManager,
    table: string,
    idColumn: string,
    id: number,
    values: Record<string, unknown>,
  ): Promise<void> {
    const entries = Object.entries(values).filter(([, value]) => value !== undefined);
    if (entries.length === 0) {
      return;
    }

    const setClause = entries
      .map(([column], index) => `"${column}" = $${index + 1}`)
      .join(', ');
    const params = entries.map(([, value]) => value);
    params.push(id);

    await manager.query(
      `UPDATE "${table}" SET ${setClause} WHERE "${idColumn}" = $${params.length}`,
      params,
    );
  }

  private async countByInfraccion(
    manager: EntityManager,
    table: string,
    idInfraccion: number,
  ): Promise<number> {
    const rows = (await manager.query(
      `SELECT COUNT(*)::int AS total FROM "${table}" WHERE id_infraccion = $1`,
      [idInfraccion],
    )) as Array<{ total: number | string }>;
    return Number(rows[0]?.total ?? 0);
  }

  private async registrarAuditoria(
    manager: EntityManager,
    params: AdminAuditContext & {
      accion: string;
      entidadId: number;
      severity: 'HIGH' | 'CRITICAL';
      antesJson: unknown;
      despuesJson: unknown;
    },
  ): Promise<void> {
    const before = sanitizeAuditPayload(params.antesJson);
    const after = sanitizeAuditPayload(params.despuesJson);

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
          $1, $2, 'infracciones', $3, $4::jsonb, $5::jsonb,
          $6, $7, $8, $9, $10, $11
        )
      `,
      [
        params.idUsuario,
        params.accion,
        String(params.entidadId),
        JSON.stringify(before ?? null),
        JSON.stringify(after ?? null),
        this.truncate(params.ip, 80),
        params.severity,
        this.truncate(params.requestId, 64),
        this.truncate(params.httpMethod?.toUpperCase(), 10),
        this.truncate(params.requestPath, 512),
        this.truncate(params.userAgent, 512),
      ],
    );
  }

  private truncate(value: string | null | undefined, maxLength: number): string | null {
    if (!value) {
      return null;
    }
    return value.slice(0, maxLength);
  }

  private rethrowDatabaseConflict(error: unknown): void {
    if (!(error instanceof QueryFailedError)) {
      return;
    }

    const driverError = error.driverError as { code?: string; constraint?: string };
    if (driverError.code === '23505') {
      throw new ConflictException(
        `La edicion entra en conflicto con un valor unico existente${
          driverError.constraint ? ` (${driverError.constraint})` : ''
        }`,
      );
    }
  }
}

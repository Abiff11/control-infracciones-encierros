import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { sanitizeAuditPayload } from '../../common/redact-sensitive-data';
import { Auditoria } from '../auditoria/entities/auditoria.entity';
import { EstatusInfraccion } from '../catalogos/entities/estatus-infraccion.entity';
import { InfraccionMovimiento } from '../infracciones/entities/infraccion-movimiento.entity';
import { Infraccion } from '../infracciones/entities/infraccion.entity';
import type { RegistrarSalidaAnticipadaDto } from './dto/registrar-salida-anticipada.dto';
import type { ResolverObservacionDto } from './dto/resolver-observacion.dto';

import { normalizeDate } from '../../common/utils/normalize-date';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { ESTADO_OPERATIVO_VEHICULO } from '../infracciones/constants/estado-operativo-vehiculo.constants';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { resolveEstadoOperativoVehiculo } from '../infracciones/utils/estado-operativo.util';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Encierro } from './entities/encierro.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';
import {
  type CampoObservado,
  ObservacionExpediente,
} from './entities/observacion-expediente.entity';
import { VehiculosEncierroQueryDto } from './dto/vehiculos-query.dto';
import {
  type VehiculosEncierroResponseDto,
  type VehiculosEncierroResumenDto,
} from './dto/vehiculos-response.dto';

interface ObservacionResolverRow {
  idObservacion: number;
  idInfraccion: number;
  idInfraccionRetencion: number;
  idVehiculo: number;
  estatus: string;
  campoObservado: string;
  valorOriginal: string;
  valorReportado: string;
  modalidadSalida: string;
}

interface VehiculoResolucionRow {
  color: string | null;
  anioModelo: number | null;
}

interface ObservacionPendienteRow {
  idObservacion: number | string;
  idInfraccion: number | string;
  folioInfraccion: string;
  placas: string | null;
  campoObservado: string;
  valorOriginal: string;
  valorReportado: string;
  motivoReporte: string;
  referenciaEvidencia: string;
  fechaReporte: Date | string;
  nombreUsuarioReporta: string;
}

interface RegistrarRetencionParams {
  idInfraccion: number;
  idEncierro: number;
  recibidoPor: string;
  fechaIngreso?: string | Date;
  folioResguardo?: string | null;
  observacionesIngreso?: string | null;
  estadoIngreso?: string | null;
}

interface DiscrepanciaVehiculo {
  campo: CampoObservado;
  valorOriginal: string;
  valorReportado: string;
}

interface RegistrarSalidaParams {
  idRetencionVehiculo: number;
  idLiberacionVehiculo: number;
  idUsuarioValidaSalida: number;
  validadoPor: string;
  personaRecibeVehiculo: string;
  fechaSalida?: string | Date;
  observacionesSalida?: string | null;
  estadoSalida: string;
}

interface VehiculosEnEncierroResumenBucket {
  encierro: string;
  total: number;
  sinPago: number;
  pagadosPendienteLiberacion: number;
  liberadosPendienteSalida: number;
  entregados: number;
}

interface VehiculosEnEncierroResumenState {
  totalVehiculosRetenidos: number;
  totalSinPago: number;
  totalPagadosPendienteLiberacion: number;
  totalLiberadosPendienteSalida: number;
  totalEntregados: number;
  porEncierro: Map<string, VehiculosEnEncierroResumenBucket>;
}

interface VehiculosEnEncierroResumenRow {
  encierro: string | null;
  totalVehiculosRetenidos: string | number | null;
  totalSinPago: string | number | null;
  totalPagadosPendienteLiberacion: string | number | null;
  totalLiberadosPendienteSalida: string | number | null;
  totalEntregados: string | number | null;
}

interface VehiculoEnEncierroRow {
  idInfraccion: string | number;
  idRetencionVehiculo: string | number;
  folioInfraccion: string | null;
  fechaInfraccion: string | Date | null;
  horaInfraccion: string | null;
  infractorNombre: string | null;
  infractorApellidoPaterno: string | null;
  infractorApellidoMaterno: string | null;
  licencia: string | null;
  placas: string | null;
  marca: string | null;
  linea: string | null;
  clase: string | null;
  color: string | null;
  serie: string | null;
  motor: string | null;
  region: string | null;
  delegacion: string | null;
  encierro: string | null;
  fechaIngreso: string | Date | null;
  folioResguardo: string | null;
  estadoIngreso: string | null;
  tienePago: boolean | number | string | null;
  fechaUltimoPago: string | Date | null;
  montoPagado: string | number | null;
  tieneLiberacion: boolean | number | string | null;
  fechaLiberacion: string | Date | null;
  tieneSalida: boolean | number | string | null;
  fechaSalida: string | Date | null;
}

@Injectable()
export class EncierrosService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Encierro)
    private readonly encierrosRepository: Repository<Encierro>,
    @InjectRepository(RetencionVehiculo)
    private readonly retencionesRepository: Repository<RetencionVehiculo>,
    @InjectRepository(SalidaVehiculo)
    private readonly salidasRepository: Repository<SalidaVehiculo>,
    private readonly auditoriaService: AuditoriaService,
    private readonly infraccionesService: InfraccionesService,
  ) {}

  async findEncierroByIdOrFail(idEncierro: number): Promise<Encierro> {
    const encierro = await this.encierrosRepository.findOne({
      where: { idEncierro },
    });

    if (!encierro) {
      throw new NotFoundException(`Encierro ${idEncierro} no encontrado`);
    }

    return encierro;
  }

  async findRetencionByIdOrFail(
    idRetencionVehiculo: number,
  ): Promise<RetencionVehiculo> {
    const retencion = await this.retencionesRepository.findOne({
      where: { idRetencionVehiculo },
      relations: {
        infraccion: true,
        encierro: true,
      },
    });

    if (!retencion) {
      throw new NotFoundException(
        `Retencion vehicular ${idRetencionVehiculo} no encontrada`,
      );
    }

    return retencion;
  }

  async findVehiculosEnEncierro(
    query: VehiculosEncierroQueryDto,
  ): Promise<VehiculosEncierroResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const baseQuery = this.buildVehiculosEnEncierroBaseQuery(query);
    const sortOrder = this.resolveSortOrder(query.sortOrder);
    const sortBy = this.resolveSortColumn(query.sortBy);

    const [data, total] = await Promise.all([
      this.applyVehiculosEnEncierroSelects(baseQuery.clone())
        .orderBy(sortBy, sortOrder)
        .addOrderBy('retencion.fechaIngreso', 'DESC')
        .addOrderBy('retencion.idRetencionVehiculo', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<VehiculoEnEncierroRow>(),
      baseQuery.clone().getCount(),
    ]);

    return {
      data: data.map((row) => this.mapVehiculoEnEncierroRow(row)),
      meta: {
        page,
        limit,
        total,
      },
    };
  }

  async getVehiculosEnEncierroResumen(
    query: VehiculosEncierroQueryDto,
  ): Promise<VehiculosEncierroResumenDto> {
    const hasSalida = this.hasSalidaExpression();
    const hasLiberacion = this.hasLiberacionExpression();
    const hasPago = this.hasPagoExpression();

    const rows = await this.buildVehiculosEnEncierroBaseQuery(query)
      .select('encierro.nombreEncierro', 'encierro')
      .addSelect(
        `COUNT(*) FILTER (WHERE NOT ${hasSalida})`,
        'totalVehiculosRetenidos',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE NOT ${hasPago} AND NOT ${hasLiberacion} AND NOT ${hasSalida})`,
        'totalSinPago',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${hasPago} AND NOT ${hasLiberacion} AND NOT ${hasSalida})`,
        'totalPagadosPendienteLiberacion',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE ${hasLiberacion} AND NOT ${hasSalida})`,
        'totalLiberadosPendienteSalida',
      )
      .addSelect(`COUNT(*) FILTER (WHERE ${hasSalida})`, 'totalEntregados')
      .groupBy('encierro.nombreEncierro')
      .getRawMany<VehiculosEnEncierroResumenRow>();

    const resumen = this.createEmptyResumenState();

    for (const row of rows) {
      const encierro = row.encierro ?? 'Sin encierro';
      const bucket = {
        encierro,
        total: this.toNumber(row.totalVehiculosRetenidos),
        sinPago: this.toNumber(row.totalSinPago),
        pagadosPendienteLiberacion: this.toNumber(
          row.totalPagadosPendienteLiberacion,
        ),
        liberadosPendienteSalida: this.toNumber(
          row.totalLiberadosPendienteSalida,
        ),
        entregados: this.toNumber(row.totalEntregados),
      };

      resumen.totalVehiculosRetenidos += bucket.total;
      resumen.totalSinPago += bucket.sinPago;
      resumen.totalPagadosPendienteLiberacion +=
        bucket.pagadosPendienteLiberacion;
      resumen.totalLiberadosPendienteSalida += bucket.liberadosPendienteSalida;
      resumen.totalEntregados += bucket.entregados;
      resumen.porEncierro.set(encierro, bucket);
    }

    return {
      totalVehiculosRetenidos: resumen.totalVehiculosRetenidos,
      totalSinPago: resumen.totalSinPago,
      totalPagadosPendienteLiberacion: resumen.totalPagadosPendienteLiberacion,
      totalLiberadosPendienteSalida: resumen.totalLiberadosPendienteSalida,
      totalEntregados: resumen.totalEntregados,
      porEncierro: Array.from(resumen.porEncierro.values()),
    };
  }

  async registrarRetencion(
    params: RegistrarRetencionParams,
  ): Promise<RetencionVehiculo> {
    const infraccion = await this.infraccionesService.findByIdOrFail(
      params.idInfraccion,
    );

    if (!infraccion.tipoProcedimiento.permiteRetencion) {
      throw new BadRequestException(
        `El tipo de expediente ${infraccion.tipoProcedimiento.nombreTipoProcedimiento} no permite ingreso a encierro.`,
      );
    }

    const existingRetencion = await this.retencionesRepository.findOne({
      where: {
        infraccion: {
          idInfraccion: params.idInfraccion,
        },
      },
      order: {
        fechaIngreso: 'DESC',
        idRetencionVehiculo: 'DESC',
      },
    });

    if (existingRetencion) {
      throw new BadRequestException(
        'La infraccion ya cuenta con una retencion vehicular registrada',
      );
    }

    const retencion = this.retencionesRepository.create({
      infraccion: { idInfraccion: params.idInfraccion },
      encierro: { idEncierro: params.idEncierro },
      fechaIngreso: normalizeDate(params.fechaIngreso),
      recibidoPor: params.recibidoPor,
      folioResguardo: params.folioResguardo ?? null,
      observacionesIngreso: params.observacionesIngreso ?? null,
      estadoIngreso: params.estadoIngreso ?? null,
    });

    return this.retencionesRepository.save(retencion);
  }

  async registrarSalida(
    params: RegistrarSalidaParams,
  ): Promise<SalidaVehiculo> {
    const retencion = await this.findRetencionByIdOrFail(
      params.idRetencionVehiculo,
    );
    const existingSalida = await this.salidasRepository.findOne({
      where: {
        retencionVehiculo: {
          idRetencionVehiculo: params.idRetencionVehiculo,
        },
      },
      order: {
        fechaSalida: 'DESC',
        idSalidaVehiculo: 'DESC',
      },
    });

    if (existingSalida) {
      throw new BadRequestException(
        'La retencion vehicular ya cuenta con una salida registrada',
      );
    }

    const liberacion = await this.dataSource
      .getRepository(LiberacionVehiculo)
      .findOne({
        where: {
          idLiberacionVehiculo: params.idLiberacionVehiculo,
        },
        relations: {
          infraccion: true,
        },
      });

    if (!liberacion) {
      throw new NotFoundException(
        `Liberacion vehicular ${params.idLiberacionVehiculo} no encontrada`,
      );
    }

    if (
      liberacion.infraccion.idInfraccion !== retencion.infraccion.idInfraccion
    ) {
      throw new BadRequestException(
        'La liberacion indicada no corresponde a la retencion vehicular seleccionada',
      );
    }

    const salida = this.salidasRepository.create({
      retencionVehiculo: {
        idRetencionVehiculo: params.idRetencionVehiculo,
      } as RetencionVehiculo,
      liberacionVehiculo: {
        idLiberacionVehiculo: params.idLiberacionVehiculo,
      } as LiberacionVehiculo,
      usuarioValidaSalida: {
        idUsuario: params.idUsuarioValidaSalida,
      } as Usuario,
      fechaSalida: normalizeDate(params.fechaSalida),
      validadoPor: params.validadoPor,
      personaRecibeVehiculo: params.personaRecibeVehiculo,
      observacionesSalida: params.observacionesSalida ?? null,
      estadoSalida: params.estadoSalida,
    });

    const savedSalida = await this.salidasRepository.save(salida);

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: retencion.infraccion.idInfraccion,
      nombreEstatus: ESTATUS_INFRACCION.VEHICULO_ENTREGADO,
      idUsuario: params.idUsuarioValidaSalida,
      accion: ACCION_MOVIMIENTO.VEHICULO_ENTREGADO,
      observaciones: 'Salida vehicular registrada',
      fechaMovimiento: params.fechaSalida,
    });

    await this.auditoriaService.registrar({
      idUsuario: params.idUsuarioValidaSalida,
      accion: 'SALIDA_ENCIERRO_REGISTRADA',
      entidad: 'salidas_vehiculo',
      entidadId: savedSalida.idSalidaVehiculo,
      despuesJson: {
        idSalidaVehiculo: savedSalida.idSalidaVehiculo,
        idRetencionVehiculo: params.idRetencionVehiculo,
        idLiberacionVehiculo: params.idLiberacionVehiculo,
        idUsuarioValidaSalida: params.idUsuarioValidaSalida,
        fechaSalida: savedSalida.fechaSalida,
      },
    });

    return savedSalida;
  }


  /**
   * Registra una entrega fisica sobre una infraccion/retencion existente.
   * No genera pago ni liberacion electronica y no modifica el flujo ordinario.
   */
  async registrarSalidaAnticipada(
    params: RegistrarSalidaAnticipadaDto & { idUsuarioValidaSalida: number },
  ): Promise<SalidaVehiculo> {
    const folio = params.folioLiberacionPresentado?.trim();
    const placas = params.placasCotejadas?.trim();
    const propietario = params.nombrePropietarioDeclarado?.trim();
    if (!folio || !placas || !propietario ||
        params.autorizacionDocumentalVerificada !== true) {
      throw new BadRequestException(
        'La salida anticipada requiere placas, folio, propietario y autorizacion documental verificada.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const retencion = await manager.getRepository(RetencionVehiculo)
        .createQueryBuilder('retencion')
        .innerJoinAndSelect('retencion.infraccion', 'infraccion')
        .innerJoinAndSelect('infraccion.vehiculo', 'vehiculo')
        .leftJoinAndSelect('vehiculo.lineaVehiculo', 'linea')
        .leftJoinAndSelect('linea.marcaVehiculo', 'marca')
        .leftJoinAndSelect('vehiculo.claseVehiculo', 'clase')
        .where('retencion.idRetencionVehiculo = :idRetencion', {
          idRetencion: params.idRetencionVehiculo,
        })
        .getOne();

      if (!retencion) {
        throw new NotFoundException('No existe una retencion con expediente y vehiculo asociado.');
      }

      const idInfraccion = retencion.infraccion.idInfraccion;
      const salidaRepository = manager.getRepository(SalidaVehiculo);
      if (await salidaRepository.exists({
        where: { retencionVehiculo: { idRetencionVehiculo: params.idRetencionVehiculo } },
      })) {
        throw new BadRequestException('La retencion ya tiene una salida registrada.');
      }

      if (await manager.getRepository(LiberacionVehiculo).exists({
        where: { infraccion: { idInfraccion } },
      })) {
        throw new BadRequestException(
          'El expediente ya cuenta con liberacion electronica; utiliza el registro ordinario de salida.',
        );
      }

      const folioRegistrado = await manager.query<Array<{ id_infraccion: number }>>(
        `SELECT id_infraccion
         FROM liberacion_vehiculo
         WHERE UPPER(BTRIM(folio_liberacion)) = $1
         LIMIT 1`,
        [folio.toUpperCase()],
      );
      if (folioRegistrado.length > 0) {
        throw new BadRequestException('El folio de liberacion presentado ya corresponde a una liberacion electronica.');
      }

      const discrepancias = this.validarCotejoSalidaAnticipada(
        params,
        retencion.infraccion,
      );

      const estatus = await manager.getRepository(EstatusInfraccion).findOne({
        where: { nombreEstatus: ESTATUS_INFRACCION.VEHICULO_ENTREGADO },
      });
      if (!estatus) {
        throw new NotFoundException('No se encontro el estatus VEHICULO_ENTREGADO.');
      }

      const fechaSalida = new Date();
      const datos = params.datosVehiculoCotejados;
      const savedSalida = await salidaRepository.save(salidaRepository.create({
        retencionVehiculo: { idRetencionVehiculo: params.idRetencionVehiculo } as RetencionVehiculo,
        liberacionVehiculo: null,
        usuarioValidaSalida: { idUsuario: params.idUsuarioValidaSalida } as Usuario,
        fechaSalida,
        validadoPor: params.validadoPor.trim(),
        personaRecibeVehiculo: params.personaRecibeVehiculo.trim(),
        observacionesSalida: params.observacionesSalida?.trim() || null,
        estadoSalida: 'ENTREGADO',
        modalidadSalida: 'ANTICIPADA',
        folioLiberacionPresentado: folio,
        placasCotejadas: placas,
        datosVehiculoCotejados: {
          placas,
          estadoPlacas: datos.estadoPlacas?.trim() || null,
          marca: datos.marca?.trim() || null,
          linea: datos.linea?.trim() || null,
          clase: datos.clase?.trim() || null,
          anioModelo: datos.anioModelo ?? null,
          color: datos.color?.trim() || null,
          serie: datos.serie?.trim() || null,
          motor: datos.motor?.trim() || null,
        },
        nombrePropietarioDeclarado: propietario,
        autorizacionDocumentalVerificada: true,
        referenciaDocumentoLiberacion: folio,
      }));

      if (discrepancias.length > 0) {
        const observacionesRepository = manager.getRepository(ObservacionExpediente);
        const soporte = params.discrepanciaMenor!;
        await observacionesRepository.save(
          discrepancias.map((discrepancia) =>
            observacionesRepository.create({
              infraccion: { idInfraccion } as Infraccion,
              salidaVehiculo: {
                idSalidaVehiculo: savedSalida.idSalidaVehiculo,
              } as SalidaVehiculo,
              usuarioReporta: {
                idUsuario: params.idUsuarioValidaSalida,
              } as Usuario,
              campoObservado: discrepancia.campo,
              valorOriginal: discrepancia.valorOriginal,
              valorReportado: discrepancia.valorReportado,
              motivoReporte: soporte.motivo.trim(),
              referenciaEvidencia: soporte.referenciaEvidencia.trim(),
              estatus: 'PENDIENTE',
            }),
          ),
        );
      }

      await manager.getRepository(Infraccion).update(
        { idInfraccion },
        { estatusInfraccion: estatus },
      );
      const movimientosRepository = manager.getRepository(InfraccionMovimiento);
      await movimientosRepository.save(movimientosRepository.create({
        infraccion: { idInfraccion } as Infraccion,
        estatusInfraccion: estatus,
        usuario: { idUsuario: params.idUsuarioValidaSalida } as Usuario,
        accion: ACCION_MOVIMIENTO.VEHICULO_ENTREGADO,
        observaciones:
          discrepancias.length > 0
            ? 'Salida anticipada con discrepancia menor pendiente; pago/liberacion electronica pendientes.'
            : 'Salida anticipada con autorizacion documental; pago/liberacion electronica pendientes.',
        fechaMovimiento: fechaSalida,
      }));

      const auditoriaRepository = manager.getRepository(Auditoria);
      await auditoriaRepository.save(auditoriaRepository.create({
        idUsuario: params.idUsuarioValidaSalida,
        accion: 'SALIDA_ENCIERRO_ANTICIPADA',
        entidad: 'salidas_vehiculo',
        entidadId: String(savedSalida.idSalidaVehiculo),
        severity: 'HIGH',
        antesJson: null,
        despuesJson: sanitizeAuditPayload({
          idInfraccion,
          idRetencionVehiculo: params.idRetencionVehiculo,
          modalidadSalida: 'ANTICIPADA',
          folioLiberacionPresentado: folio,
          documentoVerificado: true,
          totalObservaciones: discrepancias.length,
          camposObservados: discrepancias.map((item) => item.campo),
        }),
      }));

      return savedSalida;
    });
  }

  /**
   * Mantiene placas e identificadores como bloqueantes. Permite una unica
   * discrepancia menor (COLOR o ANIO_MODELO) si al menos otros dos datos
   * generales coinciden. La discrepancia no modifica al vehiculo.
   */
  private validarCotejoSalidaAnticipada(
    params: RegistrarSalidaAnticipadaDto,
    infraccion: Infraccion,
  ): DiscrepanciaVehiculo[] {
    const vehiculo = infraccion.vehiculo;
    const normalize = (value: string | number) =>
      String(value).normalize('NFKC').trim().replace(/\s+/gu, ' ').toUpperCase();
    const normalizePlacas = (value: string) =>
      normalize(value).replace(/[\s-]/gu, '');

    if (
      !vehiculo.placas ||
      normalizePlacas(vehiculo.placas) !== normalizePlacas(params.placasCotejadas)
    ) {
      throw new BadRequestException(
        'Las placas cotejadas no coinciden con el expediente. Requiere revision.',
      );
    }

    const datos = params.datosVehiculoCotejados;
    if (!datos) {
      throw new BadRequestException('Captura los datos generales cotejados.');
    }

    const generales: Array<{
      campo: string;
      reportado: string | number | null | undefined;
      registrado: string | number | null | undefined;
      campoMenor?: CampoObservado;
    }> = [
      {
        campo: 'marca',
        reportado: datos.marca,
        registrado: vehiculo.lineaVehiculo?.marcaVehiculo?.nombreMarcaVehiculo,
      },
      {
        campo: 'linea',
        reportado: datos.linea,
        registrado: vehiculo.lineaVehiculo?.nombreLineaVehiculo,
      },
      {
        campo: 'clase',
        reportado: datos.clase,
        registrado: vehiculo.claseVehiculo?.nombreClaseVehiculo,
      },
      {
        campo: 'color',
        reportado: datos.color,
        registrado: vehiculo.color,
        campoMenor: 'COLOR',
      },
      {
        campo: 'anio modelo',
        reportado: datos.anioModelo,
        registrado: vehiculo.anioModelo,
        campoMenor: 'ANIO_MODELO',
      },
    ];

    let coincidencias = 0;
    const discrepancias: DiscrepanciaVehiculo[] = [];

    for (const { campo, reportado, registrado, campoMenor } of generales) {
      if (
        reportado === null ||
        reportado === undefined ||
        String(reportado).trim() === ''
      ) {
        continue;
      }

      if (registrado === null || registrado === undefined || String(registrado).trim() === '') {
        throw new BadRequestException(
          `El campo ${campo} no tiene dato registrado para cotejar. Requiere revision.`,
        );
      }

      if (normalize(reportado) === normalize(registrado)) {
        coincidencias += 1;
        continue;
      }

      if (!campoMenor) {
        throw new BadRequestException(
          `El campo ${campo} del vehiculo no coincide con el expediente. Requiere revision.`,
        );
      }
      discrepancias.push({
        campo: campoMenor,
        valorOriginal: String(registrado),
        valorReportado: String(reportado),
      });
    }

    if (coincidencias < 2) {
      throw new BadRequestException(
        'Debes cotejar placas y al menos dos datos generales coincidentes.',
      );
    }
    if (discrepancias.length > 1) {
      throw new BadRequestException(
        'Se detectaron varias diferencias. Requiere revision antes de entregar el vehiculo.',
      );
    }

    const criticos: Array<[string, string | undefined, string | null]> = [
      ['numero de serie', datos.serie, vehiculo.serie],
      ['numero de motor', datos.motor, vehiculo.motor],
      ['estado de placas', datos.estadoPlacas, vehiculo.estadoPlacas],
    ];
    for (const [campo, reportado, registrado] of criticos) {
      if (reportado === undefined || reportado.trim() === '') {
        continue;
      }
      if (!registrado || normalize(reportado) !== normalize(registrado)) {
        throw new BadRequestException(
          `El ${campo} no coincide con el expediente. Requiere revision.`,
        );
      }
    }

    if (discrepancias.length > 0) {
      if (
        !params.discrepanciaMenor?.motivo?.trim() ||
        !params.discrepanciaMenor.referenciaEvidencia?.trim()
      ) {
        throw new BadRequestException(
          'La discrepancia menor requiere motivo y referencia de evidencia para Infracciones.',
        );
      }
    } else if (params.discrepanciaMenor) {
      throw new BadRequestException(
        'No existen diferencias en el cotejo para crear una observacion.',
      );
    }

    return discrepancias;
  }

  /**
   * Bandeja paginada de solo lectura para Infracciones.
   * La API devuelve una proyección explícita: no expone contraseñas,
   * información del propietario ni documentos ajenos a la observación.
   */
  async listarObservacionesPendientes(params: {
    page: number;
    limit: number;
    idInfraccion?: number;
  }) {
    const { page, limit, idInfraccion } = params;
    if (!Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestException('Pagina o limite de observaciones invalido (1 a 50).');
    }
    if (idInfraccion !== undefined && (!Number.isInteger(idInfraccion) || idInfraccion < 1)) {
      throw new BadRequestException('El identificador de infraccion es invalido.');
    }

    const query = this.dataSource.getRepository(ObservacionExpediente)
      .createQueryBuilder('observacion')
      .innerJoin('observacion.infraccion', 'infraccion')
      .innerJoin('infraccion.vehiculo', 'vehiculo')
      .innerJoin('observacion.usuarioReporta', 'usuarioReporta')
      .where('observacion.estatus = :estatus', { estatus: 'PENDIENTE' });

    if (idInfraccion !== undefined) {
      query.andWhere('infraccion.idInfraccion = :idInfraccion', { idInfraccion });
    }

    const total = await query.getCount();
    const rows = await query
      .select('observacion.idObservacion', 'idObservacion')
      .addSelect('infraccion.idInfraccion', 'idInfraccion')
      .addSelect('infraccion.folioInfraccion', 'folioInfraccion')
      .addSelect('vehiculo.placas', 'placas')
      .addSelect('observacion.campoObservado', 'campoObservado')
      .addSelect('observacion.valorOriginal', 'valorOriginal')
      .addSelect('observacion.valorReportado', 'valorReportado')
      .addSelect('observacion.motivoReporte', 'motivoReporte')
      .addSelect('observacion.referenciaEvidencia', 'referenciaEvidencia')
      .addSelect('observacion.fechaReporte', 'fechaReporte')
      .addSelect('usuarioReporta.nombreUsuario', 'nombreUsuarioReporta')
      .orderBy('observacion.fechaReporte', 'DESC')
      .addOrderBy('observacion.idObservacion', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<ObservacionPendienteRow>();

    return {
      data: rows.map((row) => ({
        idObservacion: Number(row.idObservacion),
        idInfraccion: Number(row.idInfraccion),
        folioInfraccion: row.folioInfraccion,
        placas: row.placas,
        campoObservado: row.campoObservado,
        valorOriginal: row.valorOriginal,
        valorReportado: row.valorReportado,
        motivoReporte: row.motivoReporte,
        referenciaEvidencia: row.referenciaEvidencia,
        nombreUsuarioReporta: row.nombreUsuarioReporta,
        fechaReporte: row.fechaReporte instanceof Date
          ? row.fechaReporte.toISOString()
          : row.fechaReporte,
        estatus: 'PENDIENTE' as const,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Solo corrige color o año modelo del expediente reportado.
   * El bloqueo de la observacion, del vehiculo y el registro de auditoria
   * ocurren en una unica transaccion.
   */
  async resolverObservacion(
    params: ResolverObservacionDto & { idObservacion: number; idUsuarioResuelve: number },
  ) {
    const resolucion = params.resolucion?.trim();
    if (!resolucion || resolucion.length < 10 || resolucion.length > 1000 ||
        (params.decision !== 'CORREGIR' && params.decision !== 'RECHAZAR')) {
      throw new BadRequestException('Decision y justificacion de 10 a 1000 caracteres requeridas.');
    }

    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<ObservacionResolverRow[]>(
        [
          'SELECT o.id_observacion AS "idObservacion",',
          'o.id_infraccion AS "idInfraccion",',
          'r.id_infraccion AS "idInfraccionRetencion",',
          'i.id_vehiculo AS "idVehiculo", o.estatus,',
          'o.campo_observado AS "campoObservado",',
          'o.valor_original AS "valorOriginal",',
          'o.valor_reportado AS "valorReportado",',
          's.modalidad_salida AS "modalidadSalida"',
          'FROM observacion_expediente o',
          'JOIN infracciones i ON i.id_infraccion = o.id_infraccion',
          'JOIN salida_vehiculo s ON s.id_salida_vehiculo = o.id_salida_vehiculo',
          'JOIN retencion_vehiculo r ON r.id_retencion_vehiculo = s.id_retencion_vehiculo',
          'WHERE o.id_observacion = $1 FOR UPDATE OF o',
        ].join(' '),
        [params.idObservacion],
      );
      const observacion = rows[0];
      if (!observacion) {
        throw new NotFoundException('No se encontro la observacion solicitada.');
      }
      if (observacion.estatus !== 'PENDIENTE') {
        throw new ConflictException('Esta observacion ya fue atendida. Actualiza la bandeja.');
      }
      if (observacion.modalidadSalida !== 'ANTICIPADA' ||
          Number(observacion.idInfraccion) !== Number(observacion.idInfraccionRetencion)) {
        throw new ConflictException('La salida no pertenece al expediente reportado.');
      }
      if (observacion.campoObservado !== 'COLOR' && observacion.campoObservado !== 'ANIO_MODELO') {
        throw new BadRequestException('Solamente se pueden corregir color y año modelo.');
      }

      let valorAnterior: string | null = null;
      let valorPosterior: string | null = null;
      const idVehiculo = Number(observacion.idVehiculo);
      if (params.decision === 'CORREGIR') {
        const vehiculos = await manager.query<VehiculoResolucionRow[]>(
          [
            'SELECT color, anio_modelo AS "anioModelo"',
            'FROM vehiculo WHERE id_vehiculo = $1 FOR UPDATE',
          ].join(' '),
          [idVehiculo],
        );
        const vehiculo = vehiculos[0];
        if (!vehiculo) {
          throw new NotFoundException('No existe el vehiculo asociado al expediente.');
        }
        const count = await manager.query<Array<{ total: number | string }>>(
          'SELECT COUNT(*)::int AS total FROM infracciones WHERE id_vehiculo = $1',
          [idVehiculo],
        );
        if (Number(count[0]?.total) !== 1) {
          throw new ConflictException(
            'Vehiculo asociado a varios expedientes. Requiere revision por ADMIN.',
          );
        }
        const actual = observacion.campoObservado === 'COLOR'
          ? vehiculo.color : vehiculo.anioModelo;
        const normalize = (value: string | number) =>
          String(value).normalize('NFKC').trim().replace(/\s+/gu, ' ').toUpperCase();
        if (actual === null || actual === undefined ||
            normalize(actual) !== normalize(observacion.valorOriginal)) {
          throw new ConflictException(
            'El valor del vehiculo cambio desde el reporte. Requiere revision.',
          );
        }
        valorAnterior = String(actual);
        if (observacion.campoObservado === 'COLOR') {
          const color = observacion.valorReportado.trim();
          if (!color || color.length > 150 || normalize(color) === normalize(actual)) {
            throw new ConflictException('Color reportado invalido o ya coincidente.');
          }
          await manager.query('UPDATE vehiculo SET color = $1 WHERE id_vehiculo = $2',
            [color, idVehiculo]);
          valorPosterior = color;
        } else {
          const anio = Number(observacion.valorReportado.trim());
          if (!/^\d{4}$/u.test(observacion.valorReportado.trim()) ||
              !Number.isInteger(anio) || anio < 1900 || anio > 2100 || anio === actual) {
            throw new ConflictException('El año modelo reportado no es valido.');
          }
          await manager.query('UPDATE vehiculo SET anio_modelo = $1 WHERE id_vehiculo = $2',
            [anio, idVehiculo]);
          valorPosterior = String(anio);
        }
      }

      const estatus = params.decision === 'CORREGIR' ? 'CORREGIDA' : 'RECHAZADA';
      const fechaResolucion = new Date();
      // TypeORM/PostgreSQL devuelve [filas RETURNING, total afectadas] en UPDATE.
      const [filasActualizadas, totalActualizadas] = await manager.query<
        [Array<{ idObservacion: number }>, number]
      >(
        [
          'UPDATE observacion_expediente SET estatus = $1,',
          'id_usuario_resuelve = $2, resolucion = $3, fecha_resolucion = $4',
          "WHERE id_observacion = $5 AND estatus = 'PENDIENTE'",
          'RETURNING id_observacion AS "idObservacion"',
        ].join(' '),
        [estatus, params.idUsuarioResuelve, resolucion, fechaResolucion, params.idObservacion],
      );
      if (
        totalActualizadas !== 1 ||
        filasActualizadas.length !== 1 ||
        Number(filasActualizadas[0].idObservacion) !== params.idObservacion
      ) {
        throw new ConflictException('No fue posible completar la resolucion.');
      }

      const auditoriaRepository = manager.getRepository(Auditoria);
      await auditoriaRepository.save(auditoriaRepository.create({
        idUsuario: params.idUsuarioResuelve,
        accion: params.decision === 'CORREGIR'
          ? 'OBSERVACION_EXPEDIENTE_CORREGIDA'
          : 'OBSERVACION_EXPEDIENTE_RECHAZADA',
        entidad: 'observacion_expediente',
        entidadId: String(params.idObservacion),
        severity: 'HIGH',
        antesJson: {
          idInfraccion: Number(observacion.idInfraccion),
          idVehiculo,
          campoObservado: observacion.campoObservado,
          estatus: 'PENDIENTE',
          valorOriginal: observacion.valorOriginal,
          valorReportado: observacion.valorReportado,
          valorAnterior,
        },
        despuesJson: {
          estatus,
          resolucion,
          valorPosterior,
          fechaResolucion: fechaResolucion.toISOString(),
        },
      }));

      return {
        idObservacion: params.idObservacion,
        idInfraccion: Number(observacion.idInfraccion),
        campoObservado: observacion.campoObservado,
        estatus,
        resolucion,
        fechaResolucion: fechaResolucion.toISOString(),
        valorAnterior,
        valorPosterior,
      };
    });
  }

  private buildVehiculosEnEncierroBaseQuery(
    query: VehiculosEncierroQueryDto,
  ): SelectQueryBuilder<RetencionVehiculo> {
    const builder = this.dataSource
      .getRepository(RetencionVehiculo)
      .createQueryBuilder('retencion')
      .innerJoin('retencion.infraccion', 'infraccion')
      .leftJoin('infraccion.infractor', 'infractor')
      .leftJoin('infraccion.vehiculo', 'vehiculo')
      .leftJoin('vehiculo.lineaVehiculo', 'lineaVehiculo')
      .leftJoin('lineaVehiculo.marcaVehiculo', 'marcaVehiculo')
      .leftJoin('vehiculo.claseVehiculo', 'claseVehiculo')
      .leftJoin('infraccion.delegacion', 'delegacion')
      .leftJoin('delegacion.region', 'region')
      .leftJoin('retencion.encierro', 'encierro');

    this.applyVehiculosEnEncierroFilters(builder, query);

    return builder;
  }

  private applyVehiculosEnEncierroSelects(
    builder: SelectQueryBuilder<RetencionVehiculo>,
  ): SelectQueryBuilder<RetencionVehiculo> {
    return builder
      .select('retencion.idRetencionVehiculo', 'idRetencionVehiculo')
      .addSelect('retencion.fechaIngreso', 'fechaIngreso')
      .addSelect('retencion.recibidoPor', 'recibidoPor')
      .addSelect('retencion.folioResguardo', 'folioResguardo')
      .addSelect('retencion.estadoIngreso', 'estadoIngreso')
      .addSelect('retencion.observacionesIngreso', 'observacionesIngreso')
      .addSelect('infraccion.idInfraccion', 'idInfraccion')
      .addSelect('infraccion.folioInfraccion', 'folioInfraccion')
      .addSelect('infraccion.fechaInfraccion', 'fechaInfraccion')
      .addSelect('infraccion.horaInfraccion', 'horaInfraccion')
      .addSelect('infractor.nombre', 'infractorNombre')
      .addSelect('infractor.apellidoPaterno', 'infractorApellidoPaterno')
      .addSelect('infractor.apellidoMaterno', 'infractorApellidoMaterno')
      .addSelect('infractor.licencia', 'licencia')
      .addSelect('vehiculo.placas', 'placas')
      .addSelect('vehiculo.serie', 'serie')
      .addSelect('vehiculo.motor', 'motor')
      .addSelect('vehiculo.color', 'color')
      .addSelect('lineaVehiculo.nombreLineaVehiculo', 'linea')
      .addSelect('marcaVehiculo.nombreMarcaVehiculo', 'marca')
      .addSelect('claseVehiculo.nombreClaseVehiculo', 'clase')
      .addSelect('region.nombreRegion', 'region')
      .addSelect('delegacion.nombreDelegacion', 'delegacion')
      .addSelect('encierro.nombreEncierro', 'encierro')
      .addSelect(this.hasPagoExpression(), 'tienePago')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('pago.fecha_pago')
            .from(PagoInfraccion, 'pago')
            .where('pago.id_infraccion = infraccion.id_infraccion')
            .orderBy('pago.fecha_pago', 'DESC')
            .addOrderBy('pago.id_pago_infraccion', 'DESC')
            .limit(1),
        'fechaUltimoPago',
      )
      .addSelect(
        (subQuery) =>
          subQuery
            .select('pago.monto')
            .from(PagoInfraccion, 'pago')
            .where('pago.id_infraccion = infraccion.id_infraccion')
            .orderBy('pago.fecha_pago', 'DESC')
            .addOrderBy('pago.id_pago_infraccion', 'DESC')
            .limit(1),
        'montoPagado',
      )
      .addSelect(this.hasLiberacionExpression(), 'tieneLiberacion')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('liberacion.fecha_liberacion')
            .from(LiberacionVehiculo, 'liberacion')
            .where('liberacion.id_infraccion = infraccion.id_infraccion')
            .orderBy('liberacion.fecha_liberacion', 'DESC')
            .addOrderBy('liberacion.id_liberacion_vehiculo', 'DESC')
            .limit(1),
        'fechaLiberacion',
      )
      .addSelect(this.hasSalidaExpression(), 'tieneSalida')
      .addSelect(
        (subQuery) =>
          subQuery
            .select('salida.fecha_salida')
            .from(SalidaVehiculo, 'salida')
            .where(
              'salida.id_retencion_vehiculo = retencion.id_retencion_vehiculo',
            )
            .orderBy('salida.fecha_salida', 'DESC')
            .addOrderBy('salida.id_salida_vehiculo', 'DESC')
            .limit(1),
        'fechaSalida',
      );
  }

  private applyVehiculosEnEncierroFilters(
    builder: SelectQueryBuilder<RetencionVehiculo>,
    query: VehiculosEncierroQueryDto,
  ): void {
    const search = query.search?.trim();
    if (search) {
      const searchValue = `%${search}%`;
      builder.andWhere(
        `(
          infraccion.folioInfraccion ILIKE :searchValue
          OR infractor.nombre ILIKE :searchValue
          OR infractor.apellidoPaterno ILIKE :searchValue
          OR infractor.apellidoMaterno ILIKE :searchValue
          OR infractor.licencia ILIKE :searchValue
          OR infractor.curp ILIKE :searchValue
          OR vehiculo.placas ILIKE :searchValue
          OR vehiculo.serie ILIKE :searchValue
          OR vehiculo.motor ILIKE :searchValue
          OR vehiculo.color ILIKE :searchValue
          OR delegacion.nombreDelegacion ILIKE :searchValue
          OR region.nombreRegion ILIKE :searchValue
          OR encierro.nombreEncierro ILIKE :searchValue
          OR retencion.folioResguardo ILIKE :searchValue
          OR retencion.estadoIngreso ILIKE :searchValue
        )`,
        { searchValue },
      );
    }

    if (query.idEncierro) {
      builder.andWhere('encierro.idEncierro = :idEncierro', {
        idEncierro: query.idEncierro,
      });
    }

    if (query.idRegion) {
      builder.andWhere('region.idRegion = :idRegion', {
        idRegion: query.idRegion,
      });
    }

    if (query.idDelegacion) {
      builder.andWhere('delegacion.idDelegacion = :idDelegacion', {
        idDelegacion: query.idDelegacion,
      });
    }

    if (query.anio) {
      builder.andWhere(
        'EXTRACT(YEAR FROM infraccion.fechaInfraccion) = :anio',
        {
          anio: query.anio,
        },
      );
    }

    const folioInfraccion = query.folioInfraccion?.trim();
    if (folioInfraccion) {
      builder.andWhere('infraccion.folioInfraccion ILIKE :folioInfraccion', {
        folioInfraccion: `%${folioInfraccion}%`,
      });
    }

    const placas = query.placas?.trim();
    if (placas) {
      builder.andWhere('vehiculo.placas ILIKE :placas', {
        placas: `%${placas}%`,
      });
    }

    const serie = query.serie?.trim();
    if (serie) {
      builder.andWhere('vehiculo.serie ILIKE :serie', {
        serie: `%${serie}%`,
      });
    }

    const motor = query.motor?.trim();
    if (motor) {
      builder.andWhere('vehiculo.motor ILIKE :motor', {
        motor: `%${motor}%`,
      });
    }

    const nombreInfractor = query.nombreInfractor?.trim();
    if (nombreInfractor) {
      builder.andWhere(
        `(infractor.nombre ILIKE :nombreInfractor OR infractor.apellidoPaterno ILIKE :nombreInfractor OR infractor.apellidoMaterno ILIKE :nombreInfractor)`,
        {
          nombreInfractor: `%${nombreInfractor}%`,
        },
      );
    }

    const licencia = query.licencia?.trim();
    if (licencia) {
      builder.andWhere('infractor.licencia ILIKE :licencia', {
        licencia: `%${licencia}%`,
      });
    }

    if (query.fechaIngresoDesde) {
      builder.andWhere(
        'retencion.fechaIngreso >= CAST(:fechaIngresoDesde AS timestamp)',
        {
          fechaIngresoDesde: query.fechaIngresoDesde,
        },
      );
    }

    if (query.fechaIngresoHasta) {
      builder.andWhere(
        'retencion.fechaIngreso <= CAST(:fechaIngresoHasta AS timestamp)',
        {
          fechaIngresoHasta: query.fechaIngresoHasta,
        },
      );
    }

    if (query.fechaInfraccionDesde) {
      builder.andWhere(
        'infraccion.fechaInfraccion >= CAST(:fechaInfraccionDesde AS date)',
        {
          fechaInfraccionDesde: query.fechaInfraccionDesde,
        },
      );
    }

    if (query.fechaInfraccionHasta) {
      builder.andWhere(
        'infraccion.fechaInfraccion <= CAST(:fechaInfraccionHasta AS date)',
        {
          fechaInfraccionHasta: query.fechaInfraccionHasta,
        },
      );
    }

    if (query.conPago !== undefined) {
      builder.andWhere(
        query.conPago
          ? this.hasPagoExpression()
          : `NOT ${this.hasPagoExpression()}`,
      );
    }

    if (query.conLiberacion !== undefined) {
      builder.andWhere(
        query.conLiberacion
          ? this.hasLiberacionExpression()
          : `NOT ${this.hasLiberacionExpression()}`,
      );
    }

    if (query.conSalida !== undefined) {
      builder.andWhere(
        query.conSalida
          ? this.hasSalidaExpression()
          : `NOT ${this.hasSalidaExpression()}`,
      );
    }

    if (query.estadoOperativo) {
      this.applyVehiculoEstadoOperativoFilter(builder, query.estadoOperativo);
    }
  }

  private applyVehiculoEstadoOperativoFilter(
    builder: SelectQueryBuilder<RetencionVehiculo>,
    estadoOperativo: string,
  ): void {
    const hasSalida = this.hasSalidaExpression();
    const hasLiberacion = this.hasLiberacionExpression();
    const hasPago = this.hasPagoExpression();
    const hasRetencion = `EXISTS (
      SELECT 1
      FROM retencion_vehiculo retencion_filtro
      WHERE retencion_filtro.id_infraccion = infraccion.id_infraccion
    )`;

    switch (estadoOperativo) {
      case ESTADO_OPERATIVO_VEHICULO.VEHICULO_ENTREGADO:
        builder.andWhere(hasSalida);
        return;
      case ESTADO_OPERATIVO_VEHICULO.LIBERADO_PENDIENTE_SALIDA:
        builder.andWhere(hasLiberacion).andWhere(`NOT ${hasSalida}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.PAGADO_PENDIENTE_LIBERACION:
        builder
          .andWhere(hasPago)
          .andWhere(`NOT ${hasLiberacion}`)
          .andWhere(`NOT ${hasSalida}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO:
        builder
          .andWhere(hasRetencion)
          .andWhere(`NOT ${hasPago}`)
          .andWhere(`NOT ${hasLiberacion}`)
          .andWhere(`NOT ${hasSalida}`);
        return;
      case ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION:
        builder.andWhere(`NOT ${hasRetencion}`);
        return;
      default:
        return;
    }
  }

  private resolveSortColumn(sortBy?: string): string {
    switch (sortBy?.trim()) {
      case 'folioInfraccion':
        return 'infraccion.folioInfraccion';
      case 'fechaInfraccion':
        return 'infraccion.fechaInfraccion';
      case 'placas':
        return 'vehiculo.placas';
      case 'serie':
        return 'vehiculo.serie';
      case 'motor':
        return 'vehiculo.motor';
      case 'nombreInfractor':
        return 'infractor.nombre';
      case 'licencia':
        return 'infractor.licencia';
      case 'estadoOperativo':
        return `CASE
          WHEN ${this.hasSalidaExpression()} THEN 5
          WHEN ${this.hasLiberacionExpression()} THEN 4
          WHEN ${this.hasPagoExpression()} THEN 3
          WHEN EXISTS (
            SELECT 1
            FROM retencion_vehiculo retencion_sort
            WHERE retencion_sort.id_infraccion = infraccion.id_infraccion
          ) THEN 2
          ELSE 1
        END`;
      default:
        return 'retencion.fechaIngreso';
    }
  }

  private resolveSortOrder(sortOrder?: string): 'ASC' | 'DESC' {
    return sortOrder?.trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  }

  private mapVehiculoEnEncierroRow(row: VehiculoEnEncierroRow) {
    const hasPago = this.toBoolean(row.tienePago);
    const hasLiberacion = this.toBoolean(row.tieneLiberacion);
    const hasSalida = this.toBoolean(row.tieneSalida);
    const estadoOperativo = resolveEstadoOperativoVehiculo({
      permiteRetencion: true,
      hasRetencion: true,
      hasPago,
      hasLiberacion,
      hasSalida,
    });

    return {
      idInfraccion: this.toNumber(row.idInfraccion),
      idRetencionVehiculo: this.toNumber(row.idRetencionVehiculo),
      folioInfraccion: this.toStringValue(row.folioInfraccion),
      fechaInfraccion: this.toStringValue(row.fechaInfraccion),
      horaInfraccion: this.toStringValue(row.horaInfraccion),
      infractorNombreCompleto: this.buildNombreCompleto(row),
      licencia: this.toNullableString(row.licencia),
      vehiculo: {
        placas: this.toNullableString(row.placas),
        marca: this.toNullableString(row.marca),
        linea: this.toNullableString(row.linea),
        clase: this.toNullableString(row.clase),
        color: this.toNullableString(row.color),
        serie: this.toNullableString(row.serie),
        motor: this.toNullableString(row.motor),
      },
      region: this.toNullableString(row.region),
      delegacion: this.toNullableString(row.delegacion),
      retencion: {
        idRetencionVehiculo: this.toNumber(row.idRetencionVehiculo),
        encierro: this.toNullableString(row.encierro),
        fechaIngreso: this.toIsoString(row.fechaIngreso) ?? '',
        folioResguardo: this.toNullableString(row.folioResguardo),
        estadoIngreso: this.toNullableString(row.estadoIngreso),
      },
      pago: {
        tienePago: hasPago,
        fechaUltimoPago: this.toIsoString(row.fechaUltimoPago),
        montoPagado: this.toNullableString(row.montoPagado),
      },
      liberacion: {
        tieneLiberacion: hasLiberacion,
        fechaLiberacion: this.toIsoString(row.fechaLiberacion),
      },
      salida: {
        tieneSalida: hasSalida,
        fechaSalida: this.toIsoString(row.fechaSalida),
      },
      estadoOperativo,
    };
  }

  private createEmptyResumenState(): VehiculosEnEncierroResumenState {
    return {
      totalVehiculosRetenidos: 0,
      totalSinPago: 0,
      totalPagadosPendienteLiberacion: 0,
      totalLiberadosPendienteSalida: 0,
      totalEntregados: 0,
      porEncierro: new Map(),
    };
  }

  private resolveEstadoOperativo(params: {
    hasRetencion: boolean;
    hasPago: boolean;
    hasLiberacion: boolean;
    hasSalida: boolean;
  }) {
    if (params.hasSalida) {
      return ESTADO_OPERATIVO_VEHICULO.VEHICULO_ENTREGADO;
    }

    if (!params.hasRetencion) {
      return ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
    }

    if (params.hasLiberacion) {
      return ESTADO_OPERATIVO_VEHICULO.LIBERADO_PENDIENTE_SALIDA;
    }

    if (params.hasPago) {
      return ESTADO_OPERATIVO_VEHICULO.PAGADO_PENDIENTE_LIBERACION;
    }

    if (params.hasRetencion) {
      return ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO;
    }

    return ESTADO_OPERATIVO_VEHICULO.SIN_RETENCION;
  }

  private hasPagoExpression(): string {
    return `EXISTS (
      SELECT 1
      FROM pago_infraccion pago
      WHERE pago.id_infraccion = infraccion.id_infraccion
    )`;
  }

  private hasLiberacionExpression(): string {
    return `EXISTS (
      SELECT 1
      FROM liberacion_vehiculo liberacion
      WHERE liberacion.id_infraccion = infraccion.id_infraccion
    )`;
  }

  private hasSalidaExpression(): string {
    return `EXISTS (
      SELECT 1
      FROM salida_vehiculo salida
      WHERE salida.id_retencion_vehiculo = retencion.id_retencion_vehiculo
    )`;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }

    return false;
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      return Number(value);
    }

    return 0;
  }

  private toStringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return '';
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return null;
  }

  private toIsoString(value: unknown): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      typeof value !== 'string' &&
      typeof value !== 'number' &&
      !(value instanceof Date)
    ) {
      return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  private buildNombreCompleto(
    row: Pick<
      VehiculoEnEncierroRow,
      | 'infractorNombre'
      | 'infractorApellidoPaterno'
      | 'infractorApellidoMaterno'
    >,
  ): string {
    return [
      row.infractorNombre,
      row.infractorApellidoPaterno,
      row.infractorApellidoMaterno,
    ]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean)
      .join(' ');
  }
}

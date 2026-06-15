import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';

import { normalizeDate } from '../../common/utils/normalize-date';
import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { ESTADO_OPERATIVO_VEHICULO } from '../infracciones/constants/estado-operativo-vehiculo.constants';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { LiberacionVehiculo } from '../liberaciones/entities/liberacion-vehiculo.entity';
import { PagoInfraccion } from '../pagos/entities/pago-infraccion.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Encierro } from './entities/encierro.entity';
import { RetencionVehiculo } from './entities/retencion-vehiculo.entity';
import { SalidaVehiculo } from './entities/salida-vehiculo.entity';
import { VehiculosEncierroQueryDto } from './dto/vehiculos-query.dto';
import {
  type VehiculosEncierroResponseDto,
  type VehiculosEncierroResumenDto,
} from './dto/vehiculos-response.dto';

interface RegistrarRetencionParams {
  idInfraccion: number;
  idEncierro: number;
  recibidoPor: string;
  fechaIngreso?: string | Date;
  folioResguardo?: string | null;
  observacionesIngreso?: string | null;
  estadoIngreso?: string | null;
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

    const retencion = await this.findRetencionByIdOrFail(
      params.idRetencionVehiculo,
    );

    await this.infraccionesService.actualizarEstatusYRegistrarMovimiento({
      idInfraccion: retencion.infraccion.idInfraccion,
      nombreEstatus: ESTATUS_INFRACCION.VEHICULO_ENTREGADO,
      idUsuario: params.idUsuarioValidaSalida,
      accion: ACCION_MOVIMIENTO.VEHICULO_ENTREGADO,
      observaciones: 'Salida vehicular registrada',
      fechaMovimiento: params.fechaSalida,
    });

    return savedSalida;
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
    const estadoOperativo = this.resolveEstadoOperativo({
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

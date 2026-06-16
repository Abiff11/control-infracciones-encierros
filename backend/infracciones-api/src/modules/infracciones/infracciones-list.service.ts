import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';

import { ESTADO_OPERATIVO_VEHICULO } from './constants/estado-operativo-vehiculo.constants';
import { FindInfraccionesQueryDto } from './dto/find-infracciones-query.dto';
import { Infraccion } from './entities/infraccion.entity';

interface InfraccionListRow {
  idInfraccion: string | number;
  folioInfraccion: string;
  fechaInfraccion: string | Date;
  horaInfraccion: string;
  observaciones: string | null;
  clavePolicia: string | null;
  numParteInformativo: string | null;
  infractorNombre: string | null;
  infractorApellidoPaterno: string | null;
  infractorApellidoMaterno: string | null;
  licencia: string | null;
  placas: string | null;
  estadoPlacas: string | null;
  serie: string | null;
  motor: string | null;
  color: string | null;
  marca: string | null;
  linea: string | null;
  clase: string | null;
  idRegion: string | number | null;
  nombreRegion: string | null;
  idDelegacion: string | number | null;
  nombreDelegacion: string | null;
  idEstatusInfraccion: string | number | null;
  nombreEstatus: string | null;
  idTipoProcedimiento: string | number | null;
  nombreTipoProcedimiento: string | null;
  idRetencionVehiculo: string | number | null;
  encierro: string | null;
  fechaIngreso: string | Date | null;
  folioResguardo: string | null;
  estadoIngreso: string | null;
  tienePago: boolean | number | string | null;
  idUltimoPago: string | number | null;
  fechaUltimoPago: string | Date | null;
  montoPagado: string | number | null;
  tieneLiberacion: boolean | number | string | null;
  idUltimaLiberacion: string | number | null;
  fechaLiberacion: string | Date | null;
  tieneSalida: boolean | number | string | null;
  fechaSalida: string | Date | null;
}

interface MotivoRow {
  idInfraccion: string | number;
  idMotivo: string | number;
  nombreMotivo: string;
  descripcionMotivo: string;
}

@Injectable()
export class InfraccionesListService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: FindInfraccionesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const baseQuery = this.buildBaseQuery(query);
    const sortOrder = this.resolveSortOrder(query.sortOrder);
    const sortBy = this.resolveSortColumn(query.sortBy);

    const [rows, total] = await Promise.all([
      this.applySelects(baseQuery.clone())
        .orderBy(sortBy, sortOrder)
        .addOrderBy('infraccion.horaInfraccion', sortOrder)
        .addOrderBy('infraccion.idInfraccion', 'DESC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<InfraccionListRow>(),
      baseQuery.clone().getCount(),
    ]);

    const ids = rows.map((row) => this.toNumber(row.idInfraccion));
    const motivosMap = await this.loadMotivosMap(ids);

    return {
      data: rows.map((row) => this.mapRow(row, motivosMap)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private buildBaseQuery(
    query: FindInfraccionesQueryDto,
  ): SelectQueryBuilder<Infraccion> {
    const builder = this.dataSource
      .getRepository(Infraccion)
      .createQueryBuilder('infraccion')
      .leftJoin('infraccion.infractor', 'infractor')
      .leftJoin('infraccion.vehiculo', 'vehiculo')
      .leftJoin('vehiculo.lineaVehiculo', 'lineaVehiculo')
      .leftJoin('lineaVehiculo.marcaVehiculo', 'marcaVehiculo')
      .leftJoin('vehiculo.claseVehiculo', 'claseVehiculo')
      .leftJoin('infraccion.delegacion', 'delegacion')
      .leftJoin('delegacion.region', 'region')
      .leftJoin('infraccion.estatusInfraccion', 'estatusInfraccion')
      .leftJoin('infraccion.tipoProcedimiento', 'tipoProcedimiento')
      .leftJoin(
        'retencion_vehiculo',
        'retencion',
        `retencion.id_retencion_vehiculo = (
          SELECT retencion_latest.id_retencion_vehiculo
          FROM retencion_vehiculo retencion_latest
          WHERE retencion_latest.id_infraccion = infraccion.id_infraccion
          ORDER BY retencion_latest.fecha_ingreso DESC, retencion_latest.id_retencion_vehiculo DESC
          LIMIT 1
        )`,
      )
      .leftJoin(
        'encierro',
        'encierro',
        'encierro.id_encierro = retencion.id_encierro',
      );

    this.applyFilters(builder, query);

    return builder;
  }

  private applySelects(
    builder: SelectQueryBuilder<Infraccion>,
  ): SelectQueryBuilder<Infraccion> {
    return builder
      .select('infraccion.idInfraccion', 'idInfraccion')
      .addSelect('infraccion.folioInfraccion', 'folioInfraccion')
      .addSelect('infraccion.fechaInfraccion', 'fechaInfraccion')
      .addSelect('infraccion.horaInfraccion', 'horaInfraccion')
      .addSelect('infraccion.observaciones', 'observaciones')
      .addSelect('infraccion.clavePolicia', 'clavePolicia')
      .addSelect('infraccion.numParteInformativo', 'numParteInformativo')
      .addSelect('infractor.nombre', 'infractorNombre')
      .addSelect('infractor.apellidoPaterno', 'infractorApellidoPaterno')
      .addSelect('infractor.apellidoMaterno', 'infractorApellidoMaterno')
      .addSelect('infractor.licencia', 'licencia')
      .addSelect('vehiculo.placas', 'placas')
      .addSelect('vehiculo.estadoPlacas', 'estadoPlacas')
      .addSelect('vehiculo.serie', 'serie')
      .addSelect('vehiculo.motor', 'motor')
      .addSelect('vehiculo.color', 'color')
      .addSelect('lineaVehiculo.nombreLineaVehiculo', 'linea')
      .addSelect('marcaVehiculo.nombreMarcaVehiculo', 'marca')
      .addSelect('claseVehiculo.nombreClaseVehiculo', 'clase')
      .addSelect('region.idRegion', 'idRegion')
      .addSelect('region.nombreRegion', 'nombreRegion')
      .addSelect('delegacion.idDelegacion', 'idDelegacion')
      .addSelect('delegacion.nombreDelegacion', 'nombreDelegacion')
      .addSelect('estatusInfraccion.idEstatusInfraccion', 'idEstatusInfraccion')
      .addSelect('estatusInfraccion.nombreEstatus', 'nombreEstatus')
      .addSelect('tipoProcedimiento.idTipoProcedimiento', 'idTipoProcedimiento')
      .addSelect(
        'tipoProcedimiento.nombreTipoProcedimiento',
        'nombreTipoProcedimiento',
      )
      .addSelect('retencion.id_retencion_vehiculo', 'idRetencionVehiculo')
      .addSelect('encierro.nombre_encierro', 'encierro')
      .addSelect('retencion.fecha_ingreso', 'fechaIngreso')
      .addSelect('retencion.folio_resguardo', 'folioResguardo')
      .addSelect('retencion.estado_ingreso', 'estadoIngreso')
      .addSelect(this.hasPagoExpression(), 'tienePago')
      .addSelect(
        `(
          SELECT pago.id_pago_infraccion
          FROM pago_infraccion pago
          WHERE pago.id_infraccion = infraccion.id_infraccion
          ORDER BY pago.fecha_pago DESC, pago.id_pago_infraccion DESC
          LIMIT 1
        )`,
        'idUltimoPago',
      )
      .addSelect(
        `(
          SELECT pago.fecha_pago
          FROM pago_infraccion pago
          WHERE pago.id_infraccion = infraccion.id_infraccion
          ORDER BY pago.fecha_pago DESC, pago.id_pago_infraccion DESC
          LIMIT 1
        )`,
        'fechaUltimoPago',
      )
      .addSelect(
        `(
          SELECT pago.monto
          FROM pago_infraccion pago
          WHERE pago.id_infraccion = infraccion.id_infraccion
          ORDER BY pago.fecha_pago DESC, pago.id_pago_infraccion DESC
          LIMIT 1
        )`,
        'montoPagado',
      )
      .addSelect(this.hasLiberacionExpression(), 'tieneLiberacion')
      .addSelect(
        `(
          SELECT liberacion.id_liberacion_vehiculo
          FROM liberacion_vehiculo liberacion
          WHERE liberacion.id_infraccion = infraccion.id_infraccion
          ORDER BY liberacion.fecha_liberacion DESC, liberacion.id_liberacion_vehiculo DESC
          LIMIT 1
        )`,
        'idUltimaLiberacion',
      )
      .addSelect(
        `(
          SELECT liberacion.fecha_liberacion
          FROM liberacion_vehiculo liberacion
          WHERE liberacion.id_infraccion = infraccion.id_infraccion
          ORDER BY liberacion.fecha_liberacion DESC, liberacion.id_liberacion_vehiculo DESC
          LIMIT 1
        )`,
        'fechaLiberacion',
      )
      .addSelect(this.hasSalidaExpression(), 'tieneSalida')
      .addSelect(
        `(
          SELECT salida.fecha_salida
          FROM salida_vehiculo salida
          WHERE salida.id_retencion_vehiculo = retencion.id_retencion_vehiculo
          ORDER BY salida.fecha_salida DESC, salida.id_salida_vehiculo DESC
          LIMIT 1
        )`,
        'fechaSalida',
      );
  }

  private applyFilters(
    builder: SelectQueryBuilder<Infraccion>,
    query: FindInfraccionesQueryDto,
  ): void {
    const search = query.search?.trim();
    if (search) {
      const searchValue = `%${search}%`;
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('infraccion.folioInfraccion ILIKE :searchValue', {
            searchValue,
          })
            .orWhere('infraccion.clavePolicia ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infraccion.numParteInformativo ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infractor.nombre ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infractor.apellidoPaterno ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infractor.apellidoMaterno ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infractor.licencia ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('infractor.curp ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('vehiculo.placas ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('vehiculo.estadoPlacas ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('vehiculo.serie ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('vehiculo.motor ILIKE :searchValue', {
              searchValue,
            })
            .orWhere('vehiculo.color ILIKE :searchValue', {
              searchValue,
            });
        }),
      );
    }

    if (query.folioInfraccion) {
      builder.andWhere('infraccion.folioInfraccion ILIKE :folioInfraccion', {
        folioInfraccion: `%${query.folioInfraccion.trim()}%`,
      });
    }

    if (query.fechaInicio) {
      builder.andWhere('infraccion.fechaInfraccion >= :fechaInicio', {
        fechaInicio: query.fechaInicio,
      });
    }

    if (query.fechaFin) {
      builder.andWhere('infraccion.fechaInfraccion <= :fechaFin', {
        fechaFin: query.fechaFin,
      });
    }

    if (query.fechaDesde) {
      builder.andWhere('infraccion.fechaInfraccion >= :fechaDesde', {
        fechaDesde: query.fechaDesde,
      });
    }

    if (query.fechaHasta) {
      builder.andWhere('infraccion.fechaInfraccion <= :fechaHasta', {
        fechaHasta: query.fechaHasta,
      });
    }

    if (query.idEstatusInfraccion) {
      builder.andWhere(
        'infraccion.idEstatusInfraccion = :idEstatusInfraccion',
        {
          idEstatusInfraccion: query.idEstatusInfraccion,
        },
      );
    }

    if (query.idDelegacion) {
      builder.andWhere('infraccion.idDelegacion = :idDelegacion', {
        idDelegacion: query.idDelegacion,
      });
    }

    if (query.idRegion) {
      builder.andWhere('region.idRegion = :idRegion', {
        idRegion: query.idRegion,
      });
    }

    if (query.idTipoProcedimiento) {
      builder.andWhere(
        'infraccion.idTipoProcedimiento = :idTipoProcedimiento',
        {
          idTipoProcedimiento: query.idTipoProcedimiento,
        },
      );
    }

    if (query.idEncierro) {
      builder.andWhere('retencion.id_encierro = :idEncierro', {
        idEncierro: query.idEncierro,
      });
    }

    if (query.placas) {
      builder.andWhere('vehiculo.placas ILIKE :placas', {
        placas: `%${query.placas.trim()}%`,
      });
    }

    if (query.serie) {
      builder.andWhere('vehiculo.serie ILIKE :serie', {
        serie: `%${query.serie.trim()}%`,
      });
    }

    if (query.motor) {
      builder.andWhere('vehiculo.motor ILIKE :motor', {
        motor: `%${query.motor.trim()}%`,
      });
    }

    if (query.nombreInfractor) {
      const nameSearch = `%${query.nombreInfractor.trim()}%`;
      builder.andWhere(
        new Brackets((qb) => {
          qb.where('infractor.nombre ILIKE :nameSearch', { nameSearch })
            .orWhere('infractor.apellidoPaterno ILIKE :nameSearch', {
              nameSearch,
            })
            .orWhere('infractor.apellidoMaterno ILIKE :nameSearch', {
              nameSearch,
            });
        }),
      );
    }

    if (query.licencia) {
      builder.andWhere('infractor.licencia ILIKE :licencia', {
        licencia: `%${query.licencia.trim()}%`,
      });
    }

    if (query.rfc) {
      builder.andWhere('infractor.rfc ILIKE :rfc', {
        rfc: `%${query.rfc.trim()}%`,
      });
    }

    if (query.clavePolicia) {
      builder.andWhere('infraccion.clavePolicia ILIKE :clavePolicia', {
        clavePolicia: `%${query.clavePolicia.trim()}%`,
      });
    }

    if (query.claveOficial) {
      builder.andWhere('infraccion.clavePolicia ILIKE :claveOficial', {
        claveOficial: `%${query.claveOficial.trim()}%`,
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

    if (query.estadoOperativo) {
      this.applyEstadoOperativoFilter(builder, query.estadoOperativo);
    }
  }

  private applyEstadoOperativoFilter(
    builder: SelectQueryBuilder<Infraccion>,
    estadoOperativo: string,
  ): void {
    const hasRetencion = this.hasRetencionExpression();
    const hasPago = this.hasPagoExpression();
    const hasLiberacion = this.hasLiberacionExpression();
    const hasSalida = this.hasSalidaByInfraccionExpression();

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
      case 'horaInfraccion':
        return 'infraccion.horaInfraccion';
      case 'placas':
        return 'vehiculo.placas';
      case 'serie':
        return 'vehiculo.serie';
      case 'motor':
        return 'vehiculo.motor';
      case 'licencia':
        return 'infractor.licencia';
      case 'clavePolicia':
        return 'infraccion.clavePolicia';
      case 'idRegion':
        return 'region.idRegion';
      case 'idDelegacion':
        return 'delegacion.idDelegacion';
      case 'estadoOperativo':
        return `CASE
          WHEN ${this.hasSalidaByInfraccionExpression()} THEN 5
          WHEN ${this.hasLiberacionExpression()} THEN 4
          WHEN ${this.hasPagoExpression()} THEN 3
          WHEN ${this.hasRetencionExpression()} THEN 2
          ELSE 1
        END`;
      default:
        return 'infraccion.fechaInfraccion';
    }
  }

  private resolveSortOrder(sortOrder?: string): 'ASC' | 'DESC' {
    return sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  }

  private async loadMotivosMap(idInfracciones: number[]): Promise<
    Map<
      number,
      Array<{
        idMotivo: number;
        nombreMotivo: string;
        descripcionMotivo: string;
      }>
    >
  > {
    const result = new Map<
      number,
      Array<{
        idMotivo: number;
        nombreMotivo: string;
        descripcionMotivo: string;
      }>
    >();

    if (idInfracciones.length === 0) {
      return result;
    }

    const rows = await this.dataSource.query<MotivoRow[]>(
      `
        SELECT
          im.id_infraccion AS "idInfraccion",
          m.id_motivo AS "idMotivo",
          m.nombre_motivo AS "nombreMotivo",
          m.descripcion_motivo AS "descripcionMotivo"
        FROM infraccion_motivo im
        INNER JOIN motivo m ON m.id_motivo = im.id_motivo
        WHERE im.id_infraccion = ANY($1::int[])
        ORDER BY im.id_infraccion ASC, im.id_infraccion_motivo ASC
      `,
      [idInfracciones],
    );

    for (const row of rows) {
      const idInfraccion = this.toNumber(row.idInfraccion);
      const items = result.get(idInfraccion) ?? [];
      items.push({
        idMotivo: this.toNumber(row.idMotivo),
        nombreMotivo: row.nombreMotivo,
        descripcionMotivo: row.descripcionMotivo,
      });
      result.set(idInfraccion, items);
    }

    return result;
  }

  private mapRow(
    row: InfraccionListRow,
    motivosMap: Map<
      number,
      Array<{
        idMotivo: number;
        nombreMotivo: string;
        descripcionMotivo: string;
      }>
    >,
  ) {
    const idInfraccion = this.toNumber(row.idInfraccion);
    const hasRetencion = row.idRetencionVehiculo !== null;
    const hasPago = this.toBoolean(row.tienePago);
    const hasLiberacion = this.toBoolean(row.tieneLiberacion);
    const hasSalida = this.toBoolean(row.tieneSalida);

    return {
      idInfraccion,
      folioInfraccion: this.toStringValue(row.folioInfraccion),
      fechaInfraccion: this.toStringValue(row.fechaInfraccion),
      horaInfraccion: this.toStringValue(row.horaInfraccion),
      observaciones: this.toNullableString(row.observaciones),
      clavePolicia: this.toNullableString(row.clavePolicia),
      numParteInformativo: this.toNullableString(row.numParteInformativo),
      infractor: {
        nombre: this.toStringValue(row.infractorNombre),
        apellidoPaterno: this.toNullableString(row.infractorApellidoPaterno),
        apellidoMaterno: this.toNullableString(row.infractorApellidoMaterno),
        licencia: this.toNullableString(row.licencia),
      },
      vehiculo: {
        placas: this.toNullableString(row.placas),
        estadoPlacas: this.toNullableString(row.estadoPlacas),
        serie: this.toNullableString(row.serie),
        motor: this.toNullableString(row.motor),
        color: this.toNullableString(row.color),
        marca: this.toNullableString(row.marca),
        linea: this.toNullableString(row.linea),
        clase: this.toNullableString(row.clase),
      },
      region: {
        idRegion: this.toNumber(row.idRegion),
        nombreRegion: this.toStringValue(row.nombreRegion),
      },
      delegacion: {
        idDelegacion: this.toNumber(row.idDelegacion),
        nombreDelegacion: this.toStringValue(row.nombreDelegacion),
      },
      estatusInfraccion: {
        idEstatusInfraccion: this.toNumber(row.idEstatusInfraccion),
        nombreEstatus: this.toStringValue(row.nombreEstatus),
      },
      tipoProcedimiento: {
        idTipoProcedimiento: this.toNumber(row.idTipoProcedimiento),
        nombreTipoProcedimiento: this.toStringValue(
          row.nombreTipoProcedimiento,
        ),
      },
      motivos: motivosMap.get(idInfraccion) ?? [],
      retencion: hasRetencion
        ? {
            idRetencionVehiculo: this.toNumber(row.idRetencionVehiculo),
            encierro: this.toNullableString(row.encierro),
            fechaIngreso: this.toIsoString(row.fechaIngreso),
            folioResguardo: this.toNullableString(row.folioResguardo),
            estadoIngreso: this.toNullableString(row.estadoIngreso),
          }
        : null,
      pago: {
        tienePago: hasPago,
        idPagoInfraccion: this.toNullableNumber(row.idUltimoPago),
        fechaUltimoPago: this.toIsoString(row.fechaUltimoPago),
        montoPagado: this.toNullableString(row.montoPagado),
      },
      liberacion: {
        tieneLiberacion: hasLiberacion,
        idLiberacionVehiculo: this.toNullableNumber(row.idUltimaLiberacion),
        fechaLiberacion: this.toIsoString(row.fechaLiberacion),
      },
      salida: {
        tieneSalida: hasSalida,
        fechaSalida: this.toIsoString(row.fechaSalida),
      },
      estadoOperativoCalculado: this.resolveEstadoOperativo({
        hasRetencion,
        hasPago,
        hasLiberacion,
        hasSalida,
      }),
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

    return ESTADO_OPERATIVO_VEHICULO.EN_ENCIERRO_SIN_PAGO;
  }

  private hasRetencionExpression(): string {
    return `EXISTS (
      SELECT 1
      FROM retencion_vehiculo retencion_filtro
      WHERE retencion_filtro.id_infraccion = infraccion.id_infraccion
    )`;
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

  private hasSalidaByInfraccionExpression(): string {
    return `EXISTS (
      SELECT 1
      FROM salida_vehiculo salida
      INNER JOIN retencion_vehiculo retencion_salida
        ON retencion_salida.id_retencion_vehiculo = salida.id_retencion_vehiculo
      WHERE retencion_salida.id_infraccion = infraccion.id_infraccion
    )`;
  }

  private toBoolean(value: boolean | number | string | null): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value > 0;
    }

    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }

    return false;
  }

  private toNumber(value: string | number | null): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toNullableNumber(value: string | number | null): number | null {
    if (value === null) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toStringValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }

    if (value === null || value === undefined) {
      return '';
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint'
    ) {
      return String(value);
    }

    return JSON.stringify(value) ?? '';
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const stringValue = this.toStringValue(value);
    return stringValue === '' ? null : stringValue;
  }

  private toIsoString(value: string | Date | null): string | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }
}

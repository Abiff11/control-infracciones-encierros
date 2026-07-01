import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DashboardQueryDto } from './dto/dashboard-query.dto';

export interface DashboardResumenResponse {
  resumen: {
    totalInfracciones: number;
    totalSinRetencion: number;
    totalVehiculosRetenidos: number;
    totalSinPago: number;
    totalPagadosPendienteLiberacion: number;
    totalLiberadosPendienteSalida: number;
    totalEntregados: number;
  };
  ingresos: {
    totalIngresos: number;
    ingresosHoy: number;
    ingresosMesActual: number;
    ingresosAnioActual: number;
    porDia: Array<{
      periodo: string;
      total: number;
    }>;
    porMes: Array<{
      periodo: string;
      total: number;
    }>;
    porAnio: Array<{
      periodo: string;
      total: number;
    }>;
  };
  flujoOperativo: Array<{
    estado: string;
    label: string;
    total: number;
  }>;
  infraccionesPorDia: Array<{
    fecha: string;
    total: number;
  }>;
  topDelegaciones: Array<{
    idDelegacion: number | null;
    nombreDelegacion: string;
    total: number;
  }>;
  topEncierros: Array<{
    idEncierro: number | null;
    nombreEncierro: string;
    total: number;
    sinPago: number;
    pagadosPendienteLiberacion: number;
    liberadosPendienteSalida: number;
    entregados: number;
  }>;
  updatedAt: string;
}

interface DashboardRawRow {
  resumen: DashboardResumen;
  ingresos: DashboardIngresos;
  flujoOperativo: DashboardFlujoItem[];
  infraccionesPorDia: DashboardDiaItem[];
  topDelegaciones: DashboardDelegacionItem[];
  topEncierros: DashboardEncierroItem[];
}

interface DashboardResumen {
  totalInfracciones: number;
  totalSinRetencion: number;
  totalVehiculosRetenidos: number;
  totalSinPago: number;
  totalPagadosPendienteLiberacion: number;
  totalLiberadosPendienteSalida: number;
  totalEntregados: number;
}

interface DashboardIngresos {
  totalIngresos: number;
  ingresosHoy: number;
  ingresosMesActual: number;
  ingresosAnioActual: number;
  porDia: DashboardIngresoSerieItem[];
  porMes: DashboardIngresoSerieItem[];
  porAnio: DashboardIngresoSerieItem[];
}

interface DashboardIngresoSerieItem {
  periodo: string;
  total: number;
}

interface DashboardFlujoItem {
  estado: string;
  label: string;
  total: number;
}

interface DashboardDiaItem {
  fecha: string;
  total: number;
}

interface DashboardDelegacionItem {
  idDelegacion: number | null;
  nombreDelegacion: string;
  total: number;
}

interface DashboardEncierroItem {
  idEncierro: number | null;
  nombreEncierro: string;
  total: number;
  sinPago: number;
  pagadosPendienteLiberacion: number;
  liberadosPendienteSalida: number;
  entregados: number;
}

interface SqlFilterParts {
  whereSql: string;
  params: unknown[];
}

const ESTADO_LABELS: Record<string, string> = {
  SIN_RETENCION: 'Sin retencion',
  EN_ENCIERRO_SIN_PAGO: 'En encierro sin pago',
  PAGADO_PENDIENTE_LIBERACION: 'Pagado por liberar',
  LIBERADO_PENDIENTE_SALIDA: 'Liberado por entregar',
  VEHICULO_ENTREGADO: 'Entregado',
};

const ESTADOS_OPERATIVOS = [
  'SIN_RETENCION',
  'EN_ENCIERRO_SIN_PAGO',
  'PAGADO_PENDIENTE_LIBERACION',
  'LIBERADO_PENDIENTE_SALIDA',
  'VEHICULO_ENTREGADO',
] as const;

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getResumen(
    query: DashboardQueryDto,
  ): Promise<DashboardResumenResponse> {
    const { whereSql, params } = this.buildFilters(query);
    const estadoCase = this.getEstadoOperativoCase('i');
    const estadoFilter = query.estadoOperativo
      ? `WHERE estado_operativo = $${params.length}`
      : '';

    const [row] = await this.dataSource.query<DashboardRawRow[]>(
      `
        WITH filtered AS (
          SELECT
            i.id_infraccion,
            i.fecha_infraccion,
            d.id_delegacion,
            d.nombre_delegacion,
            ${estadoCase} AS estado_operativo
          FROM infracciones i
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          WHERE ${whereSql}
        ),
        scoped AS (
          SELECT *
          FROM filtered
          ${estadoFilter}
        ),
        ingresos_base AS (
          SELECT
            pago.id_pago_infraccion,
            pago.fecha_pago,
            pago.monto::numeric AS monto
          FROM scoped s
          INNER JOIN pago_infraccion pago ON pago.id_infraccion = s.id_infraccion
        ),
        flujo_base AS (
          SELECT *
          FROM (VALUES
            ('SIN_RETENCION', 'Sin retencion', 1),
            ('EN_ENCIERRO_SIN_PAGO', 'En encierro sin pago', 2),
            ('PAGADO_PENDIENTE_LIBERACION', 'Pagado por liberar', 3),
            ('LIBERADO_PENDIENTE_SALIDA', 'Liberado por entregar', 4),
            ('VEHICULO_ENTREGADO', 'Entregado', 5)
          ) AS estados(estado, label, orden)
        ),
        flujo_counts AS (
          SELECT estado_operativo, COUNT(*)::int AS total
          FROM scoped
          GROUP BY estado_operativo
        ),
        dias AS (
          SELECT fecha_infraccion::date AS fecha, COUNT(*)::int AS total
          FROM scoped
          GROUP BY fecha_infraccion::date
          ORDER BY fecha_infraccion::date DESC
          LIMIT 14
        ),
        ingresos_dia AS (
          SELECT fecha_pago::date AS periodo, COALESCE(SUM(monto), 0)::numeric(14, 2) AS total
          FROM ingresos_base
          GROUP BY fecha_pago::date
          ORDER BY fecha_pago::date DESC
          LIMIT 14
        ),
        ingresos_mes AS (
          SELECT date_trunc('month', fecha_pago)::date AS periodo, COALESCE(SUM(monto), 0)::numeric(14, 2) AS total
          FROM ingresos_base
          GROUP BY date_trunc('month', fecha_pago)::date
          ORDER BY date_trunc('month', fecha_pago)::date DESC
          LIMIT 12
        ),
        ingresos_anio AS (
          SELECT date_trunc('year', fecha_pago)::date AS periodo, COALESCE(SUM(monto), 0)::numeric(14, 2) AS total
          FROM ingresos_base
          GROUP BY date_trunc('year', fecha_pago)::date
          ORDER BY date_trunc('year', fecha_pago)::date DESC
          LIMIT 6
        ),
        delegaciones AS (
          SELECT
            id_delegacion,
            COALESCE(nombre_delegacion, 'Sin delegacion') AS nombre_delegacion,
            COUNT(*)::int AS total
          FROM scoped
          GROUP BY id_delegacion, nombre_delegacion
          ORDER BY total DESC, nombre_delegacion ASC
          LIMIT 8
        ),
        encierros AS (
          SELECT
            e.id_encierro,
            COALESCE(e.nombre_encierro, 'Sin encierro') AS nombre_encierro,
            COUNT(*) FILTER (WHERE s.estado_operativo <> 'VEHICULO_ENTREGADO')::int AS total,
            COUNT(*) FILTER (WHERE s.estado_operativo = 'EN_ENCIERRO_SIN_PAGO')::int AS sin_pago,
            COUNT(*) FILTER (WHERE s.estado_operativo = 'PAGADO_PENDIENTE_LIBERACION')::int AS pagados_pendiente_liberacion,
            COUNT(*) FILTER (WHERE s.estado_operativo = 'LIBERADO_PENDIENTE_SALIDA')::int AS liberados_pendiente_salida,
            COUNT(*) FILTER (WHERE s.estado_operativo = 'VEHICULO_ENTREGADO')::int AS entregados
          FROM scoped s
          INNER JOIN retencion_vehiculo rv ON rv.id_infraccion = s.id_infraccion
          INNER JOIN encierro e ON e.id_encierro = rv.id_encierro
          GROUP BY e.id_encierro, e.nombre_encierro
          HAVING COUNT(*) FILTER (WHERE s.estado_operativo <> 'VEHICULO_ENTREGADO') > 0
             OR COUNT(*) FILTER (WHERE s.estado_operativo = 'VEHICULO_ENTREGADO') > 0
          ORDER BY total DESC, nombre_encierro ASC
          LIMIT 8
        )
        SELECT
          json_build_object(
            'totalInfracciones', (SELECT COUNT(*)::int FROM scoped),
            'totalSinRetencion', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo = 'SIN_RETENCION'),
            'totalVehiculosRetenidos', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo IN ('EN_ENCIERRO_SIN_PAGO', 'PAGADO_PENDIENTE_LIBERACION', 'LIBERADO_PENDIENTE_SALIDA')),
            'totalSinPago', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo = 'EN_ENCIERRO_SIN_PAGO'),
            'totalPagadosPendienteLiberacion', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo = 'PAGADO_PENDIENTE_LIBERACION'),
            'totalLiberadosPendienteSalida', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo = 'LIBERADO_PENDIENTE_SALIDA'),
            'totalEntregados', (SELECT COUNT(*)::int FROM scoped WHERE estado_operativo = 'VEHICULO_ENTREGADO')
          ) AS "resumen",
          json_build_object(
            'totalIngresos', COALESCE((SELECT SUM(monto) FROM ingresos_base), 0)::numeric(14, 2),
            'ingresosHoy', COALESCE((SELECT SUM(monto) FROM ingresos_base WHERE fecha_pago::date = CURRENT_DATE), 0)::numeric(14, 2),
            'ingresosMesActual', COALESCE((SELECT SUM(monto) FROM ingresos_base WHERE date_trunc('month', fecha_pago) = date_trunc('month', CURRENT_DATE)), 0)::numeric(14, 2),
            'ingresosAnioActual', COALESCE((SELECT SUM(monto) FROM ingresos_base WHERE date_trunc('year', fecha_pago) = date_trunc('year', CURRENT_DATE)), 0)::numeric(14, 2),
            'porDia', (
              SELECT COALESCE(json_agg(json_build_object(
                'periodo', ingreso_dia.periodo,
                'total', ingreso_dia.total
              ) ORDER BY ingreso_dia.periodo ASC), '[]'::json)
              FROM ingresos_dia ingreso_dia
            ),
            'porMes', (
              SELECT COALESCE(json_agg(json_build_object(
                'periodo', ingreso_mes.periodo,
                'total', ingreso_mes.total
              ) ORDER BY ingreso_mes.periodo ASC), '[]'::json)
              FROM ingresos_mes ingreso_mes
            ),
            'porAnio', (
              SELECT COALESCE(json_agg(json_build_object(
                'periodo', ingreso_anio.periodo,
                'total', ingreso_anio.total
              ) ORDER BY ingreso_anio.periodo ASC), '[]'::json)
              FROM ingresos_anio ingreso_anio
            )
          ) AS "ingresos",
          (
            SELECT COALESCE(json_agg(json_build_object(
              'estado', fb.estado,
              'label', fb.label,
              'total', COALESCE(fc.total, 0)
            ) ORDER BY fb.orden), '[]'::json)
            FROM flujo_base fb
            LEFT JOIN flujo_counts fc ON fc.estado_operativo = fb.estado
          ) AS "flujoOperativo",
          (
            SELECT COALESCE(json_agg(json_build_object(
              'fecha', dia.fecha,
              'total', dia.total
            ) ORDER BY dia.fecha ASC), '[]'::json)
            FROM dias dia
          ) AS "infraccionesPorDia",
          (
            SELECT COALESCE(json_agg(json_build_object(
              'idDelegacion', delegacion.id_delegacion,
              'nombreDelegacion', delegacion.nombre_delegacion,
              'total', delegacion.total
            ) ORDER BY delegacion.total DESC, delegacion.nombre_delegacion ASC), '[]'::json)
            FROM delegaciones delegacion
          ) AS "topDelegaciones",
          (
            SELECT COALESCE(json_agg(json_build_object(
              'idEncierro', encierro.id_encierro,
              'nombreEncierro', encierro.nombre_encierro,
              'total', encierro.total,
              'sinPago', encierro.sin_pago,
              'pagadosPendienteLiberacion', encierro.pagados_pendiente_liberacion,
              'liberadosPendienteSalida', encierro.liberados_pendiente_salida,
              'entregados', encierro.entregados
            ) ORDER BY encierro.total DESC, encierro.nombre_encierro ASC), '[]'::json)
            FROM encierros encierro
          ) AS "topEncierros"
      `,
      params,
    );

    const resumen = row?.resumen ?? this.createEmptyResumen();
    const ingresos = row?.ingresos ?? this.createEmptyIngresos();

    return {
      resumen,
      ingresos: this.normalizeIngresos(ingresos),
      flujoOperativo: this.normalizeFlujo(row?.flujoOperativo ?? []),
      infraccionesPorDia: row?.infraccionesPorDia ?? [],
      topDelegaciones: row?.topDelegaciones ?? [],
      topEncierros: row?.topEncierros ?? [],
      updatedAt: new Date().toISOString(),
    };
  }

  private buildFilters(query: DashboardQueryDto): SqlFilterParts {
    const params: unknown[] = [];
    const filters: string[] = ['1 = 1'];

    const addParam = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (query.fechaDesde) {
      filters.push(`i.fecha_infraccion >= ${addParam(query.fechaDesde)}::date`);
    }

    if (query.fechaHasta) {
      filters.push(`i.fecha_infraccion <= ${addParam(query.fechaHasta)}::date`);
    }

    if (query.idRegion) {
      filters.push(`r.id_region = ${addParam(query.idRegion)}`);
    }

    if (query.idDelegacion) {
      filters.push(`d.id_delegacion = ${addParam(query.idDelegacion)}`);
    }

    if (query.idEstatusInfraccion) {
      filters.push(
        `i.id_estatus_infraccion = ${addParam(query.idEstatusInfraccion)}`,
      );
    }

    if (query.idEncierro) {
      filters.push(`EXISTS (
        SELECT 1
        FROM retencion_vehiculo rv_filter
        WHERE rv_filter.id_infraccion = i.id_infraccion
          AND rv_filter.id_encierro = ${addParam(query.idEncierro)}
      )`);
    }

    if (query.estadoOperativo) {
      params.push(query.estadoOperativo);
    }

    return {
      whereSql: filters.join(' AND '),
      params,
    };
  }

  private getEstadoOperativoCase(alias: string): string {
    const hasRetencion = this.hasRetencionExpression(alias);
    const hasPago = this.hasPagoExpression(alias);
    const hasLiberacion = this.hasLiberacionExpression(alias);
    const hasSalida = this.hasSalidaExpression(alias);

    return `CASE
      WHEN ${hasSalida} THEN 'VEHICULO_ENTREGADO'
      WHEN NOT ${hasRetencion} THEN 'SIN_RETENCION'
      WHEN ${hasLiberacion} THEN 'LIBERADO_PENDIENTE_SALIDA'
      WHEN ${hasPago} THEN 'PAGADO_PENDIENTE_LIBERACION'
      ELSE 'EN_ENCIERRO_SIN_PAGO'
    END`;
  }

  private hasRetencionExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM retencion_vehiculo retencion_estado
      WHERE retencion_estado.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasPagoExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM pago_infraccion pago_estado
      WHERE pago_estado.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasLiberacionExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM liberacion_vehiculo liberacion_estado
      WHERE liberacion_estado.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasSalidaExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM salida_vehiculo salida_estado
      INNER JOIN retencion_vehiculo retencion_salida_estado
        ON retencion_salida_estado.id_retencion_vehiculo = salida_estado.id_retencion_vehiculo
      WHERE retencion_salida_estado.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private createEmptyResumen(): DashboardResumen {
    return {
      totalInfracciones: 0,
      totalSinRetencion: 0,
      totalVehiculosRetenidos: 0,
      totalSinPago: 0,
      totalPagadosPendienteLiberacion: 0,
      totalLiberadosPendienteSalida: 0,
      totalEntregados: 0,
    };
  }

  private createEmptyIngresos(): DashboardIngresos {
    return {
      totalIngresos: 0,
      ingresosHoy: 0,
      ingresosMesActual: 0,
      ingresosAnioActual: 0,
      porDia: [],
      porMes: [],
      porAnio: [],
    };
  }

  private normalizeFlujo(items: DashboardFlujoItem[]): DashboardFlujoItem[] {
    const itemMap = new Map(items.map((item) => [item.estado, item]));

    return ESTADOS_OPERATIVOS.map((estado) => ({
      estado,
      label: ESTADO_LABELS[estado],
      total: itemMap.get(estado)?.total ?? 0,
    }));
  }

  private normalizeIngresos(ingresos: DashboardIngresos): DashboardIngresos {
    return {
      totalIngresos: this.toNumber(ingresos.totalIngresos),
      ingresosHoy: this.toNumber(ingresos.ingresosHoy),
      ingresosMesActual: this.toNumber(ingresos.ingresosMesActual),
      ingresosAnioActual: this.toNumber(ingresos.ingresosAnioActual),
      porDia: ingresos.porDia.map((item) => ({
        periodo: item.periodo,
        total: this.toNumber(item.total),
      })),
      porMes: ingresos.porMes.map((item) => ({
        periodo: item.periodo,
        total: this.toNumber(item.total),
      })),
      porAnio: ingresos.porAnio.map((item) => ({
        periodo: item.periodo,
        total: this.toNumber(item.total),
      })),
    };
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

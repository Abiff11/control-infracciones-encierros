import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type {
  DashboardDistribucionEncierroItem,
  DashboardDistribucionEstadoOperativoItem,
  DashboardDistribucionesResponse,
  DashboardDistribucionTerritorialItem,
  DashboardEstadoOperativo,
} from './dashboard-analytics.types';
import { DashboardAnalyticsQueryDto } from './dto/dashboard-analytics-query.dto';

interface SqlFilterParts {
  whereSql: string;
  params: unknown[];
}

interface TerritorialCountRawRow {
  id: number | string;
  nombre: string;
  totalExpedientes: number | string;
  totalInfracciones: number | string;
}

interface TerritorialRevenueRawRow {
  id: number | string;
  nombre: string;
  totalIngresos: number | string;
}

interface MotivoRawRow {
  idMotivo: number | string;
  nombreMotivo: string;
  totalInfracciones: number | string;
}

interface TipoRawRow {
  idTipoProcedimiento: number | string;
  claveTipoProcedimiento: string;
  nombreTipoProcedimiento: string;
  totalExpedientes: number | string;
}

interface EncierroCountRawRow {
  idEncierro: number | string;
  nombreEncierro: string;
  totalExpedientes: number | string;
  actualmenteEnEncierro: number | string;
}

interface EncierroRevenueRawRow {
  idEncierro: number | string;
  nombreEncierro: string;
  totalIngresos: number | string;
}

interface EstadoRawRow {
  estado: DashboardEstadoOperativo;
  total: number | string;
}

interface RevenueScope {
  joinsSql: string;
  montoSql: string;
  params: unknown[];
}

const CLAVES_TIPO_INFRACCION = [
  'INFRACCION',
  'INFRACCION_SIN_RETENCION',
] as const;

const CLAVE_VEHICULO_SIN_INFRACCION = 'VEHICULO_SIN_INFRACCION';

const ESTADO_LABELS: Record<DashboardEstadoOperativo, string> = {
  SIN_RETENCION: 'Sin retencion',
  PAGADA_SIN_RETENCION: 'Pagada sin retencion',
  EN_ENCIERRO_SIN_PAGO: 'En encierro sin pago',
  PAGADO_PENDIENTE_LIBERACION: 'Pagado por liberar',
  LIBERADO_PENDIENTE_SALIDA: 'Liberado por entregar',
  VEHICULO_ENTREGADO: 'Entregado',
};

const ESTADOS_OPERATIVOS = Object.keys(
  ESTADO_LABELS,
) as DashboardEstadoOperativo[];

@Injectable()
export class DashboardDistributionsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getDistribuciones(
    query: DashboardAnalyticsQueryDto,
  ): Promise<DashboardDistribucionesResponse> {
    const infraccionFilters = this.buildFilters(query, 'infraccion', true);
    const pagoFilters = this.buildFilters(query, 'pago', false);
    const revenueScope = this.buildRevenueScope(query, pagoFilters.params);
    const tipoInfraccionSql = this.getTipoInfraccionExpression('tp');
    const estadoCase = this.getEstadoOperativoCase('i');
    const hasSalida = this.hasSalidaExpression('i');

    const [
      regionesCount,
      regionesRevenue,
      delegacionesCount,
      delegacionesRevenue,
      motivosRows,
      tiposRows,
      encierrosCount,
      encierrosRevenue,
      estadosRows,
    ] = await Promise.all([
      this.dataSource.query<TerritorialCountRawRow[]>(
        `
          SELECT
            r.id_region AS id,
            r.nombre_region AS nombre,
            COUNT(DISTINCT i.id_infraccion)::int AS "totalExpedientes",
            COUNT(DISTINCT i.id_infraccion) FILTER (
              WHERE ${tipoInfraccionSql}
            )::int AS "totalInfracciones"
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          WHERE ${infraccionFilters.whereSql}
          GROUP BY r.id_region, r.nombre_region
          ORDER BY "totalExpedientes" DESC, r.nombre_region ASC
        `,
        infraccionFilters.params,
      ),
      this.dataSource.query<TerritorialRevenueRawRow[]>(
        `
          SELECT
            r.id_region AS id,
            r.nombre_region AS nombre,
            COALESCE(SUM(${revenueScope.montoSql}), 0)::numeric(14, 2) AS "totalIngresos"
          FROM pago_infraccion p
          INNER JOIN infracciones i ON i.id_infraccion = p.id_infraccion
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          ${revenueScope.joinsSql}
          WHERE ${pagoFilters.whereSql}
          GROUP BY r.id_region, r.nombre_region
        `,
        revenueScope.params,
      ),
      this.dataSource.query<TerritorialCountRawRow[]>(
        `
          SELECT
            d.id_delegacion AS id,
            d.nombre_delegacion AS nombre,
            COUNT(DISTINCT i.id_infraccion)::int AS "totalExpedientes",
            COUNT(DISTINCT i.id_infraccion) FILTER (
              WHERE ${tipoInfraccionSql}
            )::int AS "totalInfracciones"
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          WHERE ${infraccionFilters.whereSql}
          GROUP BY d.id_delegacion, d.nombre_delegacion
          ORDER BY "totalExpedientes" DESC, d.nombre_delegacion ASC
        `,
        infraccionFilters.params,
      ),
      this.dataSource.query<TerritorialRevenueRawRow[]>(
        `
          SELECT
            d.id_delegacion AS id,
            d.nombre_delegacion AS nombre,
            COALESCE(SUM(${revenueScope.montoSql}), 0)::numeric(14, 2) AS "totalIngresos"
          FROM pago_infraccion p
          INNER JOIN infracciones i ON i.id_infraccion = p.id_infraccion
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          ${revenueScope.joinsSql}
          WHERE ${pagoFilters.whereSql}
          GROUP BY d.id_delegacion, d.nombre_delegacion
        `,
        revenueScope.params,
      ),
      this.dataSource.query<MotivoRawRow[]>(
        `
          SELECT
            m.id_motivo AS "idMotivo",
            m.nombre_motivo AS "nombreMotivo",
            COUNT(DISTINCT i.id_infraccion)::int AS "totalInfracciones"
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          INNER JOIN infraccion_motivo im
            ON im.id_infraccion = i.id_infraccion
          INNER JOIN motivo m ON m.id_motivo = im.id_motivo
          WHERE ${infraccionFilters.whereSql}
            AND ${tipoInfraccionSql}
          GROUP BY m.id_motivo, m.nombre_motivo
          ORDER BY "totalInfracciones" DESC, m.nombre_motivo ASC
        `,
        infraccionFilters.params,
      ),
      this.dataSource.query<TipoRawRow[]>(
        `
          SELECT
            tp.id_tipo_procedimiento AS "idTipoProcedimiento",
            tp.clave_tipo_procedimiento AS "claveTipoProcedimiento",
            tp.nombre_tipo_procedimiento AS "nombreTipoProcedimiento",
            COUNT(DISTINCT i.id_infraccion)::int AS "totalExpedientes"
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          WHERE ${infraccionFilters.whereSql}
          GROUP BY
            tp.id_tipo_procedimiento,
            tp.clave_tipo_procedimiento,
            tp.nombre_tipo_procedimiento
          ORDER BY "totalExpedientes" DESC, tp.nombre_tipo_procedimiento ASC
        `,
        infraccionFilters.params,
      ),
      this.dataSource.query<EncierroCountRawRow[]>(
        `
          WITH retencion_actual AS (
            SELECT DISTINCT ON (rv.id_infraccion)
              rv.id_infraccion,
              rv.id_encierro
            FROM retencion_vehiculo rv
            ORDER BY rv.id_infraccion, rv.id_retencion_vehiculo DESC
          )
          SELECT
            e.id_encierro AS "idEncierro",
            e.nombre_encierro AS "nombreEncierro",
            COUNT(DISTINCT i.id_infraccion)::int AS "totalExpedientes",
            COUNT(DISTINCT i.id_infraccion) FILTER (
              WHERE NOT ${hasSalida}
            )::int AS "actualmenteEnEncierro"
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          INNER JOIN retencion_actual ra ON ra.id_infraccion = i.id_infraccion
          INNER JOIN encierro e ON e.id_encierro = ra.id_encierro
          WHERE ${infraccionFilters.whereSql}
          GROUP BY e.id_encierro, e.nombre_encierro
          ORDER BY "actualmenteEnEncierro" DESC, e.nombre_encierro ASC
        `,
        infraccionFilters.params,
      ),
      this.dataSource.query<EncierroRevenueRawRow[]>(
        `
          WITH retencion_actual AS (
            SELECT DISTINCT ON (rv.id_infraccion)
              rv.id_infraccion,
              rv.id_encierro
            FROM retencion_vehiculo rv
            ORDER BY rv.id_infraccion, rv.id_retencion_vehiculo DESC
          )
          SELECT
            e.id_encierro AS "idEncierro",
            e.nombre_encierro AS "nombreEncierro",
            COALESCE(SUM(${revenueScope.montoSql}), 0)::numeric(14, 2) AS "totalIngresos"
          FROM pago_infraccion p
          INNER JOIN infracciones i ON i.id_infraccion = p.id_infraccion
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          INNER JOIN retencion_actual ra ON ra.id_infraccion = i.id_infraccion
          INNER JOIN encierro e ON e.id_encierro = ra.id_encierro
          ${revenueScope.joinsSql}
          WHERE ${pagoFilters.whereSql}
          GROUP BY e.id_encierro, e.nombre_encierro
        `,
        revenueScope.params,
      ),
      this.dataSource.query<EstadoRawRow[]>(
        `
          SELECT
            ${estadoCase} AS estado,
            COUNT(DISTINCT i.id_infraccion)::int AS total
          FROM infracciones i
          INNER JOIN tipo_procedimiento tp
            ON tp.id_tipo_procedimiento = i.id_tipo_procedimiento
          INNER JOIN delegacion d ON d.id_delegacion = i.id_delegacion
          INNER JOIN region r ON r.id_region = d.id_region
          WHERE ${infraccionFilters.whereSql}
          GROUP BY ${estadoCase}
        `,
        infraccionFilters.params,
      ),
    ]);

    return {
      regiones: this.mergeTerritorial(regionesCount, regionesRevenue),
      delegaciones: this.mergeTerritorial(
        delegacionesCount,
        delegacionesRevenue,
      ),
      motivos: motivosRows.map((row) => ({
        idMotivo: this.toNumber(row.idMotivo),
        nombreMotivo: row.nombreMotivo,
        totalInfracciones: this.toNumber(row.totalInfracciones),
      })),
      tiposProcedimiento: tiposRows.map((row) => ({
        idTipoProcedimiento: this.toNumber(row.idTipoProcedimiento),
        claveTipoProcedimiento: row.claveTipoProcedimiento,
        nombreTipoProcedimiento: row.nombreTipoProcedimiento,
        totalExpedientes: this.toNumber(row.totalExpedientes),
      })),
      encierros: this.mergeEncierros(encierrosCount, encierrosRevenue),
      estadosOperativos: this.normalizeEstados(estadosRows),
    };
  }

  private buildFilters(
    query: DashboardAnalyticsQueryDto,
    scope: 'infraccion' | 'pago',
    includeClaveConcepto: boolean,
  ): SqlFilterParts {
    const params: unknown[] = [];
    const filters: string[] = ['tp.es_tipo_expediente = TRUE'];
    const dateColumn =
      scope === 'pago' ? 'p.fecha_pago::date' : 'i.fecha_infraccion::date';

    const addParam = (value: unknown): string => {
      params.push(value);
      return `$${params.length}`;
    };

    if (query.fechaDesde) {
      filters.push(`${dateColumn} >= ${addParam(query.fechaDesde)}::date`);
    }

    if (query.fechaHasta) {
      filters.push(`${dateColumn} <= ${addParam(query.fechaHasta)}::date`);
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

    if (query.idTipoProcedimiento) {
      filters.push(
        `i.id_tipo_procedimiento = ${addParam(query.idTipoProcedimiento)}`,
      );
    }

    if (query.idEncierro) {
      filters.push(`EXISTS (
        SELECT 1
        FROM retencion_vehiculo rv_distribution_filter
        WHERE rv_distribution_filter.id_infraccion = i.id_infraccion
          AND rv_distribution_filter.id_encierro = ${addParam(query.idEncierro)}
      )`);
    }

    const condicion = this.getCondicionExpedienteExpression(
      query.condicionExpediente,
    );
    if (condicion) {
      filters.push(condicion);
    }

    if (query.estadoOperativo) {
      filters.push(
        `(${this.getEstadoOperativoCase('i')}) = ${addParam(query.estadoOperativo)}`,
      );
    }

    const claveConcepto = query.claveConcepto?.trim().toUpperCase();
    if (includeClaveConcepto && claveConcepto) {
      const placeholder = addParam(claveConcepto);
      filters.push(`EXISTS (
        SELECT 1
        FROM pago_infraccion pago_distribution_key
        INNER JOIN pago_concepto pc_distribution_key
          ON pc_distribution_key.id_pago_infraccion = pago_distribution_key.id_pago_infraccion
        INNER JOIN concepto_pago cp_distribution_key
          ON cp_distribution_key.id_concepto_pago = pc_distribution_key.id_concepto_pago
        WHERE pago_distribution_key.id_infraccion = i.id_infraccion
          AND cp_distribution_key.clave_concepto = ${placeholder}
      )`);
    }

    return { whereSql: filters.join(' AND '), params };
  }

  private buildRevenueScope(
    query: DashboardAnalyticsQueryDto,
    baseParams: unknown[],
  ): RevenueScope {
    const params = [...baseParams];
    const claveConcepto = query.claveConcepto?.trim().toUpperCase();

    if (!claveConcepto) {
      return {
        joinsSql: '',
        montoSql: 'p.monto::numeric',
        params,
      };
    }

    params.push(claveConcepto);
    const placeholder = `$${params.length}`;

    return {
      joinsSql: `
        INNER JOIN pago_concepto pc_distribution_revenue
          ON pc_distribution_revenue.id_pago_infraccion = p.id_pago_infraccion
        INNER JOIN concepto_pago cp_distribution_revenue
          ON cp_distribution_revenue.id_concepto_pago = pc_distribution_revenue.id_concepto_pago
         AND cp_distribution_revenue.clave_concepto = ${placeholder}
      `,
      montoSql: 'pc_distribution_revenue.monto::numeric',
      params,
    };
  }

  private getCondicionExpedienteExpression(
    condicion?: DashboardAnalyticsQueryDto['condicionExpediente'],
  ): string | null {
    if (!condicion) return null;

    const tipoInfraccion = this.getTipoInfraccionExpression('tp');
    const hasRetencion = this.hasRetencionExpression('i');

    switch (condicion) {
      case 'CON_RETENCION':
        return `(${tipoInfraccion} AND ${hasRetencion})`;
      case 'SIN_RETENCION':
        return `(${tipoInfraccion} AND NOT ${hasRetencion})`;
      case 'VEHICULO_SIN_INFRACCION':
        return `tp.clave_tipo_procedimiento = '${CLAVE_VEHICULO_SIN_INFRACCION}'`;
      default:
        return null;
    }
  }

  private getTipoInfraccionExpression(alias: string): string {
    const keys = CLAVES_TIPO_INFRACCION.map((key) => `'${key}'`).join(', ');
    return `${alias}.clave_tipo_procedimiento IN (${keys})`;
  }

  private getEstadoOperativoCase(alias: string): string {
    const hasRetencion = this.hasRetencionExpression(alias);
    const hasPago = this.hasPagoExpression(alias);
    const hasLiberacion = this.hasLiberacionExpression(alias);
    const hasSalida = this.hasSalidaExpression(alias);

    return `CASE
      WHEN ${hasSalida} THEN 'VEHICULO_ENTREGADO'
      WHEN NOT ${hasRetencion} AND ${hasPago} THEN 'PAGADA_SIN_RETENCION'
      WHEN NOT ${hasRetencion} THEN 'SIN_RETENCION'
      WHEN ${hasLiberacion} THEN 'LIBERADO_PENDIENTE_SALIDA'
      WHEN ${hasPago} THEN 'PAGADO_PENDIENTE_LIBERACION'
      ELSE 'EN_ENCIERRO_SIN_PAGO'
    END`;
  }

  private hasRetencionExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM retencion_vehiculo retencion_distribution_state
      WHERE retencion_distribution_state.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasPagoExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM pago_infraccion pago_distribution_state
      WHERE pago_distribution_state.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasLiberacionExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM liberacion_vehiculo liberacion_distribution_state
      WHERE liberacion_distribution_state.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private hasSalidaExpression(alias: string): string {
    return `EXISTS (
      SELECT 1
      FROM salida_vehiculo salida_distribution_state
      INNER JOIN retencion_vehiculo retencion_distribution_exit
        ON retencion_distribution_exit.id_retencion_vehiculo = salida_distribution_state.id_retencion_vehiculo
      WHERE retencion_distribution_exit.id_infraccion = ${alias}.id_infraccion
    )`;
  }

  private mergeTerritorial(
    counts: TerritorialCountRawRow[],
    revenues: TerritorialRevenueRawRow[],
  ): DashboardDistribucionTerritorialItem[] {
    const countMap = new Map(
      counts.map((row) => [this.toNumber(row.id), row]),
    );
    const revenueMap = new Map(
      revenues.map((row) => [this.toNumber(row.id), row]),
    );
    const ids = new Set([...countMap.keys(), ...revenueMap.keys()]);

    return Array.from(ids)
      .map((id) => {
        const count = countMap.get(id);
        const revenue = revenueMap.get(id);

        return {
          id,
          nombre: count?.nombre ?? revenue?.nombre ?? 'Sin nombre',
          totalExpedientes: this.toNumber(count?.totalExpedientes),
          totalInfracciones: this.toNumber(count?.totalInfracciones),
          totalIngresos: this.toNumber(revenue?.totalIngresos),
        };
      })
      .sort(
        (first, second) =>
          second.totalExpedientes - first.totalExpedientes ||
          second.totalIngresos - first.totalIngresos ||
          first.nombre.localeCompare(second.nombre, 'es'),
      );
  }

  private mergeEncierros(
    counts: EncierroCountRawRow[],
    revenues: EncierroRevenueRawRow[],
  ): DashboardDistribucionEncierroItem[] {
    const countMap = new Map(
      counts.map((row) => [this.toNumber(row.idEncierro), row]),
    );
    const revenueMap = new Map(
      revenues.map((row) => [this.toNumber(row.idEncierro), row]),
    );
    const ids = new Set([...countMap.keys(), ...revenueMap.keys()]);

    return Array.from(ids)
      .map((idEncierro) => {
        const count = countMap.get(idEncierro);
        const revenue = revenueMap.get(idEncierro);

        return {
          idEncierro,
          nombreEncierro:
            count?.nombreEncierro ?? revenue?.nombreEncierro ?? 'Sin encierro',
          totalExpedientes: this.toNumber(count?.totalExpedientes),
          actualmenteEnEncierro: this.toNumber(count?.actualmenteEnEncierro),
          totalIngresos: this.toNumber(revenue?.totalIngresos),
        };
      })
      .sort(
        (first, second) =>
          second.actualmenteEnEncierro - first.actualmenteEnEncierro ||
          second.totalIngresos - first.totalIngresos ||
          first.nombreEncierro.localeCompare(second.nombreEncierro, 'es'),
      );
  }

  private normalizeEstados(
    rows: EstadoRawRow[],
  ): DashboardDistribucionEstadoOperativoItem[] {
    const totals = new Map(
      rows.map((row) => [row.estado, this.toNumber(row.total)]),
    );

    return ESTADOS_OPERATIVOS.map((estado) => ({
      estado,
      label: ESTADO_LABELS[estado],
      total: totals.get(estado) ?? 0,
    }));
  }

  private toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}

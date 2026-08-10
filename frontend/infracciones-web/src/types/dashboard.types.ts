import type { EstadoOperativoVehiculo } from './infracciones.types';

export type DashboardAgrupacion = 'dia' | 'mes' | 'anio';

export type DashboardCondicionExpediente =
  | 'CON_RETENCION'
  | 'SIN_RETENCION'
  | 'VEHICULO_SIN_INFRACCION';

export interface DashboardQuery {
  fechaDesde?: string;
  fechaHasta?: string;
  idRegion?: number;
  idDelegacion?: number;
  idEstatusInfraccion?: number;
  idEncierro?: number;
  estadoOperativo?: EstadoOperativoVehiculo;
}

export interface DashboardAnalyticsQuery {
  fechaDesde?: string;
  fechaHasta?: string;
  idRegion?: number;
  idDelegacion?: number;
  idEstatusInfraccion?: number;
  idTipoProcedimiento?: number;
  idEncierro?: number;
  claveConcepto?: string;
  condicionExpediente?: DashboardCondicionExpediente;
  estadoOperativo?: EstadoOperativoVehiculo;
}

export interface DashboardTrendQuery extends DashboardAnalyticsQuery {
  agrupacion?: DashboardAgrupacion;
}

export interface DashboardResumen {
  totalInfracciones: number;
  totalSinRetencion: number;
  totalVehiculosRetenidos: number;
  totalSinPago: number;
  totalPagadosPendienteLiberacion: number;
  totalLiberadosPendienteSalida: number;
  totalEntregados: number;
}

export interface DashboardIngresoSerieItem {
  periodo: string;
  total: number;
}

export interface DashboardIngresos {
  totalIngresos: number;
  ingresosHoy: number;
  ingresosMesActual: number;
  ingresosAnioActual: number;
  porDia: DashboardIngresoSerieItem[];
  porMes: DashboardIngresoSerieItem[];
  porAnio: DashboardIngresoSerieItem[];
}

export interface DashboardFlujoItem {
  estado: EstadoOperativoVehiculo;
  label: string;
  total: number;
}

export interface DashboardDiaItem {
  fecha: string;
  total: number;
}

export interface DashboardDelegacionItem {
  idDelegacion: number | null;
  nombreDelegacion: string;
  total: number;
}

export interface DashboardEncierroItem {
  idEncierro: number | null;
  nombreEncierro: string;
  total: number;
  sinPago: number;
  pagadosPendienteLiberacion: number;
  liberadosPendienteSalida: number;
  entregados: number;
}

export interface DashboardResumenResponse {
  resumen: DashboardResumen;
  ingresos: DashboardIngresos;
  flujoOperativo: DashboardFlujoItem[];
  infraccionesPorDia: DashboardDiaItem[];
  topDelegaciones: DashboardDelegacionItem[];
  topEncierros: DashboardEncierroItem[];
  updatedAt: string;
}

export interface DashboardAnaliticaResumenResponse {
  expedientes: {
    totalExpedientes: number;
    totalInfracciones: number;
    infraccionesConRetencion: number;
    infraccionesSinRetencion: number;
    tipoInfraccionSinRetencion: number;
    vehiculosSinInfraccion: number;
    vehiculosActualmenteEnEncierro: number;
  };
  ingresos: {
    totalPagos: number;
    totalIngresos: number;
    promedioPago: number;
    ingresosConClaveIdentificada: number;
    ingresosSinDesgloseClave: number;
  };
  updatedAt: string;
}

export interface DashboardInfraccionesVariacion {
  totalInfracciones: number | null;
  conRetencion: number | null;
  sinRetencion: number | null;
  vehiculosSinInfraccion: number | null;
}

export interface DashboardInfraccionesTendenciaItem {
  periodo: string;
  totalExpedientes: number;
  totalInfracciones: number;
  conRetencion: number;
  sinRetencion: number;
  tipoInfraccionSinRetencion: number;
  vehiculosSinInfraccion: number;
  variacionVsPeriodoAnteriorPct: DashboardInfraccionesVariacion;
}

export interface DashboardInfraccionesTendenciaResponse {
  agrupacion: DashboardAgrupacion;
  series: DashboardInfraccionesTendenciaItem[];
}

export interface DashboardIngresosTendenciaItem {
  periodo: string;
  totalIngresos: number;
  totalPagos: number;
  promedioPago: number;
  variacionIngresosVsPeriodoAnteriorPct: number | null;
}

export interface DashboardIngresosTendenciaResponse {
  agrupacion: DashboardAgrupacion;
  series: DashboardIngresosTendenciaItem[];
}

export interface DashboardIngresoClaveItem {
  idConceptoPago: number;
  claveConcepto: string;
  totalPagos: number;
  monto: number;
  participacionPct: number;
}

export interface DashboardIngresosPorClaveResponse {
  totalIdentificado: number;
  claves: DashboardIngresoClaveItem[];
}

export interface DashboardDistribucionTerritorialItem {
  id: number;
  nombre: string;
  totalExpedientes: number;
  totalInfracciones: number;
  totalIngresos: number;
}

export interface DashboardDistribucionMotivoItem {
  idMotivo: number;
  nombreMotivo: string;
  totalInfracciones: number;
}

export interface DashboardDistribucionTipoItem {
  idTipoProcedimiento: number;
  claveTipoProcedimiento: string;
  nombreTipoProcedimiento: string;
  totalExpedientes: number;
}

export interface DashboardDistribucionEncierroItem {
  idEncierro: number;
  nombreEncierro: string;
  totalExpedientes: number;
  actualmenteEnEncierro: number;
  totalIngresos: number;
}

export interface DashboardDistribucionEstadoOperativoItem {
  estado: EstadoOperativoVehiculo;
  label: string;
  total: number;
}

export interface DashboardDistribucionesResponse {
  regiones: DashboardDistribucionTerritorialItem[];
  delegaciones: DashboardDistribucionTerritorialItem[];
  motivos: DashboardDistribucionMotivoItem[];
  tiposProcedimiento: DashboardDistribucionTipoItem[];
  encierros: DashboardDistribucionEncierroItem[];
  estadosOperativos: DashboardDistribucionEstadoOperativoItem[];
}

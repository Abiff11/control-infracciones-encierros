export const DASHBOARD_AGRUPACIONES = ['dia', 'mes', 'anio'] as const;
export type DashboardAgrupacion = (typeof DASHBOARD_AGRUPACIONES)[number];

export const DASHBOARD_CONDICIONES_EXPEDIENTE = [
  'CON_RETENCION',
  'SIN_RETENCION',
  'VEHICULO_SIN_INFRACCION',
] as const;
export type DashboardCondicionExpediente =
  (typeof DASHBOARD_CONDICIONES_EXPEDIENTE)[number];

export const DASHBOARD_ESTADOS_OPERATIVOS = [
  'SIN_RETENCION',
  'PAGADA_SIN_RETENCION',
  'EN_ENCIERRO_SIN_PAGO',
  'PAGADO_PENDIENTE_LIBERACION',
  'LIBERADO_PENDIENTE_SALIDA',
  'VEHICULO_ENTREGADO',
] as const;
export type DashboardEstadoOperativo =
  (typeof DASHBOARD_ESTADOS_OPERATIVOS)[number];

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
  estado: DashboardEstadoOperativo;
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

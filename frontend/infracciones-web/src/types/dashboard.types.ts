import type { EstadoOperativoVehiculo } from './infracciones.types';

export interface DashboardQuery {
  fechaDesde?: string;
  fechaHasta?: string;
  idRegion?: number;
  idDelegacion?: number;
  idEstatusInfraccion?: number;
  idEncierro?: number;
  estadoOperativo?: EstadoOperativoVehiculo;
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
  flujoOperativo: DashboardFlujoItem[];
  infraccionesPorDia: DashboardDiaItem[];
  topDelegaciones: DashboardDelegacionItem[];
  topEncierros: DashboardEncierroItem[];
  updatedAt: string;
}

import { buildQuery, request } from './apiClient';
import type {
  DashboardAnaliticaResumenResponse,
  DashboardAnalyticsQuery,
  DashboardDistribucionesResponse,
  DashboardIngresosPorClaveResponse,
  DashboardIngresosTendenciaResponse,
  DashboardInfraccionesTendenciaResponse,
  DashboardQuery,
  DashboardResumenResponse,
  DashboardTrendQuery,
} from '../../types/dashboard.types';

export function getDashboardResumen(
  token: string,
  query?: DashboardQuery,
): Promise<DashboardResumenResponse> {
  return request<DashboardResumenResponse>(
    `/dashboard/resumen${buildQuery(query)}`,
    {},
    token,
  );
}

export function getDashboardAnaliticaResumen(
  token: string,
  query?: DashboardAnalyticsQuery,
): Promise<DashboardAnaliticaResumenResponse> {
  return request<DashboardAnaliticaResumenResponse>(
    `/dashboard/analitica/resumen${buildQuery(query)}`,
    {},
    token,
  );
}

export function getDashboardInfraccionesTendencia(
  token: string,
  query?: DashboardTrendQuery,
): Promise<DashboardInfraccionesTendenciaResponse> {
  return request<DashboardInfraccionesTendenciaResponse>(
    `/dashboard/analitica/infracciones/tendencia${buildQuery(query)}`,
    {},
    token,
  );
}

export function getDashboardIngresosTendencia(
  token: string,
  query?: DashboardTrendQuery,
): Promise<DashboardIngresosTendenciaResponse> {
  return request<DashboardIngresosTendenciaResponse>(
    `/dashboard/analitica/ingresos/tendencia${buildQuery(query)}`,
    {},
    token,
  );
}

export function getDashboardIngresosPorClave(
  token: string,
  query?: DashboardAnalyticsQuery,
): Promise<DashboardIngresosPorClaveResponse> {
  return request<DashboardIngresosPorClaveResponse>(
    `/dashboard/analitica/ingresos/por-clave${buildQuery(query)}`,
    {},
    token,
  );
}

export function getDashboardDistribuciones(
  token: string,
  query?: DashboardAnalyticsQuery,
): Promise<DashboardDistribucionesResponse> {
  return request<DashboardDistribucionesResponse>(
    `/dashboard/analitica/distribuciones${buildQuery(query)}`,
    {},
    token,
  );
}

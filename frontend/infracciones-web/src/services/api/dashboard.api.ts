import { buildQuery, request } from './apiClient';
import type { DashboardQuery, DashboardResumenResponse } from '../../types/dashboard.types';

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

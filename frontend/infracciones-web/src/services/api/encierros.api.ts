import { buildQuery, request } from './apiClient';
import type {
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
  RegistrarSalidaAnticipadaPayload,
} from '../../types/operaciones.types';
import type {
  VehiculosEncierroQuery,
  VehiculosEncierroResponse,
  VehiculosEncierroResumen,
} from '../../types/encierros.types';

export function createRetencion(
  token: string,
  payload: RegistrarRetencionPayload,
): Promise<unknown> {
  return request<unknown>(
    '/encierros/retenciones',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function createSalida(
  token: string,
  payload: RegistrarSalidaPayload,
): Promise<unknown> {
  return request<unknown>(
    '/encierros/salidas',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function createSalidaAnticipada(
  token: string,
  payload: RegistrarSalidaAnticipadaPayload,
): Promise<unknown> {
  return request<unknown>(
    '/encierros/salidas/anticipadas',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

export interface ObservacionPendienteItem {
  idObservacion: number;
  idInfraccion: number;
  folioInfraccion: string;
  placas: string | null;
  campoObservado: 'COLOR' | 'ANIO_MODELO';
  valorOriginal: string;
  valorReportado: string;
  motivoReporte: string;
  referenciaEvidencia: string;
  nombreUsuarioReporta: string;
  fechaReporte: string;
  estatus: 'PENDIENTE';
}

export interface ObservacionesPendientesResponse {
  data: ObservacionPendienteItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function getObservacionesPendientes(
  token: string,
  page = 1,
  limit = 20,
  idInfraccion?: number,
): Promise<ObservacionesPendientesResponse> {
  return request<ObservacionesPendientesResponse>(
    `/encierros/observaciones/pendientes${buildQuery({ page, limit, idInfraccion })}`,
    {},
    token,
  );
}

export type DecisionObservacion = 'CORREGIR' | 'RECHAZAR';

export interface ResolverObservacionPayload {
  decision: DecisionObservacion;
  resolucion: string;
}

export interface ResolverObservacionResponse {
  idObservacion: number;
  idInfraccion: number;
  campoObservado: ObservacionPendienteItem['campoObservado'];
  estatus: 'CORREGIDA' | 'RECHAZADA';
  resolucion: string;
  fechaResolucion: string;
  valorAnterior: string | null;
  valorPosterior: string | null;
}

export function resolverObservacion(
  token: string,
  idObservacion: number,
  payload: ResolverObservacionPayload,
): Promise<ResolverObservacionResponse> {
  return request<ResolverObservacionResponse>(
    '/encierros/observaciones/' + idObservacion,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  );
}

export function getVehiculosEnEncierro(
  token: string,
  query?: VehiculosEncierroQuery,
): Promise<VehiculosEncierroResponse> {
  return request<VehiculosEncierroResponse>(
    `/encierros/vehiculos${buildQuery(query)}`,
    {},
    token,
  );
}

export function getVehiculosEnEncierroResumen(
  token: string,
  query?: VehiculosEncierroQuery,
): Promise<VehiculosEncierroResumen> {
  return request<VehiculosEncierroResumen>(
    `/encierros/vehiculos/resumen${buildQuery(query)}`,
    {},
    token,
  );
}

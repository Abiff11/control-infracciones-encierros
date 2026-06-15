import { buildQuery, request } from './apiClient';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionDetalleResponse,
  InfraccionFlujoResponse,
  InfraccionesQuery,
  InfraccionesResponse,
} from '../../types/infracciones.types';

const DEFAULT_INFRACCIONES_LIMIT = 30;
const LEGACY_INFRACCIONES_LIMIT = 10;

function normalizeInfraccionesQuery(query?: InfraccionesQuery): InfraccionesQuery {
  const limit = query?.limit;

  return {
    ...query,
    limit:
      limit === undefined || limit === LEGACY_INFRACCIONES_LIMIT
        ? DEFAULT_INFRACCIONES_LIMIT
        : limit,
  };
}

export function getInfracciones(
  token: string,
  query?: InfraccionesQuery,
): Promise<InfraccionesResponse> {
  return request<InfraccionesResponse>(
    `/infracciones${buildQuery(normalizeInfraccionesQuery(query))}`,
    {},
    token,
  );
}

export function getInfraccionFlujo(
  token: string,
  folioInfraccion: string,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    `/infracciones/${encodeURIComponent(folioInfraccion)}/flujo`,
    {},
    token,
  );
}

export function getInfraccionDetalle(
  token: string,
  idInfraccion: number,
): Promise<InfraccionDetalleResponse> {
  return request<InfraccionDetalleResponse>(
    `/infracciones/${idInfraccion}/detalle`,
    {},
    token,
  );
}

export function createInfraccion(
  token: string,
  payload: CreateInfraccionCompletaPayload,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    '/infracciones',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

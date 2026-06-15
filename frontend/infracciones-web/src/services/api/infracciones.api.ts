import { buildQuery, request } from './apiClient';
import type {
  CreateInfraccionCompletaPayload,
  InfraccionFlujoResponse,
  InfraccionesQuery,
  InfraccionesResponse,
} from '../../types/infracciones.types';

export function getInfracciones(
  token: string,
  query?: InfraccionesQuery,
): Promise<InfraccionesResponse> {
  return request<InfraccionesResponse>(
    `/infracciones${buildQuery(query)}`,
    {},
    token,
  );
}

export function getInfraccionFlujo(
  token: string,
  idInfraccion: number,
): Promise<InfraccionFlujoResponse> {
  return request<InfraccionFlujoResponse>(
    `/infracciones/${idInfraccion}/flujo`,
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

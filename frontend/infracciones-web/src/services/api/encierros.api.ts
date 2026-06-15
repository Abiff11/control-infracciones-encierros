import { buildQuery, request } from './apiClient';
import type {
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
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

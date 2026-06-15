import { request } from './apiClient';
import type {
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from '../../types/operaciones.types';

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

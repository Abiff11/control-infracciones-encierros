import { request } from './apiClient';
import type { RegistrarPagoPayload } from '../../types/operaciones.types';

export function createPago(
  token: string,
  payload: RegistrarPagoPayload,
): Promise<unknown> {
  return request<unknown>(
    '/pagos',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

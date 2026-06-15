import { request } from './apiClient';
import type { GenerarLiberacionPayload } from '../../types/operaciones.types';

export function createLiberacion(
  token: string,
  payload: GenerarLiberacionPayload,
): Promise<unknown> {
  return request<unknown>(
    '/liberaciones',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
}

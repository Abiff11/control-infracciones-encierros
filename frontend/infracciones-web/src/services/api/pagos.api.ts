import { request } from './apiClient';
import type {
  ConceptoPagoOption,
  RegistrarPagoPayload,
} from '../../types/operaciones.types';

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

export function findConceptosPago(
  token: string,
  query: string,
  limit = 10,
): Promise<ConceptoPagoOption[]> {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();

  if (normalizedQuery) {
    params.set('q', normalizedQuery);
  }
  params.set('limit', String(limit));

  return request<ConceptoPagoOption[]>(
    `/pagos/conceptos?${params.toString()}`,
    { method: 'GET' },
    token,
  );
}

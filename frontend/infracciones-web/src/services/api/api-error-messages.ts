export const RATE_LIMIT_MESSAGE =
  'Se alcanzó temporalmente el límite de solicitudes. Espera un momento e intenta nuevamente.';

export function normalizeApiErrorMessage(
  status: number | undefined,
  message: string,
): string {
  return status === 429 ? RATE_LIMIT_MESSAGE : message;
}

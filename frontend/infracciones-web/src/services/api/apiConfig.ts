const DEFAULT_API_URL = '/api';

function normalizeApiUrl(value: string | undefined): string {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return DEFAULT_API_URL;
  }

  if (configuredValue.startsWith('/')) {
    return configuredValue.replace(/\/+$/u, '') || DEFAULT_API_URL;
  }

  return configuredValue.replace(/\/+$/u, '');
}

export const apiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const swaggerUrl = `${apiUrl}/docs`;

const DEFAULT_API_URL = '/api';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function alignLocalApiHostname(value: string): string {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return value;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const configuredUrl = new URL(value);
    const browserHostname = window.location.hostname;

    if (
      LOCAL_HOSTNAMES.has(configuredUrl.hostname) &&
      LOCAL_HOSTNAMES.has(browserHostname) &&
      configuredUrl.hostname !== browserHostname
    ) {
      configuredUrl.hostname = browserHostname;
      return configuredUrl.toString().replace(/\/$/u, '');
    }
  } catch {
    return value;
  }

  return value;
}

function normalizeApiUrl(value: string | undefined): string {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return DEFAULT_API_URL;
  }

  if (configuredValue.startsWith('/')) {
    return configuredValue.replace(/\/+$/u, '') || DEFAULT_API_URL;
  }

  const normalized = configuredValue.replace(/\/+$/u, '');
  return alignLocalApiHostname(normalized);
}

export const apiUrl = normalizeApiUrl(import.meta.env.VITE_API_URL);
export const swaggerUrl = `${apiUrl}/docs`;

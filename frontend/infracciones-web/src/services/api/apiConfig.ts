const DEFAULT_API_URL = '/api';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

interface ApiUrlContext {
  isDev: boolean;
  browserHostname: string | null;
}

function alignLocalApiHostname(value: string, context: ApiUrlContext): string {
  if (!context.isDev || !context.browserHostname || value.startsWith('/')) {
    return value;
  }

  try {
    const configuredUrl = new URL(value);

    if (
      LOCAL_HOSTNAMES.has(configuredUrl.hostname) &&
      LOCAL_HOSTNAMES.has(context.browserHostname) &&
      configuredUrl.hostname !== context.browserHostname
    ) {
      configuredUrl.hostname = context.browserHostname;
      return configuredUrl.toString().replace(/\/$/u, '');
    }
  } catch {
    return value;
  }

  return value;
}

export function resolveApiUrl(
  value: string | undefined,
  context: ApiUrlContext,
): string {
  const configuredValue = value?.trim();

  if (!configuredValue) {
    return DEFAULT_API_URL;
  }

  if (configuredValue.startsWith('/')) {
    return configuredValue.replace(/\/+$/u, '') || DEFAULT_API_URL;
  }

  const normalized = configuredValue.replace(/\/+$/u, '');
  return alignLocalApiHostname(normalized, context);
}

const browserHostname =
  typeof window === 'undefined' ? null : window.location.hostname;

export const apiUrl = resolveApiUrl(import.meta.env.VITE_API_URL, {
  isDev: import.meta.env.DEV,
  browserHostname,
});
export const swaggerUrl = `${apiUrl}/docs`;

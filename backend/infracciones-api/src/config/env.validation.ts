type EnvRecord = Record<string, unknown>;

const PRODUCTION_REQUIRED_KEYS = ['JWT_SECRET', 'CORS_ORIGIN'] as const;

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
] as const;

function getString(config: EnvRecord, key: string): string | undefined {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : undefined;
}

function parseNumber(
  config: EnvRecord,
  key: string,
  fallback: number,
  min: number,
  max: number,
  errors: string[],
): string {
  const rawValue = getString(config, key);

  if (!rawValue) {
    return String(fallback);
  }

  const parsedValue = Number(rawValue);

  if (
    !Number.isInteger(parsedValue) ||
    parsedValue < min ||
    parsedValue > max
  ) {
    errors.push(`${key} debe ser un entero entre ${min} y ${max}.`);
    return String(fallback);
  }

  return String(parsedValue);
}

function parseBoolean(
  config: EnvRecord,
  key: string,
  fallback: boolean,
  errors: string[],
): string {
  const rawValue = getString(config, key);

  if (!rawValue) {
    return String(fallback);
  }

  if (['true', 'false'].includes(rawValue.toLowerCase())) {
    return rawValue.toLowerCase();
  }

  errors.push(`${key} debe ser true o false.`);
  return String(fallback);
}

function hasPlaceholderValue(value: string | undefined): boolean {
  if (!value) {
    return true;
  }

  return value.toLowerCase().includes('change_me');
}

export function validateEnv(config: EnvRecord): EnvRecord {
  const errors: string[] = [];
  const nodeEnv = getString(config, 'NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';

  for (const key of REQUIRED_KEYS) {
    if (!getString(config, key)) {
      errors.push(`${key} es obligatorio.`);
    }
  }

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (!getString(config, key)) {
        errors.push(`${key} es obligatorio en produccion.`);
      }
    }

    if (hasPlaceholderValue(getString(config, 'JWT_SECRET'))) {
      errors.push('JWT_SECRET debe cambiarse en produccion.');
    }

    if (hasPlaceholderValue(getString(config, 'DB_PASSWORD'))) {
      errors.push('DB_PASSWORD debe cambiarse en produccion.');
    }

    if (getString(config, 'DB_SYNCHRONIZE')?.toLowerCase() === 'true') {
      errors.push(
        'DB_SYNCHRONIZE no puede ser true en produccion. Usa migraciones.',
      );
    }
  }

  const validatedConfig: EnvRecord = {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: parseNumber(config, 'PORT', 3000, 1, 65535, errors),
    DB_PORT: parseNumber(config, 'DB_PORT', 5432, 1, 65535, errors),
    DB_SYNCHRONIZE: parseBoolean(config, 'DB_SYNCHRONIZE', false, errors),
    DB_LOGGING: parseBoolean(config, 'DB_LOGGING', false, errors),
    DB_MAX_QUERY_EXECUTION_TIME: parseNumber(
      config,
      'DB_MAX_QUERY_EXECUTION_TIME',
      500,
      0,
      60000,
      errors,
    ),
  };

  if (errors.length > 0) {
    throw new Error(
      `Variables de entorno invalidas:\n- ${errors.join('\n- ')}`,
    );
  }

  return validatedConfig;
}

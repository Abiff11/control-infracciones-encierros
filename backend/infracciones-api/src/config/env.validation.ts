type EnvRecord = Record<string, unknown>;

const PRODUCTION_REQUIRED_KEYS = [
  'JWT_SECRET',
  'CSRF_SECRET',
  'CORS_ORIGIN',
] as const;

const REQUIRED_KEYS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USERNAME',
  'DB_PASSWORD',
  'DB_DATABASE',
] as const;

const SECRET_PLACEHOLDER_PATTERNS = [
  'change_me',
  'changeme',
  'no_subir',
  'placeholder',
  'password_real',
  'secret_real',
  'secreto_real',
  'minimo_32',
  'min_32',
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

  const normalizedValue = value.toLowerCase();
  return SECRET_PLACEHOLDER_PATTERNS.some((pattern) =>
    normalizedValue.includes(pattern),
  );
}

function validateProductionSecret(
  key: string,
  value: string | undefined,
  minLength: number,
  errors: string[],
): void {
  if (hasPlaceholderValue(value)) {
    errors.push(`${key} debe definirse con un valor real en produccion.`);
    return;
  }

  if ((value?.length ?? 0) < minLength) {
    errors.push(
      `${key} debe tener al menos ${minLength} caracteres en produccion.`,
    );
  }
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

    validateProductionSecret(
      'JWT_SECRET',
      getString(config, 'JWT_SECRET'),
      32,
      errors,
    );
    validateProductionSecret(
      'CSRF_SECRET',
      getString(config, 'CSRF_SECRET'),
      32,
      errors,
    );
    validateProductionSecret(
      'DB_PASSWORD',
      getString(config, 'DB_PASSWORD'),
      12,
      errors,
    );

    if (getString(config, 'CSRF_SECRET') === getString(config, 'JWT_SECRET')) {
      errors.push('CSRF_SECRET debe ser distinto de JWT_SECRET en produccion.');
    }

    const configuredOrigins = [
      getString(config, 'FRONTEND_ORIGINS'),
      getString(config, 'CORS_ORIGIN'),
    ]
      .filter(Boolean)
      .flatMap((value) => value?.split(',') ?? [])
      .map((value) => value.trim());

    if (configuredOrigins.some((origin) => origin === '*')) {
      errors.push('CORS no puede usar * como origen permitido en produccion.');
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
    ENABLE_EXCEL_IMPORT: parseBoolean(
      config,
      'ENABLE_EXCEL_IMPORT',
      false,
      errors,
    ),
    DB_MAX_QUERY_EXECUTION_TIME: parseNumber(
      config,
      'DB_MAX_QUERY_EXECUTION_TIME',
      500,
      0,
      60000,
      errors,
    ),
    DB_POOL_MAX: parseNumber(config, 'DB_POOL_MAX', 20, 1, 200, errors),
    DB_POOL_IDLE_TIMEOUT_MS: parseNumber(
      config,
      'DB_POOL_IDLE_TIMEOUT_MS',
      30000,
      1000,
      600000,
      errors,
    ),
    DB_POOL_CONNECTION_TIMEOUT_MS: parseNumber(
      config,
      'DB_POOL_CONNECTION_TIMEOUT_MS',
      5000,
      500,
      60000,
      errors,
    ),
    CACHE_QUERY_ENABLED: parseBoolean(
      config,
      'CACHE_QUERY_ENABLED',
      false,
      errors,
    ),
    CACHE_QUERY_DURATION_MS: parseNumber(
      config,
      'CACHE_QUERY_DURATION_MS',
      30000,
      1000,
      3600000,
      errors,
    ),
    LOGIN_RATE_LIMIT_WINDOW_MS: parseNumber(
      config,
      'LOGIN_RATE_LIMIT_WINDOW_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: parseNumber(
      config,
      'LOGIN_RATE_LIMIT_MAX_ATTEMPTS',
      10,
      1,
      1000,
      errors,
    ),
    AUTH_MAX_FAILED_ATTEMPTS: parseNumber(
      config,
      'AUTH_MAX_FAILED_ATTEMPTS',
      5,
      1,
      100,
      errors,
    ),
    AUTH_LOCK_MINUTES: parseNumber(
      config,
      'AUTH_LOCK_MINUTES',
      15,
      1,
      1440,
      errors,
    ),
    REFRESH_TOKEN_EXPIRES_IN_MINUTES: parseNumber(
      config,
      'REFRESH_TOKEN_EXPIRES_IN_MINUTES',
      60,
      1,
      43200,
      errors,
    ),
    THROTTLE_DEFAULT_TTL_MS: parseNumber(
      config,
      'THROTTLE_DEFAULT_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_DEFAULT_LIMIT: parseNumber(
      config,
      'THROTTLE_DEFAULT_LIMIT',
      120,
      1,
      100000,
      errors,
    ),
    THROTTLE_READ_TTL_MS: parseNumber(
      config,
      'THROTTLE_READ_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_READ_LIMIT: parseNumber(
      config,
      'THROTTLE_READ_LIMIT',
      240,
      1,
      100000,
      errors,
    ),
    THROTTLE_WRITE_TTL_MS: parseNumber(
      config,
      'THROTTLE_WRITE_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_WRITE_LIMIT: parseNumber(
      config,
      'THROTTLE_WRITE_LIMIT',
      80,
      1,
      100000,
      errors,
    ),
    THROTTLE_AUTH_TTL_MS: parseNumber(
      config,
      'THROTTLE_AUTH_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_AUTH_LIMIT: parseNumber(
      config,
      'THROTTLE_AUTH_LIMIT',
      20,
      1,
      100000,
      errors,
    ),
    THROTTLE_REFRESH_TTL_MS: parseNumber(
      config,
      'THROTTLE_REFRESH_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_REFRESH_LIMIT: parseNumber(
      config,
      'THROTTLE_REFRESH_LIMIT',
      60,
      1,
      100000,
      errors,
    ),
    THROTTLE_REPORT_TTL_MS: parseNumber(
      config,
      'THROTTLE_REPORT_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_REPORT_LIMIT: parseNumber(
      config,
      'THROTTLE_REPORT_LIMIT',
      20,
      1,
      100000,
      errors,
    ),
    THROTTLE_IMPORT_TTL_MS: parseNumber(
      config,
      'THROTTLE_IMPORT_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_IMPORT_LIMIT: parseNumber(
      config,
      'THROTTLE_IMPORT_LIMIT',
      5,
      1,
      100000,
      errors,
    ),
    THROTTLE_UPLOAD_TTL_MS: parseNumber(
      config,
      'THROTTLE_UPLOAD_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_UPLOAD_LIMIT: parseNumber(
      config,
      'THROTTLE_UPLOAD_LIMIT',
      5,
      1,
      100000,
      errors,
    ),
    THROTTLE_SEARCH_TTL_MS: parseNumber(
      config,
      'THROTTLE_SEARCH_TTL_MS',
      60000,
      1000,
      3600000,
      errors,
    ),
    THROTTLE_SEARCH_LIMIT: parseNumber(
      config,
      'THROTTLE_SEARCH_LIMIT',
      60,
      1,
      100000,
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

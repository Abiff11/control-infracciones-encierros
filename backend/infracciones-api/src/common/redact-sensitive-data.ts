const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'accesstoken',
  'authorization',
  'cookie',
  'licencia',
  'telefono',
  'domicilio',
  'curp',
  'rfc',
  'serie',
  'motor',
  'placas',
]);

export function sanitizeAuditPayload<T>(value: T): T {
  return redactKeys(value, new WeakSet<object>()) as T;
}

export function redactOperationalSensitiveData<T>(value: T): T {
  return redactKeys(value, new WeakSet<object>()) as T;
}

function redactKeys(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactKeys(item, seen));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) {
    return '[CIRCULAR]';
  }

  seen.add(value);

  const output: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (isSensitiveKey(key)) {
      output[key] = REDACTED_VALUE;
      continue;
    }

    output[key] = redactKeys(nestedValue, seen);
  }

  return output;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9_]/gu, '');
  return SENSITIVE_KEYS.has(normalized);
}

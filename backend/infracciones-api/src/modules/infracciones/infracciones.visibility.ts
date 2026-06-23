const REDACTED_VALUE = '[REDACTED]';

const FULL_REDACT_KEYS = new Set([
  'licencia',
  'telefono',
  'domicilio',
  'serie',
  'motor',
  'curp',
  'rfc',
]);

function maskPlates(value: string): string {
  const normalized = value.trim();

  if (normalized.length <= 4) {
    return REDACTED_VALUE;
  }

  const suffix = normalized.slice(-4);
  return `${REDACTED_VALUE}${suffix}`;
}

export function redactOperationalSensitiveDataForConsulta<T>(value: T): T {
  return redactValue(value, new WeakSet<object>()) as T;
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen));
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
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/gu, '');

    if (normalizedKey === 'placas') {
      output[key] =
        typeof nestedValue === 'string'
          ? maskPlates(nestedValue)
          : REDACTED_VALUE;
      continue;
    }

    if (FULL_REDACT_KEYS.has(normalizedKey)) {
      output[key] = REDACTED_VALUE;
      continue;
    }

    output[key] = redactValue(nestedValue, seen);
  }

  return output;
}

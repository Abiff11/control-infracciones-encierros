export function getResponseText(
  value: unknown,
  key: string,
): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = (value as Record<string, unknown>)[key];

  if (typeof candidate === 'string' && candidate.trim() !== '') {
    return candidate;
  }

  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return String(candidate);
  }

  return null;
}

import type { ReactNode } from 'react';

const EMPTY_LABEL = 'Sin informacion registrada';

export function formatEmptyValue(value: string | null | undefined): string {
  return value?.trim() || EMPTY_LABEL;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_LABEL;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_LABEL;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(parsed);
}

export function formatTimeOfDay(value: string | null | undefined): string {
  if (!value) {
    return EMPTY_LABEL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return EMPTY_LABEL;
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    return `${trimmed.padStart(2, '0')}:00:00`;
  }

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes}:00`;
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes, seconds] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes}:${seconds}`;
  }

  return trimmed;
}

export function formatCurrencyMxn(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return EMPTY_LABEL;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(numericValue);
}

export function formatFullName(parts: Array<string | null | undefined>): string {
  const filtered = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));

  if (filtered.length === 0) {
    return EMPTY_LABEL;
  }

  return filtered.join(' ');
}

export function formatTabValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === '') {
    return EMPTY_LABEL;
  }

  return value;
}

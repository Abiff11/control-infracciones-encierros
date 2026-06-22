import type { ReactNode } from 'react';

const EMPTY_LABEL = 'Sin informacion registrada';
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
  hour12: true,
});
const TIME_OF_DAY_FORMAT = new Intl.DateTimeFormat('es-MX', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function buildTimeDate(value: string): Date | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{1,2}$/.test(trimmed)) {
    const hours = Number(trimmed);
    return new Date(2000, 0, 1, hours, 0, 0);
  }

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':').map(Number);
    return new Date(2000, 0, 1, hours, minutes, 0);
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes, seconds] = trimmed.split(':').map(Number);
    return new Date(2000, 0, 1, hours, minutes, seconds);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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

  return DATE_TIME_FORMAT.format(parsed);
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

  const parsed = buildTimeDate(value);
  if (!parsed) {
    return EMPTY_LABEL;
  }

  return TIME_OF_DAY_FORMAT.format(parsed);
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

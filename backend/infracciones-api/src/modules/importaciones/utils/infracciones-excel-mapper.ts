import { type ParsedInfraccionesExcelRow } from './excel-infracciones-parser';

export enum RowIssueType {
  ERROR = 'ERROR',
  ADVERTENCIA = 'ADVERTENCIA',
}

export interface RowIssue {
  tipo: RowIssueType;
  campo: string;
  valor: string | null;
  mensaje: string;
}

export interface NormalizedInfraccionesExcelRow {
  numeroFila: number;
  rawRow: Record<string, unknown>;
  delegacion: string | null;
  folioInfraccion: string | null;
  dia: number | null;
  mes: number | null;
  anio: number | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  nombres: string | null;
  sexo: string | null;
  licencia: string | null;
  servicio: string | null;
  clase: string | null;
  tipo: string | null;
  marca: string | null;
  modelo: number | null;
  color: string | null;
  placas: string | null;
  estado: string | null;
  serie: string | null;
  motor: string | null;
  municipio: string | null;
  colonia: string | null;
  calle: string | null;
  hora: string;
  motivos: string[];
  soloInfraccionOVehiculoDetenido: string | null;
  encierro: string | null;
  observaciones: string | null;
  clavePolicia: string | null;
  numParteInformativo: string | null;
  operativo: string | null;
  sitioServicioPublico: string | null;
  fechaInfraccion: string | null;
  issues: RowIssue[];
}

function removeDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toCellText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return '';
}

export function normalizeText(value: unknown): string | null {
  const normalized = toCellText(value).trim();
  return normalized === '' ? null : normalized;
}

export function normalizeCatalogText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? removeDiacritics(normalized).toUpperCase() : null;
}

export function normalizeSexoText(value: unknown): string | null {
  return normalizeCatalogText(value);
}

export function normalizeServicioText(value: unknown): string | null {
  const normalized = normalizeCatalogText(value);

  if (!normalized) {
    return null;
  }

  if (normalized === 'PART.') {
    return 'PARTICULAR';
  }

  if (normalized === 'PUB.') {
    return 'PUBLICO';
  }

  return normalized;
}

export function normalizeClaseVehiculoText(value: unknown): string | null {
  const normalized = normalizeCatalogText(value);

  if (!normalized) {
    return null;
  }

  if (normalized === 'AUT.') {
    return 'AUTOMOVIL';
  }

  if (normalized === 'MOT.') {
    return 'MOTOCICLETA';
  }

  if (normalized === 'CTA.') {
    return 'CAMIONETA';
  }

  if (normalized === 'CAMION') {
    return 'CAMION';
  }

  return normalized;
}

export function normalizeCatalogKey(value: unknown): string | null {
  const normalized = normalizeCatalogText(value);
  return normalized ? normalized.replace(/\s+/g, ' ') : null;
}

export function normalizeMotivoKey(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toUpperCase() : null;
}

export function parseExcelTime(value: unknown): {
  hora: string;
  warning: string | null;
} {
  const text = toCellText(value).trim();

  if (!text) {
    return {
      hora: '00:00:00',
      warning: null,
    };
  }

  if (typeof value === 'number') {
    if (value >= 0 && value < 1) {
      const totalSeconds = Math.round(value * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600) % 24;
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return {
        hora: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        warning: null,
      };
    }

    const normalizedHours = ((value % 24) + 24) % 24;
    const totalSeconds = Math.round(normalizedHours * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hora: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      warning: null,
    };
  }

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
    const [hours, minutes, seconds] = text.split(':');
    return {
      hora: `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${String(seconds ?? '00').padStart(2, '0')}`,
      warning: null,
    };
  }

  const numericGroups = text.match(/\d+/g);

  if (numericGroups?.length === 1 && /^\d+$/.test(text)) {
    const hours = Number(numericGroups[0]) % 24;
    return {
      hora: `${String(hours).padStart(2, '0')}:00:00`,
      warning: null,
    };
  }

  if (/^\d+(?:[.,]\d+)?$/.test(text)) {
    const hoursValue = Number(text.replace(',', '.'));
    const normalizedHours = ((hoursValue % 24) + 24) % 24;
    const totalSeconds = Math.round(normalizedHours * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      hora: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      warning: null,
    };
  }

  if (numericGroups && numericGroups.length >= 2) {
    const hours = Number(numericGroups[0]) % 24;
    const minutes = Number(numericGroups[1]) % 60;
    const seconds = numericGroups[2] ? Number(numericGroups[2]) % 60 : 0;

    return {
      hora: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      warning: null,
    };
  }

  return {
    hora: '00:00:00',
    warning: null,
  };
}

export function buildDateFromParts(
  day: unknown,
  month: unknown,
  year: unknown,
): { fecha: string | null; issue: RowIssue | null } {
  const dayValue = Number(day);
  const monthValue = Number(month);
  const yearValue = Number(year);

  if (
    !Number.isInteger(dayValue) ||
    !Number.isInteger(monthValue) ||
    !Number.isInteger(yearValue)
  ) {
    return {
      fecha: null,
      issue: {
        tipo: RowIssueType.ERROR,
        campo: 'fecha',
        valor: `${normalizeText(day) ?? ''}-${normalizeText(month) ?? ''}-${normalizeText(year) ?? ''}`,
        mensaje: 'La fecha no tiene dia, mes o anio validos.',
      },
    };
  }

  const fecha = new Date(Date.UTC(yearValue, monthValue - 1, dayValue));

  if (
    fecha.getUTCFullYear() !== yearValue ||
    fecha.getUTCMonth() !== monthValue - 1 ||
    fecha.getUTCDate() !== dayValue
  ) {
    return {
      fecha: null,
      issue: {
        tipo: RowIssueType.ERROR,
        campo: 'fecha',
        valor: `${String(dayValue)}-${String(monthValue)}-${String(yearValue)}`,
        mensaje: 'La fecha construida no es valida.',
      },
    };
  }

  return {
    fecha: fecha.toISOString().slice(0, 10),
    issue: null,
  };
}

export function extractFolioResguardo(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const match = value.match(/(?:RESGUARDO|RESG\.?)\s*[:.-]?\s*([A-Z0-9-]+)/i);

  return match ? match[1].toUpperCase() : null;
}

function getCellValue(values: unknown[], index: number): unknown {
  return values[index] ?? null;
}

function pushIssue(
  issues: RowIssue[],
  tipo: RowIssueType,
  campo: string,
  valor: string | null,
  mensaje: string,
): void {
  issues.push({ tipo, campo, valor, mensaje });
}

export function mapInfraccionesExcelRow(
  row: ParsedInfraccionesExcelRow,
  expectedYear: number,
): NormalizedInfraccionesExcelRow {
  const issues: RowIssue[] = [];

  const hora = parseExcelTime(getCellValue(row.values, 23));
  if (hora.warning) {
    pushIssue(
      issues,
      RowIssueType.ADVERTENCIA,
      'hora',
      normalizeText(getCellValue(row.values, 23)),
      hora.warning,
    );
  }

  const dateResult = buildDateFromParts(
    getCellValue(row.values, 2),
    getCellValue(row.values, 3),
    getCellValue(row.values, 4),
  );

  if (dateResult.issue) {
    issues.push(dateResult.issue);
  } else if (Number(getCellValue(row.values, 4)) !== expectedYear) {
    pushIssue(
      issues,
      RowIssueType.ERROR,
      'anio',
      normalizeText(getCellValue(row.values, 4)),
      `El anio de la fila no coincide con el solicitado (${expectedYear}).`,
    );
  }

  const motivos = [24, 25, 26, 27, 28]
    .map((index) => normalizeMotivoKey(getCellValue(row.values, index)))
    .filter((value): value is string => Boolean(value));

  return {
    numeroFila: row.numeroFila,
    rawRow: row.rawRow,
    delegacion: normalizeCatalogText(getCellValue(row.values, 0)),
    folioInfraccion: normalizeCatalogText(getCellValue(row.values, 1)),
    dia: Number.isFinite(Number(getCellValue(row.values, 2)))
      ? Number(getCellValue(row.values, 2))
      : null,
    mes: Number.isFinite(Number(getCellValue(row.values, 3)))
      ? Number(getCellValue(row.values, 3))
      : null,
    anio: Number.isFinite(Number(getCellValue(row.values, 4)))
      ? Number(getCellValue(row.values, 4))
      : null,
    apellidoPaterno: normalizeCatalogText(getCellValue(row.values, 5)),
    apellidoMaterno: normalizeCatalogText(getCellValue(row.values, 6)),
    nombres: normalizeCatalogText(getCellValue(row.values, 7)),
    sexo: normalizeSexoText(getCellValue(row.values, 8)),
    licencia: normalizeCatalogText(getCellValue(row.values, 9)),
    servicio: normalizeServicioText(getCellValue(row.values, 10)),
    clase: normalizeClaseVehiculoText(getCellValue(row.values, 11)),
    tipo: normalizeCatalogText(getCellValue(row.values, 12)),
    marca: normalizeCatalogText(getCellValue(row.values, 13)),
    modelo: Number.isFinite(Number(getCellValue(row.values, 14)))
      ? Number(getCellValue(row.values, 14))
      : null,
    color: normalizeCatalogText(getCellValue(row.values, 15)),
    placas: normalizeCatalogText(getCellValue(row.values, 16)),
    estado: normalizeCatalogText(getCellValue(row.values, 17)),
    serie: normalizeCatalogText(getCellValue(row.values, 18)),
    motor: normalizeCatalogText(getCellValue(row.values, 19)),
    municipio: normalizeCatalogText(getCellValue(row.values, 20)),
    colonia: normalizeCatalogText(getCellValue(row.values, 21)),
    calle: normalizeCatalogText(getCellValue(row.values, 22)),
    hora: hora.hora,
    motivos,
    soloInfraccionOVehiculoDetenido: normalizeCatalogText(
      getCellValue(row.values, 29),
    ),
    encierro: normalizeCatalogText(getCellValue(row.values, 30)),
    observaciones: normalizeText(getCellValue(row.values, 31)),
    clavePolicia: normalizeCatalogText(getCellValue(row.values, 32)),
    numParteInformativo: normalizeCatalogText(getCellValue(row.values, 33)),
    operativo: normalizeCatalogText(getCellValue(row.values, 34)),
    sitioServicioPublico: normalizeCatalogText(getCellValue(row.values, 35)),
    fechaInfraccion: dateResult.fecha,
    issues,
  };
}

export function mapInfraccionesExcelRows(
  rows: ParsedInfraccionesExcelRow[],
  expectedYear: number,
): NormalizedInfraccionesExcelRow[] {
  return rows.map((row) => mapInfraccionesExcelRow(row, expectedYear));
}

export function isVehiculoDetenido(value: string | null): boolean {
  if (!value) {
    return false;
  }

  return value === 'VEH. DETENIDO' || value === 'VEHICULO DETENIDO';
}

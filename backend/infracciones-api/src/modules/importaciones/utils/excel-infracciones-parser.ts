import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import { assertSafeXlsxContainer } from './xlsx-container-guard';

export const EXCEL_SHEET_NAME = 'INFRACCIONES';

export const EXCEL_HEADERS = [
  'DELEGACION',
  'INFRACCION',
  'DIA',
  'MES',
  'ANO',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'NOMBRES',
  'SEXO',
  'LICENCIA',
  'SERVICIO',
  'CLASE',
  'TIPO',
  'MARCA',
  'MODELO',
  'COLOR',
  'PLACAS',
  'ESTADO',
  'SERIE',
  'MOTOR',
  'MUNICIPIO',
  'COLONIA',
  'CALLE',
  'HORA',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'SOLO INFRACCION O VEHICULO DETENIDO',
  'ENCIERRO',
  'OBSERVACIONES',
  'CLAVE DEL POLICIA DE TTO.',
  'NUM. DE PARTE INFORMATIVO',
  'NOMBRE DEL OPERATIVO',
  'SITIO AL QUE PERTENECE EN CASO DE SER DE SERV. PUB.',
] as const;

export const EXCEL_COLUMN_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  'AA',
  'AB',
  'AC',
  'AD',
  'AE',
  'AF',
  'AG',
  'AH',
  'AI',
  'AJ',
] as const;

const DEFAULT_MAX_DATA_ROWS = 50_000;
const MAX_WORKSHEET_COLUMNS = 64;
const MAX_CELL_TEXT_LENGTH = 32_767;
const DEFAULT_MAX_ZIP_ENTRIES = 2_048;
const DEFAULT_MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES = 128 * 1024 * 1024;
const DEFAULT_MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES = 96 * 1024 * 1024;
const DEFAULT_MAX_ZIP_COMPRESSION_RATIO = 250;

export interface ParsedInfraccionesExcelRow {
  numeroFila: number;
  values: unknown[];
  rawRow: Record<string, unknown>;
}

export interface ParsedInfraccionesExcelWorkbook {
  nombreArchivo: string;
  nombreHoja: string;
  totalFilas: number;
  columnasDetectadas: string[];
  headerRow: string[];
  rows: ParsedInfraccionesExcelRow[];
}

function readPositiveIntegerEnv(
  key: string,
  fallback: number,
  max: number,
): number {
  const value = Number(process.env[key] ?? fallback);
  return Number.isInteger(value) && value > 0 && value <= max
    ? value
    : fallback;
}

function getImportLimits() {
  return {
    maxDataRows: readPositiveIntegerEnv(
      'EXCEL_IMPORT_MAX_ROWS',
      DEFAULT_MAX_DATA_ROWS,
      200_000,
    ),
    maxZipEntries: readPositiveIntegerEnv(
      'EXCEL_IMPORT_MAX_ZIP_ENTRIES',
      DEFAULT_MAX_ZIP_ENTRIES,
      10_000,
    ),
    maxZipTotalUncompressedBytes: readPositiveIntegerEnv(
      'EXCEL_IMPORT_MAX_UNCOMPRESSED_BYTES',
      DEFAULT_MAX_ZIP_TOTAL_UNCOMPRESSED_BYTES,
      512 * 1024 * 1024,
    ),
    maxZipEntryUncompressedBytes: readPositiveIntegerEnv(
      'EXCEL_IMPORT_MAX_ENTRY_BYTES',
      DEFAULT_MAX_ZIP_ENTRY_UNCOMPRESSED_BYTES,
      256 * 1024 * 1024,
    ),
    maxZipCompressionRatio: readPositiveIntegerEnv(
      'EXCEL_IMPORT_MAX_COMPRESSION_RATIO',
      DEFAULT_MAX_ZIP_COMPRESSION_RATIO,
      1_000,
    ),
  };
}

function normalizeHeader(value: unknown): string {
  return toCellText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
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

function buildRawRow(values: unknown[]): Record<string, unknown> {
  return Object.fromEntries(
    EXCEL_COLUMN_LETTERS.map((letter, index) => [
      letter,
      values[index] ?? null,
    ]),
  );
}

function isZipBasedWorkbook(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function assertWorksheetShape(worksheet: XLSX.WorkSheet): void {
  const rangeReference = worksheet['!ref'];
  if (!rangeReference) {
    return;
  }

  try {
    const range = XLSX.utils.decode_range(rangeReference);
    if (range.e.c + 1 > MAX_WORKSHEET_COLUMNS) {
      throw new BadRequestException(
        `La hoja INFRACCIONES excede el limite de ${MAX_WORKSHEET_COLUMNS} columnas.`,
      );
    }
  } catch (error: unknown) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException(
      'El rango declarado de la hoja no es valido.',
    );
  }
}

function assertSafeCellValues(rows: unknown[][]): void {
  for (const row of rows) {
    for (const value of row) {
      if (typeof value === 'string' && value.length > MAX_CELL_TEXT_LENGTH) {
        throw new BadRequestException(
          `Una celda excede el limite de ${MAX_CELL_TEXT_LENGTH} caracteres.`,
        );
      }
    }
  }
}

export function parseInfraccionesWorkbook(
  buffer: Buffer,
  originalName: string,
): ParsedInfraccionesExcelWorkbook {
  const limits = getImportLimits();

  if (isZipBasedWorkbook(buffer)) {
    assertSafeXlsxContainer(buffer, {
      maxEntries: limits.maxZipEntries,
      maxTotalUncompressedBytes: limits.maxZipTotalUncompressedBytes,
      maxEntryUncompressedBytes: limits.maxZipEntryUncompressedBytes,
      maxCompressionRatio: limits.maxZipCompressionRatio,
    });
  }

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: true,
    sheets: [EXCEL_SHEET_NAME],
    sheetRows: limits.maxDataRows + 3,
    cellFormula: false,
    cellHTML: false,
    cellStyles: false,
    bookVBA: false,
  });
  const worksheet = workbook.Sheets[EXCEL_SHEET_NAME];

  if (!worksheet) {
    throw new BadRequestException(
      `La hoja ${EXCEL_SHEET_NAME} no existe en el archivo cargado`,
    );
  }

  assertWorksheetShape(worksheet);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  if (rows.length < 3) {
    throw new BadRequestException(
      'La hoja INFRACCIONES no contiene encabezados y datos suficientes',
    );
  }

  assertSafeCellValues(rows);

  const headerRow = (rows[1] ?? []).map((value) => toCellText(value).trim());
  const columnasDetectadas = headerRow.filter(Boolean);
  const normalizedHeaders = headerRow.map(normalizeHeader);

  for (let index = 0; index < EXCEL_HEADERS.length; index += 1) {
    if (normalizedHeaders[index] !== EXCEL_HEADERS[index]) {
      throw new BadRequestException(
        `Encabezado invalido en la columna ${EXCEL_COLUMN_LETTERS[index]}: se esperaba ${EXCEL_HEADERS[index]}`,
      );
    }
  }

  const dataRows = rows
    .slice(2)
    .filter((row) =>
      Array.isArray(row)
        ? row.some((cell) => cell !== null && cell !== '')
        : false,
    );

  if (dataRows.length > limits.maxDataRows) {
    throw new BadRequestException(
      `La importacion excede el limite de ${limits.maxDataRows} filas de datos.`,
    );
  }

  return {
    nombreArchivo: originalName,
    nombreHoja: EXCEL_SHEET_NAME,
    totalFilas: dataRows.length,
    columnasDetectadas,
    headerRow,
    rows: dataRows.map((values, index) => ({
      numeroFila: index + 3,
      values,
      rawRow: buildRawRow(values),
    })),
  };
}

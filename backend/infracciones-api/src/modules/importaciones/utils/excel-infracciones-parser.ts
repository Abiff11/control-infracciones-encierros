import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

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

export function parseInfraccionesWorkbook(
  buffer: Buffer,
  originalName: string,
): ParsedInfraccionesExcelWorkbook {
  const workbook = XLSX.read(buffer, { type: 'buffer', raw: true });
  const worksheet = workbook.Sheets[EXCEL_SHEET_NAME];

  if (!worksheet) {
    throw new BadRequestException(
      `La hoja ${EXCEL_SHEET_NAME} no existe en el archivo cargado`,
    );
  }

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

import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

import {
  EXCEL_HEADERS,
  EXCEL_SHEET_NAME,
  parseInfraccionesWorkbook,
} from './excel-infracciones-parser';

function buildWorkbookBuffer(dataRows: unknown[][]): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['CONTROL DE INFRACCIONES'],
    [...EXCEL_HEADERS],
    ...dataRows,
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, EXCEL_SHEET_NAME);

  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  }) as Buffer;
}

function buildDataRow(folio: string): unknown[] {
  const row = new Array<unknown>(EXCEL_HEADERS.length).fill(null);
  row[0] = 'DELEGACION PRUEBA';
  row[1] = folio;
  row[2] = 1;
  row[3] = 1;
  row[4] = 2026;
  return row;
}

describe('parseInfraccionesWorkbook security limits', () => {
  const originalMaxRows = process.env.EXCEL_IMPORT_MAX_ROWS;
  const originalMaxUncompressed =
    process.env.EXCEL_IMPORT_MAX_UNCOMPRESSED_BYTES;

  afterEach(() => {
    if (originalMaxRows === undefined) {
      delete process.env.EXCEL_IMPORT_MAX_ROWS;
    } else {
      process.env.EXCEL_IMPORT_MAX_ROWS = originalMaxRows;
    }

    if (originalMaxUncompressed === undefined) {
      delete process.env.EXCEL_IMPORT_MAX_UNCOMPRESSED_BYTES;
    } else {
      process.env.EXCEL_IMPORT_MAX_UNCOMPRESSED_BYTES = originalMaxUncompressed;
    }
  });

  it('mantiene compatible la lectura XLSX dentro de los limites', () => {
    const buffer = buildWorkbookBuffer([buildDataRow('1001')]);

    const parsed = parseInfraccionesWorkbook(buffer, 'prueba.xlsx');

    expect(parsed.nombreArchivo).toBe('prueba.xlsx');
    expect(parsed.nombreHoja).toBe(EXCEL_SHEET_NAME);
    expect(parsed.totalFilas).toBe(1);
    expect(parsed.headerRow.slice(0, EXCEL_HEADERS.length)).toEqual([
      ...EXCEL_HEADERS,
    ]);
    expect(parsed.rows[0]?.numeroFila).toBe(3);
  });

  it('rechaza una hoja que excede el limite configurado de filas', () => {
    process.env.EXCEL_IMPORT_MAX_ROWS = '1';
    const buffer = buildWorkbookBuffer([
      buildDataRow('1001'),
      buildDataRow('1002'),
    ]);

    expect(() =>
      parseInfraccionesWorkbook(buffer, 'infracciones.xlsx'),
    ).toThrow(BadRequestException);
  });

  it('rechaza un XLSX cuya expansion ZIP excede el limite configurado', () => {
    process.env.EXCEL_IMPORT_MAX_UNCOMPRESSED_BYTES = '1024';
    const buffer = buildWorkbookBuffer([buildDataRow('1001')]);

    expect(() =>
      parseInfraccionesWorkbook(buffer, 'infracciones.xlsx'),
    ).toThrow('tamaño total descomprimido');
  });

  it('rechaza hojas que intentan expandir el ancho esperado', () => {
    const row = new Array<unknown>(65).fill(null);
    row[0] = 'DELEGACION PRUEBA';
    row[1] = '1001';
    row[64] = 'CELDA FUERA DEL LIMITE';
    const buffer = buildWorkbookBuffer([row]);

    expect(() =>
      parseInfraccionesWorkbook(buffer, 'infracciones.xlsx'),
    ).toThrow('excede el limite de 64 columnas');
  });
});

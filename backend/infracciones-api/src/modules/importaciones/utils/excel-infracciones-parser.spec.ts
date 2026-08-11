import * as XLSX from 'xlsx';

import {
  EXCEL_HEADERS,
  EXCEL_SHEET_NAME,
  parseInfraccionesWorkbook,
} from './excel-infracciones-parser';

describe('parseInfraccionesWorkbook', () => {
  it('mantiene compatible la lectura XLSX con la version endurecida de SheetJS', () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['CONTROL DE INFRACCIONES'],
      [...EXCEL_HEADERS],
      ['DELEGACION PRUEBA'],
    ]);

    XLSX.utils.book_append_sheet(workbook, worksheet, EXCEL_SHEET_NAME);

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    const parsed = parseInfraccionesWorkbook(buffer, 'prueba.xlsx');

    expect(parsed.nombreArchivo).toBe('prueba.xlsx');
    expect(parsed.nombreHoja).toBe(EXCEL_SHEET_NAME);
    expect(parsed.totalFilas).toBe(1);
    expect(parsed.headerRow.slice(0, EXCEL_HEADERS.length)).toEqual([
      ...EXCEL_HEADERS,
    ]);
    expect(parsed.rows[0]?.numeroFila).toBe(3);
    expect(parsed.rows[0]?.values[0]).toBe('DELEGACION PRUEBA');
  });
});

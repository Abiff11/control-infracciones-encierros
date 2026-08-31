import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Writable } from 'node:stream';

import { EXCEL_EXPORT_BLOCK_SIZE } from './constants/reporte-excel.constants';
import { ExportInfraccionesExcelDto } from './dto/export-infracciones-excel.dto';
import { InfraccionesListService } from './infracciones-list.service';
import { resolveInfraccionesExcelFields } from './infracciones-reporte-excel.fields';

function protectExcelFormula(value: string | number | null): string | number | null {
  if (typeof value === 'string' && /^[=+\-@]/u.test(value)) {
    return `'${value}`;
  }

  return value;
}

@Injectable()
export class InfraccionesExcelReportService {
  constructor(
    private readonly infraccionesListService: InfraccionesListService,
  ) {}

  getTotal(query: ExportInfraccionesExcelDto): Promise<number> {
    return this.infraccionesListService.countForPdfReport(query);
  }

  assertValidFields(fieldIds: string[]): ReturnType<typeof resolveInfraccionesExcelFields> {
    try {
      return resolveInfraccionesExcelFields(fieldIds);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Los campos del reporte Excel no son validos.',
      );
    }
  }

  async write(
    query: ExportInfraccionesExcelDto,
    output: Writable,
  ): Promise<{ total: number; rowsWritten: number }> {
    const fields = this.assertValidFields(query.campos);

    const total = await this.getTotal(query);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: output,
      useSharedStrings: false,
      useStyles: true,
    });
    const worksheet = workbook.addWorksheet('Infracciones');

    worksheet.columns = fields.map((field) => ({
      header: field.label,
      key: field.label,
      width: Math.min(Math.max(field.label.length + 4, 16), 38),
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).commit();

    let rowsWritten = 0;
    for (let offset = 0; offset < total; offset += EXCEL_EXPORT_BLOCK_SIZE) {
      const rows = await this.infraccionesListService.findForReportExportBlock(
        query,
        offset,
        EXCEL_EXPORT_BLOCK_SIZE,
      );

      for (const row of rows) {
        worksheet.addRow(fields.map((field) => protectExcelFormula(field.getValue(row)))).commit();
        rowsWritten += 1;
      }
    }

    worksheet.commit();
    await workbook.commit();

    return { total, rowsWritten };
  }
}

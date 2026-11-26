import type { InfraccionListItem } from '../../types/infracciones.types';
import { formatDateInput } from '../../utils/timezone';
import {
  getInfraccionesFieldsByIds,
  type InfraccionesReportFieldId,
} from './infracciones-report-fields';

export interface InfraccionesReportColumn {
  id: string;
  label: string;
}

export interface InfraccionesReportRow {
  id: string;
  cells: string[];
}

export interface InfraccionesReportTable {
  columns: InfraccionesReportColumn[];
  rows: InfraccionesReportRow[];
}

export function buildInfraccionesReportTable(
  items: InfraccionListItem[],
  fieldIds: InfraccionesReportFieldId[],
): InfraccionesReportTable {
  const selectedFields = getInfraccionesFieldsByIds(fieldIds);

  return {
    columns: selectedFields.map((field) => ({ id: field.id, label: field.label })),
    rows: items.map((item) => ({
      id: String(item.idInfraccion),
      cells: selectedFields.map((field) => field.getValue(item)),
    })),
  };
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildInfraccionesExcelFileName({
  fechaFin,
  fechaInicio,
}: {
  fechaInicio?: string;
  fechaFin?: string;
}): string {
  if (fechaInicio && fechaFin) {
    return `reporte-infracciones-${fechaInicio}-${fechaFin}.xlsx`;
  }

  if (fechaInicio) {
    return `reporte-infracciones-desde-${fechaInicio}.xlsx`;
  }

  if (fechaFin) {
    return `reporte-infracciones-hasta-${fechaFin}.xlsx`;
  }

  return `reporte-infracciones-completo-${formatDateInput()}.xlsx`;
}

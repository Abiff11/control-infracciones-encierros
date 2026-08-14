import type { InfraccionListItem } from '../../types/infracciones.types';
import { formatDateTime } from '../../utils/formatters';
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

export interface InfraccionesReportPayload extends InfraccionesReportTable {
  title: string;
  contextLines: string[];
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function normalizeFileName(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '') || 'reporte'
  );
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildReportHtml(payload: InfraccionesReportPayload): string {
  const columnCount = Math.max(payload.columns.length, 1);
  const contextRows = payload.contextLines
    .map((line) => `<tr class="report-meta"><td colspan="${columnCount}">${escapeHtml(line)}</td></tr>`)
    .join('');
  const headerRows = payload.columns
    .map((column) => `<th>${escapeHtml(column.label)}</th>`)
    .join('');
  const bodyRows = payload.rows
    .map((row) => `<tr>${row.cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(payload.title)}</title>
<style>
body { font-family: Arial, sans-serif; color: #0f172a; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; mso-number-format:'\\@'; vertical-align: top; }
th { background: #1e293b; color: #ffffff; font-weight: 700; }
.report-title td { background: #e2e8f0; color: #0f172a; font-size: 15px; font-weight: 700; }
.report-meta td { background: #f8fafc; color: #475569; }
@page { size: landscape; margin: 10mm; }
</style>
</head>
<body>
<table>
<tr class="report-title"><td colspan="${columnCount}">${escapeHtml(payload.title)}</td></tr>
<tr class="report-meta"><td colspan="${columnCount}">Generado: ${escapeHtml(formatDateTime(new Date().toISOString()))}</td></tr>
<tr class="report-meta"><td colspan="${columnCount}">Registros: ${payload.rows.length} | Campos: ${payload.columns.length}</td></tr>
${contextRows}
<tr>${headerRows}</tr>
${bodyRows}
</table>
</body>
</html>`;
}

export function downloadInfraccionesExcelReport(payload: InfraccionesReportPayload): void {
  const reportDate = formatDateInput();

  downloadBlob(
    new Blob([`\ufeff${buildReportHtml(payload)}`], {
      type: 'application/vnd.ms-excel;charset=utf-8',
    }),
    `${normalizeFileName(payload.title)}-${reportDate}.xls`,
  );
}

export function downloadInfraccionesPdfReport(payload: InfraccionesReportPayload): void {
  const reportWindow = window.open('', '_blank');
  const reportDate = formatDateInput();

  if (!reportWindow) {
    downloadBlob(
      new Blob([buildReportHtml(payload)], { type: 'text/html;charset=utf-8' }),
      `${normalizeFileName(payload.title)}-${reportDate}.html`,
    );
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml(payload));
  reportWindow.document.close();
  reportWindow.focus();
  setTimeout(() => reportWindow.print(), 250);
}

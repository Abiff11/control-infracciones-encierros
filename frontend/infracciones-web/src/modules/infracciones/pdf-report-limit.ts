import type { PdfReportAvailability } from '../../types/infracciones.types';

export function getPdfLimitMessage({
  limitePdf,
  total,
}: Pick<PdfReportAvailability, 'limitePdf' | 'total'>): string {
  return `PDF no disponible para esta consulta. El reporte contiene ${total} registros y supera el límite de ${limitePdf} registros para PDF. Reduce el rango o los filtros, o utiliza Exportar Excel.`;
}

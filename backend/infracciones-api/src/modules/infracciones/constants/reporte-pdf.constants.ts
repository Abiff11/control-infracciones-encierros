export const PDF_MAX_REGISTROS = 500;

export function buildPdfLimitMessage(total: number): string {
  return `PDF no disponible para esta consulta. El reporte contiene ${total} registros y supera el límite de ${PDF_MAX_REGISTROS} registros para PDF. Reduce el rango o los filtros, o utiliza Exportar Excel.`;
}

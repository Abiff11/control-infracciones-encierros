export const DOCUMENTO_PARTE_INFORMATIVO = "PARTE_INFORMATIVO";
export const DOCUMENTO_FOLIO_LIBERACION = "FOLIO_LIBERACION";

export function buildVehiculoSinInfraccionFolio(
  tipoDocumentoReferencia: string,
  numeroDocumento: string,
): string {
  const numeroNormalizado = numeroDocumento
    .trim()
    .replace(/\s+/g, "-")
    .toUpperCase();

  if (tipoDocumentoReferencia === DOCUMENTO_FOLIO_LIBERACION) {
    return numeroNormalizado;
  }

  return `PI-${numeroNormalizado.replace(/^(?:PI-)+/, "")}`;
}

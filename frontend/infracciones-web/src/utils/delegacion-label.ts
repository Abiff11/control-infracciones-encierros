import type { Delegacion } from '../types/catalogos.types';

export function formatDelegacionLabel(
  delegacion: Delegacion,
  region = delegacion.region,
): string {
  const nombreRegion = region?.nombreRegion?.trim();

  return nombreRegion
    ? `${nombreRegion} - ${delegacion.nombreDelegacion}`
    : `${delegacion.nombreDelegacion} (ID: ${delegacion.idDelegacion})`;
}

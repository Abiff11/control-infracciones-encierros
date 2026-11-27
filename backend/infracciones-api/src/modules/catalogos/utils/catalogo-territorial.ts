import {
  CATALOGO_TERRITORIAL_OFICIAL,
  EQUIVALENCIAS_DELEGACION,
} from '../constants/catalogo-territorial.constants';

export interface DelegacionTerritorial {
  readonly nombreRegion: string;
  readonly nombreDelegacion: string;
}

export function normalizeNombreTerritorial(
  value: string | null | undefined,
): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const delegacionesPorNombre = new Map<string, DelegacionTerritorial>();

for (const region of CATALOGO_TERRITORIAL_OFICIAL) {
  for (const nombreDelegacion of region.delegaciones) {
    const clave = normalizeNombreTerritorial(nombreDelegacion);
    if (delegacionesPorNombre.has(clave)) {
      throw new Error('Delegacion oficial duplicada: ' + clave);
    }

    delegacionesPorNombre.set(clave, {
      nombreRegion: region.nombreRegion,
      nombreDelegacion,
    });
  }
}

const equivalenciasPorNombre = new Map<string, string>();

for (const equivalencia of EQUIVALENCIAS_DELEGACION) {
  const origen = normalizeNombreTerritorial(equivalencia.origen);
  const destino = normalizeNombreTerritorial(equivalencia.destino);

  if (
    !origen ||
    delegacionesPorNombre.has(origen) ||
    equivalenciasPorNombre.has(origen) ||
    !delegacionesPorNombre.has(destino)
  ) {
    throw new Error('Equivalencia territorial invalida: ' + origen);
  }

  equivalenciasPorNombre.set(origen, destino);
}

export function resolveDelegacionTerritorial(
  nombre: string | null | undefined,
): DelegacionTerritorial | null {
  const clave = normalizeNombreTerritorial(nombre);
  const nombreOficial = equivalenciasPorNombre.get(clave) ?? clave;
  const delegacion = delegacionesPorNombre.get(nombreOficial);

  return delegacion ? { ...delegacion } : null;
}

export function esDelegacionDeRegion(
  nombreRegion: string | null | undefined,
  nombreDelegacion: string | null | undefined,
): boolean {
  const delegacion = resolveDelegacionTerritorial(nombreDelegacion);

  return (
    delegacion !== null &&
    normalizeNombreTerritorial(delegacion.nombreRegion) ===
      normalizeNombreTerritorial(nombreRegion)
  );
}

import type { PageKey } from './app.types';
import type { NavigationItem } from './navigation';

const ADMIN_ONLY_PAGES = new Set<PageKey>([
  'usuarios',
  'admin-expedientes',
  'admin-operaciones',
]);

const INFRACCIONES_HIDDEN_PAGES = new Set<PageKey>([
  'encierros-vehiculos',
  'importaciones',
  'catalogos',
  ...ADMIN_ONLY_PAGES,
]);

const ENCIERRO_NAVIGATION_PAGES = new Set<PageKey>([
  'infracciones',
  'reportes-infracciones',
  'flujo-operativo',
  'encierros-vehiculos',
]);

// "salida" no aparece en el menu: se abre desde una accion del flujo.
const ENCIERRO_ALLOWED_PAGES = new Set<PageKey>([
  ...ENCIERRO_NAVIGATION_PAGES,
  'salida',
]);

export function getDefaultPageForRole(roleName?: string | null): PageKey {
  return roleName?.toUpperCase() === 'ENCIERRO' ? 'infracciones' : 'dashboard';
}

export function canAccessPageForRole(
  roleName: string | null | undefined,
  page: PageKey,
): boolean {
  const role = roleName?.toUpperCase();

  if (role === 'ADMIN') {
    return true;
  }

  if (role === 'ENCIERRO') {
    return ENCIERRO_ALLOWED_PAGES.has(page);
  }

  if (role === 'INFRACCIONES') {
    return !INFRACCIONES_HIDDEN_PAGES.has(page);
  }

  return !ADMIN_ONLY_PAGES.has(page);
}

export function getVisibleNavigationItems(
  items: NavigationItem[],
  roleName?: string | null,
): NavigationItem[] {
  if (roleName?.toUpperCase() === 'ENCIERRO') {
    return items.filter((item) => ENCIERRO_NAVIGATION_PAGES.has(item.key));
  }

  return items.filter((item) => canAccessPageForRole(roleName, item.key));
}

export type OperacionOperativa = 'retencion' | 'pago' | 'liberacion' | 'salida';

export function canPerformOperationForRole(
  roleName: string | undefined,
  type: OperacionOperativa,
): boolean {
  return roleName?.toUpperCase() !== 'ENCIERRO' || type === 'salida';
}

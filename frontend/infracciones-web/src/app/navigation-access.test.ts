import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from './navigation';
import {
  canAccessPageForRole,
  getDefaultPageForRole,
  getVisibleNavigationItems,
} from './navigation-access';
import type { PageKey } from './app.types';

describe('navegacion para el rol ENCIERRO', () => {
  it('muestra exclusivamente los cuatro modulos autorizados', () => {
    expect(
      getVisibleNavigationItems(NAV_ITEMS, 'ENCIERRO').map((item) => item.key),
    ).toEqual([
      'infracciones',
      'reportes-infracciones',
      'flujo-operativo',
      'encierros-vehiculos',
    ]);
  });

  it('inicia en control operativo y conserva la salida como pagina interna', () => {
    expect(getDefaultPageForRole('ENCIERRO')).toBe('infracciones');
    expect(canAccessPageForRole('ENCIERRO', 'salida')).toBe(true);
    expect(getVisibleNavigationItems(NAV_ITEMS, 'ENCIERRO').some(
      (item) => item.key === 'salida',
    )).toBe(false);
  });

  it('bloquea la navegacion a paginas fuera del alcance', () => {
    const forbidden: PageKey[] = [
      'dashboard',
      'nueva-infraccion',
      'retencion',
      'pago',
      'liberacion',
      'importaciones',
      'catalogos',
      'usuarios',
      'admin-expedientes',
      'admin-operaciones',
    ];
    forbidden.forEach((page) => {
      expect(canAccessPageForRole('ENCIERRO', page)).toBe(false);
    });
  });

  it('mantiene las restricciones anteriores para INFRACCIONES y otros roles', () => {
    const infraccionesKeys = getVisibleNavigationItems(
      NAV_ITEMS,
      'INFRACCIONES',
    ).map((item) => item.key);
    expect(infraccionesKeys).not.toContain('encierros-vehiculos');
    expect(infraccionesKeys).not.toContain('catalogos');
    expect(infraccionesKeys).toContain('nueva-infraccion');

    const consultaKeys = getVisibleNavigationItems(
      NAV_ITEMS,
      'CONSULTA',
    ).map((item) => item.key);
    expect(consultaKeys).toContain('dashboard');
    expect(consultaKeys).not.toContain('usuarios');

    expect(getDefaultPageForRole('ADMIN')).toBe('dashboard');
    expect(getVisibleNavigationItems(NAV_ITEMS, 'ADMIN')).toEqual(NAV_ITEMS);
  });
});

import type { PageKey } from './app.types';

export const NAV_ITEMS: Array<{ key: PageKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'infracciones', label: 'Infracciones' },
  { key: 'nueva-infraccion', label: 'Nueva infraccion' },
  { key: 'pago', label: 'Pago' },
  { key: 'liberacion', label: 'Liberacion' },
  { key: 'retencion', label: 'Retencion' },
  { key: 'salida', label: 'Salida' },
  { key: 'catalogos', label: 'Catalogos' },
];

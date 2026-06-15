import type { PageKey } from './app.types';

export interface NavigationItem {
  key: PageKey;
  label: string;
  group: 'Operacion' | 'Encierros' | 'Consulta' | 'Tecnico';
}

export const NAV_ITEMS: NavigationItem[] = [
  { group: 'Consulta', key: 'dashboard', label: 'Dashboard' },
  { group: 'Consulta', key: 'infracciones', label: 'Infracciones' },
  { group: 'Consulta', key: 'flujo-operativo', label: 'Flujo operativo' },
  { group: 'Operacion', key: 'nueva-infraccion', label: 'Nueva infraccion' },
  { group: 'Encierros', key: 'encierros-vehiculos', label: 'Inventario de encierros' },
  { group: 'Tecnico', key: 'importaciones', label: 'Importaciones' },
  { group: 'Tecnico', key: 'catalogos', label: 'Catalogos' },
];

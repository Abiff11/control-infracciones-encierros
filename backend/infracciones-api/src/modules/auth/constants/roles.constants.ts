export const ROLES = {
  ADMIN: 'ADMIN',
  SECCION_PRIMERA: 'SECCION_PRIMERA',
  INFRACCIONES: 'INFRACCIONES',
  LIBERACIONES: 'LIBERACIONES',
  ENCIERRO: 'ENCIERRO',
  CONSULTA: 'CONSULTA',
  OPERADOR: 'OPERADOR',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const READ_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.SECCION_PRIMERA,
  ROLES.INFRACCIONES,
  ROLES.LIBERACIONES,
  ROLES.ENCIERRO,
  ROLES.CONSULTA,
  ROLES.OPERADOR,
];

// El inventario queda restringido a todos los roles de lectura excepto INFRACCIONES.
// No modificar READ_ROLES: las consultas operativas y observaciones lo requieren.
export const INVENTORY_READ_ROLES: RoleName[] = READ_ROLES.filter(
  (role) => role !== ROLES.INFRACCIONES,
);

export const CAPTURE_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.SECCION_PRIMERA,
  ROLES.INFRACCIONES,
  ROLES.OPERADOR,
];

export const PAYMENT_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.INFRACCIONES,
  ROLES.OPERADOR,
];

export const RELEASE_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.INFRACCIONES,
  ROLES.LIBERACIONES,
  ROLES.OPERADOR,
];

export const YARD_ENTRY_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.INFRACCIONES,
  ROLES.OPERADOR,
];

export const YARD_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.ENCIERRO,
  ROLES.OPERADOR,
];

export const IMPORT_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.SECCION_PRIMERA,
  ROLES.OPERADOR,
];

export const WRITE_ROLES: RoleName[] = [ROLES.ADMIN];

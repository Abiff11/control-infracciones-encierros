export const ROLES = {
  ADMIN: 'ADMIN',
  OPERADOR: 'OPERADOR',
  CONSULTA: 'CONSULTA',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const READ_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.OPERADOR,
  ROLES.CONSULTA,
];

export const WRITE_ROLES: RoleName[] = [ROLES.ADMIN, ROLES.OPERADOR];

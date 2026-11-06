import {
  CAPTURE_ROLES,
  READ_ROLES,
  ROLES,
  YARD_ENTRY_ROLES,
  YARD_ROLES,
} from './roles.constants';

describe('CAPTURE_ROLES', () => {
  it('permite capturar infracciones al rol INFRACCIONES', () => {
    expect(CAPTURE_ROLES).toContain(ROLES.INFRACCIONES);
  });
});

describe('permisos del rol ENCIERRO', () => {
  it('permite consultar el inventario y los expedientes', () => {
    expect(READ_ROLES).toContain(ROLES.ENCIERRO);
  });

  it('no permite registrar ingresos o retenciones', () => {
    expect(YARD_ENTRY_ROLES).not.toContain(ROLES.ENCIERRO);
    expect(YARD_ENTRY_ROLES).toEqual([
      ROLES.ADMIN,
      ROLES.INFRACCIONES,
      ROLES.OPERADOR,
    ]);
  });

  it('conserva la autorizacion de salidas vehiculares', () => {
    expect(YARD_ROLES).toContain(ROLES.ENCIERRO);
    expect(YARD_ROLES).not.toContain(ROLES.INFRACCIONES);
    expect(YARD_ROLES).not.toContain(ROLES.CONSULTA);
  });
});

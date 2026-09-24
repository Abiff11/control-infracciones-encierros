import 'reflect-metadata';

import { ROLES } from '../auth/constants/roles.constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { EncierrosController } from './encierros.controller';

describe('EncierrosController authorization', () => {
  it('permite a INFRACCIONES registrar ingresos sin autorizar salidas', () => {
    const retencionRoles = Reflect.getMetadata(
      ROLES_KEY,
      EncierrosController.prototype.registrarRetencion,
    ) as string[];
    const salidaRoles = Reflect.getMetadata(
      ROLES_KEY,
      EncierrosController.prototype.registrarSalida,
    ) as string[];

    expect(retencionRoles).toContain(ROLES.INFRACCIONES);
    expect(retencionRoles).toContain(ROLES.ENCIERRO);
    expect(retencionRoles).toContain(ROLES.ADMIN);
    expect(retencionRoles).not.toContain(ROLES.CONSULTA);

    expect(salidaRoles).not.toContain(ROLES.INFRACCIONES);
    expect(salidaRoles).toContain(ROLES.ENCIERRO);
    expect(salidaRoles).toContain(ROLES.ADMIN);
  });
});

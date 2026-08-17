import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AdminActualizarExpedienteDto } from './admin-expediente.dto';

describe('AdminActualizarExpedienteDto', () => {
  it('trata conceptos vacios de un pago legado como campo no modificado', async () => {
    const dto = plainToInstance(AdminActualizarExpedienteDto, {
      versionExpediente: 'a'.repeat(64),
      motivoEdicion: 'Corregir estatus administrativo',
      pagos: [
        {
          idPagoInfraccion: 10,
          folioLineaCaptura: 'LEGACY-001',
          conceptos: [],
        },
      ],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.pagos).toHaveLength(1);
    expect(dto.pagos?.[0].conceptos).toBeUndefined();
  });
});

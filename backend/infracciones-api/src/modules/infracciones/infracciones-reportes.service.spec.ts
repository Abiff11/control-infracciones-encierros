import { UnprocessableEntityException } from '@nestjs/common';

import { InfraccionesReportesService } from './infracciones-reportes.service';

function createService(total: number) {
  const infraccionesListService = {
    countForPdfReport: jest.fn().mockResolvedValue(total),
  };

  return {
    service: new InfraccionesReportesService(infraccionesListService as never),
    infraccionesListService,
  };
}

describe('InfraccionesReportesService', () => {
  it.each([499, 500])('permite PDF con %i registros', async (total) => {
    const { service, infraccionesListService } = createService(total);

    await expect(service.assertPdfAllowed({})).resolves.toEqual({
      total,
      limitePdf: 500,
      permitido: true,
    });
    expect(infraccionesListService.countForPdfReport).toHaveBeenCalledWith({});
  });

  it.each([501, 24_000])('bloquea PDF con %i registros', async (total) => {
    const { service } = createService(total);

    await expect(service.assertPdfAllowed({})).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );

    try {
      await service.assertPdfAllowed({});
    } catch (error) {
      const response = (error as UnprocessableEntityException).getResponse() as {
        limitePdf: number;
        message: string;
        total: number;
      };

      expect(response).toMatchObject({ total, limitePdf: 500 });
      expect(response.message).toContain(`${total} registros`);
      expect(response.message).toContain('500 registros para PDF');
    }
  });
});

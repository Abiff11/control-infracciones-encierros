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
  it.each([
    { name: 'consulta general', query: {}, total: 13_827 },
    { name: 'consulta vacia', query: { search: 'sin-coincidencias' }, total: 0 },
    { name: 'seleccion individual', query: { idInfracciones: [10] }, total: 1 },
    { name: 'seleccion multiple', query: { idInfracciones: [10, 11] }, total: 2 },
    {
      name: 'consulta filtrada',
      query: {
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
        idEstatusInfraccion: 1,
        idRegion: 10,
      },
      total: 4,
    },
    { name: 'mas de 500 registros', query: {}, total: 501 },
    { name: 'historial de 24,000 registros', query: {}, total: 24_000 },
  ])('devuelve exclusivamente total para $name', async ({ query, total }) => {
    const { service, infraccionesListService } = createService(total);

    await expect(service.getReportAvailability(query)).resolves.toEqual({
      total,
    });
    expect(infraccionesListService.countForPdfReport).toHaveBeenCalledWith(
      query,
    );
  });

  it('propaga el error del contador sin devolver una disponibilidad falsa', async () => {
    const error = new Error('No fue posible contar las infracciones.');
    const infraccionesListService = {
      countForPdfReport: jest.fn().mockRejectedValue(error),
    };
    const service = new InfraccionesReportesService(
      infraccionesListService as never,
    );

    await expect(service.getReportAvailability({})).rejects.toBe(error);
  });

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

import { BadRequestException } from '@nestjs/common';

import { LiberacionesService } from './liberaciones.service';

function createRepositoryMock() {
  return {
    count: jest.fn(),
    create: jest.fn((value: Record<string, unknown>) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

describe('LiberacionesService generarLiberacion', () => {
  it('rechaza liberacion cuando el tipo no permite retencion', async () => {
    const liberacionesRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
          permiteRetencion: false,
        },
      }),
      actualizarEstatusYRegistrarMovimiento: jest.fn(),
    };

    const service = new LiberacionesService(
      liberacionesRepository as never,
      retencionesRepository as never,
      infraccionesService as never,
      { registrar: jest.fn() } as never,
    );

    await expect(
      service.generarLiberacion({
        idInfraccion: 10,
        idPagoInfraccion: 99,
        idUsuarioLibera: 4,
        folioLiberacion: 'LIB-1',
        liberadoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza liberacion cuando no existe retencion vehicular', async () => {
    const liberacionesRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    retencionesRepository.count.mockResolvedValue(0);
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION',
          permiteRetencion: true,
        },
      }),
      actualizarEstatusYRegistrarMovimiento: jest.fn(),
    };

    const service = new LiberacionesService(
      liberacionesRepository as never,
      retencionesRepository as never,
      infraccionesService as never,
      { registrar: jest.fn() } as never,
    );

    await expect(
      service.generarLiberacion({
        idInfraccion: 11,
        idPagoInfraccion: 101,
        idUsuarioLibera: 4,
        folioLiberacion: 'LIB-2',
        liberadoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

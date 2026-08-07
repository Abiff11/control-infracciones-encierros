import { BadRequestException } from '@nestjs/common';

import { PagosService } from './pagos.service';

function createRepositoryMock() {
  return {
    count: jest.fn(),
    create: jest.fn((value: Record<string, unknown>) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

describe('PagosService registrarPago', () => {
  it('rechaza cobro de piso para tipos sin retencion', async () => {
    const pagosRepository = createRepositoryMock();
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

    const service = new PagosService(
      pagosRepository as never,
      retencionesRepository as never,
      infraccionesService as never,
      { registrar: jest.fn() } as never,
    );

    await expect(
      service.registrarPago({
        idInfraccion: 10,
        idUsuarioRegistraPago: 5,
        folioPago: 'PAGO-1',
        montoInfraccion: '150.00',
        diasPisoCobrados: 1,
        montoDiasPiso: '50.00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite pago normal sin retencion cuando el tipo no la usa', async () => {
    const pagosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
          permiteRetencion: false,
        },
      }),
      actualizarEstatusYRegistrarMovimiento: jest.fn().mockResolvedValue({}),
    };

    const service = new PagosService(
      pagosRepository as never,
      retencionesRepository as never,
      infraccionesService as never,
      { registrar: jest.fn().mockResolvedValue({}) } as never,
    );

    await service.registrarPago({
      idInfraccion: 11,
      idUsuarioRegistraPago: 7,
      folioPago: 'PAGO-2',
      montoInfraccion: '200.00',
      diasPisoCobrados: 0,
      montoDiasPiso: '0.00',
    });

    expect(pagosRepository.save).toHaveBeenCalled();
    expect(
      infraccionesService.actualizarEstatusYRegistrarMovimiento,
    ).toHaveBeenCalled();
  });
});

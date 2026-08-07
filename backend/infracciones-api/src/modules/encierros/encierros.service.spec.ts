import { BadRequestException } from '@nestjs/common';

import { EncierrosService } from './encierros.service';

function createRepositoryMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

describe('EncierrosService registrarRetencion', () => {
  it('rechaza retencion para un tipo sin retencion permitida', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    const salidasRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
          permiteRetencion: false,
        },
      }),
    };

    const service = new EncierrosService(
      {} as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      infraccionesService as never,
    );

    await expect(
      service.registrarRetencion({
        idInfraccion: 10,
        idEncierro: 4,
        recibidoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda la retencion cuando el tipo la permite y no existe previa', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    retencionesRepository.findOne.mockResolvedValue(null);
    const salidasRepository = createRepositoryMock();
    const infraccionesService = {
      findByIdOrFail: jest.fn().mockResolvedValue({
        tipoProcedimiento: {
          nombreTipoProcedimiento: 'INFRACCION',
          permiteRetencion: true,
        },
      }),
    };

    const service = new EncierrosService(
      {} as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      infraccionesService as never,
    );

    await service.registrarRetencion({
      idInfraccion: 11,
      idEncierro: 7,
      recibidoPor: 'Operador',
    });

    expect(retencionesRepository.save).toHaveBeenCalled();
  });

  it('rechaza salida cuando la liberacion no corresponde a la retencion seleccionada', async () => {
    const encierrosRepository = createRepositoryMock();
    const retencionesRepository = createRepositoryMock();
    retencionesRepository.findOne.mockResolvedValue({
      idRetencionVehiculo: 14,
      infraccion: {
        idInfraccion: 11,
      },
      encierro: {
        idEncierro: 7,
      },
    });
    const salidasRepository = createRepositoryMock();
    salidasRepository.findOne.mockResolvedValue(null);
    const dataSource = {
      getRepository: jest.fn(() => ({
        findOne: jest.fn().mockResolvedValue({
          idLiberacionVehiculo: 99,
          infraccion: {
            idInfraccion: 88,
          },
        }),
      })),
    };

    const service = new EncierrosService(
      dataSource as never,
      encierrosRepository as never,
      retencionesRepository as never,
      salidasRepository as never,
      { registrar: jest.fn() } as never,
      {
        findByIdOrFail: jest.fn(),
        actualizarEstatusYRegistrarMovimiento: jest.fn(),
      } as never,
    );

    await expect(
      service.registrarSalida({
        idRetencionVehiculo: 14,
        idLiberacionVehiculo: 99,
        idUsuarioValidaSalida: 3,
        validadoPor: 'Operador',
        personaRecibeVehiculo: 'Propietario',
        estadoSalida: 'ENTREGADO',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

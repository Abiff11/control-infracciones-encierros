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

function createServiceFixture() {
  const liberacionesRepository = createRepositoryMock();
  const retencionesRepository = createRepositoryMock();
  const pagosRepository = createRepositoryMock();
  const solventacionesRepository = createRepositoryMock();
  const infraccionesService = {
    findByIdOrFail: jest.fn().mockResolvedValue({
      tipoProcedimiento: {
        nombreTipoProcedimiento: 'INFRACCION',
        permiteRetencion: true,
      },
    }),
    actualizarEstatusYRegistrarMovimiento: jest.fn().mockResolvedValue({}),
  };
  const auditoriaService = {
    registrar: jest.fn().mockResolvedValue({}),
  };

  retencionesRepository.count.mockResolvedValue(1);
  liberacionesRepository.save.mockImplementation(
    (value: Record<string, unknown>) =>
      Promise.resolve({ ...value, idLiberacionVehiculo: 55 }),
  );
  liberacionesRepository.findOne.mockResolvedValue({
    idLiberacionVehiculo: 55,
  });
  pagosRepository.findOne.mockResolvedValue(null);
  solventacionesRepository.findOne.mockResolvedValue(null);

  const service = new LiberacionesService(
    liberacionesRepository as never,
    retencionesRepository as never,
    pagosRepository as never,
    solventacionesRepository as never,
    infraccionesService as never,
    auditoriaService as never,
  );

  return {
    auditoriaService,
    infraccionesService,
    liberacionesRepository,
    pagosRepository,
    retencionesRepository,
    service,
    solventacionesRepository,
  };
}

describe('LiberacionesService generarLiberacion', () => {
  it('rechaza liberacion cuando el tipo no permite retencion', async () => {
    const fixture = createServiceFixture();
    fixture.infraccionesService.findByIdOrFail.mockResolvedValue({
      tipoProcedimiento: {
        nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
        permiteRetencion: false,
      },
    });

    await expect(
      fixture.service.generarLiberacion({
        idInfraccion: 10,
        idPagoInfraccion: 99,
        idUsuarioLibera: 4,
        folioLiberacion: 'LIB-1',
        liberadoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza liberacion cuando no existe retencion vehicular', async () => {
    const fixture = createServiceFixture();
    fixture.retencionesRepository.count.mockResolvedValue(0);

    await expect(
      fixture.service.generarLiberacion({
        idInfraccion: 11,
        idPagoInfraccion: 101,
        idUsuarioLibera: 4,
        folioLiberacion: 'LIB-2',
        liberadoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('genera liberacion usando un pago perteneciente a la infraccion', async () => {
    const fixture = createServiceFixture();
    fixture.pagosRepository.findOne.mockResolvedValue({
      idPagoInfraccion: 99,
    });

    await fixture.service.generarLiberacion({
      idInfraccion: 10,
      idPagoInfraccion: 99,
      idUsuarioLibera: 4,
      folioLiberacion: 'LIB-PAGO',
      liberadoPor: 'Operador',
    });

    expect(fixture.liberacionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pagoInfraccion: expect.objectContaining({ idPagoInfraccion: 99 }),
        solventacionSinPago: null,
      }),
    );
  });

  it('genera liberacion sin id de pago cuando existe No aplica pago', async () => {
    const fixture = createServiceFixture();
    fixture.solventacionesRepository.findOne.mockResolvedValue({
      idSolventacionSinPago: 77,
    });

    await fixture.service.generarLiberacion({
      idInfraccion: 10,
      idUsuarioLibera: 4,
      folioLiberacion: 'LIB-SIN-PAGO',
      liberadoPor: 'Operador',
    });

    expect(fixture.liberacionesRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        pagoInfraccion: null,
        solventacionSinPago: expect.objectContaining({
          idSolventacionSinPago: 77,
        }),
      }),
    );
  });

  it('rechaza liberacion sin pago ni solventacion No aplica pago', async () => {
    const fixture = createServiceFixture();

    await expect(
      fixture.service.generarLiberacion({
        idInfraccion: 10,
        idUsuarioLibera: 4,
        folioLiberacion: 'LIB-SIN-RESPALDO',
        liberadoPor: 'Operador',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

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
  const managerQuery = jest.fn().mockResolvedValue([]);
  const manager = {
    query: managerQuery,
    getRepository: jest.fn(() => liberacionesRepository),
  };
  const transaction = jest.fn(
    (callback: (value: typeof manager) => Promise<unknown>) => callback(manager),
  );
  Object.assign(liberacionesRepository, {
    manager: { transaction },
  });
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
    managerQuery,
    transaction,
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

    const [createPayload] = fixture.liberacionesRepository.create.mock
      .calls[0] as [
      {
        pagoInfraccion: { idPagoInfraccion: number } | null;
        solventacionSinPago: { idSolventacionSinPago: number } | null;
      },
    ];

    expect(createPayload.pagoInfraccion?.idPagoInfraccion).toBe(99);
    expect(createPayload.solventacionSinPago).toBeNull();
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

    const [createPayload] = fixture.liberacionesRepository.create.mock
      .calls[0] as [
      {
        pagoInfraccion: { idPagoInfraccion: number } | null;
        solventacionSinPago: { idSolventacionSinPago: number } | null;
      },
    ];

    expect(createPayload.pagoInfraccion).toBeNull();
    expect(createPayload.solventacionSinPago?.idSolventacionSinPago).toBe(77);
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

describe('LiberacionesService conciliacion de salida anticipada', () => {
  const params = {
    idInfraccion: 10,
    idPagoInfraccion: 99,
    idUsuarioLibera: 4,
    folioLiberacion: 'LIB-ANT-1',
    liberadoPor: 'Operador',
  };

  it('vincula una liberacion coincidente sin crear otra salida', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });
    f.managerQuery
      .mockResolvedValueOnce([{
        idSalidaVehiculo: 80,
        idLiberacionVehiculo: null,
        folioLiberacionPresentado: ' lib-ant-1 ',
      }])
      // PostgreSQL/TypeORM entrega [filas RETURNING, numero de filas actualizadas].
      .mockResolvedValueOnce([[{ idSalidaVehiculo: 80 }], 1]);

    await f.service.generarLiberacion(params);

    expect(f.transaction).toHaveBeenCalledTimes(1);
    expect(f.managerQuery).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE salida_vehiculo'),
      [55, 80],
    );
    expect(f.infraccionesService.actualizarEstatusYRegistrarMovimiento)
      .toHaveBeenCalledWith(expect.objectContaining({
        nombreEstatus: 'LIBERACION_GENERADA',
        accion: 'LIBERACION_GENERADA',
      }));
  });

  it('rechaza una conciliacion sin filas actualizadas y no registra movimiento', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });
    f.managerQuery
      .mockResolvedValueOnce([{
        idSalidaVehiculo: 80,
        idLiberacionVehiculo: null,
        folioLiberacionPresentado: 'LIB-ANT-1',
      }])
      .mockResolvedValueOnce([[], 0]);

    await expect(f.service.generarLiberacion(params))
      .rejects.toThrow('No se pudo conciliar la liberacion con la salida anticipada.');
    expect(f.infraccionesService.actualizarEstatusYRegistrarMovimiento)
      .not.toHaveBeenCalled();
    expect(f.auditoriaService.registrar).not.toHaveBeenCalled();
  });

  it('rechaza una respuesta inconsistente aunque reporte una fila afectada', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });
    f.managerQuery
      .mockResolvedValueOnce([{
        idSalidaVehiculo: 80,
        idLiberacionVehiculo: null,
        folioLiberacionPresentado: 'LIB-ANT-1',
      }])
      .mockResolvedValueOnce([[{ idSalidaVehiculo: 81 }], 1]);

    await expect(f.service.generarLiberacion(params))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.infraccionesService.actualizarEstatusYRegistrarMovimiento)
      .not.toHaveBeenCalled();
  });

  it('rechaza el folio discordante antes de guardar una liberacion', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });
    f.managerQuery.mockResolvedValueOnce([{
      idSalidaVehiculo: 80,
      idLiberacionVehiculo: null,
      folioLiberacionPresentado: 'OTRO-FOLIO',
    }]);

    await expect(f.service.generarLiberacion(params))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.liberacionesRepository.save).not.toHaveBeenCalled();
    expect(f.infraccionesService.actualizarEstatusYRegistrarMovimiento)
      .not.toHaveBeenCalled();
  });

  it('genera liberacion ordinaria sin vincular ninguna salida anticipada', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });

    await f.service.generarLiberacion(params);

    expect(f.liberacionesRepository.save).toHaveBeenCalledTimes(1);
    expect(f.managerQuery).toHaveBeenCalledTimes(1);
    expect(f.infraccionesService.actualizarEstatusYRegistrarMovimiento)
      .toHaveBeenCalledTimes(1);
  });

  it('rechaza una conciliacion concurrente o ya vinculada', async () => {
    const f = createServiceFixture();
    f.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 99 });
    f.managerQuery.mockResolvedValueOnce([{
      idSalidaVehiculo: 80,
      idLiberacionVehiculo: 66,
      folioLiberacionPresentado: 'LIB-ANT-1',
    }]);

    await expect(f.service.generarLiberacion(params))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(f.liberacionesRepository.save).not.toHaveBeenCalled();
  });
});

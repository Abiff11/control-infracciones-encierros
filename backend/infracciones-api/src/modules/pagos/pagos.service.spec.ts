import { BadRequestException } from '@nestjs/common';

import { ACCION_MOVIMIENTO } from '../infracciones/constants/accion-movimiento.constants';
import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { PagosService } from './pagos.service';

function createRepositoryMock() {
  let lastCreatedValue: Record<string, unknown> | null = null;

  return {
    create: jest.fn((value: Record<string, unknown>) => {
      lastCreatedValue = value;
      return value;
    }),
    findOne: jest.fn(),
    find: jest.fn(),
    getLastCreatedValue: () => lastCreatedValue,
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

function createServiceFixture() {
  const pagosRepository = createRepositoryMock();
  const conceptosRepository = createRepositoryMock();
  const solventacionesRepository = createRepositoryMock();
  const pagoConceptoRepository = createRepositoryMock();
  const transactionPagosRepository = createRepositoryMock();

  transactionPagosRepository.save.mockImplementation(
    (value: Record<string, unknown>) =>
      Promise.resolve({ ...value, idPagoInfraccion: 91 }),
  );

  pagosRepository.findOne.mockImplementation(
    (options?: { where?: { idPagoInfraccion?: number } }) => {
      if (options?.where?.idPagoInfraccion) {
        return Promise.resolve({
          idPagoInfraccion: options.where.idPagoInfraccion,
          conceptos: [],
        });
      }

      return Promise.resolve(null);
    },
  );

  const solventacionFecha = new Date('2026-08-25T20:00:00.000Z');
  solventacionesRepository.save.mockImplementation(
    (value: Record<string, unknown>) =>
      Promise.resolve({
        ...value,
        idSolventacionSinPago: 77,
        fechaSolventacion: solventacionFecha,
      }),
  );
  solventacionesRepository.findOne.mockImplementation(
    (options?: { where?: { idSolventacionSinPago?: number } }) => {
      if (options?.where?.idSolventacionSinPago) {
        return Promise.resolve({
          idSolventacionSinPago: options.where.idSolventacionSinPago,
          infraccion: { idInfraccion: 10 },
          usuarioRegistra: { idUsuario: 5 },
          motivo: 'No se genero linea de captura',
          fechaSolventacion: solventacionFecha,
        });
      }

      return Promise.resolve(null);
    },
  );

  const manager = {
    getRepository: jest.fn((entity: { name?: string }) => {
      if (entity?.name === 'PagoInfraccion') {
        return transactionPagosRepository;
      }

      if (entity?.name === 'PagoConcepto') {
        return pagoConceptoRepository;
      }

      if (entity?.name === 'ConceptoPago') {
        return conceptosRepository;
      }

      throw new Error(
        `Repositorio no esperado: ${entity?.name ?? 'desconocido'}`,
      );
    }),
    query: jest.fn((_sql: string, values: string[]) =>
      Promise.resolve([
        {
          idConceptoPago: values[0] === '101' ? 1 : 2,
          claveConcepto: values[0],
          activo: true,
        },
      ]),
    ),
  };

  const dataSource = {
    transaction: jest.fn(
      (callback: (entityManager: typeof manager) => Promise<number>) =>
        callback(manager),
    ),
  };

  const infraccionesService = {
    findByIdOrFail: jest.fn().mockResolvedValue({
      idInfraccion: 10,
      tipoProcedimiento: {
        claveTipoProcedimiento: 'INFRACCION',
      },
    }),
    actualizarEstatusYRegistrarMovimiento: jest.fn().mockResolvedValue({}),
  };
  const auditoriaService = {
    registrar: jest.fn().mockResolvedValue({}),
  };

  const service = new PagosService(
    dataSource as never,
    pagosRepository as never,
    conceptosRepository as never,
    solventacionesRepository as never,
    infraccionesService as never,
    auditoriaService as never,
  );

  return {
    auditoriaService,
    conceptosRepository,
    dataSource,
    infraccionesService,
    manager,
    pagoConceptoRepository,
    pagosRepository,
    service,
    solventacionFecha,
    solventacionesRepository,
    transactionPagosRepository,
  };
}

describe('PagosService registrarPago', () => {
  it('registra una linea de captura con N conceptos y calcula el total', async () => {
    const fixture = createServiceFixture();

    await fixture.service.registrarPago({
      idInfraccion: 10,
      idUsuarioRegistraPago: 5,
      folioLineaCaptura: 'LC-123',
      conceptos: [
        { claveConcepto: '101', monto: '150.50' },
        { claveConcepto: '205', monto: '49.50' },
      ],
    });

    expect(fixture.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.manager.query).toHaveBeenCalledTimes(2);
    expect(fixture.pagoConceptoRepository.save).toHaveBeenCalledTimes(2);
    expect(fixture.transactionPagosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folioLineaCaptura: 'LC-123',
        monto: '200.00',
        montoInfraccion: '200.00',
        diasPisoCobrados: 0,
        montoDiasPiso: '0.00',
      }),
    );
    expect(
      fixture.infraccionesService.actualizarEstatusYRegistrarMovimiento,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreEstatus: ESTATUS_INFRACCION.PAGADA,
      }),
    );
    const [auditoriaPayload] = fixture.auditoriaService.registrar.mock
      .calls[0] as [
      {
        despuesJson: {
          folioLineaCaptura: string;
          monto: string;
        };
      },
    ];

    expect(auditoriaPayload.despuesJson.folioLineaCaptura).toBe('LC-123');
    expect(auditoriaPayload.despuesJson.monto).toBe('200.00');
  });

  it('cierra una INFRACCION_SIN_RETENCION como PAGADA_SIN_RETENCION', async () => {
    const fixture = createServiceFixture();
    fixture.infraccionesService.findByIdOrFail.mockResolvedValue({
      idInfraccion: 10,
      tipoProcedimiento: {
        claveTipoProcedimiento: 'INFRACCION_SIN_RETENCION',
      },
    });

    await fixture.service.registrarPago({
      idInfraccion: 10,
      idUsuarioRegistraPago: 5,
      folioLineaCaptura: 'LC-SR-001',
      conceptos: [{ claveConcepto: '101', monto: '100.00' }],
    });

    expect(
      fixture.infraccionesService.actualizarEstatusYRegistrarMovimiento,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreEstatus: ESTATUS_INFRACCION.PAGADA_SIN_RETENCION,
      }),
    );
  });

  it('normaliza la clave y la persiste mediante upsert', async () => {
    const fixture = createServiceFixture();

    await fixture.service.registrarPago({
      idInfraccion: 10,
      idUsuarioRegistraPago: 5,
      folioLineaCaptura: 'LC-124',
      conceptos: [{ claveConcepto: ' abc-10 ', monto: '25' }],
    });

    expect(fixture.manager.query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (clave_concepto)'),
      ['ABC-10'],
    );
  });

  it('rechaza claves repetidas dentro de la misma linea de captura', async () => {
    const fixture = createServiceFixture();

    await expect(
      fixture.service.registrarPago({
        idInfraccion: 10,
        idUsuarioRegistraPago: 5,
        folioLineaCaptura: 'LC-125',
        conceptos: [
          { claveConcepto: '101', monto: '50.00' },
          { claveConcepto: ' 101 ', monto: '25.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rechaza conceptos con monto cero', async () => {
    const fixture = createServiceFixture();

    await expect(
      fixture.service.registrarPago({
        idInfraccion: 10,
        idUsuarioRegistraPago: 5,
        folioLineaCaptura: 'LC-126',
        conceptos: [{ claveConcepto: '101', monto: '0' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza registrar pago si ya existe una solventacion No aplica pago', async () => {
    const fixture = createServiceFixture();
    fixture.solventacionesRepository.findOne.mockResolvedValue({
      idSolventacionSinPago: 77,
    });

    await expect(
      fixture.service.registrarPago({
        idInfraccion: 10,
        idUsuarioRegistraPago: 5,
        folioLineaCaptura: 'LC-127',
        conceptos: [{ claveConcepto: '101', monto: '10.00' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.dataSource.transaction).not.toHaveBeenCalled();
  });
});

describe('PagosService registrarNoAplicaPago', () => {
  it('solventa la infraccion sin crear un pago y registra motivo', async () => {
    const fixture = createServiceFixture();

    const result = await fixture.service.registrarNoAplicaPago({
      idInfraccion: 10,
      idUsuarioRegistra: 5,
      motivo: ' No se genero linea de captura ',
    });

    const createdSolventacion =
      fixture.solventacionesRepository.getLastCreatedValue();

    expect(createdSolventacion).not.toBeNull();
    expect(createdSolventacion).toHaveProperty('infraccion', {
      idInfraccion: 10,
    });
    expect(createdSolventacion).toHaveProperty('usuarioRegistra', {
      idUsuario: 5,
    });
    expect(createdSolventacion).toHaveProperty(
      'motivo',
      'No se genero linea de captura',
    );
    expect(createdSolventacion).toHaveProperty('fechaSolventacion');
    expect(createdSolventacion?.fechaSolventacion).toBeInstanceOf(Date);
    expect(fixture.solventacionesRepository.save).toHaveBeenCalledWith(
      createdSolventacion,
    );
    expect(fixture.dataSource.transaction).not.toHaveBeenCalled();
    expect(
      fixture.infraccionesService.actualizarEstatusYRegistrarMovimiento,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        nombreEstatus: ESTATUS_INFRACCION.SOLVENTADA_SIN_PAGO,
        accion: ACCION_MOVIMIENTO.NO_APLICA_PAGO,
      }),
    );
    expect(fixture.auditoriaService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'NO_APLICA_PAGO',
        entidad: 'solventacion_sin_pago',
      }),
    );
    expect(result.idSolventacionSinPago).toBe(77);
    expect(result.infraccion).toEqual({ idInfraccion: 10 });
    expect(result.usuarioRegistra).toEqual({ idUsuario: 5 });
    expect(result.motivo).toBe('No se genero linea de captura');
    expect(result.fechaSolventacion).toBe(fixture.solventacionFecha);
  });

  it('rechaza No aplica pago cuando ya existe un pago real', async () => {
    const fixture = createServiceFixture();
    fixture.pagosRepository.findOne.mockResolvedValue({ idPagoInfraccion: 91 });

    await expect(
      fixture.service.registrarNoAplicaPago({
        idInfraccion: 10,
        idUsuarioRegistra: 5,
        motivo: 'No se genero linea de captura',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fixture.solventacionesRepository.save).not.toHaveBeenCalled();
  });
});

describe('PagosService findConceptos', () => {
  it('busca coincidencias activas para autocompletar claves', async () => {
    const fixture = createServiceFixture();
    fixture.conceptosRepository.find.mockResolvedValue([]);

    await fixture.service.findConceptos(' ab ', 10);

    const [findOptions] = fixture.conceptosRepository.find.mock.calls[0] as [
      {
        where: {
          activo: boolean;
          claveConcepto?: unknown;
        };
        order: {
          claveConcepto: string;
        };
        take: number;
      },
    ];

    expect(findOptions.where.activo).toBe(true);
    expect(findOptions.where).toHaveProperty('claveConcepto');
    expect(findOptions.order.claveConcepto).toBe('ASC');
    expect(findOptions.take).toBe(10);
  });
});

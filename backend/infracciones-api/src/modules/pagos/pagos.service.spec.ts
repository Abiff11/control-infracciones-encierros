import { BadRequestException } from '@nestjs/common';

import { ESTATUS_INFRACCION } from '../infracciones/constants/estatus-infraccion.constants';
import { PagosService } from './pagos.service';

function createRepositoryMock() {
  return {
    create: jest.fn((value: Record<string, unknown>) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
}

function createServiceFixture() {
  const pagosRepository = createRepositoryMock();
  const conceptosRepository = createRepositoryMock();
  const pagoConceptoRepository = createRepositoryMock();
  const transactionPagosRepository = createRepositoryMock();

  transactionPagosRepository.save.mockImplementation(
    (value: Record<string, unknown>) =>
      Promise.resolve({ ...value, idPagoInfraccion: 91 }),
  );

  pagosRepository.findOne.mockResolvedValue({
    idPagoInfraccion: 91,
    conceptos: [],
  });

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

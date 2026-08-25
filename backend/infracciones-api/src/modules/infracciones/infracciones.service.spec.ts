import { BadRequestException } from '@nestjs/common';

import { Operativo } from '../catalogos/entities/operativo.entity';
import { TipoProcedimiento } from '../catalogos/entities/tipo-procedimiento.entity';
import { Encierro } from '../encierros/entities/encierro.entity';
import { Infractor } from '../infractores/entities/infractor.entity';
import { LugarInfraccion } from '../catalogos/entities/lugar-infraccion.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { CreateInfraccionCompletaDto } from './dto/create-infraccion-completa.dto';
import { InfraccionMotivo } from './entities/infraccion-motivo.entity';
import { InfraccionMovimiento } from './entities/infraccion-movimiento.entity';
import { Infraccion } from './entities/infraccion.entity';
import { InfraccionesService } from './infracciones.service';

type RepositoryMock = {
  create: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  save: jest.Mock;
};

interface ServiceContext {
  service: InfraccionesService;
  repositories: {
    infraccionRepo: RepositoryMock;
    encierroRepo: RepositoryMock;
  };
}

interface ServiceInternals {
  findEstatusByIdOrFail: (
    manager: unknown,
    idEstatusInfraccion: number,
  ) => Promise<unknown>;
  findFlujoByInfraccion: (folioInfraccion: string) => Promise<unknown>;
  findMotivosByIdsOrFail: (
    manager: unknown,
    motivosIds: number[],
  ) => Promise<unknown[]>;
  findTipoProcedimientoByIdOrFail: (
    manager: unknown,
    idTipoProcedimiento: number,
  ) => Promise<TipoProcedimiento>;
  findUsuarioByIdOrFail: (
    manager: unknown,
    idUsuario: number,
  ) => Promise<unknown>;
}

function createRepositoryMock(): RepositoryMock {
  return {
    create: jest.fn((value: Record<string, unknown>) => value),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
  };
}

function createBaseDto(
  overrides?: Partial<CreateInfraccionCompletaDto>,
): CreateInfraccionCompletaDto {
  const baseDto: CreateInfraccionCompletaDto = {
    infractor: {
      idSexo: 1,
      nombre: 'Juan',
      apellidoPaterno: 'Perez',
      apellidoMaterno: 'Lopez',
      licencia: 'LIC-1',
      curp: 'CURP123',
    },
    vehiculo: {
      idClaseVehiculo: 1,
      idLineaVehiculo: 2,
      idServicio: 3,
      anioModelo: 2020,
      sitioServicioPublico: 'Sitio',
      color: 'Rojo',
      placas: 'ABC123',
      estadoPlacas: 'OAX',
      serie: 'SERIE1',
      motor: 'MOTOR1',
    },
    lugarInfraccion: {
      municipio: 'Oaxaca',
      colonia: 'Centro',
      calle: 'Primera',
      numero: '10',
    },
    infraccion: {
      idDelegacion: 1,
      idTipoProcedimiento: 1,
      idEstatusInfraccion: 1,
      idOperativo: null,
      idEncierro: null,
      folioInfraccion: 'FOL-1',
      fechaInfraccion: '2026-08-07',
      horaInfraccion: '10:30',
      observaciones: 'Observacion',
      clavePolicia: 'POL-1',
      numParteInformativo: null,
      motivos: [1, 2],
    },
  };

  if (!overrides) {
    return baseDto;
  }

  return {
    ...baseDto,
    ...overrides,
    infractor: {
      ...baseDto.infractor,
      ...overrides.infractor,
    },
    vehiculo: {
      ...baseDto.vehiculo,
      ...overrides.vehiculo,
    },
    lugarInfraccion: {
      ...baseDto.lugarInfraccion,
      ...overrides.lugarInfraccion,
    },
    infraccion: {
      ...baseDto.infraccion,
      ...overrides.infraccion,
    },
  };
}

function createServiceContext(
  tipoProcedimiento: Partial<TipoProcedimiento>,
): ServiceContext {
  const infraccionRepo = createRepositoryMock();
  const infractorRepo = createRepositoryMock();
  const vehiculoRepo = createRepositoryMock();
  const lugarRepo = createRepositoryMock();
  const infraccionMotivoRepo = createRepositoryMock();
  const movimientoRepo = createRepositoryMock();
  const operativoRepo = createRepositoryMock();
  const encierroRepo = createRepositoryMock();

  const repositories = new Map<unknown, RepositoryMock>([
    [Infraccion, infraccionRepo],
    [Infractor, infractorRepo],
    [Vehiculo, vehiculoRepo],
    [LugarInfraccion, lugarRepo],
    [InfraccionMotivo, infraccionMotivoRepo],
    [InfraccionMovimiento, movimientoRepo],
    [Operativo, operativoRepo],
    [Encierro, encierroRepo],
  ]);

  lugarRepo.findOneBy.mockResolvedValue(null);
  encierroRepo.findOneBy.mockImplementation(
    ({ idEncierro }: { idEncierro: number }) =>
      Promise.resolve({
        idEncierro,
        nombreEncierro: `Encierro ${String(idEncierro)}`,
      }),
  );
  infraccionRepo.findOneBy.mockResolvedValue(null);
  infraccionRepo.save.mockImplementation((value: Record<string, unknown>) =>
    Promise.resolve({
      ...value,
      idInfraccion: 99,
    }),
  );

  const dataSource = {
    transaction: jest.fn(
      async (
        callback: (manager: {
          getRepository: (entity: unknown) => RepositoryMock;
        }) => Promise<void>,
      ) =>
        callback({
          getRepository: (entity: unknown) => {
            const repository = repositories.get(entity);

            if (!repository) {
              throw new Error(
                `Repository mock not found for ${String(entity)}`,
              );
            }

            return repository;
          },
        }),
    ),
  };

  const sharedRepo = createRepositoryMock();
  const service = new InfraccionesService(
    dataSource as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
    sharedRepo as never,
  );
  const internals = service as unknown as ServiceInternals;
  const resolvedTipoProcedimiento: TipoProcedimiento = {
    idTipoProcedimiento: 1,
    claveTipoProcedimiento: 'INFRACCION',
    nombreTipoProcedimiento: 'INFRACCION',
    esTipoExpediente: true,
    requiereFolioInfraccion: true,
    requiereNumParteInformativo: false,
    requiereMotivos: true,
    permiteRetencion: true,
    activo: true,
    ...tipoProcedimiento,
  };

  jest
    .spyOn(internals, 'findTipoProcedimientoByIdOrFail')
    .mockResolvedValue(resolvedTipoProcedimiento);
  jest
    .spyOn(internals, 'findEstatusByIdOrFail')
    .mockResolvedValue({ idEstatusInfraccion: 1 });
  jest.spyOn(internals, 'findUsuarioByIdOrFail').mockResolvedValue({
    idUsuario: 5,
  });
  jest
    .spyOn(internals, 'findMotivosByIdsOrFail')
    .mockImplementation((_manager, motivosIds) =>
      Promise.resolve(motivosIds.map((idMotivo) => ({ idMotivo }))),
    );
  jest.spyOn(internals, 'findFlujoByInfraccion').mockResolvedValue({
    ok: true,
  });

  return {
    service,
    repositories: {
      infraccionRepo,
      encierroRepo,
    },
  };
}

describe('InfraccionesService crearInfraccionCompleta', () => {
  it('crea una INFRACCION valida con folio manual', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      requiereFolioInfraccion: true,
      requiereMotivos: true,
      requiereNumParteInformativo: false,
      permiteRetencion: true,
    });

    await context.service.crearInfraccionCompleta(createBaseDto(), 5);

    expect(context.repositories.infraccionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folioInfraccion: 'FOL-1',
        encierro: null,
      }),
    );
  });

  it('guarda el encierro seleccionado cuando el tipo permite retencion', async () => {
    const context = createServiceContext({ permiteRetencion: true });

    await context.service.crearInfraccionCompleta(
      createBaseDto({
        infraccion: {
          idEncierro: 7,
        },
      }),
      5,
    );

    expect(context.repositories.encierroRepo.findOneBy).toHaveBeenCalledWith({
      idEncierro: 7,
    });
    expect(context.repositories.infraccionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        encierro: {
          idEncierro: 7,
          nombreEncierro: 'Encierro 7',
        },
      }),
    );
  });

  it('rechaza encierro cuando el tipo no permite retencion', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION_SIN_RETENCION',
      nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
      permiteRetencion: false,
    });

    await expect(
      context.service.crearInfraccionCompleta(
        createBaseDto({
          infraccion: {
            idEncierro: 7,
          },
        }),
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza INFRACCION sin folio cuando el tipo lo requiere', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      requiereFolioInfraccion: true,
      requiereMotivos: true,
    });

    await expect(
      context.service.crearInfraccionCompleta(
        createBaseDto({
          infraccion: {
            folioInfraccion: ' ',
          },
        }),
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza INFRACCION sin motivos cuando el tipo los requiere', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      requiereFolioInfraccion: true,
      requiereMotivos: true,
    });

    await expect(
      context.service.crearInfraccionCompleta(
        createBaseDto({
          infraccion: {
            motivos: [],
          },
        }),
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea una INFRACCION_SIN_RETENCION valida', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION_SIN_RETENCION',
      nombreTipoProcedimiento: 'INFRACCION SIN RETENCION',
      requiereFolioInfraccion: true,
      requiereMotivos: true,
      permiteRetencion: false,
    });

    await context.service.crearInfraccionCompleta(createBaseDto(), 5);

    expect(context.repositories.infraccionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folioInfraccion: 'FOL-1',
      }),
    );
  });

  it('genera PI-* para VEHICULO_SIN_INFRACCION', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'VEHICULO_SIN_INFRACCION',
      nombreTipoProcedimiento: 'VEHICULO SIN INFRACCION',
      requiereFolioInfraccion: false,
      requiereNumParteInformativo: true,
      requiereMotivos: false,
      permiteRetencion: true,
    });

    await context.service.crearInfraccionCompleta(
      createBaseDto({
        infraccion: {
          folioInfraccion: '',
          numParteInformativo: 'parte 001',
          motivos: [],
        },
      }),
      5,
    );

    expect(context.repositories.infraccionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        folioInfraccion: 'PI-PARTE-001',
      }),
    );
  });

  it('rechaza VEHICULO_SIN_INFRACCION sin numero de parte', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'VEHICULO_SIN_INFRACCION',
      nombreTipoProcedimiento: 'VEHICULO SIN INFRACCION',
      requiereFolioInfraccion: false,
      requiereNumParteInformativo: true,
      requiereMotivos: false,
      permiteRetencion: true,
    });

    await expect(
      context.service.crearInfraccionCompleta(
        createBaseDto({
          infraccion: {
            folioInfraccion: '',
            numParteInformativo: ' ',
            motivos: [],
          },
        }),
        5,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza tipo inactivo', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'INFRACCION',
      nombreTipoProcedimiento: 'INFRACCION',
      activo: false,
    });

    await expect(
      context.service.crearInfraccionCompleta(createBaseDto(), 5),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza tipo que no es expediente', async () => {
    const context = createServiceContext({
      claveTipoProcedimiento: 'RETENCION',
      nombreTipoProcedimiento: 'RETENCION',
      esTipoExpediente: false,
      requiereFolioInfraccion: false,
      requiereMotivos: false,
    });

    await expect(
      context.service.crearInfraccionCompleta(createBaseDto(), 5),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

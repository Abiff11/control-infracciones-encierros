import 'reflect-metadata';

import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ROLES } from '../auth/constants/roles.constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { EncierrosController } from './encierros.controller';
import { EncierrosService } from './encierros.service';

type EncierrosHandlerName = 'registrarRetencion' | 'registrarSalida';

function getHandlerRoles(handlerName: EncierrosHandlerName): string[] {
  const prototype = EncierrosController.prototype as unknown as Record<
    string,
    unknown
  >;
  const handler = prototype[handlerName];

  if (typeof handler !== 'function') {
    throw new Error(`No se encontro el handler ${handlerName}`);
  }

  const metadata: unknown = Reflect.getMetadata(ROLES_KEY, handler);

  if (!Array.isArray(metadata)) {
    return [];
  }

  return metadata.filter((role): role is string => typeof role === 'string');
}

describe('EncierrosController authorization', () => {
  it('permite a INFRACCIONES registrar ingresos sin autorizar salidas', () => {
    const retencionRoles = getHandlerRoles('registrarRetencion');
    const salidaRoles = getHandlerRoles('registrarSalida');

    expect(retencionRoles).toContain(ROLES.INFRACCIONES);
    expect(retencionRoles).not.toContain(ROLES.ENCIERRO);
    expect(retencionRoles).toContain(ROLES.ADMIN);
    expect(retencionRoles).not.toContain(ROLES.CONSULTA);

    expect(salidaRoles).not.toContain(ROLES.INFRACCIONES);
    expect(salidaRoles).toContain(ROLES.ENCIERRO);
    expect(salidaRoles).toContain(ROLES.ADMIN);
  });
});

describe('EncierrosController accesos HTTP de ENCIERRO', () => {
  let app: INestApplication;

  const encierrosService = {
    registrarRetencion: jest.fn(),
    registrarSalida: jest.fn(),
    findVehiculosEnEncierro: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EncierrosController],
      providers: [
        { provide: EncierrosService, useValue: encierrosService },
        RoleAuthGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const httpRequest = context.switchToHttp().getRequest<{
            user?: { idUsuario: number; rol: { nombreRol: string } };
          }>();

          httpRequest.user = {
            idUsuario: 25,
            rol: { nombreRol: ROLES.ENCIERRO },
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    encierrosService.registrarSalida.mockResolvedValue({
      idSalidaVehiculo: 100,
    });
    encierrosService.findVehiculosEnEncierro.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 10, total: 0 },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde HTTP 403 al intentar registrar una retencion', async () => {
    await request(app.getHttpServer())
      .post('/encierros/retenciones')
      .send({ idInfraccion: 10, idEncierro: 2, recibidoPor: 'Operador' })
      .expect(403);

    expect(encierrosService.registrarRetencion).not.toHaveBeenCalled();
  });

  it('permite registrar salida y asigna el usuario autenticado', async () => {
    await request(app.getHttpServer())
      .post('/encierros/salidas')
      .send({
        idRetencionVehiculo: 5,
        idLiberacionVehiculo: 7,
        validadoPor: 'Responsable',
        personaRecibeVehiculo: 'Propietario',
        estadoSalida: 'ENTREGADO',
      })
      .expect(201);

    expect(encierrosService.registrarSalida).toHaveBeenCalledWith(
      expect.objectContaining({
        idRetencionVehiculo: 5,
        idLiberacionVehiculo: 7,
        idUsuarioValidaSalida: 25,
      }),
    );
  });

  it('permite consultar el inventario sin modificar registros', async () => {
    await request(app.getHttpServer()).get('/encierros/vehiculos').expect(200);

    expect(encierrosService.findVehiculosEnEncierro).toHaveBeenCalledTimes(1);
    expect(encierrosService.registrarSalida).not.toHaveBeenCalled();
    expect(encierrosService.registrarRetencion).not.toHaveBeenCalled();
  });
});

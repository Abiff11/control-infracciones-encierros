import 'reflect-metadata';

import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { ROLES } from '../auth/constants/roles.constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { EncierrosController } from './encierros.controller';
import { EncierrosService } from './encierros.service';

type EncierrosHandlerName = 'registrarRetencion' | 'registrarSalida' | 'registrarSalidaAnticipada' | 'listarObservacionesPendientes' | 'resolverObservacion';

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
    const anticipadaRoles = getHandlerRoles('registrarSalidaAnticipada');
    const observacionesRoles = getHandlerRoles('listarObservacionesPendientes');
    const resolverRoles = getHandlerRoles('resolverObservacion');

    expect(retencionRoles).toContain(ROLES.INFRACCIONES);
    expect(retencionRoles).not.toContain(ROLES.ENCIERRO);
    expect(retencionRoles).toContain(ROLES.ADMIN);
    expect(retencionRoles).not.toContain(ROLES.CONSULTA);

    expect(salidaRoles).not.toContain(ROLES.INFRACCIONES);
    expect(salidaRoles).toContain(ROLES.ENCIERRO);
    expect(salidaRoles).toContain(ROLES.ADMIN);
    expect(anticipadaRoles).toEqual([ROLES.ENCIERRO]);
    expect(anticipadaRoles).not.toContain(ROLES.ADMIN);
    expect(anticipadaRoles).not.toContain(ROLES.OPERADOR);
    expect(anticipadaRoles).not.toContain(ROLES.INFRACCIONES);
    expect(observacionesRoles).toEqual([ROLES.ADMIN, ROLES.INFRACCIONES]);
    expect(observacionesRoles).not.toContain(ROLES.CONSULTA);
    expect(observacionesRoles).not.toContain(ROLES.ENCIERRO);
    expect(resolverRoles).toEqual([ROLES.INFRACCIONES, ROLES.ADMIN]);
    expect(resolverRoles).not.toContain(ROLES.ENCIERRO);
  });
});

describe('EncierrosController accesos HTTP de ENCIERRO', () => {
  let app: INestApplication;

  const encierrosService = {
    registrarRetencion: jest.fn(),
    registrarSalida: jest.fn(),
    registrarSalidaAnticipada: jest.fn(),
    listarObservacionesPendientes: jest.fn(),
    resolverObservacion: jest.fn(),
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    encierrosService.registrarSalidaAnticipada.mockResolvedValue({ idSalidaVehiculo: 101 });
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


  it('permite salida anticipada sin ID de liberacion y asigna usuario autenticado', async () => {
    await request(app.getHttpServer())
      .post('/encierros/salidas/anticipadas')
      .send({
        idRetencionVehiculo: 5,
        folioLiberacionPresentado: 'FL-2026-55',
        placasCotejadas: 'ABC-123-D',
        datosVehiculoCotejados: { marca: 'Nissan', linea: 'Versa' },
        autorizacionDocumentalVerificada: true,
        referenciaDocumentoLiberacion: 'Oficio de liberacion con firma',
        nombrePropietarioDeclarado: 'Propietario',
        validadoPor: 'Responsable',
        personaRecibeVehiculo: 'Persona receptora',
      })
      .expect(201);

    expect(encierrosService.registrarSalidaAnticipada).toHaveBeenCalledWith(
      expect.objectContaining({
        idRetencionVehiculo: 5,
        idUsuarioValidaSalida: 25,
      }),
    );
  });

  it('rechaza salida anticipada sin referencia documental', async () => {
    await request(app.getHttpServer())
      .post('/encierros/salidas/anticipadas')
      .send({
        idRetencionVehiculo: 5,
        folioLiberacionPresentado: 'FL-2026-55',
        placasCotejadas: 'ABC-123-D',
        datosVehiculoCotejados: { marca: 'Nissan', linea: 'Versa' },
        autorizacionDocumentalVerificada: true,
        nombrePropietarioDeclarado: 'Propietario',
        validadoPor: 'Responsable',
        personaRecibeVehiculo: 'Persona receptora',
      })
      .expect(400);
    expect(encierrosService.registrarSalidaAnticipada).not.toHaveBeenCalled();
  });

  it('prohibe a ENCIERRO abrir la bandeja reservada para INFRACCIONES', async () => {
    await request(app.getHttpServer())
      .get('/encierros/observaciones/pendientes')
      .expect(403);
    expect(encierrosService.listarObservacionesPendientes).not.toHaveBeenCalled();
  });

  it('prohibe a ENCIERRO resolver observaciones', async () => {
    await request(app.getHttpServer())
      .patch('/encierros/observaciones/21')
      .send({ decision: 'CORREGIR', resolucion: 'Documento oficial cotejado.' })
      .expect(403);
    expect(encierrosService.resolverObservacion).not.toHaveBeenCalled();
  });

  it('permite consultar el inventario sin modificar registros', async () => {
    await request(app.getHttpServer()).get('/encierros/vehiculos').expect(200);

    expect(encierrosService.findVehiculosEnEncierro).toHaveBeenCalledTimes(1);
    expect(encierrosService.registrarSalida).not.toHaveBeenCalled();
    expect(encierrosService.registrarRetencion).not.toHaveBeenCalled();
  });
});

describe('EncierrosController salida anticipada exclusiva de ENCIERRO', () => {
  let app: INestApplication;
  let rolSimulado: string = ROLES.ADMIN;
  const service = {
    registrarSalidaAnticipada: jest.fn(),
    registrarSalida: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EncierrosController],
      providers: [
        { provide: EncierrosService, useValue: service },
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
            idUsuario: 27,
            rol: { nombreRol: rolSimulado },
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.registrarSalida.mockResolvedValue({ idSalidaVehiculo: 100 });
  });

  afterAll(async () => { await app.close(); });

  it.each([ROLES.ADMIN, ROLES.OPERADOR, ROLES.INFRACCIONES])(
    'deniega HTTP 403 al rol %s para salida anticipada',
    async (rol) => {
      rolSimulado = rol;
      await request(app.getHttpServer())
        .post('/encierros/salidas/anticipadas')
        .send({
          idRetencionVehiculo: 5,
          folioLiberacionPresentado: 'FL-2026-55',
          placasCotejadas: 'ABC123',
          datosVehiculoCotejados: { marca: 'Nissan', linea: 'Versa' },
          autorizacionDocumentalVerificada: true,
          referenciaDocumentoLiberacion: 'Oficio firmado',
          nombrePropietarioDeclarado: 'Propietario',
          validadoPor: 'Encargado',
          personaRecibeVehiculo: 'Persona receptora',
        })
        .expect(403);
      expect(service.registrarSalidaAnticipada).not.toHaveBeenCalled();
    },
  );

  it('conserva la salida ordinaria para ADMIN', async () => {
    rolSimulado = ROLES.ADMIN;
    await request(app.getHttpServer())
      .post('/encierros/salidas')
      .send({
        idRetencionVehiculo: 5,
        idLiberacionVehiculo: 7,
        validadoPor: 'Encargado',
        personaRecibeVehiculo: 'Persona receptora',
        estadoSalida: 'ENTREGADO',
      })
      .expect(201);
    expect(service.registrarSalida).toHaveBeenCalledTimes(1);
  });
});

describe('EncierrosController atencion de observaciones por INFRACCIONES', () => {
  let app: INestApplication;
  const service = { resolverObservacion: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EncierrosController],
      providers: [
        { provide: EncierrosService, useValue: service },
        RoleAuthGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const req = context.switchToHttp().getRequest<{
            user?: { idUsuario: number; rol: { nombreRol: string } };
          }>();
          req.user = { idUsuario: 27, rol: { nombreRol: ROLES.INFRACCIONES } };
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service.resolverObservacion.mockResolvedValue({ idObservacion: 21, estatus: 'CORREGIDA' });
  });
  afterAll(async () => { await app.close(); });

  it('resuelve observacion con identidad del usuario autenticado', async () => {
    await request(app.getHttpServer())
      .patch('/encierros/observaciones/21')
      .send({
        decision: 'CORREGIR',
        resolucion: 'El año modelo fue verificado en tarjeta de circulacion.',
      })
      .expect(200);
    expect(service.resolverObservacion).toHaveBeenCalledWith({
      idObservacion: 21,
      idUsuarioResuelve: 27,
      decision: 'CORREGIR',
      resolucion: 'El año modelo fue verificado en tarjeta de circulacion.',
    });
  });

  it('no admite cambios a placas desde esta operacion', async () => {
    await request(app.getHttpServer())
      .patch('/encierros/observaciones/21')
      .send({
        decision: 'CORREGIR',
        resolucion: 'Documento oficial cotejado.',
        placas: 'OTRA-PLACA',
      })
      .expect(400);
    expect(service.resolverObservacion).not.toHaveBeenCalled();
  });

  it('no acepta rechazo sin justificacion', async () => {
    await request(app.getHttpServer())
      .patch('/encierros/observaciones/21')
      .send({ decision: 'RECHAZAR', resolucion: 'No' })
      .expect(400);
    expect(service.resolverObservacion).not.toHaveBeenCalled();
  });

  it('no acepta decisiones fuera de CORREGIR y RECHAZAR', async () => {
    await request(app.getHttpServer())
      .patch('/encierros/observaciones/21')
      .send({
        decision: 'EDITAR_SERIE',
        resolucion: 'Cambio no permitido desde la bandeja.',
      })
      .expect(400);
    expect(service.resolverObservacion).not.toHaveBeenCalled();
  });
});

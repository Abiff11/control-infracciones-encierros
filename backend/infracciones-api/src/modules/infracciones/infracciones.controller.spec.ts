import 'reflect-metadata';

import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { READ_ROLES } from '../auth/constants/roles.constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoleAuthGuard } from '../auth/guards/role-auth.guard';
import { InfraccionesAdminOperacionesService } from './infracciones-admin-operaciones.service';
import { InfraccionesAdminService } from './infracciones-admin.service';
import { InfraccionesController } from './infracciones.controller';
import { InfraccionesExcelReportService } from './infracciones-excel-report.service';
import { InfraccionesListService } from './infracciones-list.service';
import { InfraccionesReportesService } from './infracciones-reportes.service';
import { InfraccionesService } from './infracciones.service';

describe('InfraccionesController disponibilidad generica', () => {
  let app: INestApplication;
  let httpServer: Parameters<typeof request>[0];
  const listService = {
    findAll: jest.fn(),
  };
  const excelService = {
    assertValidFields: jest.fn(),
    write: jest.fn(),
  };
  const reportesService = {
    getReportAvailability: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InfraccionesController],
      providers: [
        { provide: InfraccionesService, useValue: {} },
        { provide: InfraccionesListService, useValue: listService },
        { provide: InfraccionesExcelReportService, useValue: excelService },
        { provide: InfraccionesReportesService, useValue: reportesService },
        { provide: InfraccionesAdminService, useValue: {} },
        { provide: InfraccionesAdminOperacionesService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const httpRequest = context.switchToHttp().getRequest<{
            user?: { idUsuario: number; rol: { nombreRol: string } };
          }>();
          httpRequest.user = {
            idUsuario: 1,
            rol: { nombreRol: READ_ROLES[0] },
          };
          return true;
        },
      })
      .overrideGuard(RoleAuthGuard)
      .useValue({ canActivate: () => true })
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
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];
  });

  beforeEach(() => {
    jest.clearAllMocks();
    listService.findAll.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    reportesService.getReportAvailability.mockResolvedValue({ total: 13_827 });
    excelService.write.mockImplementation(
      (_query: unknown, response: { end: (body: string) => void }) => {
        response.end('xlsx-test');
        return Promise.resolve();
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('conserva autenticacion y roles de lectura en el controlador', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, InfraccionesController),
    ).toEqual([JwtAuthGuard, RoleAuthGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, InfraccionesController)).toEqual(
      READ_ROLES,
    );
  });

  it('registra GET generico y conserva filtros en el DTO', async () => {
    await request(httpServer)
      .get('/infracciones/reportes/disponibilidad')
      .query({
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
        idRegion: 10,
      })
      .expect(200)
      .expect({ total: 13_827 });

    expect(reportesService.getReportAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
        idRegion: 10,
      }),
    );
  });

  it('registra POST generico y conserva seleccion multiple y filtros', async () => {
    reportesService.getReportAvailability.mockResolvedValueOnce({ total: 2 });

    await request(httpServer)
      .post('/infracciones/reportes/disponibilidad')
      .send({
        idInfracciones: [10, 11],
        idEstatusInfraccion: 1,
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
      })
      .expect(201)
      .expect({ total: 2 });

    expect(reportesService.getReportAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        idInfracciones: [10, 11],
        idEstatusInfraccion: 1,
        fechaInicio: '2026-11-01',
        fechaFin: '2026-11-30',
      }),
    );
  });

  it('aplica la validacion del DTO en la ruta generica', async () => {
    await request(httpServer)
      .post('/infracciones/reportes/disponibilidad')
      .send({ idInfracciones: [0], campoNoPermitido: true })
      .expect(400);

    expect(reportesService.getReportAvailability).not.toHaveBeenCalled();
  });

  it('registra exclusivamente GET y POST para el contrato generico', async () => {
    await request(httpServer)
      .put('/infracciones/reportes/disponibilidad')
      .send({})
      .expect(404);
  });

  it('retira las rutas heredadas de disponibilidad y validacion PDF', async () => {
    await request(httpServer)
      .get('/infracciones/reportes/pdf/disponibilidad')
      .expect(404);
    await request(httpServer)
      .post('/infracciones/reportes/pdf/disponibilidad')
      .send({ idInfracciones: [10] })
      .expect(404);
    await request(httpServer)
      .post('/infracciones/reportes/pdf/validacion')
      .send({ idInfracciones: [10] })
      .expect(404);

    expect(reportesService.getReportAvailability).not.toHaveBeenCalled();
  });

  it('Q3.2-09 rechaza rangos invalidos en el listado sin ejecutar el servicio', async () => {
    const response = await request(httpServer)
      .get('/infracciones')
      .query({ fechaDesde: '2026-08-24', fechaHasta: '2026-08-20' })
      .expect(400);

    expect((response.body as { message: unknown }).message).toContain(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
    expect(listService.findAll).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', { fechaInicio: '2026-08-24', fechaFin: '2026-08-20' }],
    ['POST', { fechaDesde: '2026-08-24', fechaFin: '2026-08-20' }],
  ] as const)(
    'Q3.2-10 rechaza %s de disponibilidad sin ejecutar el servicio',
    async (method, values) => {
      const pendingRequest =
        method === 'GET'
          ? request(httpServer)
              .get('/infracciones/reportes/disponibilidad')
              .query(values)
          : request(httpServer)
              .post('/infracciones/reportes/disponibilidad')
              .send(values);
      const response = await pendingRequest.expect(400);

      expect((response.body as { message: unknown }).message).toContain(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      expect(reportesService.getReportAvailability).not.toHaveBeenCalled();
    },
  );

  it('Q3.2-11 rechaza Excel antes de validar campos o escribir la respuesta', async () => {
    const response = await request(httpServer)
      .post('/infracciones/reportes/excel')
      .send({
        campos: ['folioInfraccion'],
        fechaInicio: '2026-08-24',
        fechaHasta: '2026-08-20',
      })
      .expect(400);

    expect((response.body as { message: unknown }).message).toContain(
      'La fecha inicial no puede ser posterior a la fecha final.',
    );
    expect(response.headers['content-type']).not.toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(excelService.assertValidFields).not.toHaveBeenCalled();
    expect(excelService.write).not.toHaveBeenCalled();
  });

  it('Q3.2-12 conserva listado valido y sus fechas', async () => {
    await request(httpServer)
      .get('/infracciones')
      .query({ fechaDesde: '2026-08-20', fechaHasta: '2026-08-24' })
      .expect(200);

    expect(listService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        fechaDesde: '2026-08-20',
        fechaHasta: '2026-08-24',
      }),
    );
  });

  it('Q3.2-12 conserva disponibilidad valida en GET y POST', async () => {
    await request(httpServer)
      .get('/infracciones/reportes/disponibilidad')
      .query({ fechaInicio: '2026-08-20', fechaHasta: '2026-08-24' })
      .expect(200);
    await request(httpServer)
      .post('/infracciones/reportes/disponibilidad')
      .send({
        idInfracciones: [10, 11],
        fechaInicio: '2026-08-20',
        fechaHasta: '2026-08-24',
      })
      .expect(201);

    expect(reportesService.getReportAvailability).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fechaInicio: '2026-08-20',
        fechaHasta: '2026-08-24',
      }),
    );
    expect(reportesService.getReportAvailability).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        idInfracciones: [10, 11],
        fechaInicio: '2026-08-20',
        fechaHasta: '2026-08-24',
      }),
    );
  });

  it('Q3.2-12 conserva Excel valido y finaliza la respuesta simulada', async () => {
    const query = {
      campos: ['folioInfraccion'],
      idInfracciones: [10, 11],
      fechaInicio: '2026-08-20',
      fechaHasta: '2026-08-24',
    };

    const response = await request(httpServer)
      .post('/infracciones/reportes/excel')
      .send(query)
      .expect(200);

    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(excelService.assertValidFields).toHaveBeenCalledWith(query.campos);
    expect(excelService.write).toHaveBeenCalledWith(
      expect.objectContaining(query),
      expect.anything(),
    );
  });
});

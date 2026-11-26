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
  const reportesService = {
    getReportAvailability: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [InfraccionesController],
      providers: [
        { provide: InfraccionesService, useValue: {} },
        { provide: InfraccionesListService, useValue: {} },
        { provide: InfraccionesExcelReportService, useValue: {} },
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
    reportesService.getReportAvailability.mockResolvedValue({ total: 13_827 });
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
});

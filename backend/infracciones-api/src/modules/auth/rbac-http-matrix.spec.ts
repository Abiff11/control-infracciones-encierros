import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AuditoriaController } from '../auditoria/auditoria.controller';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EncierrosController } from '../encierros/encierros.controller';
import { EncierrosService } from '../encierros/encierros.service';
import { InfraccionesAdminOperacionesService } from '../infracciones/infracciones-admin-operaciones.service';
import { InfraccionesAdminService } from '../infracciones/infracciones-admin.service';
import { InfraccionesController } from '../infracciones/infracciones.controller';
import { InfraccionesExcelReportService } from '../infracciones/infracciones-excel-report.service';
import { InfraccionesListService } from '../infracciones/infracciones-list.service';
import { InfraccionesReportesService } from '../infracciones/infracciones-reportes.service';
import { InfraccionesService } from '../infracciones/infracciones.service';
import { LiberacionesController } from '../liberaciones/liberaciones.controller';
import { LiberacionesService } from '../liberaciones/liberaciones.service';
import { PagosController } from '../pagos/pagos.controller';
import { PagosService } from '../pagos/pagos.service';
import { UsuariosController } from '../usuarios/usuarios.controller';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ROLES, type RoleName } from './constants/roles.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RoleAuthGuard } from './guards/role-auth.guard';

/**
 * Pruebas HTTP de autorización: el JWT se simula para poder recorrer los siete
 * roles sin tocar PostgreSQL. RoleAuthGuard y los @Roles de los controladores
 * son reales; las pruebas de credenciales/CSRF siguen en security-smoke.mjs.
 */
const ALL_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.SECCION_PRIMERA,
  ROLES.INFRACCIONES,
  ROLES.LIBERACIONES,
  ROLES.ENCIERRO,
  ROLES.CONSULTA,
  ROLES.OPERADOR,
];

const inventoryRoles: RoleName[] = [
  ROLES.ADMIN,
  ROLES.SECCION_PRIMERA,
  ROLES.LIBERACIONES,
  ROLES.ENCIERRO,
  ROLES.CONSULTA,
  ROLES.OPERADOR,
];

const encierros = {
  findVehiculosEnEncierro: jest.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 10, total: 0 },
  }),
  getVehiculosEnEncierroResumen: jest.fn().mockResolvedValue({ total: 0 }),
  listarObservacionesPendientes: jest.fn().mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0 },
  }),
  resolverObservacion: jest.fn().mockResolvedValue({ idObservacion: 21 }),
  registrarRetencion: jest.fn().mockResolvedValue({ idRetencionVehiculo: 5 }),
  registrarSalida: jest.fn().mockResolvedValue({ idSalidaVehiculo: 6 }),
  registrarSalidaAnticipada: jest.fn().mockResolvedValue({ idSalidaVehiculo: 7 }),
};

const infracciones = {
  getResumenPorEstatus: jest.fn().mockResolvedValue({ total: 0 }),
  findDetalleCompletoByInfraccion: jest.fn().mockResolvedValue({
    idInfraccion: 15,
    vehiculo: { placas: 'ABC1234', serie: 'SERIE-PRUEBA' },
  }),
  crearInfraccionCompleta: jest.fn().mockResolvedValue({ idInfraccion: 15 }),
};
const pagos = {
  findByInfraccion: jest.fn().mockResolvedValue([]),
  registrarPago: jest.fn().mockResolvedValue({ idPagoInfraccion: 8 }),
};
const liberaciones = {
  findByInfraccion: jest.fn().mockResolvedValue([]),
  generarLiberacion: jest.fn().mockResolvedValue({ idLiberacionVehiculo: 9 }),
};
const usuarios = {
  findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
};
const auditoria = {
  findAll: jest.fn().mockResolvedValue({ items: [] }),
};

type HttpMethod = 'get' | 'post' | 'patch';

interface RoleScenario {
  readonly label: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly allowed: readonly RoleName[];
  readonly successStatus: 200 | 201;
  readonly handler: jest.Mock;
  readonly body?: Record<string, unknown>;
}

const escenarios: RoleScenario[] = [
  {
    label: 'resumen de infracciones',
    method: 'get',
    path: '/infracciones/resumen/estatus',
    allowed: ALL_ROLES,
    successStatus: 200,
    handler: infracciones.getResumenPorEstatus,
  },
  {
    label: 'detalle de infracción',
    method: 'get',
    path: '/infracciones/15/detalle',
    allowed: ALL_ROLES,
    successStatus: 200,
    handler: infracciones.findDetalleCompletoByInfraccion,
  },
  {
    label: 'inventario de encierros',
    method: 'get',
    path: '/encierros/vehiculos',
    allowed: inventoryRoles,
    successStatus: 200,
    handler: encierros.findVehiculosEnEncierro,
  },
  {
    label: 'resumen del inventario de encierros',
    method: 'get',
    path: '/encierros/vehiculos/resumen',
    allowed: inventoryRoles,
    successStatus: 200,
    handler: encierros.getVehiculosEnEncierroResumen,
  },
  {
    label: 'observaciones pendientes',
    method: 'get',
    path: '/encierros/observaciones/pendientes',
    allowed: [ROLES.ADMIN, ROLES.INFRACCIONES],
    successStatus: 200,
    handler: encierros.listarObservacionesPendientes,
  },
  {
    label: 'pagos por infracción',
    method: 'get',
    path: '/pagos/infraccion/15',
    allowed: ALL_ROLES,
    successStatus: 200,
    handler: pagos.findByInfraccion,
  },
  {
    label: 'liberaciones por infracción',
    method: 'get',
    path: '/liberaciones/infraccion/15',
    allowed: ALL_ROLES,
    successStatus: 200,
    handler: liberaciones.findByInfraccion,
  },
  {
    label: 'administración de usuarios',
    method: 'get',
    path: '/usuarios',
    allowed: [ROLES.ADMIN],
    successStatus: 200,
    handler: usuarios.findAll,
  },
  {
    label: 'auditoría',
    method: 'get',
    path: '/auditoria',
    allowed: [ROLES.ADMIN],
    successStatus: 200,
    handler: auditoria.findAll,
  },
  {
    label: 'captura de infracción',
    method: 'post',
    path: '/infracciones',
    allowed: [
      ROLES.ADMIN,
      ROLES.SECCION_PRIMERA,
      ROLES.INFRACCIONES,
      ROLES.OPERADOR,
    ],
    successStatus: 201,
    handler: infracciones.crearInfraccionCompleta,
    body: {
      infractor: { idSexo: 1, nombre: 'Persona', apellidoPaterno: 'Prueba' },
      vehiculo: { idClaseVehiculo: 1, idLineaVehiculo: 1, idServicio: 1 },
      lugarInfraccion: { municipio: 'Oaxaca de Juárez' },
      infraccion: {
        idDelegacion: 1,
        idTipoProcedimiento: 1,
        idEstatusInfraccion: 1,
        fechaInfraccion: '2026-11-22',
        horaInfraccion: '12:00',
        motivos: [],
      },
    },
  },
  {
    label: 'retención de vehículo',
    method: 'post',
    path: '/encierros/retenciones',
    allowed: [ROLES.ADMIN, ROLES.INFRACCIONES, ROLES.OPERADOR],
    successStatus: 201,
    handler: encierros.registrarRetencion,
    body: { idInfraccion: 15, idEncierro: 2, recibidoPor: 'Responsable' },
  },
  {
    label: 'pago de infracción',
    method: 'post',
    path: '/pagos',
    allowed: [ROLES.ADMIN, ROLES.INFRACCIONES, ROLES.OPERADOR],
    successStatus: 201,
    handler: pagos.registrarPago,
    body: {
      idInfraccion: 15,
      folioLineaCaptura: 'LC-2026-001',
      conceptos: [{ claveConcepto: 'A-01', monto: '100.00' }],
    },
  },
  {
    label: 'liberación de vehículo',
    method: 'post',
    path: '/liberaciones',
    allowed: [
      ROLES.ADMIN,
      ROLES.INFRACCIONES,
      ROLES.LIBERACIONES,
      ROLES.OPERADOR,
    ],
    successStatus: 201,
    handler: liberaciones.generarLiberacion,
    body: {
      idInfraccion: 15,
      idPagoInfraccion: 8,
      folioLiberacion: 'LIB-2026-001',
      liberadoPor: 'Responsable',
    },
  },
  {
    label: 'salida ordinaria',
    method: 'post',
    path: '/encierros/salidas',
    allowed: [ROLES.ADMIN, ROLES.ENCIERRO, ROLES.OPERADOR],
    successStatus: 201,
    handler: encierros.registrarSalida,
    body: {
      idRetencionVehiculo: 5,
      idLiberacionVehiculo: 9,
      validadoPor: 'Responsable',
      personaRecibeVehiculo: 'Propietario',
      estadoSalida: 'ENTREGADO',
    },
  },
  {
    label: 'salida anticipada exclusiva',
    method: 'post',
    path: '/encierros/salidas/anticipadas',
    allowed: [ROLES.ENCIERRO],
    successStatus: 201,
    handler: encierros.registrarSalidaAnticipada,
    body: {
      idRetencionVehiculo: 5,
      folioLiberacionPresentado: 'LIB-2026-001',
      placasCotejadas: 'ABC-123-D',
      datosVehiculoCotejados: { marca: 'Nissan', linea: 'Versa' },
      autorizacionDocumentalVerificada: true,
      nombrePropietarioDeclarado: 'Propietario',
      validadoPor: 'Responsable',
      personaRecibeVehiculo: 'Propietario',
    },
  },
  {
    label: 'resolución de observaciones',
    method: 'patch',
    path: '/encierros/observaciones/21',
    allowed: [ROLES.ADMIN, ROLES.INFRACCIONES],
    successStatus: 200,
    handler: encierros.resolverObservacion,
    body: { decision: 'RECHAZAR', resolucion: 'Documento oficial cotejado.' },
  },
];

describe('RBAC HTTP: siete roles y rutas operativas críticas', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        InfraccionesController,
        EncierrosController,
        PagosController,
        LiberacionesController,
        UsuariosController,
        AuditoriaController,
      ],
      providers: [
        RoleAuthGuard,
        { provide: InfraccionesService, useValue: infracciones },
        { provide: InfraccionesListService, useValue: {} },
        { provide: InfraccionesExcelReportService, useValue: {} },
        { provide: InfraccionesReportesService, useValue: {} },
        { provide: InfraccionesAdminService, useValue: {} },
        { provide: InfraccionesAdminOperacionesService, useValue: {} },
        { provide: EncierrosService, useValue: encierros },
        { provide: PagosService, useValue: pagos },
        { provide: LiberacionesService, useValue: liberaciones },
        { provide: UsuariosService, useValue: usuarios },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext): boolean {
          const httpRequest = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { idUsuario: number; rol: { nombreRol: RoleName } };
          }>();
          const role = httpRequest.headers['x-test-role'];
          if (!role || !ALL_ROLES.includes(role as RoleName)) {
            throw new UnauthorizedException('Credenciales ausentes en prueba');
          }

          httpRequest.user = {
            idUsuario: 25,
            rol: { nombreRol: role as RoleName },
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

  afterAll(async () => {
    await app.close();
  });

  for (const escenario of escenarios) {
    describe(`${escenario.method.toUpperCase()} ${escenario.path}`, () => {
      it('rechaza la petición anónima con HTTP 401', async () => {
        jest.clearAllMocks();
        const call = request(app.getHttpServer())[escenario.method](
          escenario.path,
        );
        if (escenario.body) {
          call.send(escenario.body);
        }
        await call.expect(401);
        expect(escenario.handler).not.toHaveBeenCalled();
      });

      for (const role of ALL_ROLES) {
        it(`responde al rol ${role} según la política y no ejecuta acciones denegadas`, async () => {
          jest.clearAllMocks();
          const call = request(app.getHttpServer())[escenario.method](
            escenario.path,
          ).set('x-test-role', role);
          if (escenario.body) {
            call.send(escenario.body);
          }

          const isAllowed = escenario.allowed.includes(role);
          await call.expect(isAllowed ? escenario.successStatus : 403);
          expect(escenario.handler).toHaveBeenCalledTimes(isAllowed ? 1 : 0);
        });
      }
    });
  }

  it('oculta datos sensibles al rol CONSULTA sin alterar la consulta', async () => {
    jest.clearAllMocks();
    const response = await request(app.getHttpServer())
      .get('/infracciones/15/detalle')
      .set('x-test-role', ROLES.CONSULTA)
      .expect(200);

    const body = response.body as {
      vehiculo: { serie: string; placas: string };
    };
    expect(body.vehiculo.serie).toBe('[REDACTED]');
    expect(body.vehiculo.placas).toBe('[REDACTED]1234');
    expect(infracciones.findDetalleCompletoByInfraccion).toHaveBeenCalledTimes(
      1,
    );
  });
});

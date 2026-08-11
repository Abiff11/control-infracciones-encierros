import { AuditoriaService } from './auditoria.service';
import { SecurityObservabilityService } from './security-observability.service';

describe('SecurityObservabilityService', () => {
  const auditoriaServiceMock = {
    registrar: jest.fn(),
  };

  let service: SecurityObservabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditoriaServiceMock.registrar.mockResolvedValue({});
    service = new SecurityObservabilityService(
      auditoriaServiceMock as unknown as AuditoriaService,
    );
  });

  it('registra 401 como rechazo de autenticacion de severidad media', async () => {
    await service.recordHttpRejection({
      statusCode: 401,
      requestId: 'req-1',
      ip: '203.0.113.10',
      httpMethod: 'GET',
      requestPath: '/api/dashboard',
    });

    expect(auditoriaServiceMock.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'AUTHENTICATION_REJECTED',
        entidad: 'SEGURIDAD',
        severity: 'MEDIUM',
        requestId: 'req-1',
      }),
    );
  });

  it('registra CSRF como evento HIGH cuando existe accion explicita', async () => {
    await service.recordHttpRejection({
      statusCode: 403,
      explicitAction: 'CSRF_REJECTED',
      requestId: 'req-2',
      httpMethod: 'POST',
      requestPath: '/api/pagos',
      cfRay: 'ray-id',
    });

    expect(auditoriaServiceMock.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'CSRF_REJECTED',
        severity: 'HIGH',
        despuesJson: {
          statusCode: 403,
          cfRay: 'ray-id',
        },
      }),
    );
  });

  it('registra 429 como evento HIGH', async () => {
    await service.recordHttpRejection({
      statusCode: 429,
      requestId: 'req-3',
    });

    expect(auditoriaServiceMock.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'RATE_LIMIT_REJECTED',
        severity: 'HIGH',
      }),
    );
  });

  it('ignora respuestas que no son eventos de seguridad', async () => {
    await service.recordHttpRejection({
      statusCode: 200,
      requestId: 'req-4',
    });

    expect(auditoriaServiceMock.registrar).not.toHaveBeenCalled();
  });

  it('no propaga fallos de persistencia al flujo HTTP', async () => {
    auditoriaServiceMock.registrar.mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.recordHttpRejection({
        statusCode: 403,
        requestId: 'req-5',
      }),
    ).resolves.toBeUndefined();
  });
});

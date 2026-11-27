import 'reflect-metadata';

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import { SafeExceptionFilter } from './safe-exception.filter';

const PATH = '/api/infracciones/reportes/disponibilidad';
const TIMESTAMP = '2026-11-27T12:00:00.000Z';
const RATE_LIMIT_MESSAGE =
  'Se alcanzó temporalmente el límite de solicitudes. Espera un momento e intenta nuevamente.';

function catchException(
  exception: unknown,
  initialHeaders: Record<string, string> = {},
) {
  const headers = new Map(Object.entries(initialHeaders));
  const json = jest.fn<void, [Record<string, unknown>]>();
  const response = {
    status: jest.fn(() => ({ json })),
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    removeHeader: jest.fn((name: string) => {
      headers.delete(name);
    }),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', originalUrl: PATH }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  new SafeExceptionFilter().catch(exception, host);

  return { response, json, headers };
}

describe('SafeExceptionFilter', () => {
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(TIMESTAMP));
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each([
    ['Q4.1-01 ThrottlerException real', new ThrottlerException()],
    [
      'Q4.1-02 mensaje tecnico',
      new HttpException('ThrottlerException: Too Many Requests', 429),
    ],
    ['Q4.1-03 mensaje vacio', new HttpException('', 429)],
    [
      'Q4.1-04 objeto',
      new HttpException({ message: 'internal rate limiter', error: 'InternalError' }, 429),
    ],
    [
      'Q4.1-04 arreglo de mensajes',
      new HttpException({ message: ['internal limit', 'internal tracker'] }, 429),
    ],
  ] as const)('%s normaliza el mensaje y conserva HTTP 429', (_name, exception) => {
    const { response, json } = catchException(exception);

    expect(response.status).toHaveBeenCalledTimes(1);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(json).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledWith({
      statusCode: 429,
      message: RATE_LIMIT_MESSAGE,
      error: 'Too Many Requests',
      path: PATH,
      timestamp: TIMESTAMP,
    });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('Q4.1-05 conserva path y timestamp', () => {
    const { json } = catchException(new ThrottlerException());

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ path: PATH, timestamp: TIMESTAMP }),
    );
  });

  it('Q4.1-06 conserva los encabezados existentes de rate limiting', () => {
    const initialHeaders = {
      'Retry-After': '15',
      'X-RateLimit-Limit': '120',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '15',
      'Retry-After-report': '20',
    };
    const { response, headers } = catchException(
      new ThrottlerException(),
      initialHeaders,
    );

    expect(response.setHeader).not.toHaveBeenCalled();
    expect(response.removeHeader).not.toHaveBeenCalled();
    expect(Object.fromEntries(headers)).toEqual(initialHeaders);
  });

  it.each([
    [400, ['El campo es obligatorio'], 'Bad Request'],
    [401, 'Credenciales invalidas', 'Unauthorized'],
    [403, 'Acceso denegado', 'Forbidden'],
    [404, 'No encontrado', 'Not Found'],
    [409, 'Conflicto existente', 'Conflict'],
  ] as const)(
    'Q4.1-07 conserva el contrato de HTTP %i',
    (statusCode, message, error) => {
      const { response, json } = catchException(
        new HttpException({ message, error }, statusCode),
      );

      expect(response.status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith({
        statusCode,
        message,
        error,
        path: PATH,
        timestamp: TIMESTAMP,
      });
      expect(loggerError).not.toHaveBeenCalled();
    },
  );

  it('Q4.1-07 conserva respuestas HTTP con mensaje de texto', () => {
    const { json } = catchException(new HttpException('No encontrado', 404));

    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'No encontrado',
      error: undefined,
      path: PATH,
      timestamp: TIMESTAMP,
    });
  });

  it('Q4.1-08 conserva el contrato de una excepcion HTTP 500', () => {
    const { response, json } = catchException(
      new HttpException(
        { message: 'Error de prueba', error: 'Internal Server Error' },
        500,
      ),
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error de prueba',
      error: 'Internal Server Error',
      path: PATH,
      timestamp: TIMESTAMP,
    });
    expect(loggerError).toHaveBeenCalledTimes(1);
  });

  it('Q4.1-08 oculta los detalles de excepciones inesperadas', () => {
    const { response, json } = catchException(new Error('internal detail'));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno del servidor',
      error: undefined,
      path: PATH,
      timestamp: TIMESTAMP,
    });
  });

  it.each([
    [
      { code: '23505' },
      'La operacion ya fue registrada o entra en conflicto con un registro existente.',
    ],
    ...['40001', '40P01', '55P03'].map((code) => [
      { driverError: { code } },
      'El registro fue actualizado por otro usuario. Actualiza la informacion e intenta nuevamente.',
    ] as const),
  ] as const)(
    'Q4.1-09 conserva conflictos PostgreSQL %o',
    (exception, message) => {
      const { response, json } = catchException(exception);

      expect(response.status).toHaveBeenCalledWith(409);
      expect(json).toHaveBeenCalledWith({
        statusCode: 409,
        message,
        error: 'Conflict',
        path: PATH,
        timestamp: TIMESTAMP,
      });
      expect(loggerError).not.toHaveBeenCalled();
    },
  );

  it('Q4.1-10 conserva los detalles del registro interno para HTTP 500', () => {
    const exception = new Error('internal detail');
    catchException(exception);

    expect(loggerError).toHaveBeenCalledWith({
      statusCode: 500,
      method: 'GET',
      path: PATH,
      exceptionName: 'Error',
      exceptionMessage: 'internal detail',
      databaseErrorCode: null,
      stack: exception.stack,
    });
  });
});

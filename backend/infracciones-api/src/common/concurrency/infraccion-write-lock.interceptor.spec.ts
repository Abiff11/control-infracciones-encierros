import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import type { DataSource, QueryRunner } from 'typeorm';

import {
  InfraccionWriteLockInterceptor,
  type InfraccionWriteLockSource,
} from './infraccion-write-lock.interceptor';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function buildInterceptor(
  source: InfraccionWriteLockSource,
  config: Record<string, number> = {},
) {
  const query = jest.fn<Promise<unknown[]>, [sql: string, params: number[]]>();
  const release = jest.fn().mockResolvedValue(undefined);
  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query,
    release,
  } as unknown as QueryRunner;
  const dataSource = {
    createQueryRunner: () => queryRunner,
  } as unknown as DataSource;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(source),
  } as unknown as Reflector;
  const interceptor = new InfraccionWriteLockInterceptor(
    reflector,
    dataSource,
    new ConfigService(config),
  );

  return { interceptor, query, release };
}

describe('InfraccionWriteLockInterceptor', () => {
  it('acquires and releases the advisory lock using params.idInfraccion', async () => {
    const { interceptor, query, release } = buildInterceptor(
      'params.idInfraccion',
    );
    query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);
    const handle = jest.fn(() => of('ok'));
    const next = { handle } as CallHandler;

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ params: { idInfraccion: '42' }, body: {} }),
        next,
      ),
    );

    expect(result).toBe('ok');
    expect(query).toHaveBeenCalledWith(
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [734_221, 42],
    );
    expect(query).toHaveBeenCalledWith(
      'SELECT pg_advisory_unlock($1, $2)',
      [734_221, 42],
    );
    expect(handle).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does not acquire a lock when the route param is invalid', async () => {
    const { interceptor, query, release } = buildInterceptor(
      'params.idInfraccion',
    );
    const handle = jest.fn(() => of('ok'));
    const next = { handle } as CallHandler;

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ params: { idInfraccion: 'invalid' }, body: {} }),
        next,
      ),
    );

    expect(result).toBe('ok');
    expect(query).not.toHaveBeenCalled();
    expect(handle).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('retries until the lock deadline and returns HTTP 409 without running the handler', async () => {
    jest.useFakeTimers();

    try {
      const timeoutMs = 500;
      const { interceptor, query, release } = buildInterceptor(
        'body.idInfraccion',
        {
          CONCURRENCY_LOCK_TIMEOUT_MS: timeoutMs,
          CONCURRENCY_LOCK_RETRY_MS: 100,
        },
      );
      query.mockResolvedValue([{ locked: false }]);
      const handle = jest.fn(() => of('ok'));
      const context = buildContext({ body: { idInfraccion: 42 } });
      const result = lastValueFrom(
        interceptor.intercept(context, { handle }),
      ).catch((error: unknown) => error);

      await jest.advanceTimersByTimeAsync(timeoutMs - 1);
      expect(release).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);

      expect(await result).toMatchObject({ status: HttpStatus.CONFLICT });
      expect(query.mock.calls.length).toBeGreaterThan(1);
      expect(query).not.toHaveBeenCalledWith(
        'SELECT pg_advisory_unlock($1, $2)',
        [734_221, 42],
      );
      expect(handle).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('unlocks before returning the connection when the handler fails', async () => {
    const { interceptor, query, release } =
      buildInterceptor('body.idInfraccion');
    query
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);
    const handlerError = new Error('write failed');
    const handle = jest.fn(() => throwError(() => handlerError));
    const context = buildContext({ body: { idInfraccion: 42 } });

    await expect(
      lastValueFrom(interceptor.intercept(context, { handle })),
    ).rejects.toBe(handlerError);

    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_advisory_unlock($1, $2)',
      [734_221, 42],
    );
    expect(release).toHaveBeenCalledTimes(1);
    expect(query.mock.invocationCallOrder[1]).toBeLessThan(
      release.mock.invocationCallOrder[0],
    );
  });

  it('locks the expediente linked to body.idRetencionVehiculo', async () => {
    const { interceptor, query, release } = buildInterceptor(
      'body.idRetencionVehiculo',
    );
    query
      .mockResolvedValueOnce([{ idInfraccion: '42' }])
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);
    const handle = jest.fn(() => of('ok'));
    const context = buildContext({ body: { idRetencionVehiculo: 87 } });

    await expect(
      lastValueFrom(interceptor.intercept(context, { handle })),
    ).resolves.toBe('ok');

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WHERE id_retencion_vehiculo = $1'),
      [87],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      'SELECT pg_try_advisory_lock($1, $2) AS locked',
      [734_221, 42],
    );
    expect(query).toHaveBeenNthCalledWith(
      3,
      'SELECT pg_advisory_unlock($1, $2)',
      [734_221, 42],
    );
    expect(release).toHaveBeenCalledTimes(1);
  });
});

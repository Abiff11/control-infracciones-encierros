import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import type { DataSource, QueryRunner } from 'typeorm';

import { InfraccionWriteLockInterceptor } from './infraccion-write-lock.interceptor';

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

describe('InfraccionWriteLockInterceptor', () => {
  it('acquires and releases the advisory lock using params.idInfraccion', async () => {
    const query = jest.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('pg_try_advisory_lock')) {
        return [{ locked: true }];
      }
      if (sql.includes('pg_advisory_unlock')) {
        return [{ pg_advisory_unlock: true }];
      }
      return [];
    });
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query,
      release: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('params.idInfraccion'),
    } as unknown as Reflector;
    const configService = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    } as unknown as ConfigService;
    const interceptor = new InfraccionWriteLockInterceptor(
      reflector,
      dataSource,
      configService,
    );
    const next = { handle: jest.fn(() => of('ok')) } as CallHandler;

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
    expect(query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1, $2)', [
      734_221,
      42,
    ]);
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('does not acquire a lock when the route param is invalid', async () => {
    const query = jest.fn().mockResolvedValue([]);
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query,
      release: jest.fn().mockResolvedValue(undefined),
    } as unknown as QueryRunner;
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('params.idInfraccion'),
    } as unknown as Reflector;
    const configService = {
      get: jest.fn((_key: string, fallback: string) => fallback),
    } as unknown as ConfigService;
    const interceptor = new InfraccionWriteLockInterceptor(
      reflector,
      dataSource,
      configService,
    );
    const next = { handle: jest.fn(() => of('ok')) } as CallHandler;

    const result = await lastValueFrom(
      interceptor.intercept(
        buildContext({ params: { idInfraccion: 'invalid' }, body: {} }),
        next,
      ),
    );

    expect(result).toBe('ok');
    expect(query).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });
});

import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import type { Request } from 'express';
import { defer, lastValueFrom, type Observable } from 'rxjs';
import { DataSource, type QueryRunner } from 'typeorm';

export const INFRACCION_WRITE_LOCK_KEY = 'concurrency:infraccion-write-lock';

export type InfraccionWriteLockSource =
  | 'body.idInfraccion'
  | 'body.idRetencionVehiculo';

export const InfraccionWriteLock = (source: InfraccionWriteLockSource) =>
  SetMetadata(INFRACCION_WRITE_LOCK_KEY, source);

const ADVISORY_LOCK_NAMESPACE = 734_221;
const DEFAULT_LOCK_TIMEOUT_MS = 5_000;
const DEFAULT_LOCK_RETRY_MS = 50;

interface RetencionLookupRow {
  idInfraccion: number | string;
}

@Injectable()
export class InfraccionWriteLockInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const source = this.reflector.getAllAndOverride<InfraccionWriteLockSource>(
      INFRACCION_WRITE_LOCK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!source) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();

    return defer(() => this.executeWithLock(source, request, next));
  }

  private async executeWithLock(
    source: InfraccionWriteLockSource,
    request: Request,
    next: CallHandler,
  ): Promise<unknown> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    let idInfraccion: number | null = null;
    let lockAcquired = false;

    try {
      idInfraccion = await this.resolveInfraccionId(
        source,
        request,
        queryRunner,
      );

      if (idInfraccion === null) {
        return await lastValueFrom(next.handle());
      }

      lockAcquired = await this.acquireLock(queryRunner, idInfraccion);

      if (!lockAcquired) {
        throw new ConflictException(
          'El expediente esta siendo actualizado por otro usuario. Intenta nuevamente en unos segundos.',
        );
      }

      return await lastValueFrom(next.handle());
    } finally {
      if (lockAcquired && idInfraccion !== null) {
        try {
          await queryRunner.query('SELECT pg_advisory_unlock($1, $2)', [
            ADVISORY_LOCK_NAMESPACE,
            idInfraccion,
          ]);
        } catch {
          // La conexion se libera de todos modos; PostgreSQL elimina locks de sesion al cerrarla.
        }
      }

      await queryRunner.release();
    }
  }

  private async resolveInfraccionId(
    source: InfraccionWriteLockSource,
    request: Request,
    queryRunner: QueryRunner,
  ): Promise<number | null> {
    const body = this.readBody(request);

    if (source === 'body.idInfraccion') {
      return this.toPositiveInt(body.idInfraccion);
    }

    const idRetencionVehiculo = this.toPositiveInt(body.idRetencionVehiculo);
    if (idRetencionVehiculo === null) {
      return null;
    }

    const rows = (await queryRunner.query(
      `
        SELECT id_infraccion AS "idInfraccion"
        FROM retencion_vehiculo
        WHERE id_retencion_vehiculo = $1
        LIMIT 1
      `,
      [idRetencionVehiculo],
    )) as RetencionLookupRow[];

    return this.toPositiveInt(rows[0]?.idInfraccion);
  }

  private async acquireLock(
    queryRunner: QueryRunner,
    idInfraccion: number,
  ): Promise<boolean> {
    const timeoutMs = this.readBoundedNumber(
      'CONCURRENCY_LOCK_TIMEOUT_MS',
      DEFAULT_LOCK_TIMEOUT_MS,
      500,
      30_000,
    );
    const retryMs = this.readBoundedNumber(
      'CONCURRENCY_LOCK_RETRY_MS',
      DEFAULT_LOCK_RETRY_MS,
      10,
      500,
    );
    const deadline = Date.now() + timeoutMs;

    do {
      const rows = (await queryRunner.query(
        'SELECT pg_try_advisory_lock($1, $2) AS locked',
        [ADVISORY_LOCK_NAMESPACE, idInfraccion],
      )) as Array<{ locked?: boolean }>;

      if (rows[0]?.locked === true) {
        return true;
      }

      if (Date.now() >= deadline) {
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, retryMs));
    } while (Date.now() <= deadline);

    return false;
  }

  private readBody(request: Request): Record<string, unknown> {
    return typeof request.body === 'object' && request.body !== null
      ? (request.body as Record<string, unknown>)
      : {};
  }

  private toPositiveInt(value: unknown): number | null {
    const parsed = typeof value === 'number' ? value : Number(value);

    return Number.isInteger(parsed) && parsed > 0 && parsed <= 2_147_483_647
      ? parsed
      : null;
  }

  private readBoundedNumber(
    key: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const value = Number(this.configService.get<string>(key, String(fallback)));

    return Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  }
}

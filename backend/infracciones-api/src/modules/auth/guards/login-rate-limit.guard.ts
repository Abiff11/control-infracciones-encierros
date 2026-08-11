import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { getClientIp } from '../../../common/security/client-ip.util';

interface AttemptBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 10;
const CLEANUP_INTERVAL = 100;

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, AttemptBucket>();
  private requestsSinceCleanup = 0;

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const key = getClientIp(request);
    const windowMs = this.getWindowMs();
    const maxAttempts = this.getMaxAttempts();

    this.cleanupExpiredBuckets(now);

    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    current.count += 1;

    if (current.count > maxAttempts) {
      throw new HttpException(
        'Demasiados intentos. Espera antes de volver a intentar.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanupExpiredBuckets(now: number): void {
    this.requestsSinceCleanup += 1;

    if (this.requestsSinceCleanup < CLEANUP_INTERVAL) {
      return;
    }

    this.requestsSinceCleanup = 0;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }

  private getWindowMs(): number {
    return parsePositiveInteger(
      this.configService.get<string>('LOGIN_RATE_LIMIT_WINDOW_MS'),
      DEFAULT_WINDOW_MS,
    );
  }

  private getMaxAttempts(): number {
    return parsePositiveInteger(
      this.configService.get<string>('LOGIN_RATE_LIMIT_MAX_ATTEMPTS'),
      DEFAULT_MAX_ATTEMPTS,
    );
  }
}

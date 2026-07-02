import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

interface AttemptBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_ATTEMPTS = 10;
const buckets = new Map<string, AttemptBucket>();

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

function getClientKey(request: Request): string {
  const cfConnectingIp = request.headers['cf-connecting-ip'];

  if (typeof cfConnectingIp === 'string' && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor[0]) {
    return forwardedFor[0].split(',')[0].trim();
  }

  return request.ip ?? request.socket.remoteAddress ?? 'unknown';
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const key = getClientKey(request);
    const windowMs = this.getWindowMs();
    const maxAttempts = this.getMaxAttempts();
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
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

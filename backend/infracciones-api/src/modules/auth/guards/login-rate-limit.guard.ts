import {
  CanActivate,
  ExecutionContext,
  Injectable,
  TooManyRequestsException,
} from '@nestjs/common';
import type { Request } from 'express';

interface AttemptBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const buckets = new Map<string, AttemptBucket>();

function getClientKey(request: Request): string {
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
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const key = getClientKey(request);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + WINDOW_MS,
      });
      return true;
    }

    current.count += 1;

    if (current.count > MAX_ATTEMPTS) {
      throw new TooManyRequestsException(
        'Demasiados intentos. Espera un minuto antes de volver a intentar.',
      );
    }

    return true;
  }
}

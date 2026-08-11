import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { LoginRateLimitGuard } from './login-rate-limit.guard';

function buildContext(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

function buildRequest(forwardedIp: string): Request {
  return {
    ip: '203.0.113.40',
    headers: {
      'x-forwarded-for': forwardedIp,
      'cf-connecting-ip': forwardedIp,
    },
    socket: {
      remoteAddress: '172.20.0.10',
    },
  } as Request;
}

describe('LoginRateLimitGuard', () => {
  it('no permite evadir el limite cambiando headers de IP', () => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'LOGIN_RATE_LIMIT_MAX_ATTEMPTS') {
          return '1';
        }
        if (key === 'LOGIN_RATE_LIMIT_WINDOW_MS') {
          return '60000';
        }
        return undefined;
      }),
    } as unknown as ConfigService;
    const guard = new LoginRateLimitGuard(configService);

    expect(guard.canActivate(buildContext(buildRequest('198.51.100.10')))).toBe(
      true,
    );

    expect(() =>
      guard.canActivate(buildContext(buildRequest('198.51.100.11'))),
    ).toThrow(HttpException);
  });
});

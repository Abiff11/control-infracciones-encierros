import type { Request } from 'express';

import { getClientIp } from './client-ip.util';

function buildRequest(params: {
  ip?: string;
  remoteAddress?: string;
  headers?: Record<string, string>;
}): Request {
  return {
    ip: params.ip,
    headers: params.headers ?? {},
    socket: {
      remoteAddress: params.remoteAddress,
    },
  } as Request;
}

describe('getClientIp', () => {
  it('usa request.ip resuelto por Express y no headers reenviados directamente', () => {
    const request = buildRequest({
      ip: '203.0.113.20',
      remoteAddress: '172.20.0.10',
      headers: {
        'cf-connecting-ip': '198.51.100.77',
        'x-forwarded-for': '198.51.100.88',
      },
    });

    expect(getClientIp(request)).toBe('203.0.113.20');
  });

  it('usa la direccion del socket si Express no resolvio request.ip', () => {
    const request = buildRequest({
      remoteAddress: '::ffff:192.0.2.10',
    });

    expect(getClientIp(request)).toBe('192.0.2.10');
  });

  it('devuelve unknown si no hay direccion disponible', () => {
    const request = buildRequest({});

    expect(getClientIp(request)).toBe('unknown');
  });
});

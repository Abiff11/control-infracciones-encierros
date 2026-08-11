import type { Request } from 'express';

function normalizeIpAddress(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}

export function getClientIp(request: Request): string {
  const resolvedIp = request.ip ?? request.socket.remoteAddress ?? 'unknown';
  return normalizeIpAddress(resolvedIp);
}

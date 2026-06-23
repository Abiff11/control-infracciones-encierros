import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const CSRF_COOKIE_NAME = 'cie_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSafeHttpMethod(method: string): boolean {
  return SAFE_HTTP_METHODS.has(method.toUpperCase());
}

export function createCsrfToken(secret: string): string {
  const nonce = randomBytes(32).toString('base64url');
  const signature = signCsrfNonce(nonce, secret);
  return `${nonce}.${signature}`;
}

export function verifyCsrfToken(token: string, secret: string): boolean {
  const separatorIndex = token.indexOf('.');

  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return false;
  }

  const nonce = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = signCsrfNonce(nonce, secret);

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}

export function readCookie(request: Request, cookieName: string): string {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return '';
  }

  const cookie = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

export function getCsrfCookieOptions(params: {
  nodeEnv: string;
  cookieSecure?: string;
  cookieSameSite?: string;
}) {
  const nodeEnv = params.nodeEnv.toLowerCase();
  const secure = nodeEnv === 'production' || params.cookieSecure === 'true';
  const sameSite = resolveSameSite(params.cookieSameSite);

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
  } as const;
}

export function issueCsrfCookie(
  response: Response,
  secret: string,
  options: ReturnType<typeof getCsrfCookieOptions>,
): string {
  const token = createCsrfToken(secret);
  response.cookie(CSRF_COOKIE_NAME, token, options);
  return token;
}

export function assertValidCsrfRequest(request: Request, secret: string): void {
  const cookieToken = readCookie(request, CSRF_COOKIE_NAME);
  const headerValue = request.headers[CSRF_HEADER_NAME];
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken !== headerToken ||
    !verifyCsrfToken(cookieToken, secret)
  ) {
    throw new ForbiddenException('Token CSRF invalido');
  }
}

function signCsrfNonce(nonce: string, secret: string): string {
  return createHmac('sha256', secret).update(nonce).digest('base64url');
}

function resolveSameSite(value?: string): 'lax' | 'strict' | 'none' {
  const normalizedValue = value?.toLowerCase();

  if (normalizedValue === 'strict' || normalizedValue === 'none') {
    return normalizedValue;
  }

  return 'lax';
}

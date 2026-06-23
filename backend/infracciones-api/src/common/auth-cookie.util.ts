import type { CookieOptions } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'cie_refresh_token';

type RefreshCookieMode = 'session' | 'persistent';

function resolveSameSite(value?: string): CookieOptions['sameSite'] {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === 'strict' || normalizedValue === 'none') {
    return normalizedValue;
  }

  return 'lax';
}

export function getRefreshTokenCookieOptions(params: {
  nodeEnv: string;
  cookieSecure?: string;
  cookieSameSite?: string;
  refreshCookieMode?: string;
  refreshTokenExpiresInMinutes: number;
}): CookieOptions {
  const nodeEnv = params.nodeEnv.toLowerCase();
  const secure = nodeEnv === 'production' || params.cookieSecure === 'true';
  const sameSite = resolveSameSite(params.cookieSameSite);
  const mode = (params.refreshCookieMode?.trim().toLowerCase() ??
    'session') as RefreshCookieMode;

  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
  };

  if (mode === 'persistent') {
    options.maxAge = params.refreshTokenExpiresInMinutes * 60 * 1000;
  }

  return options;
}

export function getExpiredRefreshTokenCookieOptions(
  options: CookieOptions,
): CookieOptions {
  return {
    ...options,
    maxAge: 0,
  };
}

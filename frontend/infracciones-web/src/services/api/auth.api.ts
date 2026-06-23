import type {
  LoginRequest,
  LoginResponse,
  LoginResponseUsuario,
} from '../../types/auth.types';
import { apiUrl } from './apiConfig';

const CSRF_COOKIE_NAME = 'cie_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function readCookie(cookieName: string): string {
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!cookie) {
    return '';
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

function extractErrorMessage(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Ignore non-JSON responses.
  }

  return payload;
}

function buildHeaders(token?: string): Headers {
  const headers = new Headers({
    Accept: 'application/json',
  });
  const csrfToken = readCookie(CSRF_COOKIE_NAME);

  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function fetchJson<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: buildHeaders(token),
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(extractErrorMessage(message) || `HTTP ${response.status}`);
  }

  return parseJsonResponse<T>(response);
}

export function tokenCheck(): Promise<{ ok: boolean }> {
  return fetchJson<{ ok: boolean }>('/auth/token-check', { method: 'GET' });
}

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function refresh(): Promise<LoginResponse> {
  return fetchJson<LoginResponse>('/auth/refresh', {
    method: 'POST',
  });
}

export function logout(token?: string): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>('/auth/logout', {
    method: 'POST',
  }, token);
}

export function logoutTolerant(): Promise<{ ok: true }> {
  return fetchJson<{ ok: true }>('/auth/logout-tolerant', {
    method: 'POST',
  });
}

export function getProfile(token: string): Promise<LoginResponseUsuario> {
  return fetchJson<LoginResponseUsuario>('/auth/profile', { method: 'GET' }, token);
}

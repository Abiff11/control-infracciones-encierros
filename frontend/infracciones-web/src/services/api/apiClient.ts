import { AuthApiError, refresh as refreshAuthSession } from "./auth.api";
import {
  clearAuthSession,
  getAuthSession,
  updateAuthSession,
} from "./authSession";
import { apiUrl, swaggerUrl } from "./apiConfig";
import type { SessionState } from "../../types/auth.types";

const CSRF_COOKIE_NAME = "cie_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const GET_CACHE_TTL_MS = Number(
  import.meta.env.VITE_API_GET_CACHE_TTL_MS ?? 1500,
);

let csrfTokenPromise: Promise<void> | null = null;
let sessionRefreshPromise: Promise<void> | null = null;

const pendingGetRequests = new Map<string, Promise<unknown>>();
const recentGetResponses = new Map<
  string,
  { expiresAt: number; value: unknown }
>();

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;
type ResponseReader<T> = (response: Response) => Promise<T>;

export function buildQuery<T extends object>(params?: T): string {
  if (!params) {
    return "";
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(
    params as Record<string, QueryValue>,
  )) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function extractErrorMessage(payload: string): string {
  try {
    const parsed = JSON.parse(payload) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }

    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Ignore non-JSON responses.
  }

  return payload;
}

function readCookie(cookieName: string): string {
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));

  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
}

function assertCsrfCookieReadable(): void {
  if (readCookie(CSRF_COOKIE_NAME)) {
    return;
  }

  throw new ApiError(
    0,
    "No se pudo leer la cookie CSRF. En desarrollo, abre frontend y API con el mismo hostname (localhost o 127.0.0.1) o utiliza VITE_API_URL=/api.",
  );
}

export async function ensureCsrfToken(forceRefresh = false): Promise<void> {
  if (!forceRefresh && readCookie(CSRF_COOKIE_NAME)) {
    return;
  }

  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch(`${apiUrl}/auth/token-check`, {
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new ApiError(
            response.status,
            "No se pudo preparar la sesion segura.",
          );
        }

        assertCsrfCookieReadable();
      })
      .finally(() => {
        csrfTokenPromise = null;
      });
  }

  return csrfTokenPromise;
}

async function refreshSession(): Promise<void> {
  if (!sessionRefreshPromise) {
    sessionRefreshPromise = ensureCsrfToken(true)
      .then(() => refreshAuthSession())
      .then((response) => {
        updateAuthSession(response.accessToken, response.usuario);
        clearGetRequestCache();
      })
      .catch((error: unknown) => {
        clearAuthSession();
        clearGetRequestCache();

        if (error instanceof AuthApiError) {
          if (error.status === 401) {
            throw new ApiError(
              401,
              "La sesion expiro. Vuelve a iniciar sesion.",
            );
          }

          throw new ApiError(error.status, error.message);
        }

        if (error instanceof ApiError) {
          throw error;
        }

        throw new ApiError(0, getErrorMessage(error));
      })
      .finally(() => {
        sessionRefreshPromise = null;
      });
  }

  return sessionRefreshPromise;
}

export async function restoreAuthSession(): Promise<SessionState | null> {
  try {
    await refreshSession();
    return getAuthSession();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return null;
    }

    throw error;
  }
}

function resolveMethod(method?: string): string {
  return (method ?? "GET").toUpperCase();
}

function clearGetRequestCache() {
  pendingGetRequests.clear();
  recentGetResponses.clear();
}

function shouldReuseGetRequest(method: string, options: RequestInit) {
  return method === "GET" && !options.body && GET_CACHE_TTL_MS > 0;
}

function getRequestCacheKey(
  path: string,
  method: string,
  token: string | null,
) {
  return `${method}:${token ?? "anon"}:${path}`;
}

async function withGetRequestReuse<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const cached = recentGetResponses.get(key);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const pending = pendingGetRequests.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const requestPromise = factory()
    .then((value) => {
      recentGetResponses.set(key, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value,
      });
      return value;
    })
    .finally(() => {
      pendingGetRequests.delete(key);
    });

  pendingGetRequests.set(key, requestPromise as Promise<unknown>);
  return requestPromise;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const method = resolveMethod(options.method);
  const isMutating = MUTATING_METHODS.has(method);
  const sessionToken = token ?? getAuthSession()?.token ?? null;

  if (isMutating) {
    await ensureCsrfToken(false);
  }

  const executeRequest = () =>
    requestOnce<T>(path, options, sessionToken, isMutating, true, true);

  if (shouldReuseGetRequest(method, options)) {
    return withGetRequestReuse<T>(
      getRequestCacheKey(path, method, sessionToken),
      executeRequest,
    );
  }

  return executeRequest();
}

async function requestOnce<T>(
  path: string,
  options: RequestInit,
  token: string | null,
  isMutating: boolean,
  allowCsrfRetry: boolean,
  allowAuthRetry: boolean,
  readResponse: ResponseReader<T> = (response) => response.json() as Promise<T>,
): Promise<T> {
  const method = resolveMethod(options.method);
  const headers = new Headers(options.headers);
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (isMutating) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) {
      headers.set(CSRF_HEADER_NAME, csrfToken);
    }
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  } catch (error) {
    throw new ApiError(
      0,
      error instanceof Error
        ? `No se pudo conectar con el servidor: ${error.message}`
        : "No se pudo conectar con el servidor.",
    );
  }

  if (response.status === 403 && isMutating && allowCsrfRetry) {
    await ensureCsrfToken(true);
    return requestOnce<T>(
      path,
      options,
      token,
      isMutating,
      false,
      allowAuthRetry,
      readResponse,
    );
  }

  if (
    response.status === 401 &&
    allowAuthRetry &&
    (token || getAuthSession())
  ) {
    await refreshSession();
    return requestOnce<T>(
      path,
      options,
      getAuthSession()?.token ?? null,
      isMutating,
      allowCsrfRetry,
      false,
      readResponse,
    );
  }

  if (!response.ok) {
    const payload = await response.text();
    const message = extractErrorMessage(payload) || `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }

  if (isMutating) {
    clearGetRequestCache();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return readResponse(response);
}

export async function requestBlob(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<Blob> {
  const method = resolveMethod(options.method);
  const isMutating = MUTATING_METHODS.has(method);
  const sessionToken = token ?? getAuthSession()?.token ?? null;

  if (isMutating) {
    await ensureCsrfToken(false);
  }

  return requestOnce(
    path,
    options,
    sessionToken,
    isMutating,
    true,
    true,
    (response) => response.blob(),
  );
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrio un error inesperado.";
}

export function getSwaggerUrl(): string {
  return swaggerUrl;
}

import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoginResponse } from "../../types/auth.types";

const refreshAuthSession = vi.fn();
const CSRF_COOKIE_NAME = "cie_csrf_token";

class MockAuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

vi.mock("./auth.api", () => ({
  AuthApiError: MockAuthApiError,
  refresh: refreshAuthSession,
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function setReadableCsrfCookie(): void {
  document.cookie = `${CSRF_COOKIE_NAME}=csrf-test-token; Path=/; SameSite=Lax`;
}

function clearReadableCsrfCookie(): void {
  document.cookie = `${CSRF_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

const TEST_RESPONSE: LoginResponse = {
  accessToken: "token-restaurado",
  tokenType: "Bearer",
  expiresIn: "15m",
  usuario: {
    idUsuario: 9,
    nombreUsuario: "Admin Demo",
    email: "admin@example.com",
    activo: true,
    rol: {
      idRol: 1,
      nombreRol: "ADMIN",
    },
  },
};

describe("apiClient.restoreAuthSession", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    refreshAuthSession.mockReset();
    clearReadableCsrfCookie();

    const authSession = await import("./authSession");
    authSession.clearAuthSession();
  });

  it("deduplica refresh concurrentes durante el bootstrap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        setReadableCsrfCookie();
        return { ok: true, status: 200 } as Response;
      }),
    );

    const deferred = createDeferred<LoginResponse>();
    refreshAuthSession.mockReturnValue(deferred.promise);

    const { restoreAuthSession } = await import("./apiClient");

    const restoreA = restoreAuthSession();
    const restoreB = restoreAuthSession();

    await waitFor(() => {
      expect(refreshAuthSession).toHaveBeenCalledTimes(1);
    });

    deferred.resolve(TEST_RESPONSE);

    const [sessionA, sessionB] = await Promise.all([restoreA, restoreB]);

    expect(sessionA).toEqual({
      token: TEST_RESPONSE.accessToken,
      user: TEST_RESPONSE.usuario,
    });
    expect(sessionB).toEqual({
      token: TEST_RESPONSE.accessToken,
      user: TEST_RESPONSE.usuario,
    });
  });

  it("interpreta un 401 de refresh como ausencia normal de sesion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        setReadableCsrfCookie();
        return { ok: true, status: 200 } as Response;
      }),
    );
    refreshAuthSession.mockRejectedValue(
      new MockAuthApiError(401, "Credenciales invalidas"),
    );

    const { restoreAuthSession } = await import("./apiClient");
    const { getAuthSession } = await import("./authSession");

    await expect(restoreAuthSession()).resolves.toBeNull();
    expect(getAuthSession()).toBeNull();
  });
});

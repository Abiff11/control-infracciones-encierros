import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionState } from "../types/auth.types";

const ensureCsrfToken = vi.fn();
const restoreAuthSession = vi.fn();
const loginRequest = vi.fn();
const logoutRequest = vi.fn();
const logoutTolerantRequest = vi.fn();

vi.mock("../services/api/apiClient", () => ({
  ensureCsrfToken,
  getErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : "Error inesperado",
  isUnauthorizedError: () => false,
  restoreAuthSession,
}));

vi.mock("../services/api/auth.api", () => ({
  login: loginRequest,
  logout: logoutRequest,
  logoutTolerant: logoutTolerantRequest,
}));

const TEST_SESSION: SessionState = {
  token: "token-restaurado",
  user: {
    idUsuario: 7,
    nombreUsuario: "Operador Demo",
    email: "operador@example.com",
    activo: true,
    rol: {
      idRol: 2,
      nombreRol: "CONSULTA",
    },
  },
};

describe("useAuth", () => {
  beforeEach(async () => {
    vi.resetModules();
    ensureCsrfToken.mockReset();
    restoreAuthSession.mockReset();
    loginRequest.mockReset();
    logoutRequest.mockReset();
    logoutTolerantRequest.mockReset();

    const authSession = await import("../services/api/authSession");
    authSession.clearAuthSession();
  });

  it("bootstrap auth exitoso deja el estado authenticated", async () => {
    restoreAuthSession.mockResolvedValue(TEST_SESSION);
    const { useAuth } = await import("./useAuth");

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authStatus).toBe("authenticated");
    });

    expect(result.current.session).toEqual(TEST_SESSION);
  });

  it("refresh 401 deja el estado unauthenticated", async () => {
    restoreAuthSession.mockResolvedValue(null);
    const { useAuth } = await import("./useAuth");

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authStatus).toBe("unauthenticated");
    });

    expect(result.current.session).toBeNull();
    expect(result.current.authMessage).toBeNull();
  });

  it("logout limpia la sesion sin volver a autenticarse", async () => {
    const authSession = await import("../services/api/authSession");
    authSession.setAuthSession(TEST_SESSION);
    logoutRequest.mockResolvedValue({ ok: true });

    const { useAuth } = await import("./useAuth");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.authStatus).toBe("authenticated");
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.authStatus).toBe("unauthenticated");
    expect(result.current.session).toBeNull();
    expect(logoutRequest).toHaveBeenCalledWith(TEST_SESSION.token);
    expect(logoutTolerantRequest).not.toHaveBeenCalled();
  });
});

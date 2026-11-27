import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { normalizeApiErrorMessage } from "./api-error-messages";

const { fire } = vi.hoisted(() => ({ fire: vi.fn() }));

vi.mock("sweetalert2", () => ({ default: { fire } }));

const EXPECTED_MESSAGE =
  "Se alcanzó temporalmente el límite de solicitudes. Espera un momento e intenta nuevamente.";
const TECHNICAL_MESSAGE = "ThrottlerException: Too Many Requests";
const CSRF_COOKIE = "cie_csrf_token";
const FETCH_INTERCEPTOR_FLAG = "__cieSweetAlertFetchErrorsInstalled__";

function rateLimitedResponse(body: string | null = TECHNICAL_MESSAGE): Response {
  return new Response(body, { status: 429 });
}

describe("normalizacion HTTP 429", () => {
  beforeEach(() => {
    vi.resetModules();
    fire.mockReset().mockResolvedValue({});
    document.cookie = `${CSRF_COOKIE}=; Path=/; Max-Age=0`;
  });

  afterEach(() => {
    Reflect.deleteProperty(window, FETCH_INTERCEPTOR_FLAG);
    document.cookie = `${CSRF_COOKIE}=; Path=/; Max-Age=0`;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("Q4.2-01 normaliza el mensaje tecnico por estado HTTP", () => {
    expect(normalizeApiErrorMessage(429, TECHNICAL_MESSAGE)).toBe(
      EXPECTED_MESSAGE,
    );
  });

  it("Q4.2-02 normaliza una respuesta sin cuerpo", async () => {
    expect(normalizeApiErrorMessage(429, "")).toBe(EXPECTED_MESSAGE);
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse(null));
    vi.stubGlobal("fetch", fetchMock);
    const { request, ApiError } = await import("./apiClient");

    const error = await request("/infracciones").catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: EXPECTED_MESSAGE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Q4.2-03 normaliza HTML procedente de un proxy", async () => {
    const html = "<html><body>429 Too Many Requests</body></html>";
    expect(normalizeApiErrorMessage(429, html)).toBe(EXPECTED_MESSAGE);
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse(html));
    vi.stubGlobal("fetch", fetchMock);
    const { request, ApiError } = await import("./apiClient");

    await expect(request("/infracciones")).rejects.toMatchObject({
      name: "ApiError",
      status: 429,
      message: EXPECTED_MESSAGE,
    });
    expect(new ApiError(429, html)).toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Q4.2-04 conserva el tipo y codigo de ApiError", async () => {
    const { ApiError, getErrorMessage, isUnauthorizedError } = await import(
      "./apiClient"
    );
    const error = new ApiError(429, TECHNICAL_MESSAGE);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "ApiError",
      status: 429,
      message: EXPECTED_MESSAGE,
    });
    expect(getErrorMessage(error)).toBe(EXPECTED_MESSAGE);
    expect(isUnauthorizedError(error)).toBe(false);
  });

  it("Q4.2-05 conserva el tipo y codigo de AuthApiError", async () => {
    const { AuthApiError } = await import("./auth.api");
    const error = new AuthApiError(429, TECHNICAL_MESSAGE);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: "AuthApiError",
      status: 429,
      message: EXPECTED_MESSAGE,
    });
  });

  it("Q4.2-06 rechaza GET sin reintentar ni limpiar la sesion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      rateLimitedResponse(JSON.stringify({ message: TECHNICAL_MESSAGE })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { updateAuthSession, getAuthSession } = await import("./authSession");
    updateAuthSession("test-token", {
      idUsuario: 1,
      nombreUsuario: "Operador de prueba",
      email: "test@example.com",
      activo: true,
    });
    const originalSession = getAuthSession();
    const { request, ApiError, getErrorMessage } = await import("./apiClient");

    const error = await request("/infracciones").catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: EXPECTED_MESSAGE });
    expect(getErrorMessage(error)).toBe(EXPECTED_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthSession()).toBe(originalSession);
  });

  it("Q4.2-07 rechaza la exportacion Excel sin leer un Blob ni reintentar", async () => {
    document.cookie = `${CSRF_COOKIE}=test-csrf; Path=/; SameSite=Lax`;
    const response = rateLimitedResponse(
      JSON.stringify({ message: TECHNICAL_MESSAGE }),
    );
    const readBlob = vi.spyOn(response, "blob");
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);
    const { requestBlob, ApiError } = await import("./apiClient");

    const error = await requestBlob(
      "/infracciones/reportes/excel",
      { method: "POST", body: JSON.stringify({ fechaInicio: "2026-08-22" }) },
      "test-token",
    ).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: EXPECTED_MESSAGE });
    expect(readBlob).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Q4.2-08 normaliza el rechazo de autenticacion sin reintentar", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      rateLimitedResponse(JSON.stringify({ message: TECHNICAL_MESSAGE })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { login, AuthApiError } = await import("./auth.api");

    const error = await login({
      email: "test@example.com",
      password: "test-password",
    }).catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status: 429, message: EXPECTED_MESSAGE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("Q4.2-08 normaliza el rechazo al preparar CSRF", async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimitedResponse());
    vi.stubGlobal("fetch", fetchMock);
    const { ensureCsrfToken } = await import("./apiClient");

    await expect(ensureCsrfToken()).rejects.toMatchObject({
      status: 429,
      message: EXPECTED_MESSAGE,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([TECHNICAL_MESSAGE, "", "<html>429</html>"])(
    "Q4.2-09 presenta una alerta funcional para %s",
    async (message) => {
      const { showApiErrorAlert } = await import("./apiAlerts");

      await showApiErrorAlert({ status: 429, message });

      expect(fire).toHaveBeenCalledExactlyOnceWith({
        icon: "warning",
        title: "Demasiadas solicitudes",
        text: EXPECTED_MESSAGE,
        confirmButtonText: "Entendido",
        heightAuto: false,
      });
    },
  );

  it("Q4.2-10 deduplica alertas 429 incluso con mensajes originales diferentes", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(10000);
    const { showApiErrorAlert } = await import("./apiAlerts");

    await showApiErrorAlert({ status: 429, message: TECHNICAL_MESSAGE });
    clock.mockReturnValue(11199);
    await showApiErrorAlert({ status: 429, message: "Proxy limit reached" });

    expect(fire).toHaveBeenCalledTimes(1);
  });

  it("Q4.2-11 permite otra alerta al vencer la ventana existente", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(10000);
    const { showApiErrorAlert } = await import("./apiAlerts");

    await showApiErrorAlert({ status: 429, message: TECHNICAL_MESSAGE });
    clock.mockReturnValue(11200);
    await showApiErrorAlert({ status: 429, message: TECHNICAL_MESSAGE });

    expect(fire).toHaveBeenCalledTimes(2);
  });

  it.each([0, 400, 401, 403, 404, 409, 500, undefined])(
    "Q4.2-12 conserva los mensajes de otros estados: %s",
    async (status) => {
      const original = "Mensaje original de prueba";
      expect(normalizeApiErrorMessage(status, original)).toBe(original);
      if (status !== undefined) {
        const { ApiError } = await import("./apiClient");
        const { AuthApiError } = await import("./auth.api");
        expect(new ApiError(status, original).message).toBe(original);
        expect(new AuthApiError(status, original).message).toBe(original);
      }
    },
  );

  it.each([
    [0, "error", "Sin conexión con el servidor", "No fue posible conectar con la API. Verifica tu red o intenta nuevamente."],
    [400, "warning", "Solicitud inválida", "Mensaje original"],
    [401, "warning", "Sesión expirada", "Tu sesión ya no es válida. Inicia sesión nuevamente."],
    [403, "warning", "Acceso no autorizado", "Mensaje original"],
    [404, "info", "Información no encontrada", "Mensaje original"],
    [409, "warning", "Conflicto de información", "Mensaje original"],
    [500, "error", "Error del servidor", "Mensaje original"],
  ] as const)(
    "Q4.2-12 conserva la alerta para HTTP %s",
    async (status, icon, title, text) => {
      const { showApiErrorAlert } = await import("./apiAlerts");

      await showApiErrorAlert({ status, message: "Mensaje original" });

      expect(fire).toHaveBeenCalledExactlyOnceWith({
        icon,
        title,
        text,
        confirmButtonText: "Entendido",
        heightAuto: false,
      });
    },
  );

  it("Q4.2-13 permite una consulta posterior y no guarda el rechazo en cache", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimitedResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [], meta: { total: 0 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { request } = await import("./apiClient");

    await expect(request("/infracciones")).rejects.toMatchObject({
      status: 429,
      message: EXPECTED_MESSAGE,
    });
    await expect(request("/infracciones")).resolves.toEqual({
      data: [],
      meta: { total: 0 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("Q4-I01 integra request, interceptor global y SweetAlert2 ante HTTP 429", async () => {
    const originalFetch = vi.fn().mockResolvedValue(
      rateLimitedResponse(JSON.stringify({ message: TECHNICAL_MESSAGE })),
    );
    vi.stubGlobal("fetch", originalFetch);
    await import("./sweetalert-fetch-errors");
    const { request, ApiError } = await import("./apiClient");

    const error = await request("/infracciones?q4Integration=1").catch(
      (reason: unknown) => reason,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, message: EXPECTED_MESSAGE });
    await vi.waitFor(() => {
      expect(fire).toHaveBeenCalledExactlyOnceWith({
        icon: "warning",
        title: "Demasiadas solicitudes",
        text: EXPECTED_MESSAGE,
        confirmButtonText: "Entendido",
        heightAuto: false,
      });
    });
    expect(originalFetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(fire.mock.calls)).not.toContain(TECHNICAL_MESSAGE);
  });
});

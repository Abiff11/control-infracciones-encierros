import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const showApiErrorAlert = vi.fn();
const INSTALL_FLAG = "__cieSweetAlertFetchErrorsInstalled__";

type WindowWithAlertFetchFlag = Window &
  typeof globalThis & {
    [INSTALL_FLAG]?: boolean;
  };

vi.mock("./apiAlerts", () => ({
  showApiErrorAlert,
}));

function clearInstallFlag(): void {
  delete (window as WindowWithAlertFetchFlag)[INSTALL_FLAG];
}

async function installInterceptor(status: number): Promise<void> {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Error de prueba" }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  await import("./sweetalert-fetch-errors");
}

async function activateSession(): Promise<void> {
  const { updateAuthSession } = await import("./authSession");
  updateAuthSession("access-token", {
    idUsuario: 1,
    nombreUsuario: "Admin Demo",
    email: "admin@example.com",
    activo: true,
    rol: {
      idRol: 1,
      nombreRol: "ADMIN",
    },
  });
}

describe("sweetalert-fetch-errors", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllGlobals();
    showApiErrorAlert.mockReset();
    clearInstallFlag();

    const { clearAuthSession } = await import("./authSession");
    clearAuthSession();
  });

  afterEach(() => {
    clearInstallFlag();
    vi.unstubAllGlobals();
  });

  it("suprime el 401 de refresh durante el bootstrap anonimo", async () => {
    await installInterceptor(401);

    await window.fetch("/api/auth/refresh", { method: "POST" });

    expect(showApiErrorAlert).not.toHaveBeenCalled();
  });

  it("conserva la alerta de sesion expirada cuando habia sesion activa", async () => {
    await activateSession();
    await installInterceptor(401);

    await window.fetch("/api/auth/refresh", { method: "POST" });

    expect(showApiErrorAlert).toHaveBeenCalledTimes(1);
    expect(showApiErrorAlert).toHaveBeenCalledWith({
      status: 401,
      message: "Error de prueba",
    });
  });

  it("suprime el 401 intermedio de una request protegida", async () => {
    await activateSession();
    await installInterceptor(401);

    await window.fetch("/api/infracciones/13809");

    expect(showApiErrorAlert).not.toHaveBeenCalled();
  });

  it("mantiene el comportamiento para errores distintos de 401", async () => {
    await installInterceptor(500);

    await window.fetch("/api/infracciones");

    expect(showApiErrorAlert).toHaveBeenCalledTimes(1);
    expect(showApiErrorAlert).toHaveBeenCalledWith({
      status: 500,
      message: "Error de prueba",
    });
  });
});

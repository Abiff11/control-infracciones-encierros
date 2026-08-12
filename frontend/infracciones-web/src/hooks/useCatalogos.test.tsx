import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CatalogosBundle } from "../types/catalogos.types";

const getCatalogosBundle = vi.fn();

vi.mock("../services/api/catalogos.api", () => ({
  getCatalogosBundle,
}));

const TEST_BUNDLE: CatalogosBundle = {
  roles: [],
  regiones: [],
  delegaciones: [],
  sexos: [],
  servicios: [],
  clasesVehiculo: [],
  marcasVehiculo: [],
  lineasVehiculo: [],
  tiposProcedimiento: [],
  operativos: [],
  estatusInfraccion: [],
  motivos: [],
  encierros: [],
};

function StrictModeWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}

describe("useCatalogos", () => {
  beforeEach(() => {
    vi.resetModules();
    getCatalogosBundle.mockReset();
    getCatalogosBundle.mockResolvedValue(TEST_BUNDLE);
    window.sessionStorage.clear();
  });

  it("no ejecuta getCatalogosBundle cuando enabled=false", async () => {
    const { useCatalogos } = await import("./useCatalogos");

    renderHook(() => useCatalogos({ enabled: false }), {
      wrapper: StrictModeWrapper,
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    });

    expect(getCatalogosBundle).not.toHaveBeenCalled();
  });

  it("al pasar enabled=true ejecuta una sola carga", async () => {
    const { useCatalogos } = await import("./useCatalogos");

    const { result } = renderHook(() => useCatalogos({ enabled: true }), {
      wrapper: StrictModeWrapper,
    });

    await waitFor(() => {
      expect(getCatalogosBundle).toHaveBeenCalledTimes(1);
    });

    expect(result.current.catalogs).toEqual(TEST_BUNDLE);
    expect(result.current.loading).toBe(false);
  });

  it("no vuelve a solicitar catalogos al deshabilitarse", async () => {
    const { useCatalogos } = await import("./useCatalogos");

    const { rerender } = renderHook(
      ({ enabled }) => useCatalogos({ enabled }),
      {
        initialProps: { enabled: true },
        wrapper: StrictModeWrapper,
      },
    );

    await waitFor(() => {
      expect(getCatalogosBundle).toHaveBeenCalledTimes(1);
    });

    rerender({ enabled: false });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    });

    expect(getCatalogosBundle).toHaveBeenCalledTimes(1);
  });
});

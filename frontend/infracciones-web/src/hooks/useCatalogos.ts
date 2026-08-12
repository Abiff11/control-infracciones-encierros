import { useCallback, useEffect, useState } from "react";

import { getErrorMessage } from "../services/api/apiClient";
import { getCatalogosBundle } from "../services/api/catalogos.api";
import type { CatalogosBundle } from "../types/catalogos.types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface CatalogosCache {
  createdAt: number;
  data: CatalogosBundle;
}

interface UseCatalogosOptions {
  enabled?: boolean;
}

const CATALOGOS_CACHE_KEY = "cie_catalogos_bundle_v2";
const CATALOGOS_CACHE_TTL_MS = 10 * 60 * 1000;
let catalogosLoadPromise: Promise<CatalogosBundle> | null = null;

function readCatalogosCache(): CatalogosBundle | null {
  try {
    const rawValue = window.sessionStorage.getItem(CATALOGOS_CACHE_KEY);

    if (!rawValue) {
      return null;
    }

    const cache = JSON.parse(rawValue) as Partial<CatalogosCache>;

    if (!cache.createdAt || !cache.data) {
      return null;
    }

    if (Date.now() - cache.createdAt > CATALOGOS_CACHE_TTL_MS) {
      window.sessionStorage.removeItem(CATALOGOS_CACHE_KEY);
      return null;
    }

    return cache.data;
  } catch {
    window.sessionStorage.removeItem(CATALOGOS_CACHE_KEY);
    return null;
  }
}

function writeCatalogosCache(data: CatalogosBundle): void {
  try {
    window.sessionStorage.setItem(
      CATALOGOS_CACHE_KEY,
      JSON.stringify({ createdAt: Date.now(), data } satisfies CatalogosCache),
    );
  } catch {
    // La cache es una optimizacion; si falla, la aplicacion debe seguir funcionando.
  }
}

export function clearCatalogosCache(): void {
  window.sessionStorage.removeItem(CATALOGOS_CACHE_KEY);
}

function createInitialState<T>(): LoadState<T> {
  const cachedData = readCatalogosCache() as T | null;

  if (cachedData) {
    return {
      status: "ready",
      data: cachedData,
      error: null,
    };
  }

  return {
    status: "idle",
    data: null,
    error: null,
  };
}

function loadCatalogosBundle(): Promise<CatalogosBundle> {
  if (!catalogosLoadPromise) {
    catalogosLoadPromise = getCatalogosBundle().finally(() => {
      catalogosLoadPromise = null;
    });
  }

  return catalogosLoadPromise;
}

export function useCatalogos(options: UseCatalogosOptions = {}) {
  const { enabled = true } = options;
  const [state, setState] =
    useState<LoadState<CatalogosBundle>>(createInitialState<CatalogosBundle>());

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled) {
      return;
    }

    setState((current) => ({
      status: current.data ? "ready" : "loading",
      data: current.data,
      error: null,
    }));

    try {
      const data = await loadCatalogosBundle();
      writeCatalogosCache(data);
      setState({
        status: "ready",
        data,
        error: null,
      });
    } catch (error) {
      setState((current) => ({
        status: current.data ? "ready" : "error",
        data: current.data,
        error: getErrorMessage(error),
      }));
    }
  }, [enabled]);

  const reset = useCallback((): void => {
    clearCatalogosCache();
    setState({
      status: "idle",
      data: null,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [enabled, refresh]);

  return {
    catalogs: state.data,
    error: state.error,
    loading: enabled && (state.status === "loading" || state.status === "idle"),
    refresh,
    reset,
  };
}

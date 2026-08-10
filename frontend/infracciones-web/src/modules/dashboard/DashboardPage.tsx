import { useEffect, useMemo, useState } from "react";

import {
  getDashboardAnaliticaResumen,
  getDashboardDistribuciones,
  getDashboardIngresosPorClave,
  getDashboardIngresosTendencia,
  getDashboardInfraccionesTendencia,
} from "../../services/api/dashboard.api";
import { findConceptosPago } from "../../services/api/pagos.api";
import type { CatalogosBundle } from "../../types/catalogos.types";
import type {
  DashboardAgrupacion,
  DashboardAnaliticaResumenResponse,
  DashboardAnalyticsQuery,
  DashboardCondicionExpediente,
  DashboardDistribucionesResponse,
  DashboardIngresosPorClaveResponse,
  DashboardIngresosTendenciaResponse,
  DashboardInfraccionesTendenciaResponse,
  DashboardTrendQuery,
} from "../../types/dashboard.types";
import type { ConceptoPagoOption } from "../../types/operaciones.types";
import { DashboardAnalyticsOverview } from "./DashboardAnalyticsOverview";
import { DashboardDistributionsOverview } from "./DashboardDistributionsOverview";
import { DashboardRevenueOverview } from "./DashboardRevenueOverview";

import "./DashboardPage.css";
import "./DashboardExtra.css";

interface DashboardPageProps {
  catalogs: CatalogosBundle | null;
  apiStatusLabel: string;
  notice: string | null;
  refreshKey: number;
  runProtectedRequest: <T>(action: (token: string) => Promise<T>) => Promise<T>;
}

interface DashboardFilters {
  fechaDesde: string;
  fechaHasta: string;
  idRegion: string;
  idDelegacion: string;
  idEstatusInfraccion: string;
  idTipoProcedimiento: string;
  idEncierro: string;
  condicionExpediente: "" | DashboardCondicionExpediente;
  claveConcepto: string;
  agrupacion: DashboardAgrupacion;
  periodo: "all" | "7" | "30" | "90" | "custom";
}

interface DashboardAnalyticsState {
  resumen: DashboardAnaliticaResumenResponse | null;
  infraccionesTendencia: DashboardInfraccionesTendenciaResponse | null;
  ingresosTendencia: DashboardIngresosTendenciaResponse | null;
  ingresosPorClave: DashboardIngresosPorClaveResponse | null;
  distribuciones: DashboardDistribucionesResponse | null;
  loading: boolean;
  error: string | null;
}

const CONDICION_LABELS: Record<DashboardCondicionExpediente, string> = {
  CON_RETENCION: "Infracción con retención",
  SIN_RETENCION: "Infracción sin retención",
  VEHICULO_SIN_INFRACCION: "Vehículo en encierro sin infracción",
};

function formatInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDefaultFilters(): DashboardFilters {
  return {
    fechaDesde: "",
    fechaHasta: "",
    idRegion: "",
    idDelegacion: "",
    idEstatusInfraccion: "",
    idTipoProcedimiento: "",
    idEncierro: "",
    condicionExpediente: "",
    claveConcepto: "",
    agrupacion: "mes",
    periodo: "all",
  };
}

function applyPeriod(
  filters: DashboardFilters,
  period: DashboardFilters["periodo"],
): DashboardFilters {
  if (period === "custom") {
    return { ...filters, periodo: period };
  }

  if (period === "all") {
    return {
      ...filters,
      periodo: period,
      fechaDesde: "",
      fechaHasta: "",
    };
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - Number(period));

  return {
    ...filters,
    periodo: period,
    fechaDesde: formatInputDate(start),
    fechaHasta: formatInputDate(today),
  };
}

function toOptionalNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildAnalyticsQuery(filters: DashboardFilters): DashboardAnalyticsQuery {
  return {
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    idRegion: toOptionalNumber(filters.idRegion),
    idDelegacion: toOptionalNumber(filters.idDelegacion),
    idEstatusInfraccion: toOptionalNumber(filters.idEstatusInfraccion),
    idTipoProcedimiento: toOptionalNumber(filters.idTipoProcedimiento),
    idEncierro: toOptionalNumber(filters.idEncierro),
    claveConcepto: filters.claveConcepto.trim() || undefined,
    condicionExpediente: filters.condicionExpediente || undefined,
  };
}

function buildTrendQuery(filters: DashboardFilters): DashboardTrendQuery {
  return {
    ...buildAnalyticsQuery(filters),
    agrupacion: filters.agrupacion,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function DashboardPage({
  catalogs,
  apiStatusLabel,
  notice,
  refreshKey,
  runProtectedRequest,
}: DashboardPageProps) {
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    createDefaultFilters(),
  );
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(() =>
    createDefaultFilters(),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [analyticsState, setAnalyticsState] = useState<DashboardAnalyticsState>({
    resumen: null,
    infraccionesTendencia: null,
    ingresosTendencia: null,
    ingresosPorClave: null,
    distribuciones: null,
    loading: true,
    error: null,
  });
  const [conceptSuggestions, setConceptSuggestions] = useState<
    ConceptoPagoOption[]
  >([]);
  const [conceptSearchLoading, setConceptSearchLoading] = useState(false);
  const [conceptSearchError, setConceptSearchError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics(): Promise<void> {
      setAnalyticsState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      const analyticsQuery = buildAnalyticsQuery(appliedFilters);
      const trendQuery = buildTrendQuery(appliedFilters);

      try {
        const [
          resumen,
          infraccionesTendencia,
          ingresosTendencia,
          ingresosPorClave,
          distribuciones,
        ] = await runProtectedRequest((token) =>
          Promise.all([
            getDashboardAnaliticaResumen(token, analyticsQuery),
            getDashboardInfraccionesTendencia(token, trendQuery),
            getDashboardIngresosTendencia(token, trendQuery),
            getDashboardIngresosPorClave(token, analyticsQuery),
            getDashboardDistribuciones(token, analyticsQuery),
          ]),
        );

        if (!mounted) return;

        setAnalyticsState({
          resumen,
          infraccionesTendencia,
          ingresosTendencia,
          ingresosPorClave,
          distribuciones,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!mounted) return;

        setAnalyticsState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las métricas analíticas.",
        }));
      }
    }

    void loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [appliedFilters, refreshKey, reloadKey, runProtectedRequest]);

  useEffect(() => {
    const query = filters.claveConcepto.trim();
    if (!query) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setConceptSearchLoading(true);
      setConceptSearchError(false);

      void runProtectedRequest((token) => findConceptosPago(token, query, 20))
        .then((result) => {
          if (!cancelled) setConceptSuggestions(result);
        })
        .catch(() => {
          if (!cancelled) {
            setConceptSuggestions([]);
            setConceptSearchError(true);
          }
        })
        .finally(() => {
          if (!cancelled) setConceptSearchLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [filters.claveConcepto, runProtectedRequest]);

  const filteredDelegaciones = useMemo(() => {
    if (!catalogs || !filters.idRegion) {
      return catalogs?.delegaciones ?? [];
    }

    const idRegion = Number(filters.idRegion);
    return catalogs.delegaciones.filter(
      (delegacion) => delegacion.region?.idRegion === idRegion,
    );
  }, [catalogs, filters.idRegion]);

  const expedienteTypes = useMemo(
    () =>
      (catalogs?.tiposProcedimiento ?? []).filter(
        (tipo) => tipo.esTipoExpediente,
      ),
    [catalogs],
  );

  const conceptSuggestionKeys = useMemo(
    () =>
      Array.from(
        new Set(conceptSuggestions.map((concepto) => concepto.claveConcepto)),
      ),
    [conceptSuggestions],
  );

  const analyticsResumen = analyticsState.resumen;

  function updateFilter<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ): void {
    setFilters((current) => {
      const nextFilters: DashboardFilters = { ...current, [key]: value };

      if (key === "idRegion") {
        nextFilters.idDelegacion = "";
      }

      if (key === "fechaDesde" || key === "fechaHasta") {
        nextFilters.periodo = "custom";
      }

      return nextFilters;
    });
  }

  function updateConceptFilter(value: string): void {
    const normalized = value.toUpperCase();
    updateFilter("claveConcepto", normalized);

    if (!normalized.trim()) {
      setConceptSuggestions([]);
      setConceptSearchError(false);
      setConceptSearchLoading(false);
    }
  }

  function resetFilters(): void {
    const nextFilters = createDefaultFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setConceptSuggestions([]);
    setConceptSearchError(false);
    setConceptSearchLoading(false);
  }

  return (
    <section className="page-stack dashboard-page">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Tablero analítico de infracciones e ingresos</h1>
          <p className="page-description">
            Tendencias, retenciones, vehículos sin infracción, encierros,
            recaudación, claves de concepto y distribución territorial.
          </p>
        </div>
        <div className="dashboard-refresh-box">
          <span>
            {analyticsResumen?.updatedAt
              ? `Actualizado: ${formatDateTime(analyticsResumen.updatedAt)}`
              : apiStatusLabel}
          </span>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Actualizar
          </button>
        </div>
      </header>

      <section
        className="dashboard-filters"
        aria-label="Filtros globales del dashboard"
      >
        <label className="field">
          <span>Periodo</span>
          <select
            value={filters.periodo}
            onChange={(event) =>
              setFilters((current) =>
                applyPeriod(
                  current,
                  event.target.value as DashboardFilters["periodo"],
                ),
              )
            }
          >
            <option value="all">Todo el histórico</option>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        <label className="field">
          <span>Agrupar tendencia</span>
          <select
            value={filters.agrupacion}
            onChange={(event) =>
              updateFilter(
                "agrupacion",
                event.target.value as DashboardAgrupacion,
              )
            }
          >
            <option value="dia">Día</option>
            <option value="mes">Mes</option>
            <option value="anio">Año</option>
          </select>
        </label>

        <label className="field">
          <span>Desde</span>
          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(event) => updateFilter("fechaDesde", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Hasta</span>
          <input
            type="date"
            value={filters.fechaHasta}
            onChange={(event) => updateFilter("fechaHasta", event.target.value)}
          />
        </label>

        <label className="field">
          <span>Región</span>
          <select
            value={filters.idRegion}
            onChange={(event) => updateFilter("idRegion", event.target.value)}
          >
            <option value="">Todas</option>
            {catalogs?.regiones.map((region) => (
              <option key={region.idRegion} value={region.idRegion}>
                {region.nombreRegion}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Delegación / unidad</span>
          <select
            value={filters.idDelegacion}
            onChange={(event) =>
              updateFilter("idDelegacion", event.target.value)
            }
          >
            <option value="">Todas</option>
            {filteredDelegaciones.map((delegacion) => (
              <option
                key={delegacion.idDelegacion}
                value={delegacion.idDelegacion}
              >
                {delegacion.nombreDelegacion}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Tipo de expediente</span>
          <select
            value={filters.idTipoProcedimiento}
            onChange={(event) =>
              updateFilter("idTipoProcedimiento", event.target.value)
            }
          >
            <option value="">Todos</option>
            {expedienteTypes.map((tipo) => (
              <option
                key={tipo.idTipoProcedimiento}
                value={tipo.idTipoProcedimiento}
              >
                {tipo.nombreTipoProcedimiento}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Condición</span>
          <select
            value={filters.condicionExpediente}
            onChange={(event) =>
              updateFilter(
                "condicionExpediente",
                event.target.value as DashboardFilters["condicionExpediente"],
              )
            }
          >
            <option value="">Todas</option>
            {Object.entries(CONDICION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="field dashboard-filter-concept">
          <span>Clave de concepto</span>
          <input
            type="text"
            list="dashboard-conceptos-sugerencias"
            value={filters.claveConcepto}
            onChange={(event) => updateConceptFilter(event.target.value)}
            placeholder="Todas / buscar clave"
            maxLength={50}
            autoComplete="off"
          />
          <datalist id="dashboard-conceptos-sugerencias">
            {conceptSuggestionKeys.map((clave) => (
              <option key={clave} value={clave} />
            ))}
          </datalist>
          <small>
            {conceptSearchLoading
              ? "Buscando claves..."
              : conceptSearchError
                ? "No se pudieron consultar coincidencias."
                : filters.claveConcepto.trim()
                  ? `${conceptSuggestionKeys.length} coincidencia(s).`
                  : "Todas las claves"}
          </small>
        </label>

        <label className="field">
          <span>Estatus</span>
          <select
            value={filters.idEstatusInfraccion}
            onChange={(event) =>
              updateFilter("idEstatusInfraccion", event.target.value)
            }
          >
            <option value="">Todos</option>
            {catalogs?.estatusInfraccion.map((estatus) => (
              <option
                key={estatus.idEstatusInfraccion}
                value={estatus.idEstatusInfraccion}
              >
                {estatus.nombreEstatus}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Encierro</span>
          <select
            value={filters.idEncierro}
            onChange={(event) => updateFilter("idEncierro", event.target.value)}
          >
            <option value="">Todos</option>
            {catalogs?.encierros.map((encierro) => (
              <option key={encierro.idEncierro} value={encierro.idEncierro}>
                {encierro.nombreEncierro}
              </option>
            ))}
          </select>
        </label>

        <div className="dashboard-filter-actions">
          <button type="button" onClick={() => setAppliedFilters(filters)}>
            Aplicar filtros
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={resetFilters}
          >
            Limpiar
          </button>
        </div>
      </section>

      <section
        className="dashboard-filter-context"
        aria-label="Contexto analítico aplicado"
      >
        {analyticsState.loading ? (
          <span>Actualizando analítica...</span>
        ) : analyticsResumen ? (
          <>
            <span>
              <strong>
                {formatNumber(analyticsResumen.expedientes.totalInfracciones)}
              </strong>
              {" infracciones"}
            </span>
            <span>
              <strong>
                {formatNumber(
                  analyticsResumen.expedientes.infraccionesConRetencion,
                )}
              </strong>
              {" con retención"}
            </span>
            <span>
              <strong>
                {formatNumber(
                  analyticsResumen.expedientes.infraccionesSinRetencion,
                )}
              </strong>
              {" sin retención"}
            </span>
            <span>
              <strong>
                {formatNumber(
                  analyticsResumen.expedientes.vehiculosSinInfraccion,
                )}
              </strong>
              {" vehículos sin infracción"}
            </span>
            <span>
              <strong>
                {formatCurrency(analyticsResumen.ingresos.totalIngresos)}
              </strong>
              {" ingresos"}
            </span>
            <span>
              <strong>{analyticsState.ingresosPorClave?.claves.length ?? 0}</strong>
              {" claves con monto"}
            </span>
          </>
        ) : (
          <span>Sin métricas analíticas para los filtros aplicados.</span>
        )}
      </section>

      {analyticsState.error || notice ? (
        <div className="notice notice-error">
          {analyticsState.error ?? notice}
        </div>
      ) : null}

      <DashboardAnalyticsOverview
        agrupacion={appliedFilters.agrupacion}
        loading={analyticsState.loading}
        resumen={analyticsState.resumen}
        tendencia={analyticsState.infraccionesTendencia}
      />

      <DashboardRevenueOverview
        agrupacion={appliedFilters.agrupacion}
        claveConcepto={appliedFilters.claveConcepto}
        loading={analyticsState.loading}
        resumen={analyticsState.resumen}
        tendencia={analyticsState.ingresosTendencia}
        porClave={analyticsState.ingresosPorClave}
      />

      <DashboardDistributionsOverview
        data={analyticsState.distribuciones}
        loading={analyticsState.loading}
      />
    </section>
  );
}

export default DashboardPage;

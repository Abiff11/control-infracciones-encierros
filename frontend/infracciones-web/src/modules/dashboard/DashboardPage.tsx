import { useEffect, useMemo, useState } from "react";

import {
  getDashboardAnaliticaResumen,
  getDashboardIngresosPorClave,
  getDashboardIngresosTendencia,
  getDashboardInfraccionesTendencia,
  getDashboardResumen,
} from "../../services/api/dashboard.api";
import { findConceptosPago } from "../../services/api/pagos.api";
import type { CatalogosBundle } from "../../types/catalogos.types";
import type {
  DashboardAgrupacion,
  DashboardAnaliticaResumenResponse,
  DashboardAnalyticsQuery,
  DashboardCondicionExpediente,
  DashboardIngresosPorClaveResponse,
  DashboardIngresosTendenciaResponse,
  DashboardInfraccionesTendenciaResponse,
  DashboardQuery,
  DashboardResumenResponse,
  DashboardTrendQuery,
} from "../../types/dashboard.types";
import type { EstadoOperativoVehiculo } from "../../types/infracciones.types";
import type { ConceptoPagoOption } from "../../types/operaciones.types";
import { DashboardAnalyticsOverview } from "./DashboardAnalyticsOverview";
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
  estadoOperativo: string;
  condicionExpediente: "" | DashboardCondicionExpediente;
  claveConcepto: string;
  agrupacion: DashboardAgrupacion;
  periodo: "all" | "7" | "30" | "90" | "custom";
}

interface DashboardState {
  data: DashboardResumenResponse | null;
  loading: boolean;
  error: string | null;
}

interface DashboardAnalyticsState {
  resumen: DashboardAnaliticaResumenResponse | null;
  infraccionesTendencia: DashboardInfraccionesTendenciaResponse | null;
  ingresosTendencia: DashboardIngresosTendenciaResponse | null;
  ingresosPorClave: DashboardIngresosPorClaveResponse | null;
  loading: boolean;
  error: string | null;
}

interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

const ESTADO_LABELS: Record<EstadoOperativoVehiculo, string> = {
  SIN_RETENCION: "Sin retencion",
  PAGADA_SIN_RETENCION: "Pagada sin retencion",
  EN_ENCIERRO_SIN_PAGO: "En encierro sin pago",
  PAGADO_PENDIENTE_LIBERACION: "Pagado por liberar",
  LIBERADO_PENDIENTE_SALIDA: "Liberado por entregar",
  VEHICULO_ENTREGADO: "Entregado",
};

const ESTADOS_OPERATIVOS: EstadoOperativoVehiculo[] = [
  "SIN_RETENCION",
  "PAGADA_SIN_RETENCION",
  "EN_ENCIERRO_SIN_PAGO",
  "PAGADO_PENDIENTE_LIBERACION",
  "LIBERADO_PENDIENTE_SALIDA",
  "VEHICULO_ENTREGADO",
];

const CONDICION_LABELS: Record<DashboardCondicionExpediente, string> = {
  CON_RETENCION: "Infraccion con retencion",
  SIN_RETENCION: "Infraccion sin retencion",
  VEHICULO_SIN_INFRACCION: "Vehiculo en encierro sin infraccion",
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
    estadoOperativo: "",
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

function buildDashboardQuery(filters: DashboardFilters): DashboardQuery {
  return {
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    idRegion: toOptionalNumber(filters.idRegion),
    idDelegacion: toOptionalNumber(filters.idDelegacion),
    idEstatusInfraccion: toOptionalNumber(filters.idEstatusInfraccion),
    idEncierro: toOptionalNumber(filters.idEncierro),
    estadoOperativo: filters.estadoOperativo
      ? (filters.estadoOperativo as EstadoOperativoVehiculo)
      : undefined,
  };
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

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function getMaxValue(items: ChartDatum[]): number {
  return Math.max(...items.map((item) => item.value), 1);
}

function MetricCard({
  accent,
  label,
  value,
  helper,
}: {
  accent: "blue" | "green" | "purple" | "orange" | "teal" | "red";
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className={`dashboard-metric dashboard-metric-${accent}`}>
      <span className="dashboard-metric-icon" aria-hidden="true" />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  );
}

function BarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = getMaxValue(data);

  return (
    <div className="dashboard-bar-chart">
      {data.map((item) => (
        <div className="dashboard-bar-row" key={item.label}>
          <div className="dashboard-bar-label">
            <span>{item.label}</span>
            {item.hint ? <small>{item.hint}</small> : null}
          </div>
          <div className="dashboard-bar-track">
            <span
              style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }}
            />
          </div>
          <strong>{formatNumber(item.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ColumnChart({ data }: { data: ChartDatum[] }) {
  const maxValue = getMaxValue(data);

  return (
    <div className="dashboard-column-chart">
      {data.map((item) => (
        <div className="dashboard-column-item" key={item.label}>
          <div className="dashboard-column-value">{formatNumber(item.value)}</div>
          <div className="dashboard-column-track">
            <span
              style={{ height: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            />
          </div>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return <div className="dashboard-empty-chart">{message}</div>;
}

function DashboardPage({
  catalogs,
  apiStatusLabel,
  notice,
  refreshKey,
  runProtectedRequest,
}: DashboardPageProps) {
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(() =>
    createDefaultFilters(),
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
  });
  const [analyticsState, setAnalyticsState] = useState<DashboardAnalyticsState>({
    resumen: null,
    infraccionesTendencia: null,
    ingresosTendencia: null,
    ingresosPorClave: null,
    loading: true,
    error: null,
  });
  const [conceptSuggestions, setConceptSuggestions] = useState<ConceptoPagoOption[]>([]);
  const [conceptSearchLoading, setConceptSearchLoading] = useState(false);
  const [conceptSearchError, setConceptSearchError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard(): Promise<void> {
      setDashboardState((current) => ({ ...current, loading: true, error: null }));

      try {
        const response = await runProtectedRequest((token) =>
          getDashboardResumen(token, buildDashboardQuery(appliedFilters)),
        );
        if (!mounted) return;
        setDashboardState({ data: response, loading: false, error: null });
      } catch (error) {
        if (!mounted) return;
        setDashboardState((current) => ({
          ...current,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "No se pudo cargar el dashboard.",
        }));
      }
    }

    void loadDashboard();
    return () => {
      mounted = false;
    };
  }, [appliedFilters, refreshKey, reloadKey, runProtectedRequest]);

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics(): Promise<void> {
      setAnalyticsState((current) => ({ ...current, loading: true, error: null }));
      const analyticsQuery = buildAnalyticsQuery(appliedFilters);
      const trendQuery = buildTrendQuery(appliedFilters);

      try {
        const [resumen, infraccionesTendencia, ingresosTendencia, ingresosPorClave] =
          await runProtectedRequest((token) =>
            Promise.all([
              getDashboardAnaliticaResumen(token, analyticsQuery),
              getDashboardInfraccionesTendencia(token, trendQuery),
              getDashboardIngresosTendencia(token, trendQuery),
              getDashboardIngresosPorClave(token, analyticsQuery),
            ]),
          );

        if (!mounted) return;
        setAnalyticsState({
          resumen,
          infraccionesTendencia,
          ingresosTendencia,
          ingresosPorClave,
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
              : "No se pudieron cargar las metricas analiticas.",
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
    if (!catalogs || !filters.idRegion) return catalogs?.delegaciones ?? [];
    const idRegion = Number(filters.idRegion);
    return catalogs.delegaciones.filter(
      (delegacion) => delegacion.region?.idRegion === idRegion,
    );
  }, [catalogs, filters.idRegion]);

  const expedienteTypes = useMemo(
    () => (catalogs?.tiposProcedimiento ?? []).filter((tipo) => tipo.esTipoExpediente),
    [catalogs],
  );

  const conceptSuggestionKeys = useMemo(
    () =>
      Array.from(
        new Set(conceptSuggestions.map((concepto) => concepto.claveConcepto)),
      ),
    [conceptSuggestions],
  );

  const data = dashboardState.data;
  const resumen = data?.resumen;
  const analyticsResumen = analyticsState.resumen;

  const estadoChartData: ChartDatum[] = ESTADOS_OPERATIVOS.map((estadoOperativo) => {
    const item = data?.flujoOperativo.find((current) => current.estado === estadoOperativo);
    return { label: item?.label ?? ESTADO_LABELS[estadoOperativo], value: item?.total ?? 0 };
  });

  const delegacionChartData: ChartDatum[] =
    data?.topDelegaciones.map((item) => ({
      label: item.nombreDelegacion,
      value: item.total,
    })) ?? [];

  const dayChartData: ChartDatum[] =
    data?.infraccionesPorDia.map((item) => ({
      label: formatDateLabel(item.fecha),
      value: item.total,
    })) ?? [];

  const encierroChartData: ChartDatum[] =
    data?.topEncierros.map((item) => ({
      label: item.nombreEncierro,
      value: item.total,
      hint: `${formatNumber(item.sinPago)} sin pago`,
    })) ?? [];

  function updateFilter<K extends keyof DashboardFilters>(
    key: K,
    value: DashboardFilters[K],
  ): void {
    setFilters((current) => {
      const nextFilters: DashboardFilters = { ...current, [key]: value };
      if (key === "idRegion") nextFilters.idDelegacion = "";
      if (key === "fechaDesde" || key === "fechaHasta") nextFilters.periodo = "custom";
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
          <h1>Resumen general del sistema</h1>
          <p className="page-description">
            Indicadores de infracciones, retenciones, vehiculos sin infraccion,
            encierros, pagos, claves de concepto e ingresos.
          </p>
        </div>
        <div className="dashboard-refresh-box">
          <span>
            {analyticsResumen?.updatedAt
              ? `Actualizado: ${formatDateTime(analyticsResumen.updatedAt)}`
              : data?.updatedAt
                ? `Actualizado: ${formatDateTime(data.updatedAt)}`
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

      <section className="dashboard-filters" aria-label="Filtros globales del dashboard">
        <label className="field">
          <span>Periodo</span>
          <select
            value={filters.periodo}
            onChange={(event) =>
              setFilters((current) =>
                applyPeriod(current, event.target.value as DashboardFilters["periodo"]),
              )
            }
          >
            <option value="all">Todo el historico</option>
            <option value="7">Ultimos 7 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        <label className="field">
          <span>Agrupar tendencia</span>
          <select
            value={filters.agrupacion}
            onChange={(event) =>
              updateFilter("agrupacion", event.target.value as DashboardAgrupacion)
            }
          >
            <option value="dia">Dia</option>
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
          <span>Region</span>
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
          <span>Delegacion / unidad</span>
          <select
            value={filters.idDelegacion}
            onChange={(event) => updateFilter("idDelegacion", event.target.value)}
          >
            <option value="">Todas</option>
            {filteredDelegaciones.map((delegacion) => (
              <option key={delegacion.idDelegacion} value={delegacion.idDelegacion}>
                {delegacion.nombreDelegacion}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo de expediente</span>
          <select
            value={filters.idTipoProcedimiento}
            onChange={(event) => updateFilter("idTipoProcedimiento", event.target.value)}
          >
            <option value="">Todos</option>
            {expedienteTypes.map((tipo) => (
              <option key={tipo.idTipoProcedimiento} value={tipo.idTipoProcedimiento}>
                {tipo.nombreTipoProcedimiento}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Condicion</span>
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
            onChange={(event) => updateFilter("idEstatusInfraccion", event.target.value)}
          >
            <option value="">Todos</option>
            {catalogs?.estatusInfraccion.map((estatus) => (
              <option key={estatus.idEstatusInfraccion} value={estatus.idEstatusInfraccion}>
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
        <label className="field">
          <span>Estado operativo</span>
          <select
            value={filters.estadoOperativo}
            onChange={(event) => updateFilter("estadoOperativo", event.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS_OPERATIVOS.map((estado) => (
              <option key={estado} value={estado}>
                {ESTADO_LABELS[estado]}
              </option>
            ))}
          </select>
        </label>
        <div className="dashboard-filter-actions">
          <button type="button" onClick={() => setAppliedFilters(filters)}>
            Aplicar filtros
          </button>
          <button className="button-secondary" type="button" onClick={resetFilters}>
            Limpiar
          </button>
        </div>
      </section>

      <section className="dashboard-filter-context" aria-label="Contexto analitico aplicado">
        {analyticsState.loading ? (
          <span>Actualizando analitica...</span>
        ) : analyticsResumen ? (
          <>
            <span>
              <strong>{formatNumber(analyticsResumen.expedientes.totalInfracciones)}</strong>
              {" infracciones"}
            </span>
            <span>
              <strong>{formatNumber(analyticsResumen.expedientes.infraccionesConRetencion)}</strong>
              {" con retencion"}
            </span>
            <span>
              <strong>{formatNumber(analyticsResumen.expedientes.infraccionesSinRetencion)}</strong>
              {" sin retencion"}
            </span>
            <span>
              <strong>{formatNumber(analyticsResumen.expedientes.vehiculosSinInfraccion)}</strong>
              {" vehiculos sin infraccion"}
            </span>
            <span>
              <strong>{formatCurrency(analyticsResumen.ingresos.totalIngresos)}</strong>
              {" ingresos"}
            </span>
            <span>
              <strong>{analyticsState.ingresosPorClave?.claves.length ?? 0}</strong>
              {" claves con monto"}
            </span>
          </>
        ) : (
          <span>Sin metricas analiticas para los filtros aplicados.</span>
        )}
      </section>

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

      <section className="dashboard-section-heading">
        <div>
          <p className="section-label">Operacion</p>
          <h2>Flujo y seguimiento de expedientes</h2>
        </div>
        <span>Estado operativo actual</span>
      </section>

      <section className="dashboard-metrics-grid" aria-label="Indicadores operativos">
        <MetricCard
          accent="blue"
          label="Expedientes operativos"
          value={formatNumber(resumen?.totalInfracciones ?? 0)}
          helper="Segun filtros compatibles con flujo"
        />
        <MetricCard
          accent="orange"
          label="Vehiculos retenidos"
          value={formatNumber(resumen?.totalVehiculosRetenidos ?? 0)}
          helper="Sin salida registrada"
        />
        <MetricCard
          accent="red"
          label="Sin pago"
          value={formatNumber(resumen?.totalSinPago ?? 0)}
          helper="Prioridad de seguimiento"
        />
        <MetricCard
          accent="green"
          label="Pagados por liberar"
          value={formatNumber(resumen?.totalPagadosPendienteLiberacion ?? 0)}
          helper="Listos para liberaciones"
        />
        <MetricCard
          accent="purple"
          label="Liberados por entregar"
          value={formatNumber(resumen?.totalLiberadosPendienteSalida ?? 0)}
          helper="Pendientes en encierro"
        />
        <MetricCard
          accent="teal"
          label="Entregados"
          value={formatNumber(resumen?.totalEntregados ?? 0)}
          helper="Flujo concluido"
        />
      </section>

      {dashboardState.loading || analyticsState.loading ? (
        <p className="notice">Actualizando indicadores del dashboard...</p>
      ) : null}
      {dashboardState.error || analyticsState.error || notice ? (
        <div className="notice notice-error">
          {dashboardState.error ?? analyticsState.error ?? notice}
        </div>
      ) : null}

      <section className="dashboard-analytics-grid">
        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Operacion</p>
              <h2>Expedientes por dia</h2>
            </div>
            <span>Fecha de infraccion</span>
          </div>
          {dayChartData.length ? (
            <ColumnChart data={dayChartData} />
          ) : (
            <EmptyChart message="Sin datos para graficar." />
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Flujo operativo</p>
              <h2>Estado actual</h2>
            </div>
          </div>
          <BarChart data={estadoChartData} />
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Encierros</p>
              <h2>Top encierros</h2>
            </div>
          </div>
          {encierroChartData.length ? (
            <BarChart data={encierroChartData} />
          ) : (
            <EmptyChart message="Sin vehiculos retenidos en el periodo." />
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Delegaciones</p>
              <h2>Top unidades</h2>
            </div>
            <span>Agregado operativo</span>
          </div>
          {delegacionChartData.length ? (
            <BarChart data={delegacionChartData} />
          ) : (
            <EmptyChart message="Sin delegaciones para mostrar." />
          )}
        </article>
      </section>
    </section>
  );
}

export default DashboardPage;

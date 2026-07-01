import { useEffect, useMemo, useState } from 'react';

import type { PageKey } from '../../app/app.types';
import { getVehiculosEnEncierroResumen } from '../../services/api/encierros.api';
import { getSwaggerUrl } from '../../services/api/apiClient';
import { getInfracciones } from '../../services/api/infracciones.api';
import type { LoginResponseUsuario } from '../../types/auth.types';
import type { CatalogosBundle } from '../../types/catalogos.types';
import type { VehiculosEncierroResumen } from '../../types/encierros.types';
import type {
  EstadoOperativoVehiculo,
  InfraccionesQuery,
  InfraccionesResponse,
  PaginationMeta,
} from '../../types/infracciones.types';

import './DashboardPage.css';

interface DashboardPageProps {
  catalogs: CatalogosBundle | null;
  infraccionesMeta: PaginationMeta | null;
  apiStatusLabel: string;
  notice: string | null;
  refreshKey: number;
  user: LoginResponseUsuario;
  runProtectedRequest: <T>(action: (token: string) => Promise<T>) => Promise<T>;
  onNavigate: (page: PageKey) => void;
}

interface DashboardFilters {
  fechaDesde: string;
  fechaHasta: string;
  idRegion: string;
  idDelegacion: string;
  idEstatusInfraccion: string;
  idEncierro: string;
  estadoOperativo: string;
  periodo: '7' | '30' | '90' | 'custom';
}

interface DashboardState {
  infracciones: InfraccionesResponse | null;
  encierrosResumen: VehiculosEncierroResumen | null;
  estadoCounts: Record<EstadoOperativoVehiculo, number>;
  loading: boolean;
  error: string | null;
  updatedAt: string | null;
}

interface ChartDatum {
  label: string;
  value: number;
  hint?: string;
}

const QUICK_ACTIONS: Array<{ key: PageKey; label: string; description: string }> = [
  {
    key: 'infracciones',
    label: 'Control operativo',
    description: 'Revisar pago, liberacion y salida',
  },
  {
    key: 'nueva-infraccion',
    label: 'Nueva infraccion',
    description: 'Captura inicial del folio',
  },
  {
    key: 'encierros-vehiculos',
    label: 'Inventario de encierros',
    description: 'Vehiculos retenidos y pendientes',
  },
  {
    key: 'reportes-infracciones',
    label: 'Reportes',
    description: 'Exportacion y consulta avanzada',
  },
];

const ESTADO_LABELS: Record<EstadoOperativoVehiculo, string> = {
  SIN_RETENCION: 'Sin retencion',
  EN_ENCIERRO_SIN_PAGO: 'En encierro sin pago',
  PAGADO_PENDIENTE_LIBERACION: 'Pagado por liberar',
  LIBERADO_PENDIENTE_SALIDA: 'Liberado por entregar',
  VEHICULO_ENTREGADO: 'Entregado',
};

const ESTADOS_OPERATIVOS: EstadoOperativoVehiculo[] = [
  'SIN_RETENCION',
  'EN_ENCIERRO_SIN_PAGO',
  'PAGADO_PENDIENTE_LIBERACION',
  'LIBERADO_PENDIENTE_SALIDA',
  'VEHICULO_ENTREGADO',
];

function formatInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createDefaultFilters(): DashboardFilters {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 7);

  return {
    fechaDesde: formatInputDate(start),
    fechaHasta: formatInputDate(today),
    idRegion: '',
    idDelegacion: '',
    idEstatusInfraccion: '',
    idEncierro: '',
    estadoOperativo: '',
    periodo: '7',
  };
}

function applyPeriod(filters: DashboardFilters, period: DashboardFilters['periodo']): DashboardFilters {
  if (period === 'custom') {
    return {
      ...filters,
      periodo: period,
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
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildInfraccionesQuery(filters: DashboardFilters, limit = 200): InfraccionesQuery {
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
    page: 1,
    limit,
    sortBy: 'fechaInfraccion',
    sortOrder: 'DESC',
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
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
  accent: 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'red';
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
            <span style={{ width: `${Math.max((item.value / maxValue) * 100, 4)}%` }} />
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
            <span style={{ height: `${Math.max((item.value / maxValue) * 100, 8)}%` }} />
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
  infraccionesMeta,
  apiStatusLabel,
  notice,
  refreshKey,
  user,
  runProtectedRequest,
  onNavigate,
}: DashboardPageProps) {
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<DashboardFilters>(() => createDefaultFilters());
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    infracciones: null,
    encierrosResumen: null,
    estadoCounts: {
      SIN_RETENCION: 0,
      EN_ENCIERRO_SIN_PAGO: 0,
      PAGADO_PENDIENTE_LIBERACION: 0,
      LIBERADO_PENDIENTE_SALIDA: 0,
      VEHICULO_ENTREGADO: 0,
    },
    loading: true,
    error: null,
    updatedAt: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadDashboard(): Promise<void> {
      setDashboardState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const query = buildInfraccionesQuery(appliedFilters, 200);
        const [infracciones, encierrosResumen, ...estadoResponses] = await Promise.all([
          runProtectedRequest((token) => getInfracciones(token, query)),
          runProtectedRequest((token) =>
            getVehiculosEnEncierroResumen(token, {
              fechaInfraccionDesde: appliedFilters.fechaDesde || undefined,
              fechaInfraccionHasta: appliedFilters.fechaHasta || undefined,
              idRegion: toOptionalNumber(appliedFilters.idRegion),
              idDelegacion: toOptionalNumber(appliedFilters.idDelegacion),
              idEncierro: toOptionalNumber(appliedFilters.idEncierro),
              estadoOperativo: appliedFilters.estadoOperativo
                ? (appliedFilters.estadoOperativo as EstadoOperativoVehiculo)
                : undefined,
            }),
          ),
          ...ESTADOS_OPERATIVOS.map((estadoOperativo) =>
            runProtectedRequest((token) =>
              getInfracciones(token, {
                ...query,
                estadoOperativo,
                page: 1,
                limit: 1,
              }),
            ),
          ),
        ]);

        if (!mounted) {
          return;
        }

        const estadoCounts = ESTADOS_OPERATIVOS.reduce(
          (accumulator, estadoOperativo, index) => ({
            ...accumulator,
            [estadoOperativo]: estadoResponses[index]?.meta?.total ?? 0,
          }),
          {} as Record<EstadoOperativoVehiculo, number>,
        );

        setDashboardState({
          infracciones,
          encierrosResumen,
          estadoCounts,
          loading: false,
          error: null,
          updatedAt: new Date().toLocaleString('es-MX'),
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setDashboardState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'No se pudo cargar el dashboard.',
        }));
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [appliedFilters, refreshKey, reloadKey, runProtectedRequest]);

  const filteredDelegaciones = useMemo(() => {
    if (!catalogs || !filters.idRegion) {
      return catalogs?.delegaciones ?? [];
    }

    const idRegion = Number(filters.idRegion);
    return catalogs.delegaciones.filter((delegacion) => delegacion.region?.idRegion === idRegion);
  }, [catalogs, filters.idRegion]);

  const totalInfracciones = dashboardState.infracciones?.meta?.total ?? infraccionesMeta?.total ?? 0;
  const sampleSize = dashboardState.infracciones?.data.length ?? 0;
  const encierrosResumen = dashboardState.encierrosResumen;
  const vehiculosRetenidos = encierrosResumen?.totalVehiculosRetenidos ?? 0;
  const pendientesPago = encierrosResumen?.totalSinPago ?? 0;
  const pagadosPorLiberar = encierrosResumen?.totalPagadosPendienteLiberacion ?? 0;
  const liberadosPorEntregar = encierrosResumen?.totalLiberadosPendienteSalida ?? 0;
  const entregados = encierrosResumen?.totalEntregados ?? 0;

  const estadoChartData = ESTADOS_OPERATIVOS.map((estadoOperativo) => ({
    label: ESTADO_LABELS[estadoOperativo],
    value: dashboardState.estadoCounts[estadoOperativo] ?? 0,
  }));

  const delegacionChartData = useMemo(() => {
    const counts = new Map<string, number>();

    dashboardState.infracciones?.data.forEach((item) => {
      const label = item.delegacion?.nombreDelegacion ?? 'Sin delegacion';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [dashboardState.infracciones]);

  const dayChartData = useMemo(() => {
    const counts = new Map<string, number>();

    dashboardState.infracciones?.data.forEach((item) => {
      const date = item.fechaInfraccion.slice(0, 10);
      counts.set(date, (counts.get(date) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([label, value]) => ({ label: formatDateLabel(label), value }));
  }, [dashboardState.infracciones]);

  const encierroChartData = useMemo(
    () =>
      (encierrosResumen?.porEncierro ?? [])
        .map((item) => ({
          label: item.encierro || 'Sin encierro',
          value: item.total,
          hint: `${item.sinPago} sin pago`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
    [encierrosResumen],
  );

  const catalogCount = catalogs
    ? catalogs.regiones.length +
      catalogs.roles.length +
      catalogs.delegaciones.length +
      catalogs.sexos.length +
      catalogs.servicios.length +
      catalogs.clasesVehiculo.length +
      catalogs.marcasVehiculo.length +
      catalogs.lineasVehiculo.length +
      catalogs.tiposProcedimiento.length +
      catalogs.operativos.length +
      catalogs.estatusInfraccion.length +
      catalogs.motivos.length +
      catalogs.encierros.length
    : 0;

  function updateFilter<K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]): void {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'idRegion' ? { idDelegacion: '' } : null),
      ...(key === 'fechaDesde' || key === 'fechaHasta' ? { periodo: 'custom' as const } : null),
    }));
  }

  function resetFilters(): void {
    const nextFilters = createDefaultFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }

  return (
    <section className="page-stack dashboard-page">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Resumen general del sistema</h1>
          <p className="page-description">
            Indicadores principales de infracciones, encierros, pago, liberacion y salida de vehiculos.
          </p>
        </div>
        <div className="dashboard-refresh-box">
          <span>{dashboardState.updatedAt ? `Actualizado: ${dashboardState.updatedAt}` : apiStatusLabel}</span>
          <button className="button-secondary" type="button" onClick={() => setReloadKey((current) => current + 1)}>
            Actualizar
          </button>
        </div>
      </header>

      <section className="dashboard-filters" aria-label="Filtros de dashboard">
        <label className="field">
          <span>Desde</span>
          <input
            type="date"
            value={filters.fechaDesde}
            onChange={(event) => updateFilter('fechaDesde', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input
            type="date"
            value={filters.fechaHasta}
            onChange={(event) => updateFilter('fechaHasta', event.target.value)}
          />
        </label>
        <label className="field">
          <span>Region</span>
          <select value={filters.idRegion} onChange={(event) => updateFilter('idRegion', event.target.value)}>
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
            onChange={(event) => updateFilter('idDelegacion', event.target.value)}
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
          <span>Estatus</span>
          <select
            value={filters.idEstatusInfraccion}
            onChange={(event) => updateFilter('idEstatusInfraccion', event.target.value)}
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
          <select value={filters.idEncierro} onChange={(event) => updateFilter('idEncierro', event.target.value)}>
            <option value="">Todos</option>
            {catalogs?.encierros.map((encierro) => (
              <option key={encierro.idEncierro} value={encierro.idEncierro}>
                {encierro.nombreEncierro}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Flujo</span>
          <select
            value={filters.estadoOperativo}
            onChange={(event) => updateFilter('estadoOperativo', event.target.value)}
          >
            <option value="">Todos</option>
            {ESTADOS_OPERATIVOS.map((estado) => (
              <option key={estado} value={estado}>
                {ESTADO_LABELS[estado]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Periodo</span>
          <select value={filters.periodo} onChange={(event) => setFilters((current) => applyPeriod(current, event.target.value as DashboardFilters['periodo']))}>
            <option value="7">Ultimos 7 dias</option>
            <option value="30">Ultimos 30 dias</option>
            <option value="90">Ultimos 90 dias</option>
            <option value="custom">Personalizado</option>
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

      <section className="dashboard-metrics-grid" aria-label="Indicadores principales">
        <MetricCard
          accent="blue"
          label="Total infracciones"
          value={formatNumber(totalInfracciones)}
          helper={`Consulta: ${sampleSize} registros cargados`}
        />
        <MetricCard
          accent="orange"
          label="Vehiculos retenidos"
          value={formatNumber(vehiculosRetenidos)}
          helper="Unidades aun asociadas a encierro"
        />
        <MetricCard
          accent="red"
          label="Sin pago"
          value={formatNumber(pendientesPago)}
          helper="Prioridad de seguimiento"
        />
        <MetricCard
          accent="green"
          label="Pagados por liberar"
          value={formatNumber(pagadosPorLiberar)}
          helper="Listos para liberaciones"
        />
        <MetricCard
          accent="purple"
          label="Liberados por entregar"
          value={formatNumber(liberadosPorEntregar)}
          helper="Pendientes en encierro"
        />
        <MetricCard
          accent="teal"
          label="Entregados"
          value={formatNumber(entregados)}
          helper="Flujo concluido"
        />
      </section>

      {dashboardState.loading ? <p className="notice">Actualizando indicadores del dashboard...</p> : null}
      {dashboardState.error || notice ? (
        <div className="notice notice-error">{dashboardState.error ?? notice}</div>
      ) : null}

      <section className="dashboard-analytics-grid">
        <article className="dashboard-panel dashboard-panel-wide">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Operacion</p>
              <h2>Infracciones por dia</h2>
            </div>
            <span>Muestra reciente</span>
          </div>
          {dayChartData.length ? <ColumnChart data={dayChartData} /> : <EmptyChart message="Sin datos para graficar." />}
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

        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Delegaciones</p>
              <h2>Top unidades</h2>
            </div>
            <span>Muestra reciente</span>
          </div>
          {delegacionChartData.length ? (
            <BarChart data={delegacionChartData} />
          ) : (
            <EmptyChart message="Sin delegaciones para mostrar." />
          )}
        </article>

        <article className="dashboard-panel dashboard-panel-system">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Sistema</p>
              <h2>Sesion y catalogos</h2>
            </div>
          </div>
          <div className="dashboard-system-list">
            <div>
              <span>Usuario</span>
              <strong>{user.nombreUsuario}</strong>
              <small>{user.email}</small>
            </div>
            <div>
              <span>Rol</span>
              <strong>{user.rol?.nombreRol ?? 'Sin rol'}</strong>
              <small>{user.activo ? 'Usuario activo' : 'Usuario inactivo'}</small>
            </div>
            <div>
              <span>Catalogos</span>
              <strong>{catalogs ? `${formatNumber(catalogCount)} registros` : 'Cargando'}</strong>
              <a className="inline-link" href={getSwaggerUrl()} target="_blank" rel="noreferrer">
                Swagger / docs
              </a>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-actions-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="section-label">Acciones rapidas</p>
            <h2>Navegacion operativa</h2>
          </div>
        </div>
        <div className="dashboard-actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <button key={action.key} className="button-secondary" type="button" onClick={() => onNavigate(action.key)}>
              <strong>{action.label}</strong>
              <small>{action.description}</small>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

export default DashboardPage;

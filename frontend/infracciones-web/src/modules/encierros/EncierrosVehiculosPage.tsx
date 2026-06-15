import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SelectField } from '../../components/ui/SelectField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getErrorMessage } from '../../services/api/apiClient';
import {
  getVehiculosEnEncierro,
  getVehiculosEnEncierroResumen,
} from '../../services/api/encierros.api';
import { getInfraccionDetalle } from '../../services/api/infracciones.api';
import {
  formatDateTime,
  formatEmptyValue,
} from '../../lib/formatters';
import type { CatalogosBundle } from '../../types/catalogos.types';
import type {
  EstadoOperativoVehiculo,
  InfraccionDetalleResponse,
} from '../../types/infracciones.types';
import type {
  VehiculosEncierroQuery,
  VehiculosEncierroResponse,
  VehiculosEncierroResumen,
  VehiculoEncierroItem,
} from '../../types/encierros.types';
import { InfraccionDetalleModal } from '../infracciones/InfraccionDetalleModal';
import './EncierrosVehiculosPage.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface FiltersForm {
  search: string;
  idEncierro: string;
  idRegion: string;
  idDelegacion: string;
  anio: string;
  folioInfraccion: string;
  placas: string;
  serie: string;
  motor: string;
  nombreInfractor: string;
  licencia: string;
  estadoOperativo: string;
  fechaIngresoDesde: string;
  fechaIngresoHasta: string;
  fechaInfraccionDesde: string;
  fechaInfraccionHasta: string;
  conPago: string;
  conLiberacion: string;
  conSalida: string;
  page: string;
  limit: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

interface EncierrosVehiculosPageProps {
  catalogs: CatalogosBundle | null;
  token: string;
  refreshKey: number;
  onNavigatePago: (idInfraccion: number) => void;
  onNavigateLiberacion: (idInfraccion: number) => void;
  onNavigateSalida: (idRetencionVehiculo: number) => void;
}

const DEFAULT_FILTERS: FiltersForm = {
  search: '',
  idEncierro: '',
  idRegion: '',
  idDelegacion: '',
  anio: '',
  folioInfraccion: '',
  placas: '',
  serie: '',
  motor: '',
  nombreInfractor: '',
  licencia: '',
  estadoOperativo: '',
  fechaIngresoDesde: '',
  fechaIngresoHasta: '',
  fechaInfraccionDesde: '',
  fechaInfraccionHasta: '',
  conPago: '',
  conLiberacion: '',
  conSalida: '',
  page: '1',
  limit: '10',
  sortBy: 'fechaIngreso',
  sortOrder: 'DESC',
};

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function isFilled(value: string): boolean {
  return value.trim() !== '';
}

function toNumber(value: string): number | undefined {
  if (!isFilled(value)) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBoolean(value: string): boolean | undefined {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function buildQuery(filters: FiltersForm): VehiculosEncierroQuery {
  return {
    search: filters.search || undefined,
    idEncierro: toNumber(filters.idEncierro),
    idRegion: toNumber(filters.idRegion),
    idDelegacion: toNumber(filters.idDelegacion),
    anio: toNumber(filters.anio),
    folioInfraccion: filters.folioInfraccion || undefined,
    placas: filters.placas || undefined,
    serie: filters.serie || undefined,
    motor: filters.motor || undefined,
    nombreInfractor: filters.nombreInfractor || undefined,
    licencia: filters.licencia || undefined,
    estadoOperativo: (filters.estadoOperativo || undefined) as
      | EstadoOperativoVehiculo
      | undefined,
    fechaIngresoDesde: filters.fechaIngresoDesde || undefined,
    fechaIngresoHasta: filters.fechaIngresoHasta || undefined,
    fechaInfraccionDesde: filters.fechaInfraccionDesde || undefined,
    fechaInfraccionHasta: filters.fechaInfraccionHasta || undefined,
    conPago: toBoolean(filters.conPago),
    conLiberacion: toBoolean(filters.conLiberacion),
    conSalida: toBoolean(filters.conSalida),
    page: toNumber(filters.page),
    limit: toNumber(filters.limit),
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder,
  };
}

function getInfractorLabel(item: VehiculoEncierroItem): string {
  return item.infractorNombreCompleto || 'Sin información registrada';
}

function getVehicleLabel(item: VehiculoEncierroItem): string {
  const parts = [item.vehiculo.marca, item.vehiculo.linea, item.vehiculo.clase].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return parts.length > 0 ? parts.join(' - ') : 'Sin informacion registrada';
}

function getDiasEnEncierro(item: VehiculoEncierroItem): string {
  const fechaIngreso = new Date(item.retencion.fechaIngreso);
  const fechaSalida = item.salida.tieneSalida && item.salida.fechaSalida
    ? new Date(item.salida.fechaSalida)
    : new Date();

  if (Number.isNaN(fechaIngreso.getTime()) || Number.isNaN(fechaSalida.getTime())) {
    return 'Sin cálculo';
  }

  const diff = Math.max(0, fechaSalida.getTime() - fechaIngreso.getTime());
  const dias = Math.max(1, Math.ceil(diff / ONE_DAY_MS));
  const suffix = item.salida.tieneSalida ? 'total' : 'retenido';

  return `${dias} día${dias === 1 ? '' : 's'} ${suffix}`;
}

function getInventoryPendingLabel(item: VehiculoEncierroItem): string {
  switch (item.estadoOperativo) {
    case 'EN_ENCIERRO_SIN_PAGO':
      return 'Pendiente pago';
    case 'PAGADO_PENDIENTE_LIBERACION':
      return 'Pendiente liberación';
    case 'LIBERADO_PENDIENTE_SALIDA':
      return 'Listo para salida';
    case 'VEHICULO_ENTREGADO':
      return 'Entregado';
    case 'SIN_RETENCION':
      return 'Sin retención';
    default:
      return 'Revisar expediente';
  }
}

function EncierrosVehiculosPage({
  catalogs,
  refreshKey,
  token,
}: EncierrosVehiculosPageProps) {
  const [draftFilters, setDraftFilters] = useState<FiltersForm>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<FiltersForm>(DEFAULT_FILTERS);
  const [listState, setListState] = useState<LoadState<VehiculosEncierroResponse>>(createIdleState());
  const [summaryState, setSummaryState] = useState<LoadState<VehiculosEncierroResumen>>(
    createIdleState(),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailState, setDetailState] = useState<LoadState<InfraccionDetalleResponse>>(
    createIdleState(),
  );

  const query = useMemo(() => buildQuery(activeFilters), [activeFilters]);
  const items = listState.data?.data ?? [];
  const meta = listState.data?.meta ?? null;
  const summary = summaryState.data;

  useEffect(() => {
    let mounted = true;

    async function loadData(): Promise<void> {
      setListState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));
      setSummaryState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const [listResponse, summaryResponse] = await Promise.all([
          getVehiculosEnEncierro(token, query),
          getVehiculosEnEncierroResumen(token, query),
        ]);

        if (!mounted) {
          return;
        }

        setListState({
          status: 'ready',
          data: listResponse,
          error: null,
        });
        setSummaryState({
          status: 'ready',
          data: summaryResponse,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = getErrorMessage(error);
        setListState({
          status: 'error',
          data: null,
          error: message,
        });
        setSummaryState({
          status: 'error',
          data: null,
          error: message,
        });
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [query, refreshKey, token]);

  useEffect(() => {
    const detailId = selectedId;
    if (detailId === null) {
      return;
    }

    let mounted = true;

    async function loadDetail(currentDetailId: number): Promise<void> {
      setDetailState({
        status: 'loading',
        data: null,
        error: null,
      });

      try {
        const response = await getInfraccionDetalle(token, currentDetailId);
        if (!mounted) {
          return;
        }

        setDetailState({
          status: 'ready',
          data: response,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setDetailState({
          status: 'error',
          data: null,
          error: getErrorMessage(error),
        });
      }
    }

    void loadDetail(detailId);

    return () => {
      mounted = false;
    };
  }, [selectedId, token]);

  function updateDraftField(field: keyof FiltersForm, value: string): void {
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyFilters(event?: FormEvent<HTMLFormElement>): void {
    event?.preventDefault();
    const nextFilters = {
      ...draftFilters,
      page: draftFilters.page || '1',
      limit: draftFilters.limit || '10',
    };
    setDraftFilters(nextFilters);
    setActiveFilters(nextFilters);
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }

  function changePage(page: number): void {
    const nextPage = String(page);
    setDraftFilters((current) => ({
      ...current,
      page: nextPage,
    }));
    setActiveFilters((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  function openDetail(idInfraccion: number): void {
    setSelectedId(idInfraccion);
  }

  function closeDetail(): void {
    setSelectedId(null);
    setDetailState(createIdleState());
  }

  return (
    <section className="page-stack inventory-page">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Encierros</p>
          <h1>Inventario de encierros</h1>
          <p className="page-description">
            Control logístico de vehículos retenidos por patio, antigüedad y estado operativo.
          </p>
        </div>
      </header>

      <Card>
        <form className="page-stack" onSubmit={applyFilters}>
          <div className="panel-header">
            <div>
              <p className="section-label">Filtros</p>
              <h2>Busqueda de inventario</h2>
            </div>
            <div className="button-row">
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Limpiar filtros
              </Button>
              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </div>
          </div>

          <div className="form-grid form-grid-2">
            <Field htmlFor="encierros-search" label="Busqueda general">
              <TextInput
                id="encierros-search"
                value={draftFilters.search}
                onChange={(event) => updateDraftField('search', event.target.value)}
                placeholder="Folio, placas, infractor, licencia, serie o motor"
              />
            </Field>

            <Field htmlFor="encierros-encierro" label="Encierro">
              <SelectField
                id="encierros-encierro"
                value={draftFilters.idEncierro}
                onChange={(event) => updateDraftField('idEncierro', event.target.value)}
              >
                <option value="">Todos</option>
                {(catalogs?.encierros ?? []).map((encierro) => (
                  <option key={encierro.idEncierro} value={encierro.idEncierro}>
                    {encierro.nombreEncierro}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="encierros-fecha-ingreso-desde" label="Ingreso desde">
              <TextInput
                id="encierros-fecha-ingreso-desde"
                type="date"
                value={draftFilters.fechaIngresoDesde}
                onChange={(event) => updateDraftField('fechaIngresoDesde', event.target.value)}
              />
            </Field>

            <Field htmlFor="encierros-fecha-ingreso-hasta" label="Ingreso hasta">
              <TextInput
                id="encierros-fecha-ingreso-hasta"
                type="date"
                value={draftFilters.fechaIngresoHasta}
                onChange={(event) => updateDraftField('fechaIngresoHasta', event.target.value)}
              />
            </Field>

            <Field htmlFor="encierros-estado" label="Estado operativo">
              <SelectField
                id="encierros-estado"
                value={draftFilters.estadoOperativo}
                onChange={(event) => updateDraftField('estadoOperativo', event.target.value)}
              >
                <option value="">Todos</option>
                <option value="EN_ENCIERRO_SIN_PAGO">En encierro sin pago</option>
                <option value="PAGADO_PENDIENTE_LIBERACION">Pagado pendiente liberación</option>
                <option value="LIBERADO_PENDIENTE_SALIDA">Liberado pendiente salida</option>
                <option value="VEHICULO_ENTREGADO">Vehículo entregado</option>
              </SelectField>
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="encierros-placas" label="Placas">
              <TextInput
                id="encierros-placas"
                value={draftFilters.placas}
                onChange={(event) => updateDraftField('placas', event.target.value)}
              />
            </Field>

            <Field htmlFor="encierros-infractor" label="Nombre infractor">
              <TextInput
                id="encierros-infractor"
                value={draftFilters.nombreInfractor}
                onChange={(event) => updateDraftField('nombreInfractor', event.target.value)}
              />
            </Field>

            <Field htmlFor="encierros-delegacion" label="Delegacion">
              <SelectField
                id="encierros-delegacion"
                value={draftFilters.idDelegacion}
                onChange={(event) => updateDraftField('idDelegacion', event.target.value)}
              >
                <option value="">Todas</option>
                {(catalogs?.delegaciones ?? []).map((delegacion) => (
                  <option key={delegacion.idDelegacion} value={delegacion.idDelegacion}>
                    {delegacion.nombreDelegacion}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>
        </form>
      </Card>

      <div className="summary-strip inventory-summary-strip">
        <Card className="summary-card">
          <p className="card-label">Retenidos</p>
          <strong>{summary?.totalVehiculosRetenidos ?? 0}</strong>
        </Card>
        <Card className="summary-card">
          <p className="card-label">Sin pago</p>
          <strong>{summary?.totalSinPago ?? 0}</strong>
        </Card>
        <Card className="summary-card">
          <p className="card-label">Listos para liberar</p>
          <strong>{summary?.totalPagadosPendienteLiberacion ?? 0}</strong>
        </Card>
        <Card className="summary-card">
          <p className="card-label">Listos para entregar</p>
          <strong>{summary?.totalLiberadosPendienteSalida ?? 0}</strong>
        </Card>
        <Card className="summary-card">
          <p className="card-label">Entregados</p>
          <strong>{summary?.totalEntregados ?? 0}</strong>
        </Card>
      </div>

      {listState.status === 'loading' ? <LoadingMessage message="Cargando inventario..." /> : null}
      <ErrorMessage message={listState.error ?? summaryState.error} />

      <Card>
        <div className="page-stack">
          <div className="panel-header">
            <div>
              <p className="section-label">Inventario</p>
              <h2>Vehículos por encierro</h2>
            </div>

            {meta ? (
              <p className="meta-copy">
                Total {meta.total} · Página {meta.page} de {Math.max(1, Math.ceil(meta.total / meta.limit))}
              </p>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="data-table inventory-table">
              <thead>
                <tr>
                  <th>Encierro</th>
                  <th>Folio</th>
                  <th>Placas</th>
                  <th>Vehículo</th>
                  <th>Infractor</th>
                  <th>Ingreso</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-state">
                      {listState.status === 'loading'
                        ? 'Cargando inventario...'
                        : 'No hay vehículos para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={`${item.idRetencionVehiculo}-${item.idInfraccion}`}>
                      <td>
                        <div className="table-cell-stack inventory-encierro-cell">
                          <strong>{formatEmptyValue(item.retencion.encierro)}</strong>
                          <span>Resguardo: {formatEmptyValue(item.retencion.folioResguardo)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{item.folioInfraccion}</strong>
                          <span>{formatEmptyValue(item.retencion.estadoIngreso)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatEmptyValue(item.vehiculo.placas)}</strong>
                          <span>{formatEmptyValue(item.vehiculo.clase)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getVehicleLabel(item)}</strong>
                          <span>{formatEmptyValue(item.vehiculo.color)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getInfractorLabel(item)}</strong>
                          <span>Licencia: {formatEmptyValue(item.licencia)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatDateTime(item.retencion.fechaIngreso)}</strong>
                          <span>Ingreso registrado</span>
                        </div>
                      </td>
                      <td>
                        <span className="inventory-days-pill">{getDiasEnEncierro(item)}</span>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <StatusBadge value={item.estadoOperativo} />
                          <span>{getInventoryPendingLabel(item)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="inventory-action-stack">
                          <Button type="button" variant="secondary" onClick={() => openDetail(item.idInfraccion)}>
                            Ver expediente
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta ? (
            <PaginationControls
              page={meta.page}
              limit={meta.limit}
              total={meta.total}
              onPageChange={changePage}
            />
          ) : null}
        </div>
      </Card>

      <InfraccionDetalleModal
        open={selectedId !== null}
        loading={detailState.status === 'loading'}
        error={detailState.error}
        data={detailState.data}
        onClose={closeDetail}
      />
    </section>
  );
}

export default EncierrosVehiculosPage;

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
import { getInfraccionDetalle, getInfracciones } from '../../services/api/infracciones.api';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../utils/formatters';
import type { CatalogosBundle } from '../../types/catalogos.types';
import type {
  EstadoOperativoVehiculo,
  InfraccionDetalleResponse,
  InfraccionesQuery,
  InfraccionesResponse,
  InfraccionListItem,
  PaginationMeta,
} from '../../types/infracciones.types';
import { InfraccionDetalleModal } from './InfraccionDetalleModal';
import {
  InfraccionOperacionModal,
  type InfraccionOperacionTipo,
} from './InfraccionOperacionModal';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface FiltersForm {
  search: string;
  anio: string;
  fechaDesde: string;
  fechaHasta: string;
  idDelegacion: string;
  idEstatusInfraccion: string;
  idEncierro: string;
  folioInfraccion: string;
  placas: string;
  rfc: string;
  claveOficial: string;
  estadoOperativo: string;
  page: string;
  limit: string;
}

interface OperationState {
  type: InfraccionOperacionTipo;
  item: InfraccionListItem;
}

interface InfraccionesListPageProps {
  catalogs: CatalogosBundle | null;
  token: string;
  refreshKey: number;
  onNavigateCreate: () => void;
}

interface QuickStatusFilter {
  label: string;
  value: EstadoOperativoVehiculo | '';
}

interface NextOperation {
  type: InfraccionOperacionTipo | null;
  label: string;
  helper: string;
  disabled?: boolean;
}

const DEFAULT_FILTERS: FiltersForm = {
  search: '',
  anio: '',
  fechaDesde: '',
  fechaHasta: '',
  idDelegacion: '',
  idEstatusInfraccion: '',
  idEncierro: '',
  folioInfraccion: '',
  placas: '',
  rfc: '',
  claveOficial: '',
  estadoOperativo: '',
  page: '1',
  limit: '30',
};

const QUICK_STATUS_FILTERS: QuickStatusFilter[] = [
  { label: 'Todos', value: '' },
  { label: 'En encierro sin pago', value: 'EN_ENCIERRO_SIN_PAGO' },
  { label: 'Pagados por liberar', value: 'PAGADO_PENDIENTE_LIBERACION' },
  { label: 'Liberados por entregar', value: 'LIBERADO_PENDIENTE_SALIDA' },
  { label: 'Entregados', value: 'VEHICULO_ENTREGADO' },
];

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

function buildQuery(filters: FiltersForm): InfraccionesQuery {
  return {
    search: filters.search || undefined,
    anio: toNumber(filters.anio),
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    idDelegacion: toNumber(filters.idDelegacion),
    idEstatusInfraccion: toNumber(filters.idEstatusInfraccion),
    idEncierro: toNumber(filters.idEncierro),
    folioInfraccion: filters.folioInfraccion || undefined,
    placas: filters.placas || undefined,
    rfc: filters.rfc || undefined,
    claveOficial: filters.claveOficial || undefined,
    estadoOperativo: (filters.estadoOperativo || undefined) as EstadoOperativoVehiculo | undefined,
    page: toNumber(filters.page),
    limit: toNumber(filters.limit),
  };
}

function getInfractorLabel(item: InfraccionListItem): string {
  return formatFullName([
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ]);
}

function getVehicleLabel(item: InfraccionListItem): string {
  const parts = [item.vehiculo.marca, item.vehiculo.linea, item.vehiculo.clase].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return parts.length > 0 ? parts.join(' - ') : 'Sin informacion registrada';
}

function getOperationalDetail(item: InfraccionListItem): string {
  switch (item.estadoOperativoCalculado) {
    case 'SIN_RETENCION':
      return 'No hay ingreso al encierro';
    case 'EN_ENCIERRO_SIN_PAGO':
      return 'Vehiculo en resguardo';
    case 'PAGADO_PENDIENTE_LIBERACION':
      return item.pago?.montoPagado
        ? `Pago registrado por ${formatCurrencyMxn(item.pago.montoPagado)}`
        : 'Pago registrado';
    case 'LIBERADO_PENDIENTE_SALIDA':
      return 'Liberacion autorizada';
    case 'VEHICULO_ENTREGADO':
      return 'Vehiculo entregado';
    default:
      return 'Revisar expediente';
  }
}

function getNextOperation(item: InfraccionListItem): NextOperation {
  switch (item.estadoOperativoCalculado) {
    case 'SIN_RETENCION':
      return {
        type: 'retencion',
        label: 'Registrar ingreso',
        helper: 'Encierro debe recibir el vehiculo',
      };
    case 'EN_ENCIERRO_SIN_PAGO':
      return {
        type: 'pago',
        label: 'Registrar pago',
        helper: 'Infracciones debe registrar el pago',
      };
    case 'PAGADO_PENDIENTE_LIBERACION':
      return {
        type: 'liberacion',
        label: 'Autorizar liberacion',
        helper: 'Liberaciones debe emitir la autorizacion',
      };
    case 'LIBERADO_PENDIENTE_SALIDA':
      return {
        type: 'salida',
        label: 'Registrar salida',
        helper: 'Encierro debe entregar el vehiculo',
      };
    case 'VEHICULO_ENTREGADO':
      return {
        type: null,
        label: 'Completado',
        helper: 'Flujo operativo cerrado',
        disabled: true,
      };
    default:
      return {
        type: null,
        label: 'Revisar',
        helper: 'Abre el expediente para validar datos',
        disabled: true,
      };
  }
}

function getIngresoLabel(item: InfraccionListItem): string {
  if (!item.retencion) {
    return 'Pendiente de ingreso';
  }

  return formatDateTime(item.retencion.fechaIngreso);
}

function getEncierroLabel(item: InfraccionListItem): string {
  return item.retencion ? formatEmptyValue(item.retencion.encierro) : 'Sin encierro registrado';
}

function PendingText({ children }: { children: string }) {
  return <span className="table-operation-pending">{children}</span>;
}

function OperationButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" className="table-operation-button" onClick={onClick}>
      {children}
    </Button>
  );
}

function InfraccionesListPage({
  catalogs,
  refreshKey,
  token,
  onNavigateCreate,
}: InfraccionesListPageProps) {
  const [draftFilters, setDraftFilters] = useState<FiltersForm>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<FiltersForm>(DEFAULT_FILTERS);
  const [state, setState] = useState<LoadState<InfraccionesResponse>>(createIdleState());
  const [detailState, setDetailState] = useState<LoadState<InfraccionDetalleResponse>>(
    createIdleState(),
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [operationState, setOperationState] = useState<OperationState | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const query = useMemo(() => buildQuery(activeFilters), [activeFilters]);
  const meta: PaginationMeta | null = state.data?.meta ?? null;
  const items = state.data?.data ?? [];

  useEffect(() => {
    let mounted = true;

    async function loadInfracciones(): Promise<void> {
      setState((current) => ({
        ...current,
        status: 'loading',
        error: null,
      }));

      try {
        const response = await getInfracciones(token, query);

        if (!mounted) {
          return;
        }

        setState({
          status: 'ready',
          data: response,
          error: null,
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setState({
          status: 'error',
          data: null,
          error: getErrorMessage(error),
        });
      }
    }

    void loadInfracciones();

    return () => {
      mounted = false;
    };
  }, [query, refreshKey, localRefreshKey, token]);

  useEffect(() => {
    const detailId = selectedId;
    if (detailId === null) {
      return;
    }

    let mounted = true;

    async function loadDetalle(currentDetailId: number): Promise<void> {
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

    void loadDetalle(detailId);

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
      page: '1',
      limit: draftFilters.limit || '30',
    };
    setDraftFilters(nextFilters);
    setActiveFilters(nextFilters);
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }

  function applyQuickStatusFilter(value: EstadoOperativoVehiculo | ''): void {
    const nextFilters = {
      ...draftFilters,
      estadoOperativo: value,
      page: '1',
      limit: draftFilters.limit || '30',
    };
    setDraftFilters(nextFilters);
    setActiveFilters(nextFilters);
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

  function openOperation(type: InfraccionOperacionTipo, item: InfraccionListItem): void {
    setOperationState({ type, item });
  }

  function closeOperation(): void {
    setOperationState(null);
  }

  function completeOperation(): void {
    setOperationState(null);
    setLocalRefreshKey((current) => current + 1);
  }

  function renderNextActionCell(item: InfraccionListItem) {
    const nextOperation = getNextOperation(item);

    if (!nextOperation.type || nextOperation.disabled) {
      return (
        <div className="table-cell-stack">
          <Button type="button" variant="secondary" className="table-operation-button" disabled>
            {nextOperation.label}
          </Button>
          <PendingText>{nextOperation.helper}</PendingText>
        </div>
      );
    }

    return (
      <div className="table-cell-stack">
        <OperationButton onClick={() => openOperation(nextOperation.type as InfraccionOperacionTipo, item)}>
          {nextOperation.label}
        </OperationButton>
        <PendingText>{nextOperation.helper}</PendingText>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Operacion principal</p>
          <h1>Control operativo</h1>
          <p className="page-description">
            Verifica el ingreso del vehiculo, el pago, la liberacion y la salida desde una sola
            vista.
          </p>
        </div>

        <div className="button-row">
          <Button variant="primary" type="button" onClick={onNavigateCreate}>
            Nueva infraccion
          </Button>
        </div>
      </header>

      <Card>
        <form className="page-stack" onSubmit={applyFilters}>
          <div className="panel-header">
            <div>
              <p className="section-label">Filtros</p>
              <h2>Busqueda operativa</h2>
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

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-search" label="Busqueda general">
              <TextInput
                id="infracciones-search"
                value={draftFilters.search}
                onChange={(event) => updateDraftField('search', event.target.value)}
                placeholder="Folio, placas, infractor, licencia, serie o motor"
              />
            </Field>

            <Field htmlFor="infracciones-anio" label="Año">
              <TextInput
                id="infracciones-anio"
                type="number"
                min={1900}
                value={draftFilters.anio}
                onChange={(event) => updateDraftField('anio', event.target.value)}
                placeholder="2025"
              />
            </Field>

            <Field htmlFor="infracciones-folio" label="Folio infraccion">
              <TextInput
                id="infracciones-folio"
                value={draftFilters.folioInfraccion}
                onChange={(event) => updateDraftField('folioInfraccion', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-fecha-desde" label="Fecha desde">
              <TextInput
                id="infracciones-fecha-desde"
                type="date"
                value={draftFilters.fechaDesde}
                onChange={(event) => updateDraftField('fechaDesde', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-fecha-hasta" label="Fecha hasta">
              <TextInput
                id="infracciones-fecha-hasta"
                type="date"
                value={draftFilters.fechaHasta}
                onChange={(event) => updateDraftField('fechaHasta', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-delegacion" label="Delegacion">
              <SelectField
                id="infracciones-delegacion"
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

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-placas" label="Placas">
              <TextInput
                id="infracciones-placas"
                value={draftFilters.placas}
                onChange={(event) => updateDraftField('placas', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-rfc" label="RFC">
              <TextInput
                id="infracciones-rfc"
                value={draftFilters.rfc}
                onChange={(event) => updateDraftField('rfc', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-clave-oficial" label="Clave oficial">
              <TextInput
                id="infracciones-clave-oficial"
                value={draftFilters.claveOficial}
                onChange={(event) => updateDraftField('claveOficial', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-estatus" label="Estatus administrativo">
              <SelectField
                id="infracciones-estatus"
                value={draftFilters.idEstatusInfraccion}
                onChange={(event) => updateDraftField('idEstatusInfraccion', event.target.value)}
              >
                <option value="">Todos</option>
                {(catalogs?.estatusInfraccion ?? []).map((estatus) => (
                  <option key={estatus.idEstatusInfraccion} value={estatus.idEstatusInfraccion}>
                    {estatus.nombreEstatus}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="infracciones-estado-operativo" label="Estado operativo">
              <SelectField
                id="infracciones-estado-operativo"
                value={draftFilters.estadoOperativo}
                onChange={(event) => updateDraftField('estadoOperativo', event.target.value)}
              >
                <option value="">Todos</option>
                <option value="SIN_RETENCION">Sin ingreso a encierro</option>
                <option value="EN_ENCIERRO_SIN_PAGO">En encierro sin pago</option>
                <option value="PAGADO_PENDIENTE_LIBERACION">Pagado por liberar</option>
                <option value="LIBERADO_PENDIENTE_SALIDA">Liberado por entregar</option>
                <option value="VEHICULO_ENTREGADO">Vehiculo entregado</option>
              </SelectField>
            </Field>

            <Field htmlFor="infracciones-encierro" label="Encierro">
              <SelectField
                id="infracciones-encierro"
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
        </form>
      </Card>

      {state.status === 'loading' ? <LoadingMessage message="Cargando infracciones..." /> : null}
      <ErrorMessage message={state.error} />

      <Card>
        <div className="page-stack">
          <div className="table-field-toolbar">
            <div>
              <p className="section-label">Resultados</p>
              <h2>Control de flujo operativo</h2>
              <div className="table-field-meta">
                {meta ? <span>Total {meta.total}</span> : null}
                <span> · </span>
                <span>Accion unica por expediente</span>
              </div>
            </div>
          </div>

          <div className="button-row">
            {QUICK_STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.value || 'todos'}
                type="button"
                variant={activeFilters.estadoOperativo === filter.value ? 'primary' : 'secondary'}
                onClick={() => applyQuickStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="table-wrap table-wrap-expanded">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Vehiculo</th>
                  <th>Infractor</th>
                  <th>Encierro / Ingreso</th>
                  <th>Estado actual</th>
                  <th>Siguiente accion</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      {state.status === 'loading'
                        ? 'Cargando infracciones...'
                        : 'No hay infracciones para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.idInfraccion}>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{item.folioInfraccion}</strong>
                          <span>{formatDate(item.fechaInfraccion)}</span>
                          <span>{formatTimeOfDay(item.horaInfraccion)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getVehicleLabel(item)}</strong>
                          <span>Placas: {formatEmptyValue(item.vehiculo.placas)}</span>
                          <span>Color: {formatEmptyValue(item.vehiculo.color)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getInfractorLabel(item)}</strong>
                          <span>Licencia: {formatEmptyValue(item.infractor.licencia)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getEncierroLabel(item)}</strong>
                          <span>Ingreso: {getIngresoLabel(item)}</span>
                          <span>Resguardo: {formatEmptyValue(item.retencion?.folioResguardo)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <StatusBadge value={item.estadoOperativoCalculado} />
                          <span>{getOperationalDetail(item)}</span>
                        </div>
                      </td>
                      <td>{renderNextActionCell(item)}</td>
                      <td>
                        <Button type="button" variant="link" onClick={() => openDetail(item.idInfraccion)}>
                          Ver expediente
                        </Button>
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
              totalPages={meta.totalPages}
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

      <InfraccionOperacionModal
        catalogs={catalogs}
        item={operationState?.item ?? null}
        open={operationState !== null}
        token={token}
        type={operationState?.type ?? null}
        onClose={closeOperation}
        onCompleted={completeOperation}
      />
    </section>
  );
}

export default InfraccionesListPage;

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

const DEFAULT_FILTERS: FiltersForm = {
  search: '',
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
  limit: '10',
};

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
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    idDelegacion: toNumber(filters.idDelegacion),
    idEstatusInfraccion: toNumber(filters.idEstatusInfraccion),
    idEncierro: toNumber(filters.idEncierro),
    folioInfraccion: filters.folioInfraccion || undefined,
    placas: filters.placas || undefined,
    rfc: filters.rfc || undefined,
    claveOficial: filters.claveOficial || undefined,
    estadoOperativo: (filters.estadoOperativo || undefined) as
      | EstadoOperativoVehiculo
      | undefined,
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

function getPagoLabel(item: InfraccionListItem): string {
  if (!item.pago?.tienePago) {
    return 'Sin pago';
  }

  return [formatDateTime(item.pago.fechaUltimoPago), formatCurrencyMxn(item.pago.montoPagado)]
    .filter((value) => value !== 'Sin informacion registrada')
    .join(' | ');
}

function getLiberacionLabel(item: InfraccionListItem): string {
  if (!item.liberacion?.tieneLiberacion) {
    return 'Sin liberacion';
  }

  return formatDateTime(item.liberacion.fechaLiberacion);
}

function getSalidaLabel(item: InfraccionListItem): string {
  if (!item.salida?.tieneSalida) {
    return 'Sin salida';
  }

  return formatDateTime(item.salida.fechaSalida);
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

  function renderEncierroCell(item: InfraccionListItem) {
    if (!item.retencion) {
      return (
        <div className="table-cell-stack">
          <OperationButton onClick={() => openOperation('retencion', item)}>Retener</OperationButton>
          <PendingText>Sin encierro</PendingText>
        </div>
      );
    }

    return (
      <div className="table-cell-stack">
        <strong>{formatEmptyValue(item.retencion.encierro)}</strong>
        <span>{formatEmptyValue(item.retencion.folioResguardo)}</span>
      </div>
    );
  }

  function renderIngresoCell(item: InfraccionListItem) {
    if (!item.retencion) {
      return <PendingText>Pendiente de retencion</PendingText>;
    }

    return (
      <div className="table-cell-stack">
        <strong>{formatDateTime(item.retencion.fechaIngreso)}</strong>
        <span>{formatEmptyValue(item.retencion.estadoIngreso)}</span>
      </div>
    );
  }

  function renderPagoCell(item: InfraccionListItem) {
    if (!item.retencion) {
      return <PendingText>Requiere retencion</PendingText>;
    }

    if (!item.pago?.tienePago) {
      return (
        <div className="table-cell-stack">
          <OperationButton onClick={() => openOperation('pago', item)}>Pagar</OperationButton>
          <PendingText>Sin pago registrado</PendingText>
        </div>
      );
    }

    return (
      <div className="table-cell-stack">
        <strong>{getPagoLabel(item)}</strong>
        <span>{formatEmptyValue(item.pago?.montoPagado)}</span>
      </div>
    );
  }

  function renderLiberacionCell(item: InfraccionListItem) {
    if (!item.pago?.tienePago) {
      return <PendingText>Pendiente de pago</PendingText>;
    }

    if (!item.liberacion?.tieneLiberacion) {
      return (
        <div className="table-cell-stack">
          <OperationButton onClick={() => openOperation('liberacion', item)}>Liberar</OperationButton>
          <PendingText>Sin liberacion</PendingText>
        </div>
      );
    }

    return (
      <div className="table-cell-stack">
        <strong>{getLiberacionLabel(item)}</strong>
        <span>Liberacion registrada</span>
      </div>
    );
  }

  function renderSalidaCell(item: InfraccionListItem) {
    if (!item.liberacion?.tieneLiberacion) {
      return <PendingText>Pendiente de liberacion</PendingText>;
    }

    if (!item.salida?.tieneSalida && item.retencion?.idRetencionVehiculo) {
      return (
        <div className="table-cell-stack">
          <OperationButton onClick={() => openOperation('salida', item)}>Salida</OperationButton>
          <PendingText>Sin salida</PendingText>
        </div>
      );
    }

    return (
      <div className="table-cell-stack">
        <strong>{getSalidaLabel(item)}</strong>
        <span>Salida registrada</span>
      </div>
    );
  }

  return (
    <section className="page-stack">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Infracciones</h1>
          <p className="page-description">
            Consulta operativa con filtros completos y acciones contextuales sin salir del listado.
          </p>
        </div>

        <Button variant="primary" type="button" onClick={onNavigateCreate}>
          Nueva infraccion
        </Button>
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

          <div className="form-grid form-grid-2">
            <Field htmlFor="infracciones-search" label="Busqueda general">
              <TextInput
                id="infracciones-search"
                value={draftFilters.search}
                onChange={(event) => updateDraftField('search', event.target.value)}
                placeholder="Buscar por coincidencia en cualquier campo"
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
            <Field htmlFor="infracciones-estatus" label="Estatus">
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
                <option value="SIN_RETENCION">SIN_RETENCION</option>
                <option value="EN_ENCIERRO_SIN_PAGO">EN_ENCIERRO_SIN_PAGO</option>
                <option value="PAGADO_PENDIENTE_LIBERACION">
                  PAGADO_PENDIENTE_LIBERACION
                </option>
                <option value="LIBERADO_PENDIENTE_SALIDA">
                  LIBERADO_PENDIENTE_SALIDA
                </option>
                <option value="VEHICULO_ENTREGADO">VEHICULO_ENTREGADO</option>
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
          <div className="panel-header">
            <div>
              <p className="section-label">Resultados</p>
              <h2>Listado operativo</h2>
            </div>

            {meta ? (
              <p className="meta-copy">
                Total {meta.total} · Página {meta.page} de {Math.max(1, meta.totalPages)}
              </p>
            ) : null}
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Infractor</th>
                  <th>Placas</th>
                  <th>Vehiculo</th>
                  <th>Encierro</th>
                  <th>Ingreso</th>
                  <th>Pago</th>
                  <th>Liberacion</th>
                  <th>Salida</th>
                  <th>Estado operativo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-state">
                      {state.status === 'loading'
                        ? 'Cargando infracciones...'
                        : 'No hay infracciones para mostrar.'}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.idInfraccion}>
                      <td>{item.folioInfraccion}</td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatDate(item.fechaInfraccion)}</strong>
                          <span>{formatTimeOfDay(item.horaInfraccion)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getInfractorLabel(item)}</strong>
                          <span>{formatEmptyValue(item.infractor.licencia)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatEmptyValue(item.vehiculo.placas)}</strong>
                          <span>{formatEmptyValue(item.vehiculo.estadoPlacas)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getVehicleLabel(item)}</strong>
                          <span>{formatEmptyValue(item.vehiculo.color)}</span>
                        </div>
                      </td>
                      <td>{renderEncierroCell(item)}</td>
                      <td>{renderIngresoCell(item)}</td>
                      <td>{renderPagoCell(item)}</td>
                      <td>{renderLiberacionCell(item)}</td>
                      <td>{renderSalidaCell(item)}</td>
                      <td>
                        <StatusBadge value={item.estadoOperativoCalculado} />
                      </td>
                      <td>
                        <Button type="button" variant="link" onClick={() => openDetail(item.idInfraccion)}>
                          Ver detalle
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

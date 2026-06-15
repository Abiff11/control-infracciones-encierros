import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { SelectField } from '../../components/ui/SelectField';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getErrorMessage } from '../../services/api/apiClient';
import { getInfraccionDetalle, getInfracciones } from '../../services/api/infracciones.api';
import {
  formatDate,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../lib/formatters';
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

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface FiltersForm {
  anio: string;
  fechaDesde: string;
  fechaHasta: string;
  idRegion: string;
  idDelegacion: string;
  idEstatusInfraccion: string;
  idTipoProcedimiento: string;
  idMotivo: string;
  idEncierro: string;
  folioInfraccion: string;
  placas: string;
  serie: string;
  motor: string;
  nombreInfractor: string;
  licencia: string;
  clavePolicia: string;
  estadoOperativo: string;
  page: string;
  limit: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

interface InfraccionesListPageProps {
  catalogs: CatalogosBundle | null;
  token: string;
  refreshKey: number;
  onNavigateCreate: () => void;
}

const DEFAULT_FILTERS: FiltersForm = {
  anio: '',
  fechaDesde: '',
  fechaHasta: '',
  idRegion: '',
  idDelegacion: '',
  idEstatusInfraccion: '',
  idTipoProcedimiento: '',
  idMotivo: '',
  idEncierro: '',
  folioInfraccion: '',
  placas: '',
  serie: '',
  motor: '',
  nombreInfractor: '',
  licencia: '',
  clavePolicia: '',
  estadoOperativo: '',
  page: '1',
  limit: '10',
  sortBy: 'fechaInfraccion',
  sortOrder: 'DESC',
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
    anio: toNumber(filters.anio),
    fechaDesde: filters.fechaDesde || undefined,
    fechaHasta: filters.fechaHasta || undefined,
    idRegion: toNumber(filters.idRegion),
    idDelegacion: toNumber(filters.idDelegacion),
    idEstatusInfraccion: toNumber(filters.idEstatusInfraccion),
    idTipoProcedimiento: toNumber(filters.idTipoProcedimiento),
    idMotivo: toNumber(filters.idMotivo),
    idEncierro: toNumber(filters.idEncierro),
    folioInfraccion: filters.folioInfraccion || undefined,
    placas: filters.placas || undefined,
    serie: filters.serie || undefined,
    motor: filters.motor || undefined,
    nombreInfractor: filters.nombreInfractor || undefined,
    licencia: filters.licencia || undefined,
    clavePolicia: filters.clavePolicia || undefined,
    estadoOperativo: (filters.estadoOperativo || undefined) as
      | EstadoOperativoVehiculo
      | undefined,
    page: toNumber(filters.page),
    limit: toNumber(filters.limit),
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder,
  };
}

function getInfractorLabel(item: InfraccionListItem): string {
  return formatFullName([
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ]);
}

function formatMotivoLabel(motivo: InfraccionListItem['motivos'][number]): string {
  const descripcion = formatEmptyValue(motivo.descripcionMotivo);
  if (descripcion === motivo.nombreMotivo) {
    return motivo.nombreMotivo;
  }

  return `${motivo.nombreMotivo} - ${descripcion}`;
}

function renderMotivosChips(item: InfraccionListItem) {
  if (item.motivos.length === 0) {
    return <span className="table-empty">Sin informacion registrada</span>;
  }

  const visible = item.motivos.slice(0, 2);
  const hiddenCount = Math.max(0, item.motivos.length - visible.length);

  return (
    <div className="motivo-chip-row">
      {visible.map((motivo) => (
        <span key={motivo.idMotivo} className="motivo-chip" title={formatMotivoLabel(motivo)}>
          {motivo.nombreMotivo}
        </span>
      ))}
      {hiddenCount > 0 ? <span className="motivo-chip motivo-chip-muted">+{hiddenCount}</span> : null}
    </div>
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
  }, [query, refreshKey, token]);

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
    setActiveFilters(draftFilters);
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
  }

  function openDetail(idInfraccion: number): void {
    setSelectedId(idInfraccion);
  }

  function closeDetail(): void {
    setSelectedId(null);
    setDetailState(createIdleState());
  }

  return (
    <section className="page-stack">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Infracciones</h1>
          <p className="page-description">
            Consulta operativa con filtros completos y detalle expandido sin salir de la pantalla.
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

          <div className="form-grid form-grid-3">
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
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-region" label="Region">
              <SelectField
                id="infracciones-region"
                value={draftFilters.idRegion}
                onChange={(event) => updateDraftField('idRegion', event.target.value)}
              >
                <option value="">Todas</option>
                {(catalogs?.regiones ?? []).map((region) => (
                  <option key={region.idRegion} value={region.idRegion}>
                    {region.nombreRegion}
                  </option>
                ))}
              </SelectField>
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

            <Field htmlFor="infracciones-tipo-procedimiento" label="Tipo procedimiento">
              <SelectField
                id="infracciones-tipo-procedimiento"
                value={draftFilters.idTipoProcedimiento}
                onChange={(event) =>
                  updateDraftField('idTipoProcedimiento', event.target.value)
                }
              >
                <option value="">Todos</option>
                {(catalogs?.tiposProcedimiento ?? []).map((tipo) => (
                  <option key={tipo.idTipoProcedimiento} value={tipo.idTipoProcedimiento}>
                    {tipo.nombreTipoProcedimiento}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="infracciones-motivo" label="Motivo">
              <SelectField
                id="infracciones-motivo"
                value={draftFilters.idMotivo}
                onChange={(event) => updateDraftField('idMotivo', event.target.value)}
              >
                <option value="">Todos</option>
                {(catalogs?.motivos ?? []).map((motivo) => (
                  <option key={motivo.idMotivo} value={motivo.idMotivo}>
                    {motivo.nombreMotivo}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-folio" label="Folio">
              <TextInput
                id="infracciones-folio"
                value={draftFilters.folioInfraccion}
                onChange={(event) => updateDraftField('folioInfraccion', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-placas" label="Placas">
              <TextInput
                id="infracciones-placas"
                value={draftFilters.placas}
                onChange={(event) => updateDraftField('placas', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-serie" label="Serie">
              <TextInput
                id="infracciones-serie"
                value={draftFilters.serie}
                onChange={(event) => updateDraftField('serie', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-motor" label="Motor">
              <TextInput
                id="infracciones-motor"
                value={draftFilters.motor}
                onChange={(event) => updateDraftField('motor', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-infractor" label="Nombre infractor">
              <TextInput
                id="infracciones-infractor"
                value={draftFilters.nombreInfractor}
                onChange={(event) => updateDraftField('nombreInfractor', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-licencia" label="Licencia">
              <TextInput
                id="infracciones-licencia"
                value={draftFilters.licencia}
                onChange={(event) => updateDraftField('licencia', event.target.value)}
              />
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-clave-policia" label="Clave policia">
              <TextInput
                id="infracciones-clave-policia"
                value={draftFilters.clavePolicia}
                onChange={(event) => updateDraftField('clavePolicia', event.target.value)}
              />
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

            <Field htmlFor="infracciones-sort" label="Orden">
              <div className="form-grid form-grid-2">
                <SelectField
                  id="infracciones-sort"
                  value={draftFilters.sortBy}
                  onChange={(event) => updateDraftField('sortBy', event.target.value)}
                >
                  <option value="fechaInfraccion">Fecha infraccion</option>
                  <option value="folioInfraccion">Folio</option>
                  <option value="placas">Placas</option>
                  <option value="nombreInfractor">Nombre infractor</option>
                  <option value="estadoOperativo">Estado operativo</option>
                </SelectField>
                <SelectField
                  id="infracciones-sort-order"
                  value={draftFilters.sortOrder}
                  onChange={(event) =>
                    updateDraftField('sortOrder', event.target.value as 'ASC' | 'DESC')
                  }
                >
                  <option value="DESC">DESC</option>
                  <option value="ASC">ASC</option>
                </SelectField>
              </div>
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="infracciones-page" label="Pagina">
              <TextInput
                id="infracciones-page"
                type="number"
                min={1}
                value={draftFilters.page}
                onChange={(event) => updateDraftField('page', event.target.value)}
              />
            </Field>

            <Field htmlFor="infracciones-limit" label="Limite">
              <TextInput
                id="infracciones-limit"
                type="number"
                min={1}
                max={100}
                value={draftFilters.limit}
                onChange={(event) => updateDraftField('limit', event.target.value)}
              />
            </Field>

            <div className="form-hint form-hint-inline">
              Usa el boton superior para aplicar filtros.
            </div>
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
                Total {meta.total} · Página {meta.page} de {meta.totalPages}
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
                  <th>Motivos</th>
                  <th>Estado operativo</th>
                  <th>Estatus</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state">
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
                        {renderMotivosChips(item)}
                      </td>
                      <td>
                        <StatusBadge value={item.estadoOperativoCalculado} />
                      </td>
                      <td>{item.estatusInfraccion.nombreEstatus}</td>
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

export default InfraccionesListPage;

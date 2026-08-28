import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getErrorMessage } from '../../services/api/apiClient';
import {
  getAllInfracciones,
  getInfracciones,
} from '../../services/api/infracciones.api';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../utils/formatters';
import type {
  InfraccionesQuery,
  InfraccionesResponse,
  InfraccionListItem,
  PaginationMeta,
} from '../../types/infracciones.types';
import { InfraccionesReportModal } from './InfraccionesReportModal';
import './InfraccionesReportPage.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface InfraccionesReportPageProps {
  refreshKey: number;
  token: string;
}

interface DateRangeFilters {
  fechaInicio: string;
  fechaFin: string;
}

const DEFAULT_PAGE_SIZE = 30;
const INITIAL_DATE_RANGE: DateRangeFilters = {
  fechaInicio: '',
  fechaFin: '',
};

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
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

  return parts.length > 0 ? parts.join(' - ') : 'Sin información registrada';
}

function getPagoLabel(item: InfraccionListItem): string {
  if (!item.pago?.tienePago) {
    return 'Sin pago';
  }

  return [formatDateTime(item.pago.fechaUltimoPago), formatCurrencyMxn(item.pago.montoPagado)]
    .filter((value) => value !== 'Sin información registrada')
    .join(' | ');
}

function getLiberacionLabel(item: InfraccionListItem): string {
  if (!item.liberacion?.tieneLiberacion) {
    return 'Sin liberación';
  }

  return formatDateTime(item.liberacion.fechaLiberacion);
}

function getSalidaLabel(item: InfraccionListItem): string {
  if (!item.salida?.tieneSalida) {
    return 'Sin salida';
  }

  return formatDateTime(item.salida.fechaSalida);
}

function getDateRangeError(filters: DateRangeFilters): string | null {
  if (filters.fechaInicio && filters.fechaFin && filters.fechaInicio > filters.fechaFin) {
    return 'La fecha inicial no puede ser posterior a la fecha final.';
  }

  return null;
}

function getDateRangeLabel(filters: DateRangeFilters): string {
  if (filters.fechaInicio && filters.fechaFin) {
    return `${formatDate(filters.fechaInicio)} al ${formatDate(filters.fechaFin)}`;
  }

  if (filters.fechaInicio) {
    return `Desde ${formatDate(filters.fechaInicio)}`;
  }

  if (filters.fechaFin) {
    return `Hasta ${formatDate(filters.fechaFin)}`;
  }

  return 'Todas las fechas';
}

export function InfraccionesReportPage({ refreshKey, token }: InfraccionesReportPageProps) {
  const [state, setState] = useState<LoadState<InfraccionesResponse>>(createIdleState());
  const [page, setPage] = useState(1);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(() => new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportItems, setReportItems] = useState<InfraccionListItem[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [dateRangeDraft, setDateRangeDraft] = useState<DateRangeFilters>(INITIAL_DATE_RANGE);
  const [dateRange, setDateRange] = useState<DateRangeFilters>(INITIAL_DATE_RANGE);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const query = useMemo<InfraccionesQuery>(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      fechaInicio: dateRange.fechaInicio || undefined,
      fechaFin: dateRange.fechaFin || undefined,
    }),
    [dateRange.fechaFin, dateRange.fechaInicio, page],
  );
  const meta: PaginationMeta | null = state.data?.meta ?? null;
  const items = state.data?.data ?? [];
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedRowIds.has(item.idInfraccion));
  const appliedDateRangeLabel = getDateRangeLabel(dateRange);

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

  function changePage(nextPage: number): void {
    setSelectedRowIds(new Set());
    setPage(nextPage);
  }

  function toggleRowSelection(idInfraccion: number, checked: boolean): void {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(idInfraccion);
      } else {
        next.delete(idInfraccion);
      }
      return next;
    });
  }

  function toggleAllVisibleRows(checked: boolean): void {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (checked) {
          next.add(item.idInfraccion);
        } else {
          next.delete(item.idInfraccion);
        }
      }
      return next;
    });
  }

  function updateDateRange(field: keyof DateRangeFilters, value: string): void {
    setDateRangeDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setDateRangeError(null);
  }

  function applyDateRange(): void {
    const validationError = getDateRangeError(dateRangeDraft);
    if (validationError) {
      setDateRangeError(validationError);
      return;
    }

    setDateRange({ ...dateRangeDraft });
    setDateRangeError(null);
    setSelectedRowIds(new Set());
    setReportItems([]);
    setReportError(null);
    setReportOpen(false);
    setPage(1);
  }

  function clearDateRange(): void {
    setDateRangeDraft(INITIAL_DATE_RANGE);
    setDateRange(INITIAL_DATE_RANGE);
    setDateRangeError(null);
    setSelectedRowIds(new Set());
    setReportItems([]);
    setReportError(null);
    setReportOpen(false);
    setPage(1);
  }

  async function openReport(): Promise<void> {
    setReportLoading(true);
    setReportError(null);

    try {
      const allItems = await getAllInfracciones(token, {
        fechaInicio: dateRange.fechaInicio || undefined,
        fechaFin: dateRange.fechaFin || undefined,
      });
      setReportItems(allItems);
      setReportOpen(true);
    } catch (error) {
      setReportError(getErrorMessage(error));
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <section className="page-stack infracciones-report-page">
      <header className="page-header report-page-header">
        <div>
          <p className="eyebrow">Reportes</p>
          <h1>Generar reporte</h1>
          <p className="page-description">
            Consulta por rango de fecha y exporta todos los resultados a Excel o PDF.
          </p>
        </div>

        <div className="report-page-actions">
          <div className="report-page-chips" aria-label="Resumen de selección">
            <span>{items.length} visibles</span>
            <span>{meta ? `${meta.total} en el rango` : '0 en el rango'}</span>
            <span>{selectedRowIds.size} seleccionadas</span>
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={reportLoading}
            onClick={() => void openReport()}
          >
            {reportLoading ? 'Preparando reporte...' : 'Generar reporte'}
          </Button>
        </div>
      </header>

      <Card>
        <div className="report-date-filter">
          <div className="report-date-filter-copy">
            <p className="section-label">Rango de fecha</p>
            <h2>Fecha de infracción</h2>
            <p>
              El rango se aplica a la tabla y al reporte completo. Si no indicas fechas se incluyen todos los registros.
            </p>
          </div>

          <div className="report-date-filter-controls">
            <label className="report-date-filter-field" htmlFor="report-fecha-inicio">
              <span>Desde</span>
              <input
                id="report-fecha-inicio"
                type="date"
                value={dateRangeDraft.fechaInicio}
                onChange={(event) => updateDateRange('fechaInicio', event.target.value)}
              />
            </label>

            <label className="report-date-filter-field" htmlFor="report-fecha-fin">
              <span>Hasta</span>
              <input
                id="report-fecha-fin"
                type="date"
                value={dateRangeDraft.fechaFin}
                onChange={(event) => updateDateRange('fechaFin', event.target.value)}
              />
            </label>

            <div className="report-date-filter-buttons">
              <Button type="button" variant="primary" onClick={applyDateRange}>
                Aplicar rango
              </Button>
              <Button type="button" variant="secondary" onClick={clearDateRange}>
                Limpiar
              </Button>
            </div>
          </div>

          <div className="report-date-filter-status">
            <strong>Rango aplicado:</strong> {appliedDateRangeLabel}
          </div>
          <ErrorMessage message={dateRangeError} />
        </div>
      </Card>

      <Card>
        <div className="page-stack">
          <div className="table-field-toolbar">
            <div>
              <p className="section-label">Consulta</p>
              <h2>Infracciones disponibles</h2>
              <div className="table-field-meta">
                <span>{selectedRowIds.size} fila(s) seleccionada(s)</span>
                <span>{meta ? `Total ${meta.total}` : 'Total 0'}</span>
              </div>
            </div>

            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                disabled={reportLoading}
                onClick={() => void openReport()}
              >
                {reportLoading ? 'Preparando...' : 'Abrir reporte'}
              </Button>
            </div>
          </div>

          {state.status === 'loading' ? <LoadingMessage message="Cargando infracciones..." /> : null}
          <ErrorMessage message={state.error} />
          <ErrorMessage message={reportError} />

          <div className="table-wrap table-wrap-expanded">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-selection-cell">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar filas visibles"
                      checked={allVisibleSelected}
                      onChange={(event) => toggleAllVisibleRows(event.target.checked)}
                    />
                  </th>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Infractor</th>
                  <th>Placas</th>
                  <th>Vehículo</th>
                  <th>Encierro</th>
                  <th>Ingreso</th>
                  <th>Pago</th>
                  <th>Liberación</th>
                  <th>Salida</th>
                  <th>Estado operativo</th>
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
                      <td className="table-selection-cell">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar ${item.folioInfraccion}`}
                          checked={selectedRowIds.has(item.idInfraccion)}
                          onChange={(event) => toggleRowSelection(item.idInfraccion, event.target.checked)}
                        />
                      </td>
                      <td>
                        <strong>{item.folioInfraccion}</strong>
                      </td>
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
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatEmptyValue(item.retencion?.encierro)}</strong>
                          <span>{formatEmptyValue(item.retencion?.folioResguardo)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{formatDateTime(item.retencion?.fechaIngreso)}</strong>
                          <span>{formatEmptyValue(item.retencion?.estadoIngreso)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getPagoLabel(item)}</strong>
                          <span>{item.pago?.tienePago ? 'Pago registrado' : 'Sin pago registrado'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getLiberacionLabel(item)}</strong>
                          <span>{item.liberacion?.tieneLiberacion ? 'Liberación registrada' : 'Pendiente de liberación'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-cell-stack">
                          <strong>{getSalidaLabel(item)}</strong>
                          <span>{item.salida?.tieneSalida ? 'Salida registrada' : 'Pendiente de salida'}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge value={item.estadoOperativoCalculado} />
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

      <InfraccionesReportModal
        open={reportOpen}
        items={reportItems}
        selectedRowIds={selectedRowIds}
        dateRangeLabel={appliedDateRangeLabel}
        onClose={() => setReportOpen(false)}
      />
    </section>
  );
}

export default InfraccionesReportPage;
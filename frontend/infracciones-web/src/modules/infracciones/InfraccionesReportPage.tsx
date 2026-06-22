import { useEffect, useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { getErrorMessage } from '../../services/api/apiClient';
import { getInfracciones } from '../../services/api/infracciones.api';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../utils/formatters';
import type {
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

const DEFAULT_PAGE_SIZE = 30;

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

export function InfraccionesReportPage({ refreshKey, token }: InfraccionesReportPageProps) {
  const [state, setState] = useState<LoadState<InfraccionesResponse>>(createIdleState());
  const [page, setPage] = useState(1);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(() => new Set());
  const [reportOpen, setReportOpen] = useState(false);

  const query = useMemo(() => ({ page, limit: DEFAULT_PAGE_SIZE }), [page]);
  const meta: PaginationMeta | null = state.data?.meta ?? null;
  const items = state.data?.data ?? [];
  const allVisibleSelected =
    items.length > 0 && items.every((item) => selectedRowIds.has(item.idInfraccion));

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

  return (
    <section className="page-stack infracciones-report-page">
      <header className="page-header report-page-header">
        <div>
          <p className="eyebrow">Reportes</p>
          <h1>Generar reporte</h1>
          <p className="page-description">
            Elige el alcance y los campos del archivo. La tabla principal no cambia.
          </p>
        </div>

        <div className="report-page-actions">
          <div className="report-page-chips" aria-label="Resumen de selección">
            <span>{items.length} visibles</span>
            <span>{selectedRowIds.size} seleccionadas</span>
          </div>

          <Button type="button" variant="primary" onClick={() => setReportOpen(true)}>
            Generar reporte
          </Button>
        </div>
      </header>

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
              <Button type="button" variant="secondary" onClick={() => setReportOpen(true)}>
                Abrir reporte
              </Button>
            </div>
          </div>

          {state.status === 'loading' ? <LoadingMessage message="Cargando infracciones..." /> : null}
          <ErrorMessage message={state.error} />

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
        items={items}
        selectedRowIds={selectedRowIds}
        onClose={() => setReportOpen(false)}
      />
    </section>
  );
}

export default InfraccionesReportPage;

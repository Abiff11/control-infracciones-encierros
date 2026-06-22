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
import type { InfraccionesResponse, InfraccionListItem, PaginationMeta } from '../../types/infracciones.types';
import {
  DEFAULT_INFRACCIONES_FIELD_IDS,
  INFRACCIONES_FIELD_GROUPS,
  INFRACCIONES_REPORT_FIELDS,
  OPERATIONAL_INFRACCIONES_FIELD_IDS,
  type InfraccionesReportFieldId,
} from './infracciones-report-fields';
import {
  buildInfraccionesReportTable,
  downloadInfraccionesExcelReport,
  downloadInfraccionesPdfReport,
} from './infracciones-report-export';
import './InfraccionesReportModal.css';
import './InfraccionesReportPage.css';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';
type ReportScope = 'page' | 'selected';

interface LoadState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

interface InfraccionesReportPageProps {
  refreshKey: number;
  token: string;
}

const REPORT_FIELD_STORAGE_KEY = 'cie.infracciones.reportFields';
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

function readStoredReportFieldIds(): InfraccionesReportFieldId[] {
  if (typeof window === 'undefined') {
    return DEFAULT_INFRACCIONES_FIELD_IDS;
  }

  try {
    const rawValue = window.localStorage.getItem(REPORT_FIELD_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_INFRACCIONES_FIELD_IDS;
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return DEFAULT_INFRACCIONES_FIELD_IDS;
    }

    const availableIds = new Set(INFRACCIONES_REPORT_FIELDS.map((field) => field.id));
    const validIds = parsed.filter((fieldId): fieldId is InfraccionesReportFieldId =>
      typeof fieldId === 'string' && availableIds.has(fieldId),
    );

    return validIds.length > 0 ? validIds : DEFAULT_INFRACCIONES_FIELD_IDS;
  } catch {
    return DEFAULT_INFRACCIONES_FIELD_IDS;
  }
}

function persistReportFieldIds(fieldIds: InfraccionesReportFieldId[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(REPORT_FIELD_STORAGE_KEY, JSON.stringify(fieldIds));
}

function toggleField(
  current: InfraccionesReportFieldId[],
  fieldId: InfraccionesReportFieldId,
  checked: boolean,
): InfraccionesReportFieldId[] {
  if (checked) {
    return current.includes(fieldId) ? current : [...current, fieldId];
  }

  return current.filter((currentFieldId) => currentFieldId !== fieldId);
}

function getExportItems(
  items: InfraccionListItem[],
  selectedRowIds: Set<number>,
  scope: ReportScope,
): InfraccionListItem[] {
  if (scope === 'selected') {
    return items.filter((item) => selectedRowIds.has(item.idInfraccion));
  }

  return items;
}

export function InfraccionesReportPage({ refreshKey, token }: InfraccionesReportPageProps) {
  const [state, setState] = useState<LoadState<InfraccionesResponse>>(createIdleState());
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState<ReportScope>('page');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(() => new Set());
  const [selectedFieldIds, setSelectedFieldIds] = useState<InfraccionesReportFieldId[]>(
    readStoredReportFieldIds,
  );

  const query = useMemo(
    () => ({ page, limit: DEFAULT_PAGE_SIZE }),
    [page],
  );
  const meta: PaginationMeta | null = state.data?.meta ?? null;
  const items = state.data?.data ?? [];
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedRowIds.has(item.idInfraccion));
  const effectiveScope = selectedRowIds.size === 0 && scope === 'selected' ? 'page' : scope;
  const exportItems = getExportItems(items, selectedRowIds, effectiveScope);
  const reportTable = useMemo(
    () => buildInfraccionesReportTable(exportItems, selectedFieldIds),
    [exportItems, selectedFieldIds],
  );
  const previewRows = reportTable.rows.slice(0, 8);
  const canExport = exportItems.length > 0 && selectedFieldIds.length > 0;

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

  function updateSelectedReportFieldIds(fieldIds: InfraccionesReportFieldId[]): void {
    setSelectedFieldIds(fieldIds);
    persistReportFieldIds(fieldIds);
  }

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

  const payload = {
    title: 'Reporte de infracciones',
    contextLines: [`Alcance: ${exportItems.length} registro(s) de la pagina actual`],
    columns: reportTable.columns,
    rows: reportTable.rows,
  };

  const pageLabel = meta ? `Página ${meta.page} de ${meta.totalPages}` : 'Página 1';

  return (
    <section className="page-stack infracciones-report-page">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Reporte de infracciones</h1>
          <p className="page-description">
            Selecciona campos, usa la pagina actual o filas marcadas y exporta a Excel o PDF.
          </p>
        </div>

        <div className="report-page-header-meta">
          <span>{pageLabel}</span>
          <span>{selectedRowIds.size} seleccionadas</span>
          <span>{selectedFieldIds.length} campos de reporte</span>
        </div>
      </header>

      <Card>
        <div className="report-export-section-head">
          <div>
            <h3>Alcance del reporte</h3>
            <p className="page-description">Puedes exportar la pagina actual o solo las filas marcadas.</p>
          </div>
          <div className="report-export-summary">
            <span>{items.length} visibles</span>
            <span>{selectedRowIds.size} seleccionadas</span>
            <span>{selectedFieldIds.length} campos de reporte</span>
          </div>
        </div>

        <div className="report-scope-grid">
          <label className="report-scope-card">
            <input
              type="radio"
              name="reportScope"
              checked={effectiveScope === 'page'}
              onChange={() => setScope('page')}
            />
            <span>
              <strong>Pagina actual</strong>
              <small>Exporta los registros visibles con los filtros actuales.</small>
            </span>
          </label>
          <label className="report-scope-card">
            <input
              type="radio"
              name="reportScope"
              checked={effectiveScope === 'selected'}
              disabled={selectedRowIds.size === 0}
              onChange={() => setScope('selected')}
            />
            <span>
              <strong>Filas seleccionadas</strong>
              <small>Disponible cuando marcas una o más filas.</small>
            </span>
          </label>
        </div>
      </Card>

      <Card>
        <div className="report-export-section-head">
          <div>
            <h3>Campos del reporte</h3>
            <p className="page-description">Estos campos solo afectan el Excel/PDF y el preview.</p>
          </div>
          <div className="button-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateSelectedReportFieldIds(DEFAULT_INFRACCIONES_FIELD_IDS)}
            >
              Basicos
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateSelectedReportFieldIds(OPERATIONAL_INFRACCIONES_FIELD_IDS)}
            >
              Operativo
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => updateSelectedReportFieldIds(INFRACCIONES_REPORT_FIELDS.map((field) => field.id))}
            >
              Todos
            </Button>
          </div>
        </div>

        <div className="report-field-groups">
          {INFRACCIONES_FIELD_GROUPS.map((group) => {
            const fields = INFRACCIONES_REPORT_FIELDS.filter((field) => field.group === group);

            return (
              <div className="report-field-group" key={group}>
                <strong>{group}</strong>
                <div className="report-field-list">
                  {fields.map((field) => (
                    <label className="report-field-option" key={field.id}>
                      <input
                        type="checkbox"
                        checked={selectedFieldIds.includes(field.id)}
                        onChange={(event) =>
                          updateSelectedReportFieldIds(
                            toggleField(selectedFieldIds, field.id, event.target.checked),
                          )
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {state.status === 'loading' ? <LoadingMessage message="Cargando infracciones..." /> : null}
      <ErrorMessage message={state.error} />

      <Card>
        <div className="page-stack">
          <div className="table-field-toolbar">
            <div>
              <p className="section-label">Resultados</p>
              <h2>Registros visibles</h2>
              <div className="table-field-meta">
                <span>{selectedRowIds.size} fila(s) seleccionada(s)</span>
                <span>{meta ? `Total ${meta.total}` : 'Total 0'}</span>
              </div>
            </div>

            <div className="button-row button-row-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedRowIds(new Set())}
              >
                Limpiar seleccion
              </Button>
            </div>
          </div>

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
                  <th>Vehiculo</th>
                  <th>Encierro</th>
                  <th>Ingreso</th>
                  <th>Pago</th>
                  <th>Liberacion</th>
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
                          onChange={(event) =>
                            toggleRowSelection(item.idInfraccion, event.target.checked)
                          }
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
                          <span>{item.liberacion?.tieneLiberacion ? 'Liberacion registrada' : 'Pendiente de liberacion'}</span>
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

      <Card>
        <div className="report-export-section-head">
          <div>
            <h3>Preview del reporte</h3>
            <p className="page-description">Primeros {previewRows.length} registros del documento.</p>
          </div>
        </div>

        {reportTable.columns.length === 0 ? (
          <div className="notice">Selecciona al menos un campo.</div>
        ) : previewRows.length === 0 ? (
          <div className="notice">No hay registros para exportar.</div>
        ) : (
          <div className="table-wrap report-preview-table-wrap">
            <table className="data-table report-preview-table">
              <thead>
                <tr>
                  {reportTable.columns.map((column) => (
                    <th key={column.id}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row) => (
                  <tr key={row.id}>
                    {row.cells.map((cell, index) => (
                      <td key={`${row.id}-${reportTable.columns[index]?.id ?? index}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="report-export-footer button-row button-row-end">
        <Button
          type="button"
          variant="secondary"
          disabled={!canExport}
          onClick={() => downloadInfraccionesExcelReport(payload)}
        >
          Descargar Excel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={!canExport}
          onClick={() => downloadInfraccionesPdfReport(payload)}
        >
          Generar PDF
        </Button>
      </div>
    </section>
  );
}

export default InfraccionesReportPage;

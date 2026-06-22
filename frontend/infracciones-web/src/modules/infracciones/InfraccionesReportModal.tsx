import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { InfraccionListItem } from '../../types/infracciones.types';
import {
  DEFAULT_INFRACCIONES_FIELD_IDS,
  INFRACCIONES_FIELD_GROUPS,
  INFRACCIONES_REPORT_FIELDS,
  OPERATIONAL_INFRACCIONES_FIELD_IDS,
  type InfraccionesReportFieldDefinition,
  type InfraccionesReportFieldGroup,
  type InfraccionesReportFieldId,
} from './infracciones-report-fields';
import {
  buildInfraccionesReportTable,
  downloadInfraccionesExcelReport,
  downloadInfraccionesPdfReport,
} from './infracciones-report-export';
import './InfraccionesReportModal.css';

type ReportScope = 'page' | 'selected';
type ReportFormat = 'excel' | 'pdf';

interface InfraccionesReportModalProps {
  open: boolean;
  items: InfraccionListItem[];
  selectedRowIds: Set<number>;
  onClose: () => void;
}

interface ReportGroupView {
  group: InfraccionesReportFieldGroup;
  fields: InfraccionesReportFieldDefinition[];
  total: number;
  selectedCount: number;
}

const REPORT_FIELD_STORAGE_KEY = 'cie.infracciones.reportFields';
const PREVIEW_ROW_LIMIT = 8;
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

function getFieldLabel(fieldId: InfraccionesReportFieldId): string {
  return INFRACCIONES_REPORT_FIELDS.find((field) => field.id === fieldId)?.label ?? fieldId;
}

function getGroupLabel(group: InfraccionesReportFieldGroup): string {
  switch (group) {
    case 'Infraccion':
      return 'Infracción';
    case 'Infractor':
      return 'Infractor';
    case 'Vehiculo':
      return 'Vehículo';
    case 'Ubicacion':
      return 'Ubicación';
    case 'Motivos':
      return 'Motivos';
    case 'Pago':
      return 'Pago';
    case 'Encierro':
      return 'Encierro';
    case 'Liberacion':
      return 'Liberación';
    case 'Salida':
      return 'Salida';
    case 'Control':
      return 'Control';
    default:
      return group;
  }
}

function matchesFieldSearch(field: InfraccionesReportFieldDefinition, searchText: string): boolean {
  if (!searchText) {
    return true;
  }

  const normalizedSearch = searchText.trim().toLowerCase();
  return (
    field.label.toLowerCase().includes(normalizedSearch) ||
    getGroupLabel(field.group).toLowerCase().includes(normalizedSearch)
  );
}

function getSelectedFieldSummary(selectedFieldIds: InfraccionesReportFieldId[]): string {
  if (selectedFieldIds.length === 0) {
    return 'Sin campos seleccionados';
  }

  const labels = selectedFieldIds.slice(0, 3).map(getFieldLabel);
  const remaining = selectedFieldIds.length - labels.length;

  return remaining > 0 ? `Campos: ${labels.join(', ')} +${remaining} más` : `Campos: ${labels.join(', ')}`;
}

function getPresetFieldIds(preset: 'basic' | 'operational' | 'complete'): InfraccionesReportFieldId[] {
  if (preset === 'basic') {
    return DEFAULT_INFRACCIONES_FIELD_IDS;
  }

  if (preset === 'operational') {
    return OPERATIONAL_INFRACCIONES_FIELD_IDS;
  }

  return INFRACCIONES_REPORT_FIELDS.map((field) => field.id);
}

function getExactPreset(
  selectedFieldIds: InfraccionesReportFieldId[],
): 'basic' | 'operational' | 'complete' | null {
  const normalized = selectedFieldIds.join('|');
  const basic = DEFAULT_INFRACCIONES_FIELD_IDS.join('|');
  const operational = OPERATIONAL_INFRACCIONES_FIELD_IDS.join('|');
  const complete = INFRACCIONES_REPORT_FIELDS.map((field) => field.id).join('|');

  if (normalized === basic) {
    return 'basic';
  }

  if (normalized === operational) {
    return 'operational';
  }

  if (normalized === complete) {
    return 'complete';
  }

  return null;
}

function getPreviewMessage(canExport: boolean, selectedFieldIdsLength: number, exportCount: number): string {
  if (!canExport) {
    if (selectedFieldIdsLength === 0) {
      return 'Selecciona al menos un campo para ver la vista previa.';
    }

    return 'No hay registros para exportar con el alcance actual.';
  }

  return exportCount === 0 ? 'No hay registros para exportar con el alcance actual.' : '';
}

export function InfraccionesReportModal({
  items,
  onClose,
  open,
  selectedRowIds,
}: InfraccionesReportModalProps) {
  const [scope, setScope] = useState<ReportScope>('page');
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedFieldIds, setSelectedFieldIds] = useState<InfraccionesReportFieldId[]>(
    readStoredReportFieldIds,
  );

  const effectiveScope = selectedRowIds.size === 0 && scope === 'selected' ? 'page' : scope;
  const exportItems = useMemo(
    () => getExportItems(items, selectedRowIds, effectiveScope),
    [effectiveScope, items, selectedRowIds],
  );
  const reportTable = useMemo(
    () => buildInfraccionesReportTable(exportItems, selectedFieldIds),
    [exportItems, selectedFieldIds],
  );
  const previewRows = reportTable.rows.slice(0, PREVIEW_ROW_LIMIT);
  const canExport = exportItems.length > 0 && selectedFieldIds.length > 0;
  const previewMessage = getPreviewMessage(canExport, selectedFieldIds.length, exportItems.length);
  const preset = getExactPreset(selectedFieldIds);
  const selectedSummary = getSelectedFieldSummary(selectedFieldIds);
  const normalizedSearch = fieldSearch.trim().toLowerCase();
  const visibleGroups: ReportGroupView[] = INFRACCIONES_FIELD_GROUPS.map((group) => {
    const fields = INFRACCIONES_REPORT_FIELDS.filter(
      (field) => field.group === group && matchesFieldSearch(field, normalizedSearch),
    );
    const allGroupFields = INFRACCIONES_REPORT_FIELDS.filter((field) => field.group === group);
    const selectedCount = allGroupFields.filter((field) => selectedFieldIds.includes(field.id)).length;

    return {
      group,
      fields,
      total: allGroupFields.length,
      selectedCount,
    };
  }).filter((group) => group.fields.length > 0 || normalizedSearch.length === 0);

  const payload = {
    title: 'Reporte de infracciones',
    contextLines: [
      `Alcance: ${effectiveScope === 'selected' ? 'Seleccionadas' : 'Página actual'}`,
      `Registros visibles: ${items.length}`,
      `Registros a exportar: ${exportItems.length}`,
      `Campos incluidos: ${selectedFieldIds.length}`,
    ],
    columns: reportTable.columns,
    rows: reportTable.rows,
  };

  function updateSelectedFieldIds(fieldIds: InfraccionesReportFieldId[]): void {
    setSelectedFieldIds(fieldIds);
    persistReportFieldIds(fieldIds);
  }

  function applyPreset(presetKey: 'basic' | 'operational' | 'complete'): void {
    updateSelectedFieldIds(getPresetFieldIds(presetKey));
  }

  function clearFields(): void {
    updateSelectedFieldIds([]);
  }

  function toggleGroup(group: InfraccionesReportFieldGroup, checked: boolean): void {
    const groupIds = INFRACCIONES_REPORT_FIELDS.filter((field) => field.group === group).map(
      (field) => field.id,
    ) as InfraccionesReportFieldId[];

    updateSelectedFieldIds(
      checked
        ? Array.from(new Set([...selectedFieldIds, ...groupIds]))
        : selectedFieldIds.filter((fieldId) => !groupIds.includes(fieldId)),
    );
  }

  function toggleFieldSelection(fieldId: InfraccionesReportFieldId, checked: boolean): void {
    updateSelectedFieldIds(toggleField(selectedFieldIds, fieldId, checked));
  }

  function handleExport(format: ReportFormat): void {
    if (!canExport) {
      return;
    }

    if (format === 'excel') {
      downloadInfraccionesExcelReport(payload);
      return;
    }

    downloadInfraccionesPdfReport(payload);
  }

  return (
    <Modal
      open={open}
      title="Generar reporte"
      description="Elige el alcance y los campos del archivo. La tabla principal no cambia."
      eyebrowLabel="Reportes"
      size="wide"
      onClose={onClose}
    >
      <div className="report-modal-shell">
        <header className="report-modal-summary" aria-label="Resumen del reporte">
          <span>{items.length} visibles</span>
          <span>{selectedRowIds.size} seleccionadas</span>
          <span>{selectedFieldIds.length} campos</span>
          <span>{exportItems.length} a exportar</span>
        </header>

        <div className="report-modal-layout">
          <section className="report-config-panel">
            <div className="report-modal-section">
              <div className="report-section-head">
                <div>
                  <p className="section-label">Alcance</p>
                  <h3>Qué registros se exportarán</h3>
                </div>
                <p className="report-inline-note">Se exportarán {exportItems.length} registros.</p>
              </div>

              <div className="report-scope-switch" role="group" aria-label="Alcance del reporte">
                <button
                  type="button"
                  className={`report-scope-option ${effectiveScope === 'page' ? 'is-active' : ''}`}
                  aria-pressed={effectiveScope === 'page'}
                  onClick={() => setScope('page')}
                >
                  <strong>Página actual</strong>
                  <span>Exporta lo que ves con los filtros actuales.</span>
                </button>
                <button
                  type="button"
                  className={`report-scope-option ${effectiveScope === 'selected' ? 'is-active' : ''}`}
                  aria-pressed={effectiveScope === 'selected'}
                  disabled={selectedRowIds.size === 0}
                  onClick={() => setScope('selected')}
                >
                  <strong>Seleccionadas</strong>
                  {selectedRowIds.size === 0 ? (
                    <span>Marca filas en la tabla para exportarlas por separado.</span>
                  ) : (
                    <span>Exporta solo las filas marcadas.</span>
                  )}
                </button>
              </div>
            </div>

            <div className="report-modal-section">
              <div className="report-section-head">
                <div>
                  <p className="section-label">Presets</p>
                  <h3>Selección rápida</h3>
                </div>
                <p className="report-inline-note">{selectedSummary}</p>
              </div>

              <div className="report-preset-row">
                <Button
                  type="button"
                  variant={preset === 'basic' ? 'primary' : 'secondary'}
                  className={`report-preset-button ${preset === 'basic' ? 'is-active' : ''}`}
                  onClick={() => applyPreset('basic')}
                >
                  Básico
                </Button>
                <Button
                  type="button"
                  variant={preset === 'operational' ? 'primary' : 'secondary'}
                  className={`report-preset-button ${preset === 'operational' ? 'is-active' : ''}`}
                  onClick={() => applyPreset('operational')}
                >
                  Operativo
                </Button>
                <Button
                  type="button"
                  variant={preset === 'complete' ? 'primary' : 'secondary'}
                  className={`report-preset-button ${preset === 'complete' ? 'is-active' : ''}`}
                  onClick={() => applyPreset('complete')}
                >
                  Completo
                </Button>
                <Button type="button" variant="secondary" className="report-preset-button" onClick={clearFields}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="report-modal-section">
              <label className="report-field-search" htmlFor="report-field-search">
                <span>Buscar campo</span>
                <input
                  id="report-field-search"
                  type="search"
                  value={fieldSearch}
                  onChange={(event) => setFieldSearch(event.target.value)}
                  placeholder="Buscar campo..."
                />
              </label>

              <div className="report-field-chips" aria-label="Campos incluidos">
                {selectedFieldIds.length === 0 ? (
                  <span className="report-chip report-chip-muted">Sin campos seleccionados</span>
                ) : (
                  <span className="report-chip">{selectedSummary}</span>
                )}
              </div>
            </div>

            <div className="report-modal-section report-field-section">
              <div className="report-section-head">
                <div>
                  <p className="section-label">Campos</p>
                  <h3>Selecciona qué columnas incluir</h3>
                </div>
              </div>

              <div className="report-field-accordion-list">
                {visibleGroups.length === 0 ? (
                  <div className="report-empty-state">No hay campos con ese nombre.</div>
                ) : (
                  visibleGroups.map((group) => {
                    const groupIds = INFRACCIONES_REPORT_FIELDS.filter((field) => field.group === group.group).map(
                      (field) => field.id,
                    ) as InfraccionesReportFieldId[];
                    const allSelected =
                      group.total > 0 && groupIds.every((fieldId) => selectedFieldIds.includes(fieldId));
                    const someSelected =
                      group.total > 0 &&
                      groupIds.some((fieldId) => selectedFieldIds.includes(fieldId)) &&
                      !allSelected;

                    return (
                      <details className="report-field-accordion" key={group.group} open={group.selectedCount > 0}>
                        <summary>
                          <strong>{getGroupLabel(group.group)}</strong>
                          <span>
                            {group.selectedCount}/{group.total}
                          </span>
                        </summary>

                        <div className="report-field-accordion-body">
                          <div className="report-group-actions">
                            <Button
                              type="button"
                              variant="secondary"
                              className="report-mini-button"
                              onClick={() => toggleGroup(group.group, true)}
                            >
                              Todos
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="report-mini-button"
                              onClick={() => toggleGroup(group.group, false)}
                            >
                              Ninguno
                            </Button>
                          </div>

                          <div className="report-field-grid">
                            {group.fields.map((field) => (
                              <label className="report-field-option" key={field.id}>
                                <input
                                  type="checkbox"
                                  checked={selectedFieldIds.includes(field.id)}
                                  onChange={(event) => toggleFieldSelection(field.id, event.target.checked)}
                                />
                                <span>{field.label}</span>
                              </label>
                            ))}
                          </div>

                          {someSelected ? <small className="report-group-note">Selección parcial.</small> : null}
                        </div>
                      </details>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          <aside className="report-preview-panel">
            <div className="report-modal-section report-preview-section">
              <div className="report-section-head">
                <div>
                  <p className="section-label">Vista previa</p>
                  <h3>Resultado antes de exportar</h3>
                </div>
                <p className="report-inline-note">
                  {previewRows.length} filas · {reportTable.columns.length} columnas
                </p>
              </div>

              {previewMessage ? (
                <div className="report-empty-state">{previewMessage}</div>
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
            </div>
          </aside>
        </div>

        <footer className="report-modal-footer">
          <div className="report-footer-note">
            {selectedFieldIds.length === 0
              ? 'Selecciona al menos un campo.'
              : exportItems.length === 0
                ? 'No hay registros para exportar.'
                : 'Listo para exportar.'}
          </div>

          <div className="report-footer-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" disabled={!canExport} onClick={() => handleExport('excel')}>
              Exportar Excel
            </Button>
            <Button type="button" variant="primary" disabled={!canExport} onClick={() => handleExport('pdf')}>
              Generar PDF
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}

export default InfraccionesReportModal;

import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import type { InfraccionListItem } from '../../types/infracciones.types';
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

type ReportScope = 'page' | 'selected';

interface InfraccionesReportModalProps {
  open: boolean;
  items: InfraccionListItem[];
  selectedRowIds: Set<number>;
  selectedFieldIds: InfraccionesReportFieldId[];
  contextLines: string[];
  onSelectedFieldIdsChange: (fieldIds: InfraccionesReportFieldId[]) => void;
  onClose: () => void;
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

export function InfraccionesReportModal({
  contextLines,
  items,
  onClose,
  onSelectedFieldIdsChange,
  open,
  selectedFieldIds,
  selectedRowIds,
}: InfraccionesReportModalProps) {
  const [scope, setScope] = useState<ReportScope>(selectedRowIds.size > 0 ? 'selected' : 'page');
  const effectiveScope = selectedRowIds.size === 0 && scope === 'selected' ? 'page' : scope;
  const exportItems = useMemo(
    () => getExportItems(items, selectedRowIds, effectiveScope),
    [effectiveScope, items, selectedRowIds],
  );
  const reportTable = useMemo(
    () => buildInfraccionesReportTable(exportItems, selectedFieldIds),
    [exportItems, selectedFieldIds],
  );
  const previewRows = reportTable.rows.slice(0, 8);
  const canExport = exportItems.length > 0 && selectedFieldIds.length > 0;
  const payload = {
    title: 'Reporte de infracciones',
    contextLines: [
      effectiveScope === 'selected'
        ? `Alcance: ${exportItems.length} registro(s) seleccionado(s)`
        : `Alcance: ${exportItems.length} registro(s) de la pagina actual`,
      ...contextLines,
    ],
    columns: reportTable.columns,
    rows: reportTable.rows,
  };

  return (
    <Modal
      open={open}
      title="Reportes de infracciones"
      description="Selecciona únicamente los campos que deben salir en el Excel o PDF. La tabla principal permanece fija."
      onClose={onClose}
    >
      <div className="infracciones-report-modal page-stack">
        <section className="report-export-section">
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
                <small>Exporta los registros visibles con los filtros aplicados.</small>
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
        </section>

        <section className="report-export-section">
          <div className="report-export-section-head">
            <div>
              <h3>Campos del reporte</h3>
              <p className="page-description">Estos campos solo afectan el Excel/PDF y el preview del documento.</p>
            </div>
            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onSelectedFieldIdsChange(DEFAULT_INFRACCIONES_FIELD_IDS)}
              >
                Basicos
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onSelectedFieldIdsChange(OPERATIONAL_INFRACCIONES_FIELD_IDS)}
              >
                Operativo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onSelectedFieldIdsChange(INFRACCIONES_REPORT_FIELDS.map((field) => field.id))}
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
                            onSelectedFieldIdsChange(
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
        </section>

        <section className="report-export-section">
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
        </section>

        <div className="report-export-footer button-row button-row-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
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
      </div>
    </Modal>
  );
}

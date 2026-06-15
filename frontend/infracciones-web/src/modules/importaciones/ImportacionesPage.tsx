import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { SelectField } from '../../components/ui/SelectField';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { getErrorMessage } from '../../services/api/apiClient';
import {
  confirmarImportacionInfracciones,
  getImportacionInfraccionesDetalle,
  getImportacionesInfracciones,
  previewImportacionInfracciones,
} from '../../services/api/importaciones.api';
import type { CatalogosBundle } from '../../types/catalogos.types';
import {
  ImportacionFilaIssueTipo,
  ImportacionInfraccionesEstado,
  ImportacionInfraccionesModoDuplicados,
  type ImportacionDetalleResponse,
  type ImportacionInfraccionesConfirmarPayload,
  type ImportacionInfraccionesPreviewPayload,
  type ImportacionInfraccionesResumen,
  type ImportacionPreviewResponse,
} from '../../types/importaciones.types';

interface LoadState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string | null;
}

interface ImportacionesPageProps {
  catalogs: CatalogosBundle | null;
  token: string;
  onImportCompleted: () => Promise<void> | void;
}

interface ImportacionesFormState {
  anio: string;
  idRegion: string;
  idDelegacionDefault: string;
  modoDuplicados: ImportacionInfraccionesModoDuplicados;
  crearCatalogosFaltantes: boolean;
  crearDelegacionesFaltantes: boolean;
  observaciones: string;
}

const DEFAULT_YEAR = '2025';

function createIdleState<T>(): LoadState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
  };
}

function toNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getRegionLabel(item: ImportacionInfraccionesResumen): string {
  return item.region?.nombreRegion ?? 'Sin region';
}

function getDelegacionLabel(item: ImportacionInfraccionesResumen): string {
  return item.delegacionDefault?.nombreDelegacion ?? 'Sin delegacion default';
}

function getStatusLabel(status: ImportacionInfraccionesEstado): string {
  switch (status) {
    case ImportacionInfraccionesEstado.PREVIEW:
      return 'Preview';
    case ImportacionInfraccionesEstado.IMPORTADA:
      return 'Importada';
    case ImportacionInfraccionesEstado.IMPORTADA_CON_ERRORES:
      return 'Con errores';
    case ImportacionInfraccionesEstado.FALLIDA:
      return 'Fallida';
    default:
      return status;
  }
}

function getIssueLabel(tipo: string): string {
  return tipo === ImportacionFilaIssueTipo.ERROR ? 'Error' : 'Advertencia';
}

function ImportacionesPage({ catalogs, token, onImportCompleted }: ImportacionesPageProps) {
  const [form, setForm] = useState<ImportacionesFormState>({
    anio: DEFAULT_YEAR,
    idRegion: '',
    idDelegacionDefault: '',
    modoDuplicados: ImportacionInfraccionesModoDuplicados.OMITIR,
    crearCatalogosFaltantes: true,
    crearDelegacionesFaltantes: true,
    observaciones: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewState, setPreviewState] = useState<LoadState<ImportacionPreviewResponse>>(
    createIdleState<ImportacionPreviewResponse>(),
  );
  const [confirmState, setConfirmState] = useState<LoadState<ImportacionDetalleResponse>>(
    createIdleState<ImportacionDetalleResponse>(),
  );
  const [importsState, setImportsState] = useState<
    LoadState<ImportacionInfraccionesResumen[]>
  >(createIdleState<ImportacionInfraccionesResumen[]>());
  const [detailState, setDetailState] = useState<LoadState<ImportacionDetalleResponse>>(
    createIdleState<ImportacionDetalleResponse>(),
  );

  const regionId = toNumber(form.idRegion);
  const selectedYear = toNumber(form.anio);

  const delegacionesDisponibles = useMemo(() => {
    if (!catalogs) {
      return [];
    }

    if (!regionId) {
      return catalogs.delegaciones;
    }

    return catalogs.delegaciones.filter(
      (delegacion) => delegacion.region?.idRegion === regionId,
    );
  }, [catalogs, regionId]);

  async function loadImportaciones(): Promise<void> {
    setImportsState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    try {
      const response = await getImportacionesInfracciones(token, {
        anio: selectedYear,
        idRegion: regionId,
      });

      setImportsState({
        status: 'ready',
        data: response,
        error: null,
      });
    } catch (error) {
      setImportsState({
        status: 'error',
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadImportaciones();
    // Token is the trigger for initial and session-bound refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadDetail(idImportacionInfracciones: number): Promise<void> {
    setDetailState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    try {
      const response = await getImportacionInfraccionesDetalle(
        token,
        idImportacionInfracciones,
      );

      setDetailState({
        status: 'ready',
        data: response,
        error: null,
      });
    } catch (error) {
      setDetailState({
        status: 'error',
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  function updateField<K extends keyof typeof form>(
    name: K,
    value: (typeof form)[K],
  ): void {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleRegionChange(value: string): void {
    const nextRegionId = toNumber(value);
    const availableDelegacionIds = new Set(
      (catalogs?.delegaciones ?? [])
        .filter(
          (delegacion) =>
            !nextRegionId || delegacion.region?.idRegion === nextRegionId,
        )
        .map((delegacion) => String(delegacion.idDelegacion)),
    );

    setForm((current) => {
      const next = {
        ...current,
        idRegion: value,
      };

      if (
        next.idDelegacionDefault &&
        !availableDelegacionIds.has(next.idDelegacionDefault)
      ) {
        next.idDelegacionDefault = '';
      }

      return next;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
  }

  function buildPreviewPayload(): ImportacionInfraccionesPreviewPayload | null {
    const anio = toNumber(form.anio);
    const idRegion = toNumber(form.idRegion);

    if (!file || !anio || !idRegion) {
      return null;
    }

    return {
      file,
      anio,
      idRegion,
      idDelegacionDefault: toNumber(form.idDelegacionDefault),
      crearCatalogosFaltantes: form.crearCatalogosFaltantes,
      crearDelegacionesFaltantes: form.crearDelegacionesFaltantes,
    };
  }

  function buildConfirmPayload():
    | ImportacionInfraccionesConfirmarPayload
    | null {
    const previewPayload = buildPreviewPayload();

    if (!previewPayload) {
      return null;
    }

    return {
      ...previewPayload,
      modoDuplicados: form.modoDuplicados,
      crearCatalogosFaltantes: form.crearCatalogosFaltantes,
      crearDelegacionesFaltantes: form.crearDelegacionesFaltantes,
      observaciones: form.observaciones.trim() || undefined,
    };
  }

  async function handlePreview(): Promise<void> {
    const payload = buildPreviewPayload();

    if (!payload) {
      setPreviewState({
        status: 'error',
        data: null,
        error: 'Selecciona archivo, año y región antes de previsualizar.',
      });
      return;
    }

    setPreviewState({
      status: 'loading',
      data: null,
      error: null,
    });

    try {
      const response = await previewImportacionInfracciones(token, payload);
      setPreviewState({
        status: 'ready',
        data: response,
        error: null,
      });
    } catch (error) {
      setPreviewState({
        status: 'error',
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  async function handleConfirm(): Promise<void> {
    const payload = buildConfirmPayload();

    if (!payload) {
      setConfirmState({
        status: 'error',
        data: null,
        error: 'Selecciona archivo, año y región antes de confirmar.',
      });
      return;
    }

    setConfirmState({
      status: 'loading',
      data: null,
      error: null,
    });

    try {
      const response = await confirmarImportacionInfracciones(token, payload);
      setConfirmState({
        status: 'ready',
        data: response,
        error: null,
      });
      setDetailState({
        status: 'ready',
        data: response,
        error: null,
      });
      await loadImportaciones();
      await onImportCompleted();
    } catch (error) {
      setConfirmState({
        status: 'error',
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  const preview = previewState.data;
  const confirm = confirmState.data;
  const imports = importsState.data ?? [];
  const selectedDetail = detailState.data;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Importaciones</p>
          <h1>Excel anual de infracciones</h1>
          <p className="page-description">
            Carga el archivo anual, previsualiza el mapeo y confirma la creación de
            infracciones, motivos y retenciones.
          </p>
        </div>
      </header>

      <Card>
        <div className="page-stack">
          <div className="panel-header">
            <div>
              <p className="section-label">Entrada</p>
              <h2>Parametros de importacion</h2>
            </div>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="importacion-anio" label="Año">
              <TextInput
                id="importacion-anio"
                type="number"
                min={1900}
                value={form.anio}
                onChange={(event) => updateField('anio', event.target.value)}
              />
            </Field>

            <Field htmlFor="importacion-region" label="Region">
              <SelectField
                id="importacion-region"
                value={form.idRegion}
                onChange={(event) => handleRegionChange(event.target.value)}
              >
                <option value="">Selecciona una region</option>
                {(catalogs?.regiones ?? []).map((region) => (
                  <option key={region.idRegion} value={region.idRegion}>
                    {region.nombreRegion}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="importacion-delegacion" label="Delegacion default">
              <SelectField
                id="importacion-delegacion"
                value={form.idDelegacionDefault}
                onChange={(event) => updateField('idDelegacionDefault', event.target.value)}
              >
                <option value="">Sin delegacion default</option>
                {delegacionesDisponibles.map((delegacion) => (
                  <option key={delegacion.idDelegacion} value={delegacion.idDelegacion}>
                    {delegacion.nombreDelegacion}
                  </option>
                ))}
              </SelectField>
            </Field>
          </div>

          <div className="form-grid form-grid-3">
            <Field htmlFor="importacion-file" label="Archivo Excel">
              <input
                id="importacion-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </Field>

            <Field htmlFor="importacion-modo" label="Modo duplicados">
              <SelectField
                id="importacion-modo"
                value={form.modoDuplicados}
                onChange={(event) =>
                  updateField(
                    'modoDuplicados',
                    event.target.value as ImportacionInfraccionesModoDuplicados,
                  )
                }
              >
                <option value={ImportacionInfraccionesModoDuplicados.OMITIR}>
                  Omitir
                </option>
                <option value={ImportacionInfraccionesModoDuplicados.ERROR}>
                  Error
                </option>
              </SelectField>
            </Field>

            <Field htmlFor="importacion-observaciones" label="Observaciones">
              <TextAreaField
                id="importacion-observaciones"
                rows={3}
                value={form.observaciones}
                onChange={(event) => updateField('observaciones', event.target.value)}
                placeholder="Notas del lote"
              />
            </Field>
          </div>

          <div className="chip-grid">
            <label className="chip-option">
              <input
                type="checkbox"
                checked={form.crearCatalogosFaltantes}
                onChange={(event) =>
                  updateField('crearCatalogosFaltantes', event.target.checked)
                }
              />
              <span>Crear catalogos faltantes</span>
            </label>

            <label className="chip-option">
              <input
                type="checkbox"
                checked={form.crearDelegacionesFaltantes}
                onChange={(event) =>
                  updateField('crearDelegacionesFaltantes', event.target.checked)
                }
              />
              <span>Crear delegaciones faltantes</span>
            </label>
          </div>

          <div className="button-row">
            <Button type="button" variant="secondary" onClick={() => void handlePreview()}>
              Previsualizar
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleConfirm()}>
              Confirmar importacion
            </Button>
            <Button type="button" variant="secondary" onClick={() => void loadImportaciones()}>
              Recargar listado
            </Button>
          </div>

          <ErrorMessage message={previewState.error} />
          <ErrorMessage message={confirmState.error} />
        </div>
      </Card>

      <div className="flow-grid">
        <Card className="flow-card">
          <div className="page-stack">
            <div className="panel-header">
              <div>
                <p className="section-label">Preview</p>
                <h2>Resumen del archivo</h2>
              </div>
            </div>

            {previewState.status === 'loading' ? (
              <LoadingMessage message="Analizando Excel..." />
            ) : preview ? (
              <div className="page-stack">
                <dl className="result-summary">
                  <div className="result-summary-item">
                    <dt>Filas</dt>
                    <dd>{preview.totalFilas}</dd>
                  </div>
                  <div className="result-summary-item">
                    <dt>Delegaciones</dt>
                    <dd>{preview.conteos.delegacionesDetectadas}</dd>
                  </div>
                  <div className="result-summary-item">
                    <dt>Motivos</dt>
                    <dd>{preview.conteos.motivosDetectados}</dd>
                  </div>
                  <div className="result-summary-item">
                    <dt>Motivos desconocidos</dt>
                    <dd>{preview.conteos.motivosDesconocidos}</dd>
                  </div>
                </dl>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Delegacion</th>
                        <th>Folio</th>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Servicio</th>
                        <th>Clase</th>
                        <th>Motivos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.primeras10Filas.map((row) => (
                        <tr key={row.numeroFila}>
                          <td>{row.numeroFila}</td>
                          <td>{row.delegacion ?? '-'}</td>
                          <td>{row.folioInfraccion ?? '-'}</td>
                          <td>{row.fechaInfraccion ?? '-'}</td>
                          <td>{row.horaInfraccion}</td>
                          <td>{row.servicio ?? '-'}</td>
                          <td>{row.clase ?? '-'}</td>
                          <td>{row.motivos.join(', ') || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.erroresPreliminares.length > 0 ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Tipo</th>
                          <th>Campo</th>
                          <th>Valor</th>
                          <th>Mensaje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.erroresPreliminares.map((issue, index) => (
                          <tr key={`${issue.numeroFila}-${issue.campo}-${index}`}>
                            <td>{issue.numeroFila}</td>
                            <td>{getIssueLabel(issue.tipo)}</td>
                            <td>{issue.campo}</td>
                            <td>{issue.valor ?? '-'}</td>
                            <td>{issue.mensaje}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="notice">Sin errores preliminares.</div>
                )}
              </div>
            ) : (
              <div className="notice">Todavia no hay preview.</div>
            )}
          </div>
        </Card>

        <Card className="flow-card">
          <div className="page-stack">
            <div className="panel-header">
              <div>
                <p className="section-label">Confirmacion</p>
                <h2>Resultado del lote</h2>
              </div>
            </div>

            {confirmState.status === 'loading' ? (
              <LoadingMessage message="Procesando importacion..." />
            ) : confirm ? (
              <dl className="result-summary">
                <div className="result-summary-item">
                  <dt>Importadas</dt>
                  <dd>{confirm.importacion.filasImportadas}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Omitidas</dt>
                  <dd>{confirm.importacion.filasOmitidas}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Con error</dt>
                  <dd>{confirm.importacion.filasConError}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Estado</dt>
                  <dd>{getStatusLabel(confirm.importacion.estado)}</dd>
                </div>
              </dl>
            ) : (
              <div className="notice">Aun no se confirma ningun lote.</div>
            )}

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Año</th>
                    <th>Region</th>
                    <th>Delegacion</th>
                    <th>Estado</th>
                    <th>Importadas</th>
                    <th>Con error</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {imports.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        No hay importaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    imports.map((item) => (
                      <tr key={item.idImportacionInfracciones}>
                        <td>{item.idImportacionInfracciones}</td>
                        <td>{item.anio}</td>
                        <td>{getRegionLabel(item)}</td>
                        <td>{getDelegacionLabel(item)}</td>
                        <td>{getStatusLabel(item.estado)}</td>
                        <td>{item.filasImportadas}</td>
                        <td>{item.filasConError}</td>
                        <td>
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => void loadDetail(item.idImportacionInfracciones)}
                          >
                            Ver detalle
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {detailState.status === 'loading' ? (
              <LoadingMessage message="Cargando detalle..." />
            ) : selectedDetail ? (
              <div className="page-stack">
                <div className="notice">
                  Detalle del lote {selectedDetail.importacion.idImportacionInfracciones}
                </div>

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fila</th>
                        <th>Tipo</th>
                        <th>Campo</th>
                        <th>Valor</th>
                        <th>Mensaje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.errores.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="empty-state">
                            El lote no registró errores.
                          </td>
                        </tr>
                      ) : (
                        selectedDetail.errores.map((issue) => (
                          <tr key={issue.idImportacionInfraccionError}>
                            <td>{issue.numeroFila}</td>
                            <td>{getIssueLabel(issue.tipo)}</td>
                            <td>{issue.campo}</td>
                            <td>{issue.valor ?? '-'}</td>
                            <td>{issue.mensaje}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <ErrorMessage message={detailState.error} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="page-stack">
          <div className="panel-header">
            <div>
              <p className="section-label">Listado</p>
              <h2>Importaciones registradas</h2>
            </div>

            <Button type="button" variant="secondary" onClick={() => void loadImportaciones()}>
              Actualizar
            </Button>
          </div>

          {importsState.status === 'loading' ? (
            <LoadingMessage message="Cargando importaciones..." />
          ) : null}
          <ErrorMessage message={importsState.error} />
        </div>
      </Card>
    </section>
  );
}

export default ImportacionesPage;

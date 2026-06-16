import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Field, TextInput } from "../../components/ui/Field";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { SelectField } from "../../components/ui/SelectField";
import { TextAreaField } from "../../components/ui/TextAreaField";
import { getErrorMessage } from "../../services/api/apiClient";
import {
  confirmarImportacionInfracciones,
  getImportacionInfraccionesDetalle,
  getImportacionesInfracciones,
  previewImportacionInfracciones,
} from "../../services/api/importaciones.api";
import type { CatalogosBundle } from "../../types/catalogos.types";
import {
  ImportacionFilaIssueTipo,
  ImportacionInfraccionesEstado,
  ImportacionInfraccionesModoDuplicados,
  type ImportacionDetalleResponse,
  type ImportacionFilaIssue,
  type ImportacionInfraccionError,
  type ImportacionInfraccionesConfirmarPayload,
  type ImportacionInfraccionesPreviewPayload,
  type ImportacionInfraccionesResumen,
  type ImportacionPreviewResponse,
} from "../../types/importaciones.types";
import "./ImportacionesPage.css";

interface LoadState<T> {
  status: "idle" | "loading" | "ready" | "error";
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

type ImportIssueLike =
  | (ImportacionFilaIssue & { numeroFila: number })
  | ImportacionInfraccionError;

const DEFAULT_YEAR = "2025";
const ISSUE_TABLE_LIMIT = 80;

function createIdleState<T>(): LoadState<T> {
  return {
    status: "idle",
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
  return item.region?.nombreRegion ?? "Sin region";
}

function getDelegacionLabel(item: ImportacionInfraccionesResumen): string {
  return item.delegacionDefault?.nombreDelegacion ?? "Sin delegacion default";
}

function getStatusLabel(status: ImportacionInfraccionesEstado): string {
  switch (status) {
    case ImportacionInfraccionesEstado.PREVIEW:
      return "Preview";
    case ImportacionInfraccionesEstado.IMPORTADA:
      return "Importada";
    case ImportacionInfraccionesEstado.IMPORTADA_CON_ERRORES:
      return "Con errores";
    case ImportacionInfraccionesEstado.FALLIDA:
      return "Fallida";
    default:
      return status;
  }
}

function getIssueLabel(tipo: string): string {
  return tipo === ImportacionFilaIssueTipo.ERROR ? "Error" : "Advertencia";
}

function getIssueTone(tipo: string): string {
  return tipo === ImportacionFilaIssueTipo.ERROR ? "danger" : "warning";
}

function buildIssueSummary(issues: ImportIssueLike[]) {
  const grouped = new Map<
    string,
    {
      campo: string;
      errores: number;
      advertencias: number;
      total: number;
      mensaje: string;
    }
  >();

  for (const issue of issues) {
    const current = grouped.get(issue.campo) ?? {
      campo: issue.campo,
      errores: 0,
      advertencias: 0,
      total: 0,
      mensaje: issue.mensaje,
    };

    current.total += 1;
    if (issue.tipo === ImportacionFilaIssueTipo.ERROR) {
      current.errores += 1;
    } else {
      current.advertencias += 1;
    }
    grouped.set(issue.campo, current);
  }

  return [...grouped.values()].sort((left, right) => right.total - left.total);
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card
      className={`import-metric-card ${tone ? `import-metric-${tone}` : ""}`}
    >
      <p className="card-label">{label}</p>
      <strong>{value}</strong>
    </Card>
  );
}

function IssueSummary({ issues }: { issues: ImportIssueLike[] }) {
  const summary = buildIssueSummary(issues);

  if (summary.length === 0) {
    return <div className="notice">Sin errores detectados.</div>;
  }

  return (
    <div className="import-issue-summary">
      {summary.slice(0, 6).map((item) => (
        <div key={item.campo} className="import-issue-card">
          <span>{item.campo}</span>
          <strong>{item.total}</strong>
          <small>
            {item.errores} error(es) · {item.advertencias} advertencia(s)
          </small>
        </div>
      ))}
    </div>
  );
}

function IssuesTable({ issues }: { issues: ImportIssueLike[] }) {
  if (issues.length === 0) {
    return <div className="notice">No hay errores para revisar.</div>;
  }

  return (
    <div className="table-wrap import-issue-table-wrap">
      <table className="data-table import-issue-table">
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
          {issues.slice(0, ISSUE_TABLE_LIMIT).map((issue, index) => (
            <tr key={`${issue.numeroFila}-${issue.campo}-${index}`}>
              <td>{issue.numeroFila}</td>
              <td>
                <span
                  className={`import-issue-pill import-issue-${getIssueTone(issue.tipo)}`}
                >
                  {getIssueLabel(issue.tipo)}
                </span>
              </td>
              <td>{issue.campo}</td>
              <td>{issue.valor ?? "-"}</td>
              <td>{issue.mensaje}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {issues.length > ISSUE_TABLE_LIMIT ? (
        <p className="meta-copy">
          Mostrando {ISSUE_TABLE_LIMIT} de {issues.length} incidencias.
        </p>
      ) : null}
    </div>
  );
}

function ImportacionesPage({
  catalogs,
  token,
  onImportCompleted,
}: ImportacionesPageProps) {
  const [form, setForm] = useState<ImportacionesFormState>({
    anio: DEFAULT_YEAR,
    idRegion: "",
    idDelegacionDefault: "",
    modoDuplicados: ImportacionInfraccionesModoDuplicados.OMITIR,
    crearCatalogosFaltantes: false,
    crearDelegacionesFaltantes: false,
    observaciones: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewState, setPreviewState] =
    useState<LoadState<ImportacionPreviewResponse>>(
      createIdleState<ImportacionPreviewResponse>(),
    );
  const [confirmState, setConfirmState] =
    useState<LoadState<ImportacionDetalleResponse>>(
      createIdleState<ImportacionDetalleResponse>(),
    );
  const [importsState, setImportsState] =
    useState<LoadState<ImportacionInfraccionesResumen[]>>(
      createIdleState<ImportacionInfraccionesResumen[]>(),
    );
  const [detailState, setDetailState] =
    useState<LoadState<ImportacionDetalleResponse>>(
      createIdleState<ImportacionDetalleResponse>(),
    );

  const regionId = toNumber(form.idRegion);
  const selectedYear = toNumber(form.anio);
  const preview = previewState.data;
  const confirm = confirmState.data;
  const imports = importsState.data ?? [];
  const selectedDetail = detailState.data;
  const resultDetail = confirm ?? selectedDetail;
  const resultIssues = resultDetail?.errores ?? [];
  const canPreview = Boolean(file && selectedYear && regionId);
  const canConfirm = Boolean(
    canPreview && previewState.status === "ready" && preview,
  );

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
      status: "loading",
      error: null,
    }));

    try {
      const response = await getImportacionesInfracciones(token, {
        anio: selectedYear,
        idRegion: regionId,
      });

      setImportsState({
        status: "ready",
        data: response,
        error: null,
      });
    } catch (error) {
      setImportsState({
        status: "error",
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
      status: "loading",
      error: null,
    }));

    try {
      const response = await getImportacionInfraccionesDetalle(
        token,
        idImportacionInfracciones,
      );

      setDetailState({
        status: "ready",
        data: response,
        error: null,
      });
    } catch (error) {
      setDetailState({
        status: "error",
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  function updateField<K extends keyof ImportacionesFormState>(
    name: K,
    value: ImportacionesFormState[K],
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
        next.idDelegacionDefault = "";
      }

      return next;
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
    setPreviewState(createIdleState<ImportacionPreviewResponse>());
    setConfirmState(createIdleState<ImportacionDetalleResponse>());
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

  function buildConfirmPayload(): ImportacionInfraccionesConfirmarPayload | null {
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
        status: "error",
        data: null,
        error: "Selecciona archivo, año y región antes de previsualizar.",
      });
      return;
    }

    setPreviewState({
      status: "loading",
      data: null,
      error: null,
    });
    setConfirmState(createIdleState<ImportacionDetalleResponse>());

    try {
      const response = await previewImportacionInfracciones(token, payload);
      setPreviewState({
        status: "ready",
        data: response,
        error: null,
      });
    } catch (error) {
      setPreviewState({
        status: "error",
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  async function handleConfirm(): Promise<void> {
    const payload = buildConfirmPayload();

    if (!payload || !preview) {
      setConfirmState({
        status: "error",
        data: null,
        error: "Primero previsualiza correctamente el archivo.",
      });
      return;
    }

    setConfirmState({
      status: "loading",
      data: null,
      error: null,
    });

    try {
      const response = await confirmarImportacionInfracciones(token, payload);
      setConfirmState({
        status: "ready",
        data: response,
        error: null,
      });
      setDetailState({
        status: "ready",
        data: response,
        error: null,
      });
      await loadImportaciones();
      await onImportCompleted();
    } catch (error) {
      setConfirmState({
        status: "error",
        data: null,
        error: getErrorMessage(error),
      });
    }
  }

  return (
    <section className="page-stack import-page">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Importaciones</p>
          <h1>Excel anual de infracciones</h1>
          <p className="page-description">
            Carga, revisa y confirma el lote anual. La previsualización te dice
            qué se importará y qué requiere revisión.
          </p>
        </div>
      </header>

      <Card className="import-step-card">
        <div className="import-step-header">
          <div>
            <p className="section-label">Paso 1</p>
            <h2>Archivo y contexto</h2>
            <p className="page-description">
              Selecciona año, región y Excel. La delegación default solo se usa
              cuando la fila no trae delegación.
            </p>
          </div>
          <span className="import-state-pill">
            {file ? file.name : "Sin archivo"}
          </span>
        </div>

        <div className="form-grid form-grid-3">
          <Field htmlFor="importacion-anio" label="Año">
            <TextInput
              id="importacion-anio"
              type="number"
              min={1900}
              value={form.anio}
              onChange={(event) => updateField("anio", event.target.value)}
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
              onChange={(event) =>
                updateField("idDelegacionDefault", event.target.value)
              }
            >
              <option value="">Sin delegacion default</option>
              {delegacionesDisponibles.map((delegacion) => (
                <option
                  key={delegacion.idDelegacion}
                  value={delegacion.idDelegacion}
                >
                  {delegacion.nombreDelegacion}
                </option>
              ))}
            </SelectField>
          </Field>
        </div>

        <div className="import-config-grid">
          <label className="import-file-box" htmlFor="importacion-file">
            <span>Archivo Excel</span>
            <strong>
              {file ? file.name : "Seleccionar archivo .xlsx / .xls"}
            </strong>
            <input
              id="importacion-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
          </label>

          <Field htmlFor="importacion-modo" label="Modo duplicados">
            <SelectField
              id="importacion-modo"
              value={form.modoDuplicados}
              onChange={(event) =>
                updateField(
                  "modoDuplicados",
                  event.target.value as ImportacionInfraccionesModoDuplicados,
                )
              }
            >
              <option value={ImportacionInfraccionesModoDuplicados.OMITIR}>
                Omitir duplicados
              </option>
              <option value={ImportacionInfraccionesModoDuplicados.ERROR}>
                Marcar como error
              </option>
            </SelectField>
          </Field>

          <Field htmlFor="importacion-observaciones" label="Observaciones">
            <TextAreaField
              id="importacion-observaciones"
              rows={3}
              value={form.observaciones}
              onChange={(event) =>
                updateField("observaciones", event.target.value)
              }
              placeholder="Notas del lote"
            />
          </Field>
        </div>

        <div className="import-switch-grid">
          <label className="import-switch-card">
            <input
              type="checkbox"
              checked={form.crearCatalogosFaltantes}
              onChange={(event) =>
                updateField("crearCatalogosFaltantes", event.target.checked)
              }
            />
            <span>
              <strong>Crear catálogos faltantes</strong>
              Servicio, clase, marca, línea, sexo, operativo, encierro y
              motivos.
            </span>
          </label>

          <label className="import-switch-card">
            <input
              type="checkbox"
              checked={form.crearDelegacionesFaltantes}
              onChange={(event) =>
                updateField("crearDelegacionesFaltantes", event.target.checked)
              }
            />
            <span>
              <strong>Crear delegaciones faltantes</strong>
              Solo dentro de la región seleccionada.
            </span>
          </label>
        </div>

        <div className="import-actions-bar">
          <div>
            <p className="section-label">Flujo recomendado</p>
            <span>
              Previsualiza antes de confirmar para revisar errores y
              advertencias.
            </span>
          </div>
          <div className="button-row button-row-end">
            <Button
              type="button"
              variant="secondary"
              disabled={!canPreview || previewState.status === "loading"}
              onClick={() => void handlePreview()}
            >
              {previewState.status === "loading"
                ? "Analizando..."
                : "Previsualizar"}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!canConfirm || confirmState.status === "loading"}
              onClick={() => void handleConfirm()}
            >
              {confirmState.status === "loading"
                ? "Importando..."
                : "Confirmar importación"}
            </Button>
          </div>
        </div>

        <ErrorMessage message={previewState.error} />
        <ErrorMessage message={confirmState.error} />
      </Card>

      <Card className="import-step-card">
        <div className="import-step-header">
          <div>
            <p className="section-label">Paso 2</p>
            <h2>Previsualización</h2>
            <p className="page-description">
              Resumen del archivo antes de crear datos. Las advertencias indican
              valores completados automáticamente.
            </p>
          </div>
        </div>

        {previewState.status === "loading" ? (
          <LoadingMessage message="Analizando Excel..." />
        ) : preview ? (
          <div className="page-stack">
            <div className="import-metrics-grid">
              <MetricCard label="Filas detectadas" value={preview.totalFilas} />
              <MetricCard
                label="Delegaciones"
                value={preview.conteos.delegacionesDetectadas}
              />
              <MetricCard
                label="Motivos"
                value={preview.conteos.motivosDetectados}
              />
              <MetricCard
                label="Incidencias preview"
                value={preview.erroresPreliminares.length}
                tone={
                  preview.erroresPreliminares.length > 0 ? "warning" : "success"
                }
              />
            </div>

            <IssueSummary issues={preview.erroresPreliminares} />

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
                      <td>{row.delegacion ?? "-"}</td>
                      <td>{row.folioInfraccion ?? "-"}</td>
                      <td>{row.fechaInfraccion ?? "-"}</td>
                      <td>{row.horaInfraccion}</td>
                      <td>{row.servicio ?? "-"}</td>
                      <td>{row.clase ?? "-"}</td>
                      <td>{row.motivos.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <IssuesTable issues={preview.erroresPreliminares} />
          </div>
        ) : (
          <div className="notice">
            Selecciona archivo, año y región; después pulsa Previsualizar.
          </div>
        )}
      </Card>

      <Card className="import-step-card">
        <div className="import-step-header">
          <div>
            <p className="section-label">Paso 3</p>
            <h2>Resultado del lote</h2>
            <p className="page-description">
              Resultado de la última confirmación o del detalle seleccionado en
              historial.
            </p>
          </div>
        </div>

        {confirmState.status === "loading" ? (
          <LoadingMessage message="Procesando importación..." />
        ) : resultDetail ? (
          <div className="page-stack">
            <div className="import-metrics-grid">
              <MetricCard
                label="Importadas"
                value={resultDetail.importacion.filasImportadas}
                tone="success"
              />
              <MetricCard
                label="Omitidas"
                value={resultDetail.importacion.filasOmitidas}
              />
              <MetricCard
                label="Con error"
                value={resultDetail.importacion.filasConError}
                tone={
                  resultDetail.importacion.filasConError > 0
                    ? "danger"
                    : "success"
                }
              />
              <MetricCard
                label="Estado"
                value={getStatusLabel(resultDetail.importacion.estado)}
              />
            </div>

            <IssueSummary issues={resultIssues} />
            <IssuesTable issues={resultIssues} />
          </div>
        ) : (
          <div className="notice">Aún no se ha confirmado ningún lote.</div>
        )}
      </Card>

      <Card className="import-step-card">
        <div className="panel-header">
          <div>
            <p className="section-label">Historial</p>
            <h2>Importaciones registradas</h2>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadImportaciones()}
          >
            Actualizar
          </Button>
        </div>

        {importsState.status === "loading" ? (
          <LoadingMessage message="Cargando importaciones..." />
        ) : null}
        <ErrorMessage message={importsState.error} />
        <ErrorMessage message={detailState.error} />

        <div className="table-wrap">
          <table className="data-table import-history-table">
            <thead>
              <tr>
                <th>Año</th>
                <th>Archivo</th>
                <th>Region</th>
                <th>Estado</th>
                <th>Filas</th>
                <th>Importadas</th>
                <th>Errores</th>
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
                    <td>{item.anio}</td>
                    <td>
                      <div className="table-cell-stack">
                        <strong>{item.nombreArchivo}</strong>
                        <span>{getDelegacionLabel(item)}</span>
                      </div>
                    </td>
                    <td>{getRegionLabel(item)}</td>
                    <td>{getStatusLabel(item.estado)}</td>
                    <td>{item.totalFilas}</td>
                    <td>{item.filasImportadas}</td>
                    <td>{item.filasConError}</td>
                    <td>
                      <Button
                        type="button"
                        variant="link"
                        onClick={() =>
                          void loadDetail(item.idImportacionInfracciones)
                        }
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
      </Card>
    </section>
  );
}

export default ImportacionesPage;

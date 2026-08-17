import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Swal from "sweetalert2";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { CheckboxInput, Field, TextInput } from "../../components/ui/Field";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { SelectField } from "../../components/ui/SelectField";
import { getErrorMessage } from "../../services/api/apiClient";
import {
  deleteAdminExpediente,
  getAdminExpediente,
  getInfracciones,
  updateAdminExpediente,
} from "../../services/api/infracciones.api";
import type { CatalogosBundle } from "../../types/catalogos.types";
import type {
  AdminActualizarExpedientePayload,
  AdminExpedienteInfraccion,
  AdminExpedienteSnapshot,
  AdminLiberacionSnapshot,
  AdminPagoSnapshot,
  AdminRetencionSnapshot,
  AdminSalidaSnapshot,
} from "../../types/admin-expediente.types";
import {
  dateTimeLocalToIso,
  formatDateTimeLocalInput,
} from "../../utils/timezone";
import "./AdminExpedientesPage.css";

interface AdminExpedientesPageProps {
  catalogs: CatalogosBundle | null;
  token: string;
  onChanged: () => void;
}

interface AdminSectionProps {
  title: string;
  open?: boolean;
  children: ReactNode;
}

function AdminSection({ title, open = false, children }: AdminSectionProps) {
  return (
    <details open={open}>
      <summary>
        <strong>{title}</strong>
      </summary>
      {children}
    </details>
  );
}

function toLocalDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 16);
  }

  return formatDateTimeLocalInput(parsed);
}

function normalizeSnapshotForForm(
  snapshot: AdminExpedienteSnapshot,
): AdminExpedienteSnapshot {
  return {
    ...snapshot,
    infraccion: { ...snapshot.infraccion },
    motivos: [...snapshot.motivos],
    retencion: snapshot.retencion
      ? {
          ...snapshot.retencion,
          fechaIngreso: toLocalDateTime(snapshot.retencion.fechaIngreso),
        }
      : null,
    pagos: snapshot.pagos.map((pago) => ({
      ...pago,
      fechaPago: toLocalDateTime(pago.fechaPago),
      conceptos: pago.conceptos.map((concepto) => ({ ...concepto })),
    })),
    liberaciones: snapshot.liberaciones.map((liberacion) => ({
      ...liberacion,
      fechaLiberacion: toLocalDateTime(liberacion.fechaLiberacion),
    })),
    salidas: snapshot.salidas.map((salida) => ({
      ...salida,
      fechaSalida: toLocalDateTime(salida.fechaSalida),
    })),
  };
}

function toOptionalNumber(value: string): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildFullName(infraccion: AdminExpedienteInfraccion): string {
  return [
    infraccion.nombre,
    infraccion.apellidoPaterno,
    infraccion.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ");
}

function AdminExpedientesPage({
  catalogs,
  token,
  onChanged,
}: AdminExpedientesPageProps) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminExpedienteSnapshot | null>(null);
  const [form, setForm] = useState<AdminExpedienteSnapshot | null>(null);
  const [motivoEdicion, setMotivoEdicion] = useState("");
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  const [folioConfirmacion, setFolioConfirmacion] = useState("");

  const tiposExpediente = useMemo(
    () =>
      (catalogs?.tiposProcedimiento ?? []).filter(
        (tipo) => tipo.esTipoExpediente && tipo.activo,
      ),
    [catalogs],
  );

  const baselineForm = useMemo(
    () => (snapshot ? normalizeSnapshotForForm(snapshot) : null),
    [snapshot],
  );

  const hasChanges = useMemo(
    () =>
      Boolean(
        form &&
          baselineForm &&
          JSON.stringify(form) !== JSON.stringify(baselineForm),
      ),
    [baselineForm, form],
  );

  async function resolveIdInfraccionByFolio(value: string): Promise<number> {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error("Captura el folio o numero de infraccion");
    }

    const response = await getInfracciones(token, {
      folioInfraccion: trimmed,
      page: 1,
      limit: 30,
    });
    const normalized = trimmed.toUpperCase();
    const exactMatches = response.data.filter(
      (item) => item.folioInfraccion.trim().toUpperCase() === normalized,
    );

    if (exactMatches.length === 0) {
      throw new Error(`No se encontro la infraccion con folio ${trimmed}`);
    }

    if (exactMatches.length > 1) {
      throw new Error(
        `Se encontraron ${exactMatches.length} infracciones con el folio ${trimmed}. No se puede administrar hasta resolver la duplicidad.`,
      );
    }

    return exactMatches[0].idInfraccion;
  }

  async function loadBySearch(event?: FormEvent<HTMLFormElement>): Promise<void> {
    event?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const idInfraccion = await resolveIdInfraccionByFolio(search);
      const response = await getAdminExpediente(token, idInfraccion);
      setSnapshot(response);
      setForm(normalizeSnapshotForForm(response));
      setSearch(response.infraccion.folioInfraccion);
      setMotivoEdicion("");
      setMotivoEliminacion("");
      setFolioConfirmacion("");
    } catch (currentError) {
      setSnapshot(null);
      setForm(null);
      setError(getErrorMessage(currentError));
    } finally {
      setLoading(false);
    }
  }

  function clearExpediente(): void {
    setSnapshot(null);
    setForm(null);
    setSearch("");
    setMotivoEdicion("");
    setMotivoEliminacion("");
    setFolioConfirmacion("");
    setError(null);
  }

  function updateCore<K extends keyof AdminExpedienteInfraccion>(
    key: K,
    value: AdminExpedienteInfraccion[K],
  ): void {
    setForm((current) =>
      current
        ? {
            ...current,
            infraccion: { ...current.infraccion, [key]: value },
          }
        : current,
    );
  }

  function updateRetencion(patch: Partial<AdminRetencionSnapshot>): void {
    setForm((current) =>
      current?.retencion
        ? {
            ...current,
            retencion: { ...current.retencion, ...patch },
          }
        : current,
    );
  }

  function updatePago(index: number, patch: Partial<AdminPagoSnapshot>): void {
    setForm((current) => {
      if (!current) return current;
      const pagos = current.pagos.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item,
      );
      return { ...current, pagos };
    });
  }

  function updateLiberacion(
    index: number,
    patch: Partial<AdminLiberacionSnapshot>,
  ): void {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        liberaciones: current.liberaciones.map((item, currentIndex) =>
          currentIndex === index ? { ...item, ...patch } : item,
        ),
      };
    });
  }

  function updateSalida(index: number, patch: Partial<AdminSalidaSnapshot>): void {
    setForm((current) => {
      if (!current) return current;
      return {
        ...current,
        salidas: current.salidas.map((item, currentIndex) =>
          currentIndex === index ? { ...item, ...patch } : item,
        ),
      };
    });
  }

  function toggleMotivo(idMotivo: number): void {
    setForm((current) => {
      if (!current) return current;
      const exists = current.motivos.includes(idMotivo);
      return {
        ...current,
        motivos: exists
          ? current.motivos.filter((id) => id !== idMotivo)
          : [...current.motivos, idMotivo],
      };
    });
  }

  function updateConcepto(
    pagoIndex: number,
    conceptoIndex: number,
    patch: { claveConcepto?: string; monto?: string },
  ): void {
    setForm((current) => {
      if (!current) return current;
      const pagos = current.pagos.map((pago, currentPagoIndex) => {
        if (currentPagoIndex !== pagoIndex) return pago;
        return {
          ...pago,
          conceptos: pago.conceptos.map((concepto, currentConceptoIndex) =>
            currentConceptoIndex === conceptoIndex
              ? { ...concepto, ...patch }
              : concepto,
          ),
        };
      });
      return { ...current, pagos };
    });
  }

  function addConcepto(pagoIndex: number): void {
    setForm((current) => {
      if (!current) return current;
      const pagos = current.pagos.map((pago, currentIndex) =>
        currentIndex === pagoIndex
          ? {
              ...pago,
              conceptos: [
                ...pago.conceptos,
                {
                  idPagoConcepto: -Date.now(),
                  claveConcepto: "",
                  monto: "0.00",
                  orden: pago.conceptos.length + 1,
                },
              ],
            }
          : pago,
      );
      return { ...current, pagos };
    });
  }

  function removeConcepto(pagoIndex: number, conceptoIndex: number): void {
    setForm((current) => {
      if (!current) return current;
      const pagos = current.pagos.map((pago, currentIndex) => {
        if (currentIndex !== pagoIndex || pago.conceptos.length <= 1) return pago;
        return {
          ...pago,
          conceptos: pago.conceptos
            .filter((_, index) => index !== conceptoIndex)
            .map((concepto, index) => ({ ...concepto, orden: index + 1 })),
        };
      });
      return { ...current, pagos };
    });
  }

  function buildUpdatePayload(): AdminActualizarExpedientePayload {
    if (!form) {
      throw new Error("No hay expediente cargado");
    }
    if (motivoEdicion.trim().length < 5) {
      throw new Error("Describe el motivo de la edicion (minimo 5 caracteres)");
    }

    return {
      motivoEdicion: motivoEdicion.trim(),
      infraccion: {
        idDelegacion: form.infraccion.idDelegacion,
        idTipoProcedimiento: form.infraccion.idTipoProcedimiento,
        idEstatusInfraccion: form.infraccion.idEstatusInfraccion,
        idOperativo: form.infraccion.idOperativo,
        folioInfraccion: form.infraccion.folioInfraccion,
        fechaInfraccion: form.infraccion.fechaInfraccion,
        horaInfraccion: form.infraccion.horaInfraccion,
        observaciones: form.infraccion.observaciones,
        clavePolicia: form.infraccion.clavePolicia,
        numParteInformativo: form.infraccion.numParteInformativo,
        motivos: form.motivos,
      },
      infractor: {
        idSexo: form.infraccion.idSexo,
        nombre: form.infraccion.nombre,
        apellidoPaterno: form.infraccion.apellidoPaterno,
        apellidoMaterno: form.infraccion.apellidoMaterno,
        licencia: form.infraccion.licencia,
        curp: form.infraccion.curp,
      },
      vehiculo: {
        idClaseVehiculo: form.infraccion.idClaseVehiculo,
        idLineaVehiculo: form.infraccion.idLineaVehiculo,
        idServicio: form.infraccion.idServicio,
        anioModelo: form.infraccion.anioModelo,
        sitioServicioPublico: form.infraccion.sitioServicioPublico,
        color: form.infraccion.color,
        placas: form.infraccion.placas,
        estadoPlacas: form.infraccion.estadoPlacas,
        serie: form.infraccion.serie,
        motor: form.infraccion.motor,
      },
      lugarInfraccion: {
        nombreLugarInfraccion: form.infraccion.nombreLugarInfraccion,
      },
      retencion: form.retencion
        ? {
            idRetencionVehiculo: form.retencion.idRetencionVehiculo,
            idEncierro: form.retencion.idEncierro,
            fechaIngreso: dateTimeLocalToIso(form.retencion.fechaIngreso),
            recibidoPor: form.retencion.recibidoPor,
            folioResguardo: form.retencion.folioResguardo,
            observacionesIngreso: form.retencion.observacionesIngreso,
            estadoIngreso: form.retencion.estadoIngreso,
          }
        : undefined,
      pagos: form.pagos.map((pago) => ({
        idPagoInfraccion: pago.idPagoInfraccion,
        folioLineaCaptura: pago.folioLineaCaptura,
        fechaPago: dateTimeLocalToIso(pago.fechaPago),
        observaciones: pago.observaciones,
        conceptos: pago.conceptos.map((concepto) => ({
          claveConcepto: concepto.claveConcepto,
          monto: concepto.monto,
        })),
      })),
      liberaciones: form.liberaciones.map((liberacion) => ({
        idLiberacionVehiculo: liberacion.idLiberacionVehiculo,
        folioLiberacion: liberacion.folioLiberacion,
        fechaLiberacion: dateTimeLocalToIso(liberacion.fechaLiberacion),
        liberadoPor: liberacion.liberadoPor,
        nombreRecibeLiberacion: liberacion.nombreRecibeLiberacion,
        observacion: liberacion.observacion,
      })),
      salidas: form.salidas.map((salida) => ({
        idSalidaVehiculo: salida.idSalidaVehiculo,
        fechaSalida: dateTimeLocalToIso(salida.fechaSalida),
        validadoPor: salida.validadoPor,
        personaRecibeVehiculo: salida.personaRecibeVehiculo,
        observacionesSalida: salida.observacionesSalida,
        estadoSalida: salida.estadoSalida,
      })),
    };
  }

  async function saveExpediente(): Promise<void> {
    if (!form) return;
    setSaving(true);
    setError(null);

    try {
      const payload = buildUpdatePayload();
      const response = await updateAdminExpediente(
        token,
        form.infraccion.idInfraccion,
        payload,
      );
      setSnapshot(response);
      setForm(normalizeSnapshotForForm(response));
      setSearch(response.infraccion.folioInfraccion);
      setMotivoEdicion("");
      onChanged();
      await Swal.fire({
        icon: "success",
        title: "Expediente actualizado",
        text: `La infraccion ${response.infraccion.folioInfraccion} fue actualizada y auditada.`,
      });
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpediente(): Promise<void> {
    if (!snapshot) return;
    if (motivoEliminacion.trim().length < 5) {
      setError("Describe el motivo de eliminacion (minimo 5 caracteres)");
      return;
    }
    if (folioConfirmacion !== snapshot.infraccion.folioInfraccion) {
      setError("Escribe exactamente el folio actual para confirmar la eliminacion");
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Eliminar expediente completo",
      html: `Se eliminara <strong>${snapshot.infraccion.folioInfraccion}</strong> y sus relaciones operativas. Esta accion no se puede deshacer desde la interfaz.`,
      showCancelButton: true,
      confirmButtonText: "Eliminar definitivamente",
      cancelButtonText: "Cancelar",
      focusCancel: true,
    });
    if (!confirmation.isConfirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await deleteAdminExpediente(
        token,
        snapshot.infraccion.idInfraccion,
        {
          folioConfirmacion,
          motivoEliminacion: motivoEliminacion.trim(),
        },
      );
      clearExpediente();
      onChanged();
      await Swal.fire({
        icon: "success",
        title: "Infraccion eliminada",
        text: `La infraccion ${response.folioInfraccion} fue eliminada y quedo registro de auditoria.`,
      });
    } catch (currentError) {
      setError(getErrorMessage(currentError));
    } finally {
      setDeleting(false);
    }
  }

  const estatusActual = form
    ? catalogs?.estatusInfraccion.find(
        (item) => item.idEstatusInfraccion === form.infraccion.idEstatusInfraccion,
      )?.nombreEstatus ?? "Sin estatus"
    : "";
  const tipoActual = form
    ? catalogs?.tiposProcedimiento.find(
        (item) => item.idTipoProcedimiento === form.infraccion.idTipoProcedimiento,
      )?.nombreTipoProcedimiento ?? "Sin tipo"
    : "";
  const delegacionActual = form
    ? catalogs?.delegaciones.find(
        (item) => item.idDelegacion === form.infraccion.idDelegacion,
      )?.nombreDelegacion ?? "Sin delegacion"
    : "";

  return (
    <section className="admin-expedientes-page page-stack">
      <header className="admin-expedientes-hero">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Administrar infracciones</h1>
          <p className="page-description">
            Localiza una infraccion por su numero, corrige los datos autorizados o
            elimina el registro completo. Cada operacion administrativa queda
            auditada.
          </p>
        </div>
        <div className="admin-hero-badges" aria-label="Controles de seguridad">
          <span className="admin-pill">Solo ADMIN</span>
          <span className="admin-pill">Cambios auditados</span>
          <span className="admin-pill">Control de concurrencia</span>
        </div>
      </header>

      <Card className="admin-search-card">
        <div className="admin-search-heading">
          <div>
            <p className="section-label">Localizar infraccion</p>
            <h2>Buscar por folio / numero de infraccion</h2>
            <p>
              Utiliza el numero que aparece en la infraccion. Los identificadores
              internos del sistema no se solicitan ni se muestran al usuario.
            </p>
          </div>
        </div>
        <form className="admin-search-form" onSubmit={loadBySearch}>
          <Field
            htmlFor="admin-expediente-search"
            label="Folio / numero de infraccion"
          >
            <TextInput
              id="admin-expediente-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setError(null);
              }}
              placeholder="Ej. 50927"
              autoComplete="off"
              inputMode="text"
            />
            <p className="admin-search-helper">
              La coincidencia debe ser exacta. Tambien se admiten folios
              alfanumericos si existen en el registro.
            </p>
          </Field>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Buscando..." : "Cargar infraccion"}
          </Button>
        </form>
      </Card>

      {loading ? <LoadingMessage message="Cargando infraccion..." /> : null}
      <ErrorMessage message={error} />

      {!form && !loading ? (
        <div className="admin-empty-guide" aria-label="Flujo administrativo">
          <div className="admin-guide-card">
            <span className="admin-guide-step">1</span>
            <strong>Localiza</strong>
            <p>Captura el folio o numero visible en la infraccion.</p>
          </div>
          <div className="admin-guide-card">
            <span className="admin-guide-step">2</span>
            <strong>Revisa y corrige</strong>
            <p>El expediente se organiza por infraccion, persona y vehiculo.</p>
          </div>
          <div className="admin-guide-card">
            <span className="admin-guide-step">3</span>
            <strong>Justifica la accion</strong>
            <p>Editar o eliminar requiere motivo y genera evidencia de auditoria.</p>
          </div>
        </div>
      ) : null}

      {form ? (
        <>
          <Card className="admin-record-card">
            <div className="admin-record-head">
              <div>
                <p className="section-label">Infraccion cargada</p>
                <h2>Infraccion {form.infraccion.folioInfraccion}</h2>
                <p className="admin-record-subtitle">
                  Revisa los datos antes de guardar. Los identificadores tecnicos y
                  usuarios responsables se conservan internamente como trazabilidad.
                </p>
              </div>
              <div className="admin-record-actions">
                <span
                  className={`admin-status-badge${hasChanges ? " is-dirty" : ""}`}
                >
                  {hasChanges ? "Cambios sin guardar" : "Sin cambios pendientes"}
                </span>
                <Button type="button" variant="secondary" onClick={clearExpediente}>
                  Nueva busqueda
                </Button>
              </div>
            </div>

            <div className="admin-record-meta-grid">
              <div className="admin-meta-item">
                <span>Estatus</span>
                <strong>{estatusActual}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Tipo</span>
                <strong>{tipoActual}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Delegacion</span>
                <strong>{delegacionActual}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Fecha</span>
                <strong>{form.infraccion.fechaInfraccion}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Infractor</span>
                <strong>{buildFullName(form.infraccion) || "Sin nombre"}</strong>
              </div>
              <div className="admin-meta-item">
                <span>Vehiculo</span>
                <strong>{form.infraccion.placas || "Sin placas"}</strong>
              </div>
            </div>
          </Card>

          <div className="admin-editor-layout">
            <Card className="admin-editor-card">
              <div className="admin-editor-intro">
                <p className="section-label">Editor administrativo</p>
                <h2>Datos del expediente</h2>
                <p>
                  Abre solo la seccion que necesitas corregir. Los cambios no se
                  aplican hasta usar Guardar correccion.
                </p>
              </div>

              <div className="admin-section-list">
                <AdminSection title="Datos de la infraccion" open>
                  <div className="page-stack">
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-folio" label="Folio / numero">
                        <TextInput
                          id="admin-folio"
                          value={form.infraccion.folioInfraccion}
                          onChange={(event) =>
                            updateCore("folioInfraccion", event.target.value)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-fecha" label="Fecha infraccion">
                        <TextInput
                          id="admin-fecha"
                          type="date"
                          value={form.infraccion.fechaInfraccion}
                          onChange={(event) =>
                            updateCore("fechaInfraccion", event.target.value)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-hora" label="Hora infraccion">
                        <TextInput
                          id="admin-hora"
                          type="time"
                          step={1}
                          value={form.infraccion.horaInfraccion}
                          onChange={(event) =>
                            updateCore("horaInfraccion", event.target.value)
                          }
                        />
                      </Field>
                    </div>

                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-delegacion" label="Delegacion">
                        <SelectField
                          id="admin-delegacion"
                          value={form.infraccion.idDelegacion}
                          onChange={(event) =>
                            updateCore("idDelegacion", Number(event.target.value))
                          }
                        >
                          {(catalogs?.delegaciones ?? []).map((item) => (
                            <option key={item.idDelegacion} value={item.idDelegacion}>
                              {item.nombreDelegacion}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-tipo" label="Tipo procedimiento">
                        <SelectField
                          id="admin-tipo"
                          value={form.infraccion.idTipoProcedimiento}
                          onChange={(event) =>
                            updateCore(
                              "idTipoProcedimiento",
                              Number(event.target.value),
                            )
                          }
                        >
                          {tiposExpediente.map((item) => (
                            <option
                              key={item.idTipoProcedimiento}
                              value={item.idTipoProcedimiento}
                            >
                              {item.nombreTipoProcedimiento}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-estatus" label="Estatus administrativo">
                        <SelectField
                          id="admin-estatus"
                          value={form.infraccion.idEstatusInfraccion}
                          onChange={(event) =>
                            updateCore(
                              "idEstatusInfraccion",
                              Number(event.target.value),
                            )
                          }
                        >
                          {(catalogs?.estatusInfraccion ?? []).map((item) => (
                            <option
                              key={item.idEstatusInfraccion}
                              value={item.idEstatusInfraccion}
                            >
                              {item.nombreEstatus}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                    </div>

                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-operativo" label="Operativo">
                        <SelectField
                          id="admin-operativo"
                          value={form.infraccion.idOperativo ?? ""}
                          onChange={(event) =>
                            updateCore(
                              "idOperativo",
                              toOptionalNumber(event.target.value),
                            )
                          }
                        >
                          <option value="">Sin operativo</option>
                          {(catalogs?.operativos ?? []).map((item) => (
                            <option key={item.idOperativo} value={item.idOperativo}>
                              {item.nombreOperativo}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-clave" label="Clave policia">
                        <TextInput
                          id="admin-clave"
                          value={form.infraccion.clavePolicia ?? ""}
                          onChange={(event) =>
                            updateCore("clavePolicia", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-parte" label="Numero de parte">
                        <TextInput
                          id="admin-parte"
                          value={form.infraccion.numParteInformativo ?? ""}
                          onChange={(event) =>
                            updateCore(
                              "numParteInformativo",
                              event.target.value || null,
                            )
                          }
                        />
                      </Field>
                    </div>

                    <Field htmlFor="admin-lugar" label="Lugar de infraccion">
                      <TextInput
                        id="admin-lugar"
                        value={form.infraccion.nombreLugarInfraccion}
                        onChange={(event) =>
                          updateCore("nombreLugarInfraccion", event.target.value)
                        }
                      />
                    </Field>

                    <Field htmlFor="admin-observaciones" label="Observaciones">
                      <textarea
                        id="admin-observaciones"
                        rows={3}
                        value={form.infraccion.observaciones ?? ""}
                        onChange={(event) =>
                          updateCore("observaciones", event.target.value || null)
                        }
                      />
                    </Field>
                  </div>
                </AdminSection>

                <AdminSection title="Datos del infractor">
                  <div className="page-stack">
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-nombre" label="Nombre">
                        <TextInput
                          id="admin-nombre"
                          value={form.infraccion.nombre}
                          onChange={(event) =>
                            updateCore("nombre", event.target.value)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-ap-pat" label="Apellido paterno">
                        <TextInput
                          id="admin-ap-pat"
                          value={form.infraccion.apellidoPaterno ?? ""}
                          onChange={(event) =>
                            updateCore(
                              "apellidoPaterno",
                              event.target.value || null,
                            )
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-ap-mat" label="Apellido materno">
                        <TextInput
                          id="admin-ap-mat"
                          value={form.infraccion.apellidoMaterno ?? ""}
                          onChange={(event) =>
                            updateCore(
                              "apellidoMaterno",
                              event.target.value || null,
                            )
                          }
                        />
                      </Field>
                    </div>
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-sexo" label="Sexo">
                        <SelectField
                          id="admin-sexo"
                          value={form.infraccion.idSexo}
                          onChange={(event) =>
                            updateCore("idSexo", Number(event.target.value))
                          }
                        >
                          {(catalogs?.sexos ?? []).map((item) => (
                            <option key={item.idSexo} value={item.idSexo}>
                              {item.nombreSexo}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-licencia" label="Licencia">
                        <TextInput
                          id="admin-licencia"
                          value={form.infraccion.licencia ?? ""}
                          onChange={(event) =>
                            updateCore("licencia", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-curp" label="CURP">
                        <TextInput
                          id="admin-curp"
                          maxLength={18}
                          value={form.infraccion.curp ?? ""}
                          onChange={(event) =>
                            updateCore("curp", event.target.value || null)
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </AdminSection>

                <AdminSection title="Datos del vehiculo">
                  <div className="page-stack">
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-clase" label="Clase">
                        <SelectField
                          id="admin-clase"
                          value={form.infraccion.idClaseVehiculo}
                          onChange={(event) =>
                            updateCore(
                              "idClaseVehiculo",
                              Number(event.target.value),
                            )
                          }
                        >
                          {(catalogs?.clasesVehiculo ?? []).map((item) => (
                            <option
                              key={item.idClaseVehiculo}
                              value={item.idClaseVehiculo}
                            >
                              {item.nombreClaseVehiculo}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-linea" label="Linea / marca">
                        <SelectField
                          id="admin-linea"
                          value={form.infraccion.idLineaVehiculo}
                          onChange={(event) =>
                            updateCore(
                              "idLineaVehiculo",
                              Number(event.target.value),
                            )
                          }
                        >
                          {(catalogs?.lineasVehiculo ?? []).map((item) => (
                            <option
                              key={item.idLineaVehiculo}
                              value={item.idLineaVehiculo}
                            >
                              {item.marcaVehiculo?.nombreMarcaVehiculo
                                ? `${item.marcaVehiculo.nombreMarcaVehiculo} - `
                                : ""}
                              {item.nombreLineaVehiculo}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                      <Field htmlFor="admin-servicio" label="Servicio">
                        <SelectField
                          id="admin-servicio"
                          value={form.infraccion.idServicio}
                          onChange={(event) =>
                            updateCore("idServicio", Number(event.target.value))
                          }
                        >
                          {(catalogs?.servicios ?? []).map((item) => (
                            <option key={item.idServicio} value={item.idServicio}>
                              {item.nombreServicio}
                            </option>
                          ))}
                        </SelectField>
                      </Field>
                    </div>
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-placas" label="Placas">
                        <TextInput
                          id="admin-placas"
                          value={form.infraccion.placas ?? ""}
                          onChange={(event) =>
                            updateCore("placas", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-estado-placas" label="Estado placas">
                        <TextInput
                          id="admin-estado-placas"
                          value={form.infraccion.estadoPlacas ?? ""}
                          onChange={(event) =>
                            updateCore("estadoPlacas", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-modelo" label="Modelo">
                        <TextInput
                          id="admin-modelo"
                          type="number"
                          min={1}
                          value={form.infraccion.anioModelo ?? ""}
                          onChange={(event) =>
                            updateCore(
                              "anioModelo",
                              toOptionalNumber(event.target.value),
                            )
                          }
                        />
                      </Field>
                    </div>
                    <div className="form-grid form-grid-3">
                      <Field htmlFor="admin-color" label="Color">
                        <TextInput
                          id="admin-color"
                          value={form.infraccion.color ?? ""}
                          onChange={(event) =>
                            updateCore("color", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-serie" label="Serie">
                        <TextInput
                          id="admin-serie"
                          value={form.infraccion.serie ?? ""}
                          onChange={(event) =>
                            updateCore("serie", event.target.value || null)
                          }
                        />
                      </Field>
                      <Field htmlFor="admin-motor" label="Motor">
                        <TextInput
                          id="admin-motor"
                          value={form.infraccion.motor ?? ""}
                          onChange={(event) =>
                            updateCore("motor", event.target.value || null)
                          }
                        />
                      </Field>
                    </div>
                    <Field htmlFor="admin-sitio" label="Sitio servicio publico">
                      <TextInput
                        id="admin-sitio"
                        value={form.infraccion.sitioServicioPublico ?? ""}
                        onChange={(event) =>
                          updateCore(
                            "sitioServicioPublico",
                            event.target.value || null,
                          )
                        }
                      />
                    </Field>
                  </div>
                </AdminSection>

                <AdminSection title={`Motivos (${form.motivos.length})`}>
                  <div className="chip-grid">
                    {(catalogs?.motivos ?? []).map((motivo) => (
                      <label key={motivo.idMotivo} className="field chip-option">
                        <span>{motivo.nombreMotivo}</span>
                        <CheckboxInput
                          checked={form.motivos.includes(motivo.idMotivo)}
                          onChange={() => toggleMotivo(motivo.idMotivo)}
                        />
                      </label>
                    ))}
                  </div>
                </AdminSection>

                {form.retencion ? (
                  <AdminSection title="Retencion / encierro">
                    <div className="page-stack">
                      <div className="form-grid form-grid-3">
                        <Field htmlFor="admin-encierro" label="Encierro">
                          <SelectField
                            id="admin-encierro"
                            value={form.retencion.idEncierro}
                            onChange={(event) =>
                              updateRetencion({
                                idEncierro: Number(event.target.value),
                              })
                            }
                          >
                            {(catalogs?.encierros ?? []).map((item) => (
                              <option key={item.idEncierro} value={item.idEncierro}>
                                {item.nombreEncierro}
                              </option>
                            ))}
                          </SelectField>
                        </Field>
                        <Field htmlFor="admin-fecha-ingreso" label="Fecha ingreso">
                          <TextInput
                            id="admin-fecha-ingreso"
                            type="datetime-local"
                            value={form.retencion.fechaIngreso}
                            onChange={(event) =>
                              updateRetencion({ fechaIngreso: event.target.value })
                            }
                          />
                        </Field>
                        <Field htmlFor="admin-recibido" label="Recibido por">
                          <TextInput
                            id="admin-recibido"
                            value={form.retencion.recibidoPor}
                            onChange={(event) =>
                              updateRetencion({ recibidoPor: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <div className="form-grid form-grid-2">
                        <Field htmlFor="admin-resguardo" label="Folio resguardo">
                          <TextInput
                            id="admin-resguardo"
                            value={form.retencion.folioResguardo ?? ""}
                            onChange={(event) =>
                              updateRetencion({
                                folioResguardo: event.target.value || null,
                              })
                            }
                          />
                        </Field>
                        <Field htmlFor="admin-estado-ingreso" label="Estado ingreso">
                          <TextInput
                            id="admin-estado-ingreso"
                            value={form.retencion.estadoIngreso ?? ""}
                            onChange={(event) =>
                              updateRetencion({
                                estadoIngreso: event.target.value || null,
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field
                        htmlFor="admin-obs-ingreso"
                        label="Observaciones ingreso"
                      >
                        <textarea
                          id="admin-obs-ingreso"
                          rows={3}
                          value={form.retencion.observacionesIngreso ?? ""}
                          onChange={(event) =>
                            updateRetencion({
                              observacionesIngreso: event.target.value || null,
                            })
                          }
                        />
                      </Field>
                    </div>
                  </AdminSection>
                ) : null}

                {form.pagos.length > 0 ? (
                  <AdminSection title={`Pagos (${form.pagos.length})`}>
                    <div className="page-stack">
                      {form.pagos.map((pago, pagoIndex) => (
                        <Card key={pago.idPagoInfraccion}>
                          <div className="page-stack">
                            <div>
                              <p className="section-label">Pago {pagoIndex + 1}</p>
                              <strong>{pago.folioLineaCaptura}</strong>
                            </div>
                            <div className="form-grid form-grid-3">
                              <Field
                                htmlFor={`admin-linea-${pago.idPagoInfraccion}`}
                                label="Linea de captura"
                              >
                                <TextInput
                                  id={`admin-linea-${pago.idPagoInfraccion}`}
                                  value={pago.folioLineaCaptura}
                                  onChange={(event) =>
                                    updatePago(pagoIndex, {
                                      folioLineaCaptura: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-pago-fecha-${pago.idPagoInfraccion}`}
                                label="Fecha pago"
                              >
                                <TextInput
                                  id={`admin-pago-fecha-${pago.idPagoInfraccion}`}
                                  type="datetime-local"
                                  value={pago.fechaPago}
                                  onChange={(event) =>
                                    updatePago(pagoIndex, {
                                      fechaPago: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-pago-obs-${pago.idPagoInfraccion}`}
                                label="Observaciones"
                              >
                                <TextInput
                                  id={`admin-pago-obs-${pago.idPagoInfraccion}`}
                                  value={pago.observaciones ?? ""}
                                  onChange={(event) =>
                                    updatePago(pagoIndex, {
                                      observaciones: event.target.value || null,
                                    })
                                  }
                                />
                              </Field>
                            </div>

                            {pago.conceptos.map((concepto, conceptoIndex) => (
                              <div
                                className="form-grid form-grid-3"
                                key={`${pago.idPagoInfraccion}-${concepto.idPagoConcepto}-${conceptoIndex}`}
                              >
                                <Field
                                  htmlFor={`admin-concepto-clave-${pagoIndex}-${conceptoIndex}`}
                                  label="Clave concepto"
                                >
                                  <TextInput
                                    id={`admin-concepto-clave-${pagoIndex}-${conceptoIndex}`}
                                    value={concepto.claveConcepto}
                                    onChange={(event) =>
                                      updateConcepto(pagoIndex, conceptoIndex, {
                                        claveConcepto:
                                          event.target.value.toUpperCase(),
                                      })
                                    }
                                  />
                                </Field>
                                <Field
                                  htmlFor={`admin-concepto-monto-${pagoIndex}-${conceptoIndex}`}
                                  label="Monto"
                                >
                                  <TextInput
                                    id={`admin-concepto-monto-${pagoIndex}-${conceptoIndex}`}
                                    inputMode="decimal"
                                    value={concepto.monto}
                                    onChange={(event) =>
                                      updateConcepto(pagoIndex, conceptoIndex, {
                                        monto: event.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <div className="field">
                                  <label>&nbsp;</label>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    disabled={pago.conceptos.length <= 1}
                                    onClick={() =>
                                      removeConcepto(pagoIndex, conceptoIndex)
                                    }
                                  >
                                    Quitar concepto
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <div className="button-row button-row-end">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => addConcepto(pagoIndex)}
                              >
                                Agregar concepto
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AdminSection>
                ) : null}

                {form.liberaciones.length > 0 ? (
                  <AdminSection
                    title={`Liberaciones (${form.liberaciones.length})`}
                  >
                    <div className="page-stack">
                      {form.liberaciones.map((item, index) => (
                        <Card key={item.idLiberacionVehiculo}>
                          <div className="page-stack">
                            <p className="section-label">Liberacion {index + 1}</p>
                            <div className="form-grid form-grid-3">
                              <Field
                                htmlFor={`admin-lib-folio-${item.idLiberacionVehiculo}`}
                                label="Folio liberacion"
                              >
                                <TextInput
                                  id={`admin-lib-folio-${item.idLiberacionVehiculo}`}
                                  value={item.folioLiberacion}
                                  onChange={(event) =>
                                    updateLiberacion(index, {
                                      folioLiberacion: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-lib-fecha-${item.idLiberacionVehiculo}`}
                                label="Fecha liberacion"
                              >
                                <TextInput
                                  id={`admin-lib-fecha-${item.idLiberacionVehiculo}`}
                                  type="datetime-local"
                                  value={item.fechaLiberacion}
                                  onChange={(event) =>
                                    updateLiberacion(index, {
                                      fechaLiberacion: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-lib-por-${item.idLiberacionVehiculo}`}
                                label="Liberado por"
                              >
                                <TextInput
                                  id={`admin-lib-por-${item.idLiberacionVehiculo}`}
                                  value={item.liberadoPor}
                                  onChange={(event) =>
                                    updateLiberacion(index, {
                                      liberadoPor: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-lib-recibe-${item.idLiberacionVehiculo}`}
                                label="Nombre recibe"
                              >
                                <TextInput
                                  id={`admin-lib-recibe-${item.idLiberacionVehiculo}`}
                                  value={item.nombreRecibeLiberacion ?? ""}
                                  onChange={(event) =>
                                    updateLiberacion(index, {
                                      nombreRecibeLiberacion:
                                        event.target.value || null,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-lib-obs-${item.idLiberacionVehiculo}`}
                                label="Observacion"
                              >
                                <TextInput
                                  id={`admin-lib-obs-${item.idLiberacionVehiculo}`}
                                  value={item.observacion ?? ""}
                                  onChange={(event) =>
                                    updateLiberacion(index, {
                                      observacion: event.target.value || null,
                                    })
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AdminSection>
                ) : null}

                {form.salidas.length > 0 ? (
                  <AdminSection title={`Salidas (${form.salidas.length})`}>
                    <div className="page-stack">
                      {form.salidas.map((item, index) => (
                        <Card key={item.idSalidaVehiculo}>
                          <div className="page-stack">
                            <p className="section-label">Salida {index + 1}</p>
                            <div className="form-grid form-grid-3">
                              <Field
                                htmlFor={`admin-salida-fecha-${item.idSalidaVehiculo}`}
                                label="Fecha salida"
                              >
                                <TextInput
                                  id={`admin-salida-fecha-${item.idSalidaVehiculo}`}
                                  type="datetime-local"
                                  value={item.fechaSalida}
                                  onChange={(event) =>
                                    updateSalida(index, {
                                      fechaSalida: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-salida-valida-${item.idSalidaVehiculo}`}
                                label="Validado por"
                              >
                                <TextInput
                                  id={`admin-salida-valida-${item.idSalidaVehiculo}`}
                                  value={item.validadoPor}
                                  onChange={(event) =>
                                    updateSalida(index, {
                                      validadoPor: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-salida-recibe-${item.idSalidaVehiculo}`}
                                label="Persona recibe"
                              >
                                <TextInput
                                  id={`admin-salida-recibe-${item.idSalidaVehiculo}`}
                                  value={item.personaRecibeVehiculo}
                                  onChange={(event) =>
                                    updateSalida(index, {
                                      personaRecibeVehiculo: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-salida-estado-${item.idSalidaVehiculo}`}
                                label="Estado salida"
                              >
                                <TextInput
                                  id={`admin-salida-estado-${item.idSalidaVehiculo}`}
                                  value={item.estadoSalida}
                                  onChange={(event) =>
                                    updateSalida(index, {
                                      estadoSalida: event.target.value,
                                    })
                                  }
                                />
                              </Field>
                              <Field
                                htmlFor={`admin-salida-obs-${item.idSalidaVehiculo}`}
                                label="Observaciones"
                              >
                                <TextInput
                                  id={`admin-salida-obs-${item.idSalidaVehiculo}`}
                                  value={item.observacionesSalida ?? ""}
                                  onChange={(event) =>
                                    updateSalida(index, {
                                      observacionesSalida:
                                        event.target.value || null,
                                    })
                                  }
                                />
                              </Field>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </AdminSection>
                ) : null}
              </div>
            </Card>

            <aside className="admin-action-sidebar">
              <Card className="admin-action-card admin-save-card">
                <div className="page-stack">
                  <div>
                    <p className="section-label">Guardar correccion</p>
                    <h2>Auditoria de edicion</h2>
                    <p className="page-description">
                      El motivo es obligatorio y se almacena junto con el antes y
                      despues del expediente.
                    </p>
                  </div>

                  <div className="admin-save-state">
                    <span>Estado</span>
                    <strong>{hasChanges ? "Cambios pendientes" : "Sin cambios"}</strong>
                  </div>

                  <div className="admin-operation-counts">
                    <div className="admin-operation-count">
                      <strong>{form.pagos.length}</strong>
                      <span>Pagos</span>
                    </div>
                    <div className="admin-operation-count">
                      <strong>{form.retencion ? 1 : 0}</strong>
                      <span>Retencion</span>
                    </div>
                    <div className="admin-operation-count">
                      <strong>{form.liberaciones.length}</strong>
                      <span>Liberaciones</span>
                    </div>
                    <div className="admin-operation-count">
                      <strong>{form.salidas.length}</strong>
                      <span>Salidas</span>
                    </div>
                  </div>

                  <Field htmlFor="admin-motivo-edicion" label="Motivo de edicion">
                    <textarea
                      id="admin-motivo-edicion"
                      rows={3}
                      maxLength={500}
                      value={motivoEdicion}
                      onChange={(event) => setMotivoEdicion(event.target.value)}
                      placeholder="Describe por que se corrige este expediente"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={saving || deleting || !hasChanges}
                    onClick={() => void saveExpediente()}
                  >
                    {saving
                      ? "Guardando..."
                      : hasChanges
                        ? "Guardar correccion"
                        : "Sin cambios por guardar"}
                  </Button>
                </div>
              </Card>

              <Card className="admin-action-card admin-danger-card">
                <div className="page-stack">
                  <div>
                    <p className="section-label">Zona destructiva</p>
                    <h2>Eliminar infraccion</h2>
                    <p>
                      Elimina fisicamente la infraccion y sus relaciones operativas.
                      El evento permanece en auditoria.
                    </p>
                  </div>
                  <Field
                    htmlFor="admin-motivo-eliminar"
                    label="Motivo de eliminacion"
                  >
                    <textarea
                      id="admin-motivo-eliminar"
                      rows={3}
                      maxLength={500}
                      value={motivoEliminacion}
                      onChange={(event) =>
                        setMotivoEliminacion(event.target.value)
                      }
                      placeholder="Justifica la eliminacion"
                    />
                  </Field>
                  <Field
                    htmlFor="admin-confirmar-folio"
                    label={`Confirma escribiendo: ${snapshot?.infraccion.folioInfraccion ?? ""}`}
                  >
                    <TextInput
                      id="admin-confirmar-folio"
                      value={folioConfirmacion}
                      onChange={(event) => setFolioConfirmacion(event.target.value)}
                      autoComplete="off"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="secondary"
                    className="admin-danger-button"
                    disabled={saving || deleting}
                    onClick={() => void deleteExpediente()}
                  >
                    {deleting ? "Eliminando..." : "Eliminar definitivamente"}
                  </Button>
                </div>
              </Card>
            </aside>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default AdminExpedientesPage;

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { Button } from "../../components/ui/Button";
import { Field, TextInput } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { SelectField } from "../../components/ui/SelectField";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { getErrorMessage } from "../../services/api/apiClient";
import {
  createRetencion,
  createSalida,
} from "../../services/api/encierros.api";
import { createLiberacion } from "../../services/api/liberaciones.api";
import { createPago } from "../../services/api/pagos.api";
import {
  formatDate,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from "../../utils/formatters";
import { confirmAction } from "../../utils/sweetAlert";
import type { CatalogosBundle } from "../../types/catalogos.types";
import type { InfraccionListItem } from "../../types/infracciones.types";
import type {
  GenerarLiberacionPayload,
  RegistrarPagoPayload,
  RegistrarRetencionPayload,
  RegistrarSalidaPayload,
} from "../../types/operaciones.types";
import "./InfraccionOperacionModal.css";

export type InfraccionOperacionTipo =
  | "retencion"
  | "pago"
  | "liberacion"
  | "salida";

interface InfraccionOperacionModalProps {
  catalogs: CatalogosBundle | null;
  item: InfraccionListItem | null;
  open: boolean;
  token: string;
  type: InfraccionOperacionTipo | null;
  onClose: () => void;
  onCompleted: () => void;
}

interface OperationCopy {
  title: string;
  description: string;
  submitLabel: string;
}

interface OperationFormState {
  idEncierro: string;
  fechaIngreso: string;
  recibidoPor: string;
  folioResguardo: string;
  estadoIngreso: string;
  observacionesIngreso: string;
  folioPago: string;
  montoInfraccion: string;
  diasPisoCobrados: string;
  montoDiasPiso: string;
  fechaPago: string;
  observacionesPago: string;
  folioLiberacion: string;
  liberadoPor: string;
  fechaLiberacion: string;
  observacionLiberacion: string;
  validadoPor: string;
  personaRecibeVehiculo: string;
  fechaSalida: string;
  estadoSalida: string;
  observacionesSalida: string;
}

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function toIsoDateTime(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function toMoney(value: string): string {
  const numericValue = Number(value || "0");

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return "0.00";
  }

  return numericValue.toFixed(2);
}

function createInitialForm(
  type: InfraccionOperacionTipo | null,
): OperationFormState {
  const now = getCurrentDateTimeLocal();

  return {
    idEncierro: "",
    fechaIngreso: now,
    recibidoPor: "",
    folioResguardo: "",
    estadoIngreso: "CAPTURADO",
    observacionesIngreso: "",
    folioPago: "",
    montoInfraccion: "0.00",
    diasPisoCobrados: "0",
    montoDiasPiso: "0.00",
    fechaPago: now,
    observacionesPago: "",
    folioLiberacion: "",
    liberadoPor: "",
    fechaLiberacion: now,
    observacionLiberacion: "",
    validadoPor: "",
    personaRecibeVehiculo: "",
    fechaSalida: now,
    estadoSalida: type === "salida" ? "ENTREGADO" : "",
    observacionesSalida: "",
  };
}

function getOperationCopy(type: InfraccionOperacionTipo | null): OperationCopy {
  switch (type) {
    case "retencion":
      return {
        title: "Registrar retencion",
        description: "Captura el ingreso del vehiculo al encierro.",
        submitLabel: "Guardar retencion",
      };
    case "pago":
      return {
        title: "Registrar pago",
        description:
          "Registra el pago separado por infraccion y dias de piso.",
        submitLabel: "Guardar pago",
      };
    case "liberacion":
      return {
        title: "Generar liberacion",
        description: "Genera la liberacion del vehiculo despues del pago.",
        submitLabel: "Guardar liberacion",
      };
    case "salida":
      return {
        title: "Registrar salida",
        description: "Registra la entrega fisica del vehiculo.",
        submitLabel: "Guardar salida",
      };
    default:
      return {
        title: "Operacion",
        description: "Actualiza el expediente operativo.",
        submitLabel: "Guardar",
      };
  }
}

function getInfractorLabel(item: InfraccionListItem): string {
  return formatFullName([
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ]);
}

function getVehicleLabel(item: InfraccionListItem): string {
  return [item.vehiculo.marca, item.vehiculo.linea, item.vehiculo.clase]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" - ");
}

function OperationSummary({ item }: { item: InfraccionListItem }) {
  return (
    <section className="operation-modal-summary">
      <div>
        <p className="section-label">Expediente</p>
        <h3>{item.folioInfraccion}</h3>
        <strong>{getInfractorLabel(item)}</strong>
      </div>

      <div className="operation-modal-facts">
        <span>{formatDate(item.fechaInfraccion)}</span>
        <span>{formatTimeOfDay(item.horaInfraccion)}</span>
        <span>Placas: {formatEmptyValue(item.vehiculo.placas)}</span>
        <span>{getVehicleLabel(item)}</span>
      </div>

      <StatusBadge value={item.estadoOperativoCalculado} />
    </section>
  );
}

function FormActions({
  disabled,
  onClose,
  saving,
  submitLabel,
}: {
  disabled: boolean;
  onClose: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="operation-modal-actions">
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" variant="primary" disabled={disabled || saving}>
        {saving ? "Guardando..." : submitLabel}
      </Button>
    </div>
  );
}

function RequiredNote({ children }: { children: ReactNode }) {
  return <p className="operation-modal-note">{children}</p>;
}

export function InfraccionOperacionModal({
  catalogs,
  item,
  onClose,
  onCompleted,
  open,
  token,
  type,
}: InfraccionOperacionModalProps) {
  const copy = useMemo(() => getOperationCopy(type), [type]);
  const [form, setForm] = useState<OperationFormState>(() =>
    createInitialForm(type),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoTotalPago = useMemo(
    () =>
      toMoney(
        String(
          Number(form.montoInfraccion || "0") +
            Number(form.montoDiasPiso || "0"),
        ),
      ),
    [form.montoDiasPiso, form.montoInfraccion],
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(createInitialForm(type));
      setSaving(false);
      setError(null);
    }
  }, [open, type]);

  function updateField(field: keyof OperationFormState, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function getValidationError(): string | null {
    if (!item || !type) {
      return "No hay expediente seleccionado.";
    }

    if (type === "retencion") {
      if (!catalogs) {
        return "Los catalogos aun no estan disponibles.";
      }

      if (!form.idEncierro) {
        return "Selecciona el encierro.";
      }

      if (!form.recibidoPor.trim()) {
        return "Captura quien recibe el vehiculo.";
      }
    }

    if (type === "pago") {
      if (!form.folioPago.trim()) {
        return "Captura el folio de pago.";
      }

      if (Number(form.montoInfraccion || "0") < 0) {
        return "El monto de infraccion no puede ser negativo.";
      }

      if (Number(form.diasPisoCobrados || "0") < 0) {
        return "Los dias de piso no pueden ser negativos.";
      }

      if (Number(form.montoDiasPiso || "0") < 0) {
        return "El monto de dias de piso no puede ser negativo.";
      }

      if (Number(montoTotalPago) <= 0) {
        return "Captura al menos un importe mayor a cero.";
      }
    }

    if (type === "liberacion") {
      if (!item.pago?.idPagoInfraccion) {
        return "No se encontro el pago asociado. Actualiza el listado e intenta de nuevo.";
      }

      if (!form.folioLiberacion.trim()) {
        return "Captura el folio de liberacion.";
      }

      if (!form.liberadoPor.trim()) {
        return "Captura el responsable que libera.";
      }
    }

    if (type === "salida") {
      if (
        !item.retencion?.idRetencionVehiculo ||
        !item.liberacion?.idLiberacionVehiculo
      ) {
        return "No se encontraron los datos tecnicos de retencion/liberacion. Actualiza el listado.";
      }

      if (!form.validadoPor.trim() || !form.personaRecibeVehiculo.trim()) {
        return "Captura quien valida y quien recibe el vehiculo.";
      }

      if (!form.estadoSalida.trim()) {
        return "Captura el estado de salida.";
      }
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const validationError = getValidationError();
    if (validationError || !item || !type) {
      setError(validationError ?? "No hay expediente seleccionado.");
      return;
    }

    try {
      if (type === "retencion") {
        const confirmed = await confirmAction({
          title: "Registrar retención",
          text: `Vas a registrar la retención del expediente ${item.folioInfraccion}.`,
          confirmButtonText: "Registrar retención",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: RegistrarRetencionPayload = {
          idInfraccion: item.idInfraccion,
          idEncierro: Number(form.idEncierro),
          fechaIngreso: toIsoDateTime(form.fechaIngreso),
          recibidoPor: form.recibidoPor.trim(),
          folioResguardo: toNullableString(form.folioResguardo),
          estadoIngreso: toNullableString(form.estadoIngreso),
          observacionesIngreso: toNullableString(form.observacionesIngreso),
        };
        await createRetencion(token, payload);
      }

      if (type === "pago") {
        const confirmed = await confirmAction({
          title: "Registrar pago",
          text: `Vas a registrar el pago del expediente ${item.folioInfraccion} por ${montoTotalPago}.`,
          confirmButtonText: "Registrar pago",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: RegistrarPagoPayload = {
          idInfraccion: item.idInfraccion,
          folioPago: form.folioPago.trim(),
          monto: montoTotalPago,
          montoInfraccion: toMoney(form.montoInfraccion),
          diasPisoCobrados: Number(form.diasPisoCobrados || "0"),
          montoDiasPiso: toMoney(form.montoDiasPiso),
          fechaPago: toIsoDateTime(form.fechaPago),
          observaciones: toNullableString(form.observacionesPago),
        };
        await createPago(token, payload);
      }

      if (type === "liberacion" && item.pago?.idPagoInfraccion) {
        const confirmed = await confirmAction({
          title: "Generar liberación",
          text: `Vas a generar la liberación del expediente ${item.folioInfraccion} usando el pago ${item.pago.idPagoInfraccion}.`,
          confirmButtonText: "Generar liberación",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: GenerarLiberacionPayload = {
          idInfraccion: item.idInfraccion,
          idPagoInfraccion: item.pago.idPagoInfraccion,
          folioLiberacion: form.folioLiberacion.trim(),
          liberadoPor: form.liberadoPor.trim(),
          nombreRecibeLiberacion: null,
          fechaLiberacion: toIsoDateTime(form.fechaLiberacion),
          observacion: toNullableString(form.observacionLiberacion),
        };
        await createLiberacion(token, payload);
      }

      if (
        type === "salida" &&
        item.retencion?.idRetencionVehiculo &&
        item.liberacion?.idLiberacionVehiculo
      ) {
        const confirmed = await confirmAction({
          title: "Registrar salida",
          text: `Vas a registrar la salida del expediente ${item.folioInfraccion} con la retención ${item.retencion.idRetencionVehiculo} y la liberación ${item.liberacion.idLiberacionVehiculo}.`,
          confirmButtonText: "Registrar salida",
          cancelButtonText: "Seguir editando",
        });

        if (!confirmed) {
          return;
        }

        setSaving(true);
        setError(null);

        const payload: RegistrarSalidaPayload = {
          idRetencionVehiculo: item.retencion.idRetencionVehiculo,
          idLiberacionVehiculo: item.liberacion.idLiberacionVehiculo,
          validadoPor: form.validadoPor.trim(),
          personaRecibeVehiculo: form.personaRecibeVehiculo.trim(),
          fechaSalida: toIsoDateTime(form.fechaSalida),
          estadoSalida: form.estadoSalida.trim(),
          observacionesSalida: toNullableString(form.observacionesSalida),
        };
        await createSalida(token, payload);
      }

      onCompleted();
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = getValidationError() === null;

  return (
    <Modal
      open={open}
      title={copy.title}
      description={copy.description}
      onClose={onClose}
    >
      {item ? <OperationSummary item={item} /> : null}

      <form className="operation-modal-form" onSubmit={handleSubmit}>
        {type === "retencion" ? (
          <div className="form-grid form-grid-2">
            <Field htmlFor="operacion-retencion-encierro" label="Encierro">
              <SelectField
                id="operacion-retencion-encierro"
                value={form.idEncierro}
                onChange={(event) =>
                  updateField("idEncierro", event.target.value)
                }
                required
              >
                <option value="">Selecciona</option>
                {(catalogs?.encierros ?? []).map((encierro) => (
                  <option key={encierro.idEncierro} value={encierro.idEncierro}>
                    {encierro.nombreEncierro}
                  </option>
                ))}
              </SelectField>
            </Field>

            <Field htmlFor="operacion-retencion-fecha" label="Fecha ingreso">
              <TextInput
                id="operacion-retencion-fecha"
                type="datetime-local"
                value={form.fechaIngreso}
                onChange={(event) =>
                  updateField("fechaIngreso", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-retencion-recibido" label="Recibido por">
              <TextInput
                id="operacion-retencion-recibido"
                value={form.recibidoPor}
                onChange={(event) =>
                  updateField("recibidoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field htmlFor="operacion-retencion-folio" label="Folio resguardo">
              <TextInput
                id="operacion-retencion-folio"
                value={form.folioResguardo}
                onChange={(event) =>
                  updateField("folioResguardo", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-retencion-estado" label="Estado ingreso">
              <TextInput
                id="operacion-retencion-estado"
                value={form.estadoIngreso}
                onChange={(event) =>
                  updateField("estadoIngreso", event.target.value)
                }
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-retencion-observaciones">
                Observaciones
              </label>
              <textarea
                id="operacion-retencion-observaciones"
                rows={3}
                value={form.observacionesIngreso}
                onChange={(event) =>
                  updateField("observacionesIngreso", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {type === "pago" ? (
          <div className="form-grid form-grid-2">
            <Field htmlFor="operacion-pago-folio" label="Folio pago">
              <TextInput
                id="operacion-pago-folio"
                value={form.folioPago}
                onChange={(event) =>
                  updateField("folioPago", event.target.value)
                }
                required
              />
            </Field>

            <Field htmlFor="operacion-pago-monto-inf" label="Monto infraccion">
              <TextInput
                id="operacion-pago-monto-inf"
                type="number"
                min="0"
                step="0.01"
                value={form.montoInfraccion}
                onChange={(event) =>
                  updateField("montoInfraccion", event.target.value)
                }
                placeholder="0.00"
              />
            </Field>

            <Field htmlFor="operacion-pago-dias-piso" label="Dias de piso cobrados">
              <TextInput
                id="operacion-pago-dias-piso"
                type="number"
                min="0"
                value={form.diasPisoCobrados}
                onChange={(event) =>
                  updateField("diasPisoCobrados", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-pago-monto-piso" label="Monto dias de piso">
              <TextInput
                id="operacion-pago-monto-piso"
                type="number"
                min="0"
                step="0.01"
                value={form.montoDiasPiso}
                onChange={(event) =>
                  updateField("montoDiasPiso", event.target.value)
                }
                placeholder="0.00"
              />
            </Field>

            <Field htmlFor="operacion-pago-total" label="Total calculado">
              <TextInput id="operacion-pago-total" value={montoTotalPago} readOnly />
            </Field>

            <Field htmlFor="operacion-pago-fecha" label="Fecha pago">
              <TextInput
                id="operacion-pago-fecha"
                type="datetime-local"
                value={form.fechaPago}
                onChange={(event) =>
                  updateField("fechaPago", event.target.value)
                }
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-pago-observaciones">
                Observaciones
              </label>
              <textarea
                id="operacion-pago-observaciones"
                rows={3}
                value={form.observacionesPago}
                onChange={(event) =>
                  updateField("observacionesPago", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {type === "liberacion" ? (
          <div className="form-grid form-grid-2">
            <RequiredNote>
              Se usara automaticamente el pago registrado del expediente. No se
              muestra el ID tecnico.
            </RequiredNote>

            <Field
              htmlFor="operacion-liberacion-folio"
              label="Folio liberacion"
            >
              <TextInput
                id="operacion-liberacion-folio"
                value={form.folioLiberacion}
                onChange={(event) =>
                  updateField("folioLiberacion", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-liberacion-por"
              label="Responsable que libera"
            >
              <TextInput
                id="operacion-liberacion-por"
                value={form.liberadoPor}
                onChange={(event) =>
                  updateField("liberadoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-liberacion-fecha"
              label="Fecha liberacion"
            >
              <TextInput
                id="operacion-liberacion-fecha"
                type="datetime-local"
                value={form.fechaLiberacion}
                onChange={(event) =>
                  updateField("fechaLiberacion", event.target.value)
                }
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-liberacion-observacion">
                Observaciones
              </label>
              <textarea
                id="operacion-liberacion-observacion"
                rows={3}
                value={form.observacionLiberacion}
                onChange={(event) =>
                  updateField("observacionLiberacion", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {type === "salida" ? (
          <div className="form-grid form-grid-2">
            <RequiredNote>
              Se usaran automaticamente la retencion y la liberacion vigentes
              del expediente.
            </RequiredNote>

            <Field htmlFor="operacion-salida-validado" label="Validado por">
              <TextInput
                id="operacion-salida-validado"
                value={form.validadoPor}
                onChange={(event) =>
                  updateField("validadoPor", event.target.value)
                }
                required
              />
            </Field>

            <Field
              htmlFor="operacion-salida-recibe"
              label="Persona recibe vehiculo"
            >
              <TextInput
                id="operacion-salida-recibe"
                value={form.personaRecibeVehiculo}
                onChange={(event) =>
                  updateField("personaRecibeVehiculo", event.target.value)
                }
                required
              />
            </Field>

            <Field htmlFor="operacion-salida-fecha" label="Fecha salida">
              <TextInput
                id="operacion-salida-fecha"
                type="datetime-local"
                value={form.fechaSalida}
                onChange={(event) =>
                  updateField("fechaSalida", event.target.value)
                }
              />
            </Field>

            <Field htmlFor="operacion-salida-estado" label="Estado salida">
              <TextInput
                id="operacion-salida-estado"
                value={form.estadoSalida}
                onChange={(event) =>
                  updateField("estadoSalida", event.target.value)
                }
                required
              />
            </Field>

            <div className="field field-span-2">
              <label htmlFor="operacion-salida-observaciones">
                Observaciones
              </label>
              <textarea
                id="operacion-salida-observaciones"
                rows={3}
                value={form.observacionesSalida}
                onChange={(event) =>
                  updateField("observacionesSalida", event.target.value)
                }
              />
            </div>
          </div>
        ) : null}

        {error ? <div className="notice notice-error">{error}</div> : null}

        <FormActions
          disabled={!canSubmit}
          onClose={onClose}
          saving={saving}
          submitLabel={copy.submitLabel}
        />
      </form>
    </Modal>
  );
}

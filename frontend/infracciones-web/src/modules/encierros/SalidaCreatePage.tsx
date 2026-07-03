import { useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type { RegistrarSalidaPayload } from "../../types/operaciones.types";
import { getResponseText } from "../../utils/response";
import { confirmAction } from "../../utils/sweetAlert";

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === "") {
    return undefined;
  }

  return value;
}

function isFilled(value: string): boolean {
  return value.trim() !== "";
}

interface SalidaCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: RegistrarSalidaPayload) => Promise<unknown>;
  initialIdRetencionVehiculo?: number | null;
}

function createInitialForm(initialIdRetencionVehiculo?: number | null) {
  return {
    idRetencionVehiculo: initialIdRetencionVehiculo
      ? String(initialIdRetencionVehiculo)
      : "",
    idLiberacionVehiculo: "",
    validadoPor: "",
    personaRecibeVehiculo: "",
    fechaSalida: getCurrentDateTimeLocal(),
    observacionesSalida: "",
    estadoSalida: "",
  };
}

type SalidaFormState = ReturnType<typeof createInitialForm>;

function SalidaCreatePage({
  initialIdRetencionVehiculo,
  onCompleted,
  onSubmit,
}: SalidaCreatePageProps) {
  const [form, setForm] = useState(() =>
    createInitialForm(initialIdRetencionVehiculo),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function updateField(field: keyof SalidaFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function resetForm() {
    setForm(createInitialForm(initialIdRetencionVehiculo));
    setError(null);
    setResult(null);
  }

  async function handleReset(): Promise<void> {
    const confirmed = await confirmAction({
      title: "Limpiar salida",
      text: `Se perderán los datos capturados de la salida de la retención ${form.idRetencionVehiculo || "sin ID"}.`,
      confirmButtonText: "Limpiar salida",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    resetForm();
  }

  function getValidationError(): string | null {
    if (!isFilled(form.idRetencionVehiculo)) {
      return "Ingresa el ID de la retencion.";
    }

    if (!isFilled(form.idLiberacionVehiculo)) {
      return "Ingresa el ID de la liberacion.";
    }

    if (!isFilled(form.validadoPor) || !isFilled(form.personaRecibeVehiculo)) {
      return "Completa los nombres requeridos para la salida.";
    }

    if (!isFilled(form.estadoSalida)) {
      return "Ingresa el estado de la salida.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = await confirmAction({
      title: "Registrar salida",
      text: `Vas a registrar la salida del vehículo para la retención ${form.idRetencionVehiculo} y la liberación ${form.idLiberacionVehiculo}.`,
      confirmButtonText: "Registrar salida",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const response = await onSubmit({
        idRetencionVehiculo: Number(form.idRetencionVehiculo),
        idLiberacionVehiculo: Number(form.idLiberacionVehiculo),
        validadoPor: form.validadoPor.trim(),
        personaRecibeVehiculo: form.personaRecibeVehiculo.trim(),
        fechaSalida: form.fechaSalida
          ? new Date(form.fechaSalida).toISOString()
          : undefined,
        observacionesSalida: toNullableString(form.observacionesSalida) ?? null,
        estadoSalida: form.estadoSalida.trim(),
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Error desconocido al guardar la salida.",
      );
    } finally {
      setSaving(false);
    }
  }

  const exitId = getResponseText(result, "idSalidaVehiculo");
  const exitSummary = exitId
    ? [
        { label: "ID salida", value: exitId },
        {
          label: "Retencion",
          value: getResponseText(result, "idRetencionVehiculo") ?? "Sin dato",
        },
        {
          label: "Liberacion",
          value: getResponseText(result, "idLiberacionVehiculo") ?? "Sin dato",
        },
      ]
    : [];
  const canSubmit =
    isFilled(form.idRetencionVehiculo) &&
    isFilled(form.idLiberacionVehiculo) &&
    isFilled(form.validadoPor) &&
    isFilled(form.personaRecibeVehiculo) &&
    isFilled(form.estadoSalida);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Salida</h1>
          <p className="page-description">
            Registra la entrega fisica del vehiculo en el encierro.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="salida-id-retencion">ID retencion</label>
            <input
              id="salida-id-retencion"
              type="number"
              min="1"
              value={form.idRetencionVehiculo}
              onChange={(event) =>
                updateField("idRetencionVehiculo", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-id-liberacion">ID liberacion</label>
            <input
              id="salida-id-liberacion"
              type="number"
              min="1"
              value={form.idLiberacionVehiculo}
              onChange={(event) =>
                updateField("idLiberacionVehiculo", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-validado-por">Validado por</label>
            <input
              id="salida-validado-por"
              value={form.validadoPor}
              onChange={(event) =>
                updateField("validadoPor", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-recibe">Persona recibe vehiculo</label>
            <input
              id="salida-recibe"
              value={form.personaRecibeVehiculo}
              onChange={(event) =>
                updateField("personaRecibeVehiculo", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-fecha">Fecha salida</label>
            <input
              id="salida-fecha"
              type="datetime-local"
              value={form.fechaSalida}
              onChange={(event) =>
                updateField("fechaSalida", event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="salida-estado">Estado salida</label>
            <input
              id="salida-estado"
              value={form.estadoSalida}
              onChange={(event) =>
                updateField("estadoSalida", event.target.value)
              }
              required
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="salida-observaciones">Observaciones</label>
            <textarea
              id="salida-observaciones"
              value={form.observacionesSalida}
              onChange={(event) =>
                updateField("observacionesSalida", event.target.value)
              }
              rows={4}
            />
          </div>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button
            className="button-primary"
            type="submit"
            disabled={saving || !canSubmit}
          >
            {saving ? "Guardando..." : "Registrar salida"}
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={() => void handleReset()}
          >
            Limpiar
          </button>
        </div>
      </form>

      <OperationResultCard
        title="Salida registrada"
        description="El backend devuelve la salida con el identificador que cierra el flujo."
        result={result}
        emptyLabel="Sin respuesta aun."
        copyValue={exitId}
        summary={exitSummary}
      />
    </section>
  );
}

export default SalidaCreatePage;

import { useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type { GenerarLiberacionPayload } from "../../types/operaciones.types";
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

interface LiberacionCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: GenerarLiberacionPayload) => Promise<unknown>;
  initialIdInfraccion?: number | null;
}

function createInitialForm(initialIdInfraccion?: number | null) {
  return {
    idInfraccion: initialIdInfraccion ? String(initialIdInfraccion) : "",
    idPagoInfraccion: "",
    folioLiberacion: "",
    liberadoPor: "",
    fechaLiberacion: getCurrentDateTimeLocal(),
    observacion: "",
  };
}

type LiberacionFormState = ReturnType<typeof createInitialForm>;

function LiberacionCreatePage({
  initialIdInfraccion,
  onCompleted,
  onSubmit,
}: LiberacionCreatePageProps) {
  const [form, setForm] = useState(() =>
    createInitialForm(initialIdInfraccion),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function updateField(field: keyof LiberacionFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function resetForm() {
    setForm(createInitialForm(initialIdInfraccion));
    setError(null);
    setResult(null);
  }

  async function handleReset(): Promise<void> {
    const confirmed = await confirmAction({
      title: "Limpiar liberación",
      text: `Se perderán los datos capturados de la liberación de la infracción ${form.idInfraccion || "sin ID"}.`,
      confirmButtonText: "Limpiar liberación",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    resetForm();
  }

  function getValidationError(): string | null {
    if (!isFilled(form.idInfraccion)) {
      return "Ingresa el ID de infraccion.";
    }

    if (!isFilled(form.idPagoInfraccion)) {
      return "Ingresa el ID del pago.";
    }

    if (!isFilled(form.folioLiberacion)) {
      return "Ingresa el folio de liberacion.";
    }

    if (!isFilled(form.liberadoPor)) {
      return "Captura el responsable que libera.";
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
      title: "Generar liberación",
      text: `Vas a generar la liberación de la infracción ${form.idInfraccion} usando el pago ${form.idPagoInfraccion}.`,
      confirmButtonText: "Generar liberación",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const response = await onSubmit({
        idInfraccion: Number(form.idInfraccion),
        idPagoInfraccion: Number(form.idPagoInfraccion),
        folioLiberacion: form.folioLiberacion.trim(),
        liberadoPor: form.liberadoPor.trim(),
        nombreRecibeLiberacion: null,
        fechaLiberacion: form.fechaLiberacion
          ? new Date(form.fechaLiberacion).toISOString()
          : undefined,
        observacion: toNullableString(form.observacion) ?? null,
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Error desconocido al guardar la liberacion.",
      );
    } finally {
      setSaving(false);
    }
  }

  const releaseId = getResponseText(result, "idLiberacionVehiculo");
  const releaseSummary = releaseId
    ? [
        { label: "ID liberacion", value: releaseId },
        {
          label: "Folio",
          value: getResponseText(result, "folioLiberacion") ?? "Sin folio",
        },
        {
          label: "Responsable que libera",
          value: getResponseText(result, "liberadoPor") ?? "Sin dato",
        },
      ]
    : [];
  const canSubmit =
    isFilled(form.idInfraccion) &&
    isFilled(form.idPagoInfraccion) &&
    isFilled(form.folioLiberacion) &&
    isFilled(form.liberadoPor);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Liberacion</h1>
          <p className="page-description">
            Genera una liberacion vehicular usando el usuario autenticado del
            JWT.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="liberacion-id-infraccion">ID infraccion</label>
            <input
              id="liberacion-id-infraccion"
              type="number"
              min="1"
              value={form.idInfraccion}
              onChange={(event) =>
                updateField("idInfraccion", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-id-pago">ID pago</label>
            <input
              id="liberacion-id-pago"
              type="number"
              min="1"
              value={form.idPagoInfraccion}
              onChange={(event) =>
                updateField("idPagoInfraccion", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-folio">Folio liberacion</label>
            <input
              id="liberacion-folio"
              value={form.folioLiberacion}
              onChange={(event) =>
                updateField("folioLiberacion", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-liberado-por">
              Responsable que libera
            </label>
            <input
              id="liberacion-liberado-por"
              value={form.liberadoPor}
              onChange={(event) =>
                updateField("liberadoPor", event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-fecha">Fecha liberacion</label>
            <input
              id="liberacion-fecha"
              type="datetime-local"
              value={form.fechaLiberacion}
              onChange={(event) =>
                updateField("fechaLiberacion", event.target.value)
              }
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="liberacion-observacion">Observacion</label>
            <textarea
              id="liberacion-observacion"
              value={form.observacion}
              onChange={(event) =>
                updateField("observacion", event.target.value)
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
            {saving ? "Guardando..." : "Generar liberacion"}
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
        title="Liberacion generada"
        description="El backend devuelve la liberacion con el identificador para la salida."
        result={result}
        emptyLabel="Sin respuesta aun."
        copyValue={releaseId}
        summary={releaseSummary}
      />
    </section>
  );
}

export default LiberacionCreatePage;

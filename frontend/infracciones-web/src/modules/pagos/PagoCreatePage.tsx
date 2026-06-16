import { useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type { RegistrarPagoPayload } from "../../types/operaciones.types";
import { getResponseText } from "../../utils/response";

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

interface PagoCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: RegistrarPagoPayload) => Promise<unknown>;
  initialIdInfraccion?: number | null;
}

function createInitialForm(initialIdInfraccion?: number | null) {
  return {
    idInfraccion: initialIdInfraccion ? String(initialIdInfraccion) : "",
    folioPago: "",
    monto: "",
    fechaPago: getCurrentDateTimeLocal(),
    observaciones: "",
  };
}

type PagoFormState = ReturnType<typeof createInitialForm>;

function PagoCreatePage({
  initialIdInfraccion,
  onCompleted,
  onSubmit,
}: PagoCreatePageProps) {
  const [form, setForm] = useState(() =>
    createInitialForm(initialIdInfraccion),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function updateField(field: keyof PagoFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function resetForm() {
    setForm(createInitialForm(initialIdInfraccion));
    setError(null);
    setResult(null);
  }

  function getValidationError(): string | null {
    if (!isFilled(form.idInfraccion)) {
      return "Ingresa el ID de infraccion.";
    }

    if (!isFilled(form.folioPago)) {
      return "Ingresa el folio del pago.";
    }

    if (!isFilled(form.monto)) {
      return "Ingresa el monto del pago.";
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

    setSaving(true);

    try {
      const response = await onSubmit({
        idInfraccion: Number(form.idInfraccion),
        folioPago: form.folioPago.trim(),
        monto: form.monto.trim(),
        fechaPago: form.fechaPago
          ? new Date(form.fechaPago).toISOString()
          : undefined,
        observaciones: toNullableString(form.observaciones) ?? null,
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Error desconocido al guardar el pago.",
      );
    } finally {
      setSaving(false);
    }
  }

  const paymentId = getResponseText(result, "idPagoInfraccion");
  const paymentSummary = paymentId
    ? [
        { label: "ID pago", value: paymentId },
        {
          label: "Folio",
          value: getResponseText(result, "folioPago") ?? "Sin folio",
        },
        {
          label: "Monto",
          value: getResponseText(result, "monto") ?? "Sin monto",
        },
      ]
    : [];
  const canSubmit =
    isFilled(form.idInfraccion) &&
    isFilled(form.folioPago) &&
    isFilled(form.monto);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Pago</h1>
          <p className="page-description">
            Registra un pago y deja que el backend tome el usuario autenticado
            desde el JWT.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="pago-id-infraccion">ID infraccion</label>
            <input
              id="pago-id-infraccion"
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
            <label htmlFor="pago-folio">Folio pago</label>
            <input
              id="pago-folio"
              value={form.folioPago}
              onChange={(event) => updateField("folioPago", event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="pago-monto">Monto</label>
            <input
              id="pago-monto"
              value={form.monto}
              onChange={(event) => updateField("monto", event.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="pago-fecha">Fecha pago</label>
            <input
              id="pago-fecha"
              type="datetime-local"
              value={form.fechaPago}
              onChange={(event) => updateField("fechaPago", event.target.value)}
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="pago-observaciones">Observaciones</label>
            <textarea
              id="pago-observaciones"
              value={form.observaciones}
              onChange={(event) =>
                updateField("observaciones", event.target.value)
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
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={resetForm}
          >
            Limpiar
          </button>
        </div>
      </form>

      <OperationResultCard
        title="Pago registrado"
        description="El backend devuelve el pago con su identificador para continuar la liberacion."
        result={result}
        emptyLabel="Sin respuesta aun."
        copyValue={paymentId}
        summary={paymentSummary}
      />
    </section>
  );
}

export default PagoCreatePage;

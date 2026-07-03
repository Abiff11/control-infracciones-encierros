import { useMemo, useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type { RegistrarPagoPayload } from "../../types/operaciones.types";
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

function toMoney(value: string): string {
  const numericValue = Number(value || "0");

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return "0.00";
  }

  return numericValue.toFixed(2);
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
    montoInfraccion: "0.00",
    diasPisoCobrados: "0",
    montoDiasPiso: "0.00",
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

  const montoTotal = useMemo(
    () => toMoney(String(Number(form.montoInfraccion || "0") + Number(form.montoDiasPiso || "0"))),
    [form.montoDiasPiso, form.montoInfraccion],
  );

  function updateField(field: keyof PagoFormState, value: string) {
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
      title: "Limpiar pago",
      text: `Se perderán los datos capturados del pago de la infracción ${form.idInfraccion || "sin ID"}.`,
      confirmButtonText: "Limpiar pago",
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

    if (!isFilled(form.folioPago)) {
      return "Ingresa el folio del pago.";
    }

    if (Number(form.montoInfraccion || "0") < 0) {
      return "El monto de la infraccion no puede ser negativo.";
    }

    if (Number(form.diasPisoCobrados || "0") < 0) {
      return "Los dias de piso no pueden ser negativos.";
    }

    if (Number(form.montoDiasPiso || "0") < 0) {
      return "El monto de dias de piso no puede ser negativo.";
    }

    if (Number(montoTotal) <= 0) {
      return "Captura al menos un importe mayor a cero.";
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
      title: "Registrar pago",
      text: `Vas a registrar el pago de la infracción ${form.idInfraccion} por ${montoTotal}.`,
      confirmButtonText: "Registrar pago",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const response = await onSubmit({
        idInfraccion: Number(form.idInfraccion),
        folioPago: form.folioPago.trim(),
        monto: montoTotal,
        montoInfraccion: toMoney(form.montoInfraccion),
        diasPisoCobrados: Number(form.diasPisoCobrados || "0"),
        montoDiasPiso: toMoney(form.montoDiasPiso),
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
          label: "Total",
          value: getResponseText(result, "monto") ?? montoTotal,
        },
      ]
    : [];
  const canSubmit = getValidationError() === null;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Pago</h1>
          <p className="page-description">
            Registra por separado el monto de la infraccion y los dias de piso
            cobrados.
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
            <label htmlFor="pago-monto-infraccion">Monto infraccion</label>
            <input
              id="pago-monto-infraccion"
              type="number"
              min="0"
              step="0.01"
              value={form.montoInfraccion}
              onChange={(event) =>
                updateField("montoInfraccion", event.target.value)
              }
              placeholder="0.00"
            />
          </div>

          <div className="field">
            <label htmlFor="pago-dias-piso">Dias de piso cobrados</label>
            <input
              id="pago-dias-piso"
              type="number"
              min="0"
              value={form.diasPisoCobrados}
              onChange={(event) =>
                updateField("diasPisoCobrados", event.target.value)
              }
            />
          </div>

          <div className="field">
            <label htmlFor="pago-monto-piso">Monto dias de piso</label>
            <input
              id="pago-monto-piso"
              type="number"
              min="0"
              step="0.01"
              value={form.montoDiasPiso}
              onChange={(event) =>
                updateField("montoDiasPiso", event.target.value)
              }
              placeholder="0.00"
            />
          </div>

          <div className="field">
            <label htmlFor="pago-total">Total calculado</label>
            <input id="pago-total" value={montoTotal} readOnly />
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
            onClick={() => void handleReset()}
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

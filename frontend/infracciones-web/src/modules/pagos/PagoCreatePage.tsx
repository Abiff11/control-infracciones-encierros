import { useMemo, useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type { RegistrarPagoPayload } from "../../types/operaciones.types";
import { getResponseText } from "../../utils/response";
import { confirmAction } from "../../utils/sweetAlert";
import {
  createEmptyPagoConceptoRow,
  type PagoConceptoFormRow,
} from "../infracciones/pago-conceptos-form";

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
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
    folioLineaCaptura: "",
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
  const [conceptos, setConceptos] = useState<PagoConceptoFormRow[]>([
    createEmptyPagoConceptoRow(),
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const montoTotal = useMemo(
    () =>
      toMoney(
        String(
          conceptos.reduce((total, concepto) => {
            const monto = Number(concepto.monto || "0");
            return total + (Number.isFinite(monto) ? monto : 0);
          }, 0),
        ),
      ),
    [conceptos],
  );

  function updateField(field: keyof PagoFormState, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function updateConcepto(
    index: number,
    field: keyof PagoConceptoFormRow,
    value: string,
  ): void {
    setConceptos((current) =>
      current.map((concepto, currentIndex) =>
        currentIndex === index ? { ...concepto, [field]: value } : concepto,
      ),
    );
    setError(null);
  }

  function addConcepto(): void {
    setConceptos((current) => [...current, createEmptyPagoConceptoRow()]);
  }

  function removeConcepto(index: number): void {
    setConceptos((current) => {
      if (current.length === 1) {
        return [createEmptyPagoConceptoRow()];
      }

      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  function resetForm(): void {
    setForm(createInitialForm(initialIdInfraccion));
    setConceptos([createEmptyPagoConceptoRow()]);
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

    if (confirmed) {
      resetForm();
    }
  }

  function getValidationError(): string | null {
    if (!form.idInfraccion.trim()) {
      return "Ingresa el ID de infracción.";
    }

    if (!form.folioLineaCaptura.trim()) {
      return "Ingresa el folio de la línea de captura.";
    }

    if (conceptos.length === 0) {
      return "Agrega al menos una clave de concepto.";
    }

    const claves = new Set<string>();

    for (const concepto of conceptos) {
      const clave = concepto.claveConcepto.trim().toUpperCase();
      const monto = Number(concepto.monto);

      if (!clave) {
        return "Captura la clave de todos los conceptos.";
      }

      if (!Number.isFinite(monto) || monto <= 0) {
        return `Captura un monto mayor a cero para la clave ${clave}.`;
      }

      if (claves.has(clave)) {
        return `La clave ${clave} está repetida.`;
      }

      claves.add(clave);
    }

    return Number(montoTotal) > 0
      ? null
      : "El total de la línea de captura debe ser mayor a cero.";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const validationError = getValidationError();
    if (validationError) {
      setError(validationError);
      return;
    }

    const confirmed = await confirmAction({
      title: "Registrar pago",
      text: `Vas a registrar la línea de captura ${form.folioLineaCaptura.trim()} por ${montoTotal}.`,
      confirmButtonText: "Registrar pago",
      cancelButtonText: "Seguir editando",
    });

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const payload: RegistrarPagoPayload = {
        idInfraccion: Number(form.idInfraccion),
        folioLineaCaptura: form.folioLineaCaptura.trim(),
        conceptos: conceptos.map((concepto) => ({
          claveConcepto: concepto.claveConcepto.trim().toUpperCase(),
          monto: toMoney(concepto.monto),
        })),
        fechaPago: form.fechaPago
          ? new Date(form.fechaPago).toISOString()
          : undefined,
        observaciones: toNullableString(form.observaciones),
      };

      const response = await onSubmit(payload);
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
          label: "Folio línea de captura",
          value:
            getResponseText(result, "folioLineaCaptura") ??
            getResponseText(result, "folioPago") ??
            "Sin folio",
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
          <p className="eyebrow">Operación</p>
          <h1>Pago</h1>
          <p className="page-description">
            Registra el folio de la línea de captura y una o más claves con su monto.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="pago-id-infraccion">ID infracción</label>
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
            <label htmlFor="pago-folio">Folio línea de captura</label>
            <input
              id="pago-folio"
              value={form.folioLineaCaptura}
              onChange={(event) =>
                updateField("folioLineaCaptura", event.target.value)
              }
              maxLength={50}
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

          <div className="field">
            <label htmlFor="pago-total">Total calculado</label>
            <input id="pago-total" value={montoTotal} readOnly />
          </div>
        </div>

        <div className="form-stack">
          <div className="page-header">
            <div>
              <p className="eyebrow">Conceptos</p>
              <h2>Claves de pago</h2>
            </div>
            <button type="button" onClick={addConcepto}>
              + Agregar clave
            </button>
          </div>

          {conceptos.map((concepto, index) => (
            <div className="form-grid form-grid-2" key={`concepto-${index}`}>
              <div className="field">
                <label htmlFor={`pago-clave-${index}`}>Clave {index + 1}</label>
                <input
                  id={`pago-clave-${index}`}
                  value={concepto.claveConcepto}
                  onChange={(event) =>
                    updateConcepto(
                      index,
                      "claveConcepto",
                      event.target.value.toUpperCase(),
                    )
                  }
                  maxLength={50}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor={`pago-monto-${index}`}>Monto</label>
                <input
                  id={`pago-monto-${index}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={concepto.monto}
                  onChange={(event) =>
                    updateConcepto(index, "monto", event.target.value)
                  }
                  required
                />
                <button type="button" onClick={() => removeConcepto(index)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="field">
          <label htmlFor="pago-observaciones">Observaciones</label>
          <textarea
            id="pago-observaciones"
            value={form.observaciones}
            onChange={(event) => updateField("observaciones", event.target.value)}
          />
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="form-actions">
          <button type="button" onClick={() => void handleReset()} disabled={saving}>
            Limpiar
          </button>
          <button type="submit" disabled={!canSubmit || saving}>
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
        </div>
      </form>

      {paymentSummary.length ? (
        <OperationResultCard title="Pago registrado" items={paymentSummary} />
      ) : null}
    </section>
  );
}

export default PagoCreatePage;

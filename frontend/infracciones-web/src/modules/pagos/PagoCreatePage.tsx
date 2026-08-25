import { useMemo, useState, type FormEvent } from "react";

import { OperationResultCard } from "../../components/operation/OperationResultCard";
import type {
  RegistrarNoAplicaPagoPayload,
  RegistrarPagoPayload,
} from "../../types/operaciones.types";
import { getResponseText } from "../../utils/response";
import { confirmAction } from "../../utils/sweetAlert";
import {
  dateTimeLocalToIso,
  formatDateTimeLocalInput,
} from "../../utils/timezone";
import {
  createEmptyPagoConceptoRow,
  type PagoConceptoFormRow,
} from "../infracciones/pago-conceptos-form";

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
  onSubmitNoAplica: (payload: RegistrarNoAplicaPagoPayload) => Promise<unknown>;
  initialIdInfraccion?: number | null;
}

function createInitialForm(initialIdInfraccion?: number | null) {
  return {
    idInfraccion: initialIdInfraccion ? String(initialIdInfraccion) : "",
    folioLineaCaptura: "",
    fechaPago: formatDateTimeLocalInput(),
    observaciones: "",
  };
}

type PagoFormState = ReturnType<typeof createInitialForm>;

function PagoCreatePage({
  initialIdInfraccion,
  onCompleted,
  onSubmit,
  onSubmitNoAplica,
}: PagoCreatePageProps) {
  const [form, setForm] = useState(() =>
    createInitialForm(initialIdInfraccion),
  );
  const [conceptos, setConceptos] = useState<PagoConceptoFormRow[]>([
    createEmptyPagoConceptoRow(),
  ]);
  const [noAplicaPago, setNoAplicaPago] = useState(false);
  const [motivoNoAplica, setMotivoNoAplica] = useState("");
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
    setNoAplicaPago(false);
    setMotivoNoAplica("");
    setError(null);
    setResult(null);
  }

  function toggleNoAplicaPago(): void {
    setNoAplicaPago((current) => !current);
    setMotivoNoAplica("");
    setError(null);
    setResult(null);
  }

  async function handleReset(): Promise<void> {
    const confirmed = await confirmAction({
      title: "Limpiar pago",
      text: `Se perderán los datos capturados para la infracción ${form.idInfraccion || "sin ID"}.`,
      confirmButtonText: "Limpiar",
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

    if (noAplicaPago) {
      if (motivoNoAplica.trim().length < 3) {
        return "Escribe el motivo por el que no aplica pago.";
      }

      return null;
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

    if (noAplicaPago) {
      const motivo = motivoNoAplica.trim();
      const confirmed = await confirmAction({
        title: "Solventar sin pago",
        text: `La infracción ${form.idInfraccion} quedará solventada sin línea de captura ni ingreso registrado. Motivo: ${motivo}`,
        confirmButtonText: "Confirmar no aplica pago",
        cancelButtonText: "Seguir editando",
      });

      if (!confirmed) {
        return;
      }

      setSaving(true);

      try {
        const response = await onSubmitNoAplica({
          idInfraccion: Number(form.idInfraccion),
          motivo,
        });
        setResult(response);
        setError(null);
        onCompleted();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Error desconocido al solventar la infracción sin pago.",
        );
      } finally {
        setSaving(false);
      }

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
        fechaPago: form.fechaPago ? dateTimeLocalToIso(form.fechaPago) : undefined,
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
  const noAplicaId = getResponseText(result, "idSolventacionSinPago");
  const operationId = paymentId ?? noAplicaId;
  const operationSummary = paymentId
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
    : noAplicaId
      ? [
          { label: "ID solventación", value: noAplicaId },
          {
            label: "Resultado",
            value: "No aplica pago",
          },
          {
            label: "Motivo",
            value: getResponseText(result, "motivo") ?? motivoNoAplica,
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
            Registra una línea de captura o solventa el expediente mediante No aplica pago cuando no se generó línea ni ingreso.
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

          {!noAplicaPago ? (
            <>
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
            </>
          ) : null}
        </div>

        {noAplicaPago ? (
          <div className="form-stack">
            <div className="notice">
              Esta opción solventa la infracción sin registrar pago ni ingreso. El motivo quedará asociado al usuario autenticado y al historial del expediente.
            </div>
            <div className="field">
              <label htmlFor="pago-no-aplica-motivo">Motivo *</label>
              <textarea
                id="pago-no-aplica-motivo"
                value={motivoNoAplica}
                onChange={(event) => {
                  setMotivoNoAplica(event.target.value);
                  setError(null);
                }}
                maxLength={1000}
                rows={5}
                placeholder="Describe por qué la infracción no generó línea de captura ni pago."
                required
              />
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="form-actions">
          <button type="button" onClick={() => void handleReset()} disabled={saving}>
            Limpiar
          </button>
          <button type="button" onClick={toggleNoAplicaPago} disabled={saving}>
            {noAplicaPago ? "Volver a registrar pago" : "No aplica pago"}
          </button>
          <button type="submit" disabled={!canSubmit || saving}>
            {saving
              ? "Guardando..."
              : noAplicaPago
                ? "Solventar sin pago"
                : "Registrar pago"}
          </button>
        </div>
      </form>

      {operationSummary.length ? (
        <OperationResultCard
          title={paymentId ? "Pago registrado" : "Infracción solventada sin pago"}
          result={result}
          emptyLabel="Sin resultado"
          copyValue={operationId}
          summary={operationSummary}
        />
      ) : null}
    </section>
  );
}

export default PagoCreatePage;

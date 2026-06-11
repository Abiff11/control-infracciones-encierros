import { useState, type FormEvent } from 'react';

import type { RegistrarPagoPayload } from '../infracciones/infracciones.types';

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return value;
}

interface PagoCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: RegistrarPagoPayload) => Promise<unknown>;
}

const INITIAL_FORM = {
  idInfraccion: '',
  folioPago: '',
  monto: '',
  fechaPago: getCurrentDateTimeLocal(),
  observaciones: '',
};

function PagoCreatePage({ onCompleted, onSubmit }: PagoCreatePageProps) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  function updateField(field: keyof typeof INITIAL_FORM, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm({
      ...INITIAL_FORM,
      fechaPago: getCurrentDateTimeLocal(),
    });
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await onSubmit({
        idInfraccion: Number(form.idInfraccion),
        folioPago: form.folioPago.trim(),
        monto: form.monto.trim(),
        fechaPago: form.fechaPago ? new Date(form.fechaPago).toISOString() : undefined,
        observaciones: toNullableString(form.observaciones) ?? null,
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Error desconocido al guardar el pago.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operación</p>
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
            <label htmlFor="pago-id-infraccion">ID infracción</label>
            <input
              id="pago-id-infraccion"
              type="number"
              min="1"
              value={form.idInfraccion}
              onChange={(event) => updateField('idInfraccion', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="pago-folio">Folio pago</label>
            <input
              id="pago-folio"
              value={form.folioPago}
              onChange={(event) => updateField('folioPago', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="pago-monto">Monto</label>
            <input
              id="pago-monto"
              value={form.monto}
              onChange={(event) => updateField('monto', event.target.value)}
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
              onChange={(event) => updateField('fechaPago', event.target.value)}
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="pago-observaciones">Observaciones</label>
            <textarea
              id="pago-observaciones"
              value={form.observaciones}
              onChange={(event) => updateField('observaciones', event.target.value)}
              rows={4}
            />
          </div>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar pago'}
          </button>
          <button className="button-secondary" type="button" onClick={resetForm}>
            Limpiar
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Resultado</p>
            <h2>Respuesta del backend</h2>
          </div>
        </div>

        <pre className="result-box">
          {result ? JSON.stringify(result, null, 2) : 'Sin respuesta aún.'}
        </pre>
      </section>
    </section>
  );
}

export default PagoCreatePage;

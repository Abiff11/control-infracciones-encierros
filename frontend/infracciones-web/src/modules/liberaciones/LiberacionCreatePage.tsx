import { useState, type FormEvent } from 'react';

import type { GenerarLiberacionPayload } from '../infracciones/infracciones.types';

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return value;
}

interface LiberacionCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: GenerarLiberacionPayload) => Promise<unknown>;
}

const INITIAL_FORM = {
  idInfraccion: '',
  idPagoInfraccion: '',
  folioLiberacion: '',
  liberadoPor: '',
  nombreRecibeLiberacion: '',
  fechaLiberacion: getCurrentDateTimeLocal(),
  observacion: '',
};

function LiberacionCreatePage({
  onCompleted,
  onSubmit,
}: LiberacionCreatePageProps) {
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
      fechaLiberacion: getCurrentDateTimeLocal(),
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
        idPagoInfraccion: Number(form.idPagoInfraccion),
        folioLiberacion: form.folioLiberacion.trim(),
        liberadoPor: form.liberadoPor.trim(),
        nombreRecibeLiberacion: form.nombreRecibeLiberacion.trim(),
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
          : 'Error desconocido al guardar la liberación.',
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
          <h1>Liberación</h1>
          <p className="page-description">
            Genera una liberación vehicular usando el usuario autenticado del JWT.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="liberacion-id-infraccion">ID infracción</label>
            <input
              id="liberacion-id-infraccion"
              type="number"
              min="1"
              value={form.idInfraccion}
              onChange={(event) => updateField('idInfraccion', event.target.value)}
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
                updateField('idPagoInfraccion', event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-folio">Folio liberación</label>
            <input
              id="liberacion-folio"
              value={form.folioLiberacion}
              onChange={(event) => updateField('folioLiberacion', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-liberado-por">Liberado por</label>
            <input
              id="liberacion-liberado-por"
              value={form.liberadoPor}
              onChange={(event) => updateField('liberadoPor', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-recibe">Nombre recibe</label>
            <input
              id="liberacion-recibe"
              value={form.nombreRecibeLiberacion}
              onChange={(event) =>
                updateField('nombreRecibeLiberacion', event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="liberacion-fecha">Fecha liberación</label>
            <input
              id="liberacion-fecha"
              type="datetime-local"
              value={form.fechaLiberacion}
              onChange={(event) => updateField('fechaLiberacion', event.target.value)}
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="liberacion-observacion">Observación</label>
            <textarea
              id="liberacion-observacion"
              value={form.observacion}
              onChange={(event) => updateField('observacion', event.target.value)}
              rows={4}
            />
          </div>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Generar liberación'}
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

export default LiberacionCreatePage;

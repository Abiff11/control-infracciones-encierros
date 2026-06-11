import { useState, type FormEvent } from 'react';

import type { RegistrarSalidaPayload } from '../infracciones/infracciones.types';

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return value;
}

interface SalidaCreatePageProps {
  onCompleted: () => void;
  onSubmit: (payload: RegistrarSalidaPayload) => Promise<unknown>;
}

const INITIAL_FORM = {
  idRetencionVehiculo: '',
  idLiberacionVehiculo: '',
  validadoPor: '',
  personaRecibeVehiculo: '',
  fechaSalida: getCurrentDateTimeLocal(),
  observacionesSalida: '',
  estadoSalida: '',
};

function SalidaCreatePage({ onCompleted, onSubmit }: SalidaCreatePageProps) {
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
      fechaSalida: getCurrentDateTimeLocal(),
    });
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await onSubmit({
        idRetencionVehiculo: Number(form.idRetencionVehiculo),
        idLiberacionVehiculo: Number(form.idLiberacionVehiculo),
        validadoPor: form.validadoPor.trim(),
        personaRecibeVehiculo: form.personaRecibeVehiculo.trim(),
        fechaSalida: form.fechaSalida ? new Date(form.fechaSalida).toISOString() : undefined,
        observacionesSalida:
          toNullableString(form.observacionesSalida) ?? null,
        estadoSalida: form.estadoSalida.trim(),
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Error desconocido al guardar la salida.',
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
          <h1>Salida</h1>
          <p className="page-description">
            Registra la entrega física del vehículo en el encierro.
          </p>
        </div>
      </header>

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="salida-id-retencion">ID retención</label>
            <input
              id="salida-id-retencion"
              type="number"
              min="1"
              value={form.idRetencionVehiculo}
              onChange={(event) =>
                updateField('idRetencionVehiculo', event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-id-liberacion">ID liberación</label>
            <input
              id="salida-id-liberacion"
              type="number"
              min="1"
              value={form.idLiberacionVehiculo}
              onChange={(event) =>
                updateField('idLiberacionVehiculo', event.target.value)
              }
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-validado-por">Validado por</label>
            <input
              id="salida-validado-por"
              value={form.validadoPor}
              onChange={(event) => updateField('validadoPor', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="salida-recibe">Persona recibe vehículo</label>
            <input
              id="salida-recibe"
              value={form.personaRecibeVehiculo}
              onChange={(event) =>
                updateField('personaRecibeVehiculo', event.target.value)
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
              onChange={(event) => updateField('fechaSalida', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="salida-estado">Estado salida</label>
            <input
              id="salida-estado"
              value={form.estadoSalida}
              onChange={(event) => updateField('estadoSalida', event.target.value)}
              required
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="salida-observaciones">Observaciones</label>
            <textarea
              id="salida-observaciones"
              value={form.observacionesSalida}
              onChange={(event) =>
                updateField('observacionesSalida', event.target.value)
              }
              rows={4}
            />
          </div>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar salida'}
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

export default SalidaCreatePage;

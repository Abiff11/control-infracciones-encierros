import { useState, type FormEvent } from 'react';

import type { CatalogosBundle } from '../catalogos/catalogos.types';
import type { RegistrarRetencionPayload } from '../infracciones/infracciones.types';

function getCurrentDateTimeLocal(): string {
  return new Date().toISOString().slice(0, 16);
}

function toNullableString(value: string): string | null | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  return value;
}

interface RetencionCreatePageProps {
  catalogs: CatalogosBundle | null;
  onCompleted: () => void;
  onSubmit: (payload: RegistrarRetencionPayload) => Promise<unknown>;
}

const INITIAL_FORM = {
  idInfraccion: '',
  idEncierro: '',
  fechaIngreso: getCurrentDateTimeLocal(),
  recibidoPor: '',
  folioResguardo: '',
  observacionesIngreso: '',
  estadoIngreso: '',
};

function RetencionCreatePage({
  catalogs,
  onCompleted,
  onSubmit,
}: RetencionCreatePageProps) {
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
      fechaIngreso: getCurrentDateTimeLocal(),
    });
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!catalogs) {
      setError('Los catálogos todavía no están disponibles.');
      return;
    }

    setSaving(true);

    try {
      const response = await onSubmit({
        idInfraccion: Number(form.idInfraccion),
        idEncierro: Number(form.idEncierro),
        fechaIngreso: form.fechaIngreso
          ? new Date(form.fechaIngreso).toISOString()
          : undefined,
        recibidoPor: form.recibidoPor.trim(),
        folioResguardo: toNullableString(form.folioResguardo) ?? null,
        observacionesIngreso:
          toNullableString(form.observacionesIngreso) ?? null,
        estadoIngreso: toNullableString(form.estadoIngreso) ?? null,
      });

      setResult(response);
      setError(null);
      onCompleted();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Error desconocido al guardar la retención.',
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
          <h1>Retención</h1>
          <p className="page-description">
            Registra el ingreso físico del vehículo al encierro.
          </p>
        </div>
      </header>

      {!catalogs ? <div className="notice">Cargando catálogos...</div> : null}

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="retencion-id-infraccion">ID infracción</label>
            <input
              id="retencion-id-infraccion"
              type="number"
              min="1"
              value={form.idInfraccion}
              onChange={(event) => updateField('idInfraccion', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="retencion-id-encierro">Encierro</label>
            <select
              id="retencion-id-encierro"
              value={form.idEncierro}
              onChange={(event) => updateField('idEncierro', event.target.value)}
              required
            >
              <option value="">Selecciona</option>
              {catalogs?.encierros.map((encierro) => (
                <option key={encierro.idEncierro} value={encierro.idEncierro}>
                  {encierro.nombreEncierro}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="retencion-fecha">Fecha ingreso</label>
            <input
              id="retencion-fecha"
              type="datetime-local"
              value={form.fechaIngreso}
              onChange={(event) => updateField('fechaIngreso', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="retencion-recibido-por">Recibido por</label>
            <input
              id="retencion-recibido-por"
              value={form.recibidoPor}
              onChange={(event) => updateField('recibidoPor', event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="retencion-folio">Folio resguardo</label>
            <input
              id="retencion-folio"
              value={form.folioResguardo}
              onChange={(event) => updateField('folioResguardo', event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="retencion-estado">Estado ingreso</label>
            <input
              id="retencion-estado"
              value={form.estadoIngreso}
              onChange={(event) => updateField('estadoIngreso', event.target.value)}
            />
          </div>

          <div className="field field-span-2">
            <label htmlFor="retencion-observaciones">Observaciones</label>
            <textarea
              id="retencion-observaciones"
              value={form.observacionesIngreso}
              onChange={(event) =>
                updateField('observacionesIngreso', event.target.value)
              }
              rows={4}
            />
          </div>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="button-row">
          <button className="button-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar retención'}
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

export default RetencionCreatePage;

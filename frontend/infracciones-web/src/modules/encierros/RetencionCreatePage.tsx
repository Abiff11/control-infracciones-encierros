import { useEffect, useState, type FormEvent } from 'react';

import { OperationResultCard } from '../../components/operation/OperationResultCard';
import type { CatalogosBundle } from '../catalogos/catalogos.types';
import { getResponseText } from '../../utils/response';
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

function isFilled(value: string): boolean {
  return value.trim() !== '';
}

interface RetencionCreatePageProps {
  catalogs: CatalogosBundle | null;
  initialIdInfraccion?: number | null;
  onCompleted: () => void;
  onSubmit: (payload: RegistrarRetencionPayload) => Promise<unknown>;
}

function createInitialForm(initialIdInfraccion?: number | null) {
  return {
    idInfraccion: initialIdInfraccion ? String(initialIdInfraccion) : '',
    idEncierro: '',
    fechaIngreso: getCurrentDateTimeLocal(),
    recibidoPor: '',
    folioResguardo: '',
    observacionesIngreso: '',
    estadoIngreso: '',
  };
}

type RetencionFormState = ReturnType<typeof createInitialForm>;

function RetencionCreatePage({
  catalogs,
  initialIdInfraccion,
  onCompleted,
  onSubmit,
}: RetencionCreatePageProps) {
  const [form, setForm] = useState<RetencionFormState>(() =>
    createInitialForm(initialIdInfraccion),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      idInfraccion: initialIdInfraccion ? String(initialIdInfraccion) : current.idInfraccion,
    }));
  }, [initialIdInfraccion]);

  function updateField(field: keyof RetencionFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function resetForm() {
    setForm(createInitialForm(initialIdInfraccion));
    setError(null);
    setResult(null);
  }

  function getValidationError(): string | null {
    if (!catalogs) {
      return 'Los catalogos todavia no estan disponibles.';
    }

    if (!isFilled(form.idInfraccion)) {
      return 'Ingresa el ID de infraccion.';
    }

    if (!isFilled(form.idEncierro)) {
      return 'Selecciona el encierro.';
    }

    if (!isFilled(form.recibidoPor)) {
      return 'Ingresa quien recibe la retencion.';
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
          : 'Error desconocido al guardar la retencion.',
      );
    } finally {
      setSaving(false);
    }
  }

  const retencionId = getResponseText(result, 'idRetencionVehiculo');
  const retencionSummary = retencionId
    ? [
        { label: 'ID retencion', value: retencionId },
        {
          label: 'Encierro',
          value: getResponseText(result, 'idEncierro') ?? 'Sin encierro',
        },
        {
          label: 'Recibio',
          value: getResponseText(result, 'recibidoPor') ?? 'Sin dato',
        },
      ]
    : [];
  const canSubmit =
    Boolean(catalogs) &&
    isFilled(form.idInfraccion) &&
    isFilled(form.idEncierro) &&
    isFilled(form.recibidoPor);

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operacion</p>
          <h1>Retencion</h1>
          <p className="page-description">
            Registra el ingreso fisico del vehiculo al encierro.
          </p>
        </div>
      </header>

      {!catalogs ? <div className="notice">Cargando catalogos...</div> : null}

      <form className="panel form-stack" onSubmit={handleSubmit}>
        <div className="form-grid form-grid-2">
          <div className="field">
            <label htmlFor="retencion-id-infraccion">ID infraccion</label>
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
          <button
            className="button-primary"
            type="submit"
            disabled={saving || !canSubmit}
          >
            {saving ? 'Guardando...' : 'Registrar retencion'}
          </button>
          <button className="button-secondary" type="button" onClick={resetForm}>
            Limpiar
          </button>
        </div>
      </form>

      <OperationResultCard
        title="Retencion registrada"
        description="El backend devuelve la retencion con el identificador para la salida."
        result={result}
        emptyLabel="Sin respuesta aun."
        copyValue={retencionId}
        summary={retencionSummary}
      />
    </section>
  );
}

export default RetencionCreatePage;

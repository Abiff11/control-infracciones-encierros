import { useState, type FormEvent } from 'react';

import { Card } from '../../components/ui/Card';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { JsonResult } from '../../components/ui/JsonResult';
import type { InfraccionFlujoResponse } from './infracciones.types';

interface FlujoOperativoPageProps {
  onSubmit: (idInfraccion: number) => Promise<InfraccionFlujoResponse>;
}

interface FlowSectionProps {
  title: string;
  description: string;
  value: unknown;
  emptyLabel: string;
}

function FlowSection({ description, emptyLabel, title, value }: FlowSectionProps) {
  return (
    <Card className="flow-card">
      <div className="page-stack">
        <header>
          <p className="section-label">Flujo</p>
          <h3>{title}</h3>
          <p className="page-description">{description}</p>
        </header>

        <JsonResult value={value} emptyLabel={emptyLabel} />
      </div>
    </Card>
  );
}

function FlujoOperativoPage({ onSubmit }: FlujoOperativoPageProps) {
  const [idInfraccion, setIdInfraccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfraccionFlujoResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedId = Number(idInfraccion);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError('Ingresa un ID de infraccion valido.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await onSubmit(parsedId);
      setResult(response);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Error desconocido al consultar el flujo.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Flujo operativo</h1>
          <p className="page-description">
            Consulta la infraccion y sus movimientos asociados en una sola vista.
          </p>
        </div>
      </header>

      <Card>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Field htmlFor="flujo-id-infraccion" label="ID infraccion">
            <TextInput
              id="flujo-id-infraccion"
              type="number"
              min="1"
              value={idInfraccion}
              onChange={(event) => {
                setIdInfraccion(event.target.value);
                setError(null);
              }}
              placeholder="1"
              required
            />
          </Field>

          <div className="button-row">
            <button className="button-primary" type="submit" disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar flujo'}
            </button>
          </div>
        </form>
      </Card>

      <ErrorMessage message={error} />

      {loading && !result ? <LoadingMessage message="Buscando flujo operativo..." /> : null}

      {result ? (
        <section className="flow-grid">
          <Card className="flow-card flow-card-wide">
            <div className="page-stack">
              <header>
                <p className="section-label">Infraccion</p>
                <h2>{result.infraccion.folioInfraccion}</h2>
                <p className="page-description">
                  {result.infraccion.infractor.nombre}{' '}
                  {result.infraccion.infractor.apellidoPaterno ?? ''}{' '}
                  {result.infraccion.infractor.apellidoMaterno ?? ''}
                </p>
              </header>

              <dl className="result-summary">
                <div className="result-summary-item">
                  <dt>Estatus</dt>
                  <dd>{result.infraccion.estatusInfraccion.nombreEstatus}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Motivos</dt>
                  <dd>{result.motivos.length}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Pagos</dt>
                  <dd>{result.pagos.length}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Liberaciones</dt>
                  <dd>{result.liberaciones.length}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Retenciones</dt>
                  <dd>{result.retenciones.length}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Salidas</dt>
                  <dd>{result.salidas.length}</dd>
                </div>
                <div className="result-summary-item">
                  <dt>Movimientos</dt>
                  <dd>{result.movimientos.length}</dd>
                </div>
              </dl>

              <JsonResult value={result.infraccion} emptyLabel="Sin infraccion." />
            </div>
          </Card>

          <FlowSection
            title="Motivos"
            description="Motivos asociados a la infraccion."
            value={result.motivos}
            emptyLabel="Sin motivos registrados."
          />

          <FlowSection
            title="Pagos"
            description="Pagos vinculados a la infraccion."
            value={result.pagos}
            emptyLabel="Sin pagos registrados."
          />

          <FlowSection
            title="Liberaciones"
            description="Liberaciones generadas para la infraccion."
            value={result.liberaciones}
            emptyLabel="Sin liberaciones registradas."
          />

          <FlowSection
            title="Retenciones"
            description="Retenciones asociadas al encierro."
            value={result.retenciones}
            emptyLabel="Sin retenciones registradas."
          />

          <FlowSection
            title="Salidas"
            description="Salidas registradas para la infraccion."
            value={result.salidas}
            emptyLabel="Sin salidas registradas."
          />

          <FlowSection
            title="Movimientos"
            description="Historial completo de acciones operativas."
            value={result.movimientos}
            emptyLabel="Sin movimientos registrados."
          />
        </section>
      ) : null}
    </section>
  );
}

export default FlujoOperativoPage;

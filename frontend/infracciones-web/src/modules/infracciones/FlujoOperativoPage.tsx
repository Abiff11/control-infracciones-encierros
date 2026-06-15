import { useState, type FormEvent, type ReactNode } from 'react';

import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { Field, TextInput } from '../../components/ui/Field';
import { LoadingMessage } from '../../components/ui/LoadingMessage';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Timeline } from '../../components/ui/Timeline';
import {
  formatCurrencyMxn,
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from '../../lib/formatters';
import type { InfraccionFlujoResponse } from './infracciones.types';
import './FlujoOperativoPage.css';

interface FlujoOperativoPageProps {
  onSubmit: (folioInfraccion: string) => Promise<InfraccionFlujoResponse>;
}

type AnyRecord = Record<string, unknown>;
type StepState = 'done' | 'pending' | 'current';

interface FlowStep {
  label: string;
  title: string;
  description: string;
  state: StepState;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readPath(value: unknown, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[key];
  }, value);
}

function readString(value: unknown, path: string[]): string | null {
  const rawValue = readPath(value, path);

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }

  if (rawValue instanceof Date) {
    return rawValue.toISOString();
  }

  if (typeof rawValue === 'string') {
    return rawValue;
  }

  if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
    return String(rawValue);
  }

  return null;
}

function getFolio(result: InfraccionFlujoResponse): string {
  return readString(result, ['infraccion', 'folioInfraccion']) ?? 'Sin folio registrado';
}

function getInfractorName(result: InfraccionFlujoResponse): string {
  return formatFullName([
    readString(result, ['infraccion', 'infractor', 'nombre']),
    readString(result, ['infraccion', 'infractor', 'apellidoPaterno']),
    readString(result, ['infraccion', 'infractor', 'apellidoMaterno']),
  ]);
}

function getVehiculoLabel(result: InfraccionFlujoResponse): string {
  const marca = readString(result, [
    'infraccion',
    'vehiculo',
    'lineaVehiculo',
    'marcaVehiculo',
    'nombreMarcaVehiculo',
  ]);
  const linea = readString(result, ['infraccion', 'vehiculo', 'lineaVehiculo', 'nombreLineaVehiculo']);
  const clase = readString(result, ['infraccion', 'vehiculo', 'claseVehiculo', 'nombreClaseVehiculo']);
  const parts = [marca, linea, clase].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(' - ') : 'Sin informacion registrada';
}

function getEstatus(result: InfraccionFlujoResponse): string {
  return (
    readString(result, ['infraccion', 'estatusInfraccion', 'nombreEstatus']) ??
    readString(result, ['estatusInfraccion', 'nombreEstatus']) ??
    'Sin estatus registrado'
  );
}

function getEstadoOperativo(result: InfraccionFlujoResponse): string | null {
  return readString(result, ['estadoOperativoCalculado']);
}

function getFirst(items: unknown[]): unknown | null {
  return items.length > 0 ? items[0] : null;
}

function buildFlowSteps(result: InfraccionFlujoResponse): FlowStep[] {
  const retenciones = asArray(result.retenciones);
  const pagos = asArray(result.pagos);
  const liberaciones = asArray(result.liberaciones);
  const salidas = asArray(result.salidas);
  const retencion = getFirst(retenciones);
  const pago = getFirst(pagos);
  const liberacion = getFirst(liberaciones);
  const salida = getFirst(salidas);

  return [
    {
      label: 'Captura',
      title: getFolio(result),
      description: `${formatDate(readString(result, ['infraccion', 'fechaInfraccion']))} · ${formatTimeOfDay(
        readString(result, ['infraccion', 'horaInfraccion']),
      )}`,
      state: 'done',
    },
    {
      label: 'Retencion',
      title: retencion
        ? readString(retencion, ['encierro', 'nombreEncierro']) ?? 'Vehiculo retenido'
        : 'Sin retencion',
      description: retencion
        ? formatDateTime(readString(retencion, ['fechaIngreso']))
        : 'Pendiente de registrar',
      state: retencion ? 'done' : 'pending',
    },
    {
      label: 'Pago',
      title: pago ? readString(pago, ['folioPago']) ?? 'Pago registrado' : 'Sin pago',
      description: pago
        ? `${formatCurrencyMxn(readString(pago, ['monto']))} · ${formatDateTime(
            readString(pago, ['fechaPago']),
          )}`
        : 'Pendiente de registrar',
      state: pago ? 'done' : retencion ? 'current' : 'pending',
    },
    {
      label: 'Liberacion',
      title: liberacion
        ? readString(liberacion, ['folioLiberacion']) ?? 'Liberacion registrada'
        : 'Sin liberacion',
      description: liberacion
        ? formatDateTime(readString(liberacion, ['fechaLiberacion']))
        : 'Pendiente de generar',
      state: liberacion ? 'done' : pago ? 'current' : 'pending',
    },
    {
      label: 'Salida',
      title: salida ? readString(salida, ['estadoSalida']) ?? 'Salida registrada' : 'Sin salida',
      description: salida
        ? formatDateTime(readString(salida, ['fechaSalida']))
        : 'Pendiente de entrega',
      state: salida ? 'done' : liberacion ? 'current' : 'pending',
    },
  ];
}

function FlowStepCard({ step }: { step: FlowStep }) {
  return (
    <article className={`flow-step-card flow-step-card-${step.state}`}>
      <p className="flow-step-label">{step.label}</p>
      <strong>{step.title}</strong>
      <span>{step.description}</span>
    </article>
  );
}

function FlowDiagram({ steps }: { steps: FlowStep[] }) {
  return (
    <div className="flow-diagram" aria-label="Flujo operativo visual">
      {steps.map((step, index) => (
        <div key={step.label} className="flow-diagram-node">
          <FlowStepCard step={step} />
          {index < steps.length - 1 ? <span className="flow-arrow">→</span> : null}
        </div>
      ))}
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="result-summary-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-item">
      <p className="info-label">{label}</p>
      <p className="info-value">{value}</p>
    </div>
  );
}

function MotivosPanel({ motivos }: { motivos: unknown[] }) {
  if (motivos.length === 0) {
    return <EmptyState title="Sin motivos registrados." />;
  }

  return (
    <div className="motivo-grid">
      {motivos.map((motivo, index) => (
        <article key={index} className="motivo-card">
          <strong>{readString(motivo, ['motivo', 'nombreMotivo']) ?? readString(motivo, ['nombreMotivo'])}</strong>
          <span>
            {formatEmptyValue(
              readString(motivo, ['motivo', 'descripcionMotivo']) ??
                readString(motivo, ['descripcionMotivo']),
            )}
          </span>
        </article>
      ))}
    </div>
  );
}

function OperativeCards({
  emptyLabel,
  items,
  renderItem,
}: {
  emptyLabel: string;
  items: unknown[];
  renderItem: (item: unknown, index: number) => ReactNode;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyLabel} />;
  }

  return <div className="flow-card-grid">{items.map(renderItem)}</div>;
}

function FlujoOperativoPage({ onSubmit }: FlujoOperativoPageProps) {
  const [folioInfraccion, setFolioInfraccion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfraccionFlujoResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFolio = folioInfraccion.trim();

    if (!normalizedFolio) {
      setError('Ingresa un folio de infraccion valido.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await onSubmit(normalizedFolio);
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

  const motivos = result ? asArray(result.motivos) : [];
  const pagos = result ? asArray(result.pagos) : [];
  const liberaciones = result ? asArray(result.liberaciones) : [];
  const retenciones = result ? asArray(result.retenciones) : [];
  const salidas = result ? asArray(result.salidas) : [];
  const movimientos = result ? asArray(result.movimientos) : [];
  const estadoOperativo = result ? getEstadoOperativo(result) : null;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Flujo operativo</h1>
          <p className="page-description">
            Consulta el expediente por folio y revisa su avance operativo visualmente.
          </p>
        </div>
      </header>

      <Card>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Field htmlFor="flujo-folio-infraccion" label="Folio infraccion">
            <TextInput
              id="flujo-folio-infraccion"
              type="text"
              value={folioInfraccion}
              onChange={(event) => {
                setFolioInfraccion(event.target.value);
                setError(null);
              }}
              placeholder="117251"
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
        <section className="page-stack">
          <Card className="flow-visual-card">
            <div className="page-stack">
              <div className="detail-hero-top">
                <div className="detail-hero-copy">
                  <p className="section-label">Expediente operativo</p>
                  <h2>{getFolio(result)}</h2>
                  <p className="detail-hero-name">{getInfractorName(result)}</p>
                  <div className="detail-hero-subline">
                    <span>Fecha: {formatDate(readString(result, ['infraccion', 'fechaInfraccion']))}</span>
                    <span>Hora: {formatTimeOfDay(readString(result, ['infraccion', 'horaInfraccion']))}</span>
                    <span>
                      Placas: {formatEmptyValue(readString(result, ['infraccion', 'vehiculo', 'placas']))}
                    </span>
                    <span>Vehiculo: {getVehiculoLabel(result)}</span>
                  </div>
                </div>

                <div className="detail-hero-status">
                  {estadoOperativo ? <StatusBadge value={estadoOperativo} /> : null}
                  <p className="detail-hero-status-label">Estado operativo</p>
                </div>
              </div>

              <dl className="result-summary">
                <SummaryMetric label="Estatus" value={getEstatus(result)} />
                <SummaryMetric label="Motivos" value={motivos.length} />
                <SummaryMetric label="Pagos" value={pagos.length} />
                <SummaryMetric label="Liberaciones" value={liberaciones.length} />
                <SummaryMetric label="Retenciones" value={retenciones.length} />
                <SummaryMetric label="Salidas" value={salidas.length} />
                <SummaryMetric label="Movimientos" value={movimientos.length} />
              </dl>

              <FlowDiagram steps={buildFlowSteps(result)} />
            </div>
          </Card>

          <div className="flow-dashboard-grid">
            <Card className="flow-card flow-card-wide">
              <div className="page-stack">
                <header>
                  <p className="section-label">Datos generales</p>
                  <h3>Resumen del expediente</h3>
                  <p className="page-description">
                    Identificacion visual del expediente. El identificador interno queda oculto.
                  </p>
                </header>

                <div className="info-grid info-grid-3">
                  <SmallInfo label="Folio infraccion" value={getFolio(result)} />
                  <SmallInfo label="Estatus" value={getEstatus(result)} />
                  <SmallInfo
                    label="Clave policia"
                    value={formatEmptyValue(readString(result, ['infraccion', 'clavePolicia']))}
                  />
                  <SmallInfo label="Infractor" value={getInfractorName(result)} />
                  <SmallInfo
                    label="Licencia"
                    value={formatEmptyValue(readString(result, ['infraccion', 'infractor', 'licencia']))}
                  />
                  <SmallInfo
                    label="Placas"
                    value={formatEmptyValue(readString(result, ['infraccion', 'vehiculo', 'placas']))}
                  />
                </div>
              </div>
            </Card>

            <Card className="flow-card">
              <div className="page-stack">
                <header>
                  <p className="section-label">Motivos</p>
                  <h3>Motivos capturados</h3>
                </header>
                <MotivosPanel motivos={motivos} />
              </div>
            </Card>

            <Card className="flow-card">
              <div className="page-stack">
                <header>
                  <p className="section-label">Retencion</p>
                  <h3>Ingreso a encierro</h3>
                </header>
                <OperativeCards
                  emptyLabel="Sin retenciones registradas."
                  items={retenciones}
                  renderItem={(retencion, index) => (
                    <article key={index} className="flow-mini-card">
                      <strong>{readString(retencion, ['encierro', 'nombreEncierro']) ?? 'Encierro no registrado'}</strong>
                      <span>{formatDateTime(readString(retencion, ['fechaIngreso']))}</span>
                      <span>Folio resguardo: {formatEmptyValue(readString(retencion, ['folioResguardo']))}</span>
                      <span>Estado ingreso: {formatEmptyValue(readString(retencion, ['estadoIngreso']))}</span>
                    </article>
                  )}
                />
              </div>
            </Card>

            <Card className="flow-card">
              <div className="page-stack">
                <header>
                  <p className="section-label">Pagos</p>
                  <h3>Pagos registrados</h3>
                </header>
                <OperativeCards
                  emptyLabel="Sin pagos registrados."
                  items={pagos}
                  renderItem={(pago, index) => (
                    <article key={index} className="flow-mini-card">
                      <strong>{readString(pago, ['folioPago']) ?? 'Pago registrado'}</strong>
                      <span>{formatCurrencyMxn(readString(pago, ['monto']))}</span>
                      <span>{formatDateTime(readString(pago, ['fechaPago']))}</span>
                      <span>{formatEmptyValue(readString(pago, ['observaciones']))}</span>
                    </article>
                  )}
                />
              </div>
            </Card>

            <Card className="flow-card">
              <div className="page-stack">
                <header>
                  <p className="section-label">Liberacion</p>
                  <h3>Liberaciones</h3>
                </header>
                <OperativeCards
                  emptyLabel="Sin liberaciones registradas."
                  items={liberaciones}
                  renderItem={(liberacion, index) => (
                    <article key={index} className="flow-mini-card">
                      <strong>{readString(liberacion, ['folioLiberacion']) ?? 'Liberacion registrada'}</strong>
                      <span>{formatDateTime(readString(liberacion, ['fechaLiberacion']))}</span>
                      <span>Liberado por: {formatEmptyValue(readString(liberacion, ['liberadoPor']))}</span>
                      <span>
                        Recibe: {formatEmptyValue(readString(liberacion, ['nombreRecibeLiberacion']))}
                      </span>
                    </article>
                  )}
                />
              </div>
            </Card>

            <Card className="flow-card">
              <div className="page-stack">
                <header>
                  <p className="section-label">Salida</p>
                  <h3>Entrega del vehiculo</h3>
                </header>
                <OperativeCards
                  emptyLabel="Sin salidas registradas."
                  items={salidas}
                  renderItem={(salida, index) => (
                    <article key={index} className="flow-mini-card">
                      <strong>{readString(salida, ['estadoSalida']) ?? 'Salida registrada'}</strong>
                      <span>{formatDateTime(readString(salida, ['fechaSalida']))}</span>
                      <span>Validado por: {formatEmptyValue(readString(salida, ['validadoPor']))}</span>
                      <span>
                        Recibe: {formatEmptyValue(readString(salida, ['personaRecibeVehiculo']))}
                      </span>
                    </article>
                  )}
                />
              </div>
            </Card>

            <Card className="flow-card flow-card-wide">
              <div className="page-stack">
                <header>
                  <p className="section-label">Movimientos</p>
                  <h3>Linea de tiempo operativa</h3>
                </header>
                {movimientos.length === 0 ? (
                  <EmptyState title="Sin movimientos registrados." />
                ) : (
                  <Timeline
                    items={movimientos.map((movimiento, index) => ({
                      id: index,
                      title: formatDateTime(readString(movimiento, ['fechaMovimiento'])),
                      meta: (
                        <StatusBadge
                          value={
                            readString(movimiento, ['estatusInfraccion', 'nombreEstatus']) ??
                            readString(movimiento, ['estatus']) ??
                            'Movimiento'
                          }
                          compact
                        />
                      ),
                      description: (
                        <div className="info-grid info-grid-3">
                          <SmallInfo
                            label="Accion"
                            value={formatEmptyValue(readString(movimiento, ['accion']))}
                          />
                          <SmallInfo
                            label="Usuario"
                            value={formatEmptyValue(
                              readString(movimiento, ['usuario', 'nombreUsuario']) ??
                                readString(movimiento, ['usuario']),
                            )}
                          />
                          <SmallInfo
                            label="Observaciones"
                            value={formatEmptyValue(readString(movimiento, ['observaciones']))}
                          />
                        </div>
                      ),
                    }))}
                  />
                )}
              </div>
            </Card>
          </div>
        </section>
      ) : null}
    </section>
  );
}

export default FlujoOperativoPage;

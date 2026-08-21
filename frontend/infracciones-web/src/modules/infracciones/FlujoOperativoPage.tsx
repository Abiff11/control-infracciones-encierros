import { useState, type FormEvent } from "react";

import { Card } from "../../components/ui/Card";
import { ErrorMessage } from "../../components/ui/ErrorMessage";
import { Field, TextInput } from "../../components/ui/Field";
import { LoadingMessage } from "../../components/ui/LoadingMessage";
import { StatusBadge } from "../../components/ui/StatusBadge";
import {
  formatDate,
  formatDateTime,
  formatEmptyValue,
  formatFullName,
  formatTimeOfDay,
} from "../../utils/formatters";
import type { InfraccionFlujoResponse } from "../../types/infracciones.types";
import "./FlujoOperativoPage.css";

interface FlujoOperativoPageProps {
  onSubmit: (folioInfraccion: string) => Promise<InfraccionFlujoResponse>;
}

type AnyRecord = Record<string, unknown>;
type StepState = "done" | "pending" | "current";

interface FlowStep {
  label: string;
  title: string;
  description: string;
  state: StepState;
}

interface NextAction {
  title: string;
  description: string;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return null;
  }

  if (rawValue instanceof Date) {
    return rawValue.toISOString();
  }

  if (typeof rawValue === "string") {
    return rawValue;
  }

  if (typeof rawValue === "number" || typeof rawValue === "boolean") {
    return String(rawValue);
  }

  return null;
}

function getFolio(result: InfraccionFlujoResponse): string {
  return (
    readString(result, ["infraccion", "folioInfraccion"]) ??
    "Sin folio registrado"
  );
}

function getInfractorName(result: InfraccionFlujoResponse): string {
  return formatFullName([
    readString(result, ["infraccion", "infractor", "nombre"]),
    readString(result, ["infraccion", "infractor", "apellidoPaterno"]),
    readString(result, ["infraccion", "infractor", "apellidoMaterno"]),
  ]);
}

function getVehiculoLabel(result: InfraccionFlujoResponse): string {
  const marca = readString(result, [
    "infraccion",
    "vehiculo",
    "lineaVehiculo",
    "marcaVehiculo",
    "nombreMarcaVehiculo",
  ]);
  const linea = readString(result, [
    "infraccion",
    "vehiculo",
    "lineaVehiculo",
    "nombreLineaVehiculo",
  ]);
  const clase = readString(result, [
    "infraccion",
    "vehiculo",
    "claseVehiculo",
    "nombreClaseVehiculo",
  ]);
  const parts = [marca, linea, clase].filter((value): value is string =>
    Boolean(value),
  );

  return parts.length > 0 ? parts.join(" - ") : "Sin informacion registrada";
}

function getEstatus(result: InfraccionFlujoResponse): string {
  return (
    readString(result, ["infraccion", "estatusInfraccion", "nombreEstatus"]) ??
    readString(result, ["estatusInfraccion", "nombreEstatus"]) ??
    "Sin estatus registrado"
  );
}

function getEstadoOperativo(result: InfraccionFlujoResponse): string | null {
  return (
    readString(result, ["infraccion", "estadoOperativoCalculado"]) ??
    readString(result, ["estadoOperativoCalculado"])
  );
}

function getPermiteRetencion(result: InfraccionFlujoResponse): boolean {
  const rawValue = readPath(result, [
    "infraccion",
    "tipoProcedimiento",
    "permiteRetencion",
  ]);

  return rawValue === true || rawValue === 1 || rawValue === "true" || rawValue === "1";
}

function getFirst(items: unknown[]): unknown | null {
  return items.length > 0 ? items[0] : null;
}

function buildFlowSteps(result: InfraccionFlujoResponse): FlowStep[] {
  const permiteRetencion = getPermiteRetencion(result);
  const retenciones = asArray(result.retenciones);
  const pagos = asArray(result.pagos);
  const liberaciones = asArray(result.liberaciones);
  const salidas = asArray(result.salidas);
  const retencion = getFirst(retenciones);
  const pago = getFirst(pagos);
  const liberacion = getFirst(liberaciones);
  const salida = getFirst(salidas);
  const capturaStep: FlowStep = {
    label: "Captura",
    title: getFolio(result),
    description: `${formatDate(readString(result, ["infraccion", "fechaInfraccion"]))} · ${formatTimeOfDay(
      readString(result, ["infraccion", "horaInfraccion"]),
    )}`,
    state: "done",
  };
  const pagoStep: FlowStep = {
    label: "Pago",
    title: pago
      ? (readString(pago, ["folioPago"]) ?? "Registrado")
      : "Pendiente",
    description: pago
      ? formatDateTime(readString(pago, ["fechaPago"]))
      : "Registrar pago",
    state: pago ? "done" : permiteRetencion && !retencion ? "pending" : "current",
  };

  if (!permiteRetencion) {
    return [capturaStep, pagoStep];
  }

  return [
    capturaStep,
    {
      label: "Retencion",
      title: retencion
        ? (readString(retencion, ["encierro", "nombreEncierro"]) ??
          "Registrada")
        : "Pendiente",
      description: retencion
        ? formatDateTime(readString(retencion, ["fechaIngreso"]))
        : "Registrar ingreso a encierro",
      state: retencion ? "done" : "current",
    },
    pagoStep,
    {
      label: "Liberacion",
      title: liberacion
        ? (readString(liberacion, ["folioLiberacion"]) ?? "Registrada")
        : "Pendiente",
      description: liberacion
        ? formatDateTime(readString(liberacion, ["fechaLiberacion"]))
        : "Generar liberacion",
      state: liberacion ? "done" : pago ? "current" : "pending",
    },
    {
      label: "Salida",
      title: salida ? "Entregado" : "Pendiente",
      description: salida
        ? formatDateTime(readString(salida, ["fechaSalida"]))
        : "Registrar salida",
      state: salida ? "done" : liberacion ? "current" : "pending",
    },
  ];
}

function getNextAction(result: InfraccionFlujoResponse): NextAction {
  const permiteRetencion = getPermiteRetencion(result);
  const retenciones = asArray(result.retenciones);
  const pagos = asArray(result.pagos);
  const liberaciones = asArray(result.liberaciones);
  const salidas = asArray(result.salidas);

  if (!permiteRetencion) {
    if (pagos.length === 0) {
      return {
        title: "Registrar pago",
        description: "El expediente no requiere ingreso a encierro y no tiene pago registrado.",
      };
    }

    return {
      title: "Flujo completo",
      description: "Pago registrado. El expediente no requiere liberacion ni salida de encierro.",
    };
  }

  if (retenciones.length === 0) {
    return {
      title: "Registrar retencion",
      description: "El vehiculo aun no tiene ingreso a encierro.",
    };
  }

  if (pagos.length === 0) {
    return {
      title: "Registrar pago",
      description: "El vehiculo esta retenido y no tiene pago registrado.",
    };
  }

  if (liberaciones.length === 0) {
    return {
      title: "Generar liberacion",
      description: "Ya existe pago; falta liberar el vehiculo.",
    };
  }

  if (salidas.length === 0) {
    return {
      title: "Registrar salida",
      description: "El vehiculo esta liberado; falta registrar la entrega.",
    };
  }

  return {
    title: "Flujo completo",
    description: "El vehiculo ya fue entregado.",
  };
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
          {index < steps.length - 1 ? (
            <span className="flow-arrow">→</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MotivoChips({ motivos }: { motivos: unknown[] }) {
  if (motivos.length === 0) {
    return <span className="flow-muted-text">Sin motivos registrados</span>;
  }

  return (
    <div className="motivo-chip-row">
      {motivos.map((motivo, index) => {
        const nombre =
          readString(motivo, ["motivo", "nombreMotivo"]) ??
          readString(motivo, ["nombreMotivo"]);
        const descripcion =
          readString(motivo, ["motivo", "descripcionMotivo"]) ??
          readString(motivo, ["descripcionMotivo"]);

        return (
          <span key={`${nombre ?? "motivo"}-${index}`} className="motivo-chip">
            {nombre
              ? `${nombre} ${descripcion ? `· ${descripcion}` : ""}`
              : "Motivo registrado"}
          </span>
        );
      })}
    </div>
  );
}

function FlujoOperativoPage({ onSubmit }: FlujoOperativoPageProps) {
  const [folioInfraccion, setFolioInfraccion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InfraccionFlujoResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedFolio = folioInfraccion.trim();

    if (!normalizedFolio) {
      setError("Ingresa un folio de infraccion valido.");
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
          : "Error desconocido al consultar el flujo.",
      );
    } finally {
      setLoading(false);
    }
  }

  const motivos = result ? asArray(result.motivos) : [];
  const estadoOperativo = result ? getEstadoOperativo(result) : null;
  const nextAction = result ? getNextAction(result) : null;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Flujo operativo</h1>
          <p className="page-description">
            Consulta el expediente por folio y revisa solo el estado operativo
            esencial.
          </p>
        </div>
      </header>

      <Card>
        <form className="flow-search-form" onSubmit={handleSubmit}>
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

          <button className="button-primary" type="submit" disabled={loading}>
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </form>
      </Card>

      <ErrorMessage message={error} />

      {loading && !result ? (
        <LoadingMessage message="Buscando flujo operativo..." />
      ) : null}

      {result ? (
        <Card className="flow-visual-card">
          <div className="page-stack">
            <div className="flow-hero">
              <div>
                <p className="section-label">Expediente</p>
                <h2>{getFolio(result)}</h2>
                <p className="detail-hero-name">{getInfractorName(result)}</p>
                <div className="detail-hero-subline">
                  <span>
                    {formatDate(
                      readString(result, ["infraccion", "fechaInfraccion"]),
                    )}
                  </span>
                  <span>
                    {formatTimeOfDay(
                      readString(result, ["infraccion", "horaInfraccion"]),
                    )}
                  </span>
                  <span>
                    Placas:{" "}
                    {formatEmptyValue(
                      readString(result, ["infraccion", "vehiculo", "placas"]),
                    )}
                  </span>
                  <span>{getVehiculoLabel(result)}</span>
                </div>
              </div>

              <div className="flow-hero-status">
                <p className="section-label">Estado actual</p>
                {estadoOperativo ? (
                  <StatusBadge value={estadoOperativo} />
                ) : (
                  <strong>{getEstatus(result)}</strong>
                )}
              </div>
            </div>

            <FlowDiagram steps={buildFlowSteps(result)} />

            <div className="flow-bottom-grid">
              <section className="flow-next-action">
                <p className="section-label">Siguiente accion</p>
                <strong>{nextAction?.title}</strong>
                <span>{nextAction?.description}</span>
              </section>

              <section className="flow-essential-card">
                <p className="section-label">Motivos</p>
                <MotivoChips motivos={motivos} />
              </section>
            </div>
          </div>
        </Card>
      ) : null}
    </section>
  );
}

export default FlujoOperativoPage;

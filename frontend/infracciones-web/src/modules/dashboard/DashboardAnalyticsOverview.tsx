import type {
  DashboardAgrupacion,
  DashboardAnaliticaResumenResponse,
  DashboardInfraccionesTendenciaResponse,
} from "../../types/dashboard.types";
import { DashboardTrendLineChart } from "./DashboardTrendLineChart";

import "./DashboardAnalyticsOverview.css";

interface DashboardAnalyticsOverviewProps {
  agrupacion: DashboardAgrupacion;
  loading: boolean;
  resumen: DashboardAnaliticaResumenResponse | null;
  tendencia: DashboardInfraccionesTendenciaResponse | null;
}

interface AnalyticMetricProps {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "orange" | "green" | "purple" | "teal" | "red";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatVariation(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Sin periodo anterior comparable";
  }

  if (value === 0) {
    return "Sin cambio vs periodo anterior";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}% vs periodo anterior`;
}

function AnalyticMetric({ label, value, helper, tone }: AnalyticMetricProps) {
  return (
    <article className={`dashboard-analytic-metric dashboard-analytic-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

export function DashboardAnalyticsOverview({
  agrupacion,
  loading,
  resumen,
  tendencia,
}: DashboardAnalyticsOverviewProps) {
  const latestTrend = tendencia?.series.at(-1);

  return (
    <section className="dashboard-analytic-overview" aria-label="Analitica de infracciones">
      <div className="dashboard-section-heading">
        <div>
          <p className="section-label">Analitica</p>
          <h2>Infracciones y variantes</h2>
        </div>
        <span>{agrupacion === "mes" ? "Tendencia mensual" : `Agrupado por ${agrupacion}`}</span>
      </div>

      <div className="dashboard-analytic-kpis">
        <AnalyticMetric
          tone="blue"
          label="Infracciones"
          value={formatNumber(resumen?.expedientes.totalInfracciones ?? 0)}
          helper={formatVariation(latestTrend?.variacionVsPeriodoAnteriorPct.totalInfracciones)}
        />
        <AnalyticMetric
          tone="orange"
          label="Con retencion"
          value={formatNumber(resumen?.expedientes.infraccionesConRetencion ?? 0)}
          helper={formatVariation(latestTrend?.variacionVsPeriodoAnteriorPct.conRetencion)}
        />
        <AnalyticMetric
          tone="green"
          label="Sin retencion"
          value={formatNumber(resumen?.expedientes.infraccionesSinRetencion ?? 0)}
          helper={formatVariation(latestTrend?.variacionVsPeriodoAnteriorPct.sinRetencion)}
        />
        <AnalyticMetric
          tone="purple"
          label="Vehiculos sin infraccion"
          value={formatNumber(resumen?.expedientes.vehiculosSinInfraccion ?? 0)}
          helper={formatVariation(latestTrend?.variacionVsPeriodoAnteriorPct.vehiculosSinInfraccion)}
        />
        <AnalyticMetric
          tone="teal"
          label="Actualmente en encierro"
          value={formatNumber(resumen?.expedientes.vehiculosActualmenteEnEncierro ?? 0)}
          helper="Retencion registrada y sin salida"
        />
        <AnalyticMetric
          tone="red"
          label="INFRACCIÓN SIN RETENCIÓN"
          value={formatNumber(resumen?.expedientes.tipoInfraccionSinRetencion ?? 0)}
          helper="Tipo de expediente registrado"
        />
      </div>

      <article className="dashboard-panel dashboard-analytic-trend-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="section-label">Tendencia</p>
            <h2>Tendencia de infracciones y variantes</h2>
          </div>
          <span>{agrupacion === "mes" ? "Meses en eje horizontal" : "Periodo en eje horizontal"}</span>
        </div>

        {loading ? (
          <div className="dashboard-trend-empty">Actualizando tendencia...</div>
        ) : (
          <DashboardTrendLineChart
            agrupacion={agrupacion}
            data={tendencia?.series ?? []}
          />
        )}
      </article>
    </section>
  );
}

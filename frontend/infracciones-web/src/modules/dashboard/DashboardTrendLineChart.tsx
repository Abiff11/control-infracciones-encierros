import type {
  DashboardAgrupacion,
  DashboardInfraccionesTendenciaItem,
} from "../../types/dashboard.types";

import "./DashboardTrendLineChart.css";

interface DashboardTrendLineChartProps {
  agrupacion: DashboardAgrupacion;
  data: DashboardInfraccionesTendenciaItem[];
}

interface TrendSeriesDefinition {
  key: "totalInfracciones" | "conRetencion" | "sinRetencion" | "vehiculosSinInfraccion";
  label: string;
  className: string;
}

const SERIES: TrendSeriesDefinition[] = [
  { key: "totalInfracciones", label: "Infracciones totales", className: "dashboard-trend-series-total" },
  { key: "conRetencion", label: "Con retencion", className: "dashboard-trend-series-retencion" },
  { key: "sinRetencion", label: "Sin retencion", className: "dashboard-trend-series-sin-retencion" },
  { key: "vehiculosSinInfraccion", label: "Vehiculos sin infraccion", className: "dashboard-trend-series-sin-infraccion" },
];

const WIDTH = 1040;
const HEIGHT = 360;
const PADDING_LEFT = 64;
const PADDING_RIGHT = 28;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 62;
const GRID_LINES = 4;

function formatPeriodLabel(value: string, agrupacion: DashboardAgrupacion): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (agrupacion === "anio") {
    return new Intl.DateTimeFormat("es-MX", { year: "numeric" }).format(date);
  }
  if (agrupacion === "dia") {
    return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function getMaxValue(data: DashboardInfraccionesTendenciaItem[]): number {
  return Math.max(1, ...data.flatMap((item) => SERIES.map((series) => Number(item[series.key]) || 0)));
}

function getX(index: number, total: number): number {
  const chartWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  return total <= 1
    ? PADDING_LEFT + chartWidth / 2
    : PADDING_LEFT + (chartWidth * index) / (total - 1);
}

function getY(value: number, maxValue: number): number {
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  return PADDING_TOP + chartHeight - (value / maxValue) * chartHeight;
}

function buildPolyline(
  data: DashboardInfraccionesTendenciaItem[],
  key: TrendSeriesDefinition["key"],
  maxValue: number,
): string {
  return data
    .map((item, index) => `${getX(index, data.length)},${getY(item[key], maxValue)}`)
    .join(" ");
}

function getLabelStep(total: number): number {
  if (total <= 12) return 1;
  if (total <= 24) return 2;
  return Math.ceil(total / 12);
}

export function DashboardTrendLineChart({ agrupacion, data }: DashboardTrendLineChartProps) {
  if (data.length === 0) {
    return <div className="dashboard-trend-empty">Sin datos de tendencia para los filtros aplicados.</div>;
  }

  const maxValue = getMaxValue(data);
  const labelStep = getLabelStep(data.length);
  const gridValues = Array.from({ length: GRID_LINES + 1 }, (_, index) =>
    Math.round((maxValue * index) / GRID_LINES),
  ).reverse();

  return (
    <div className="dashboard-trend-wrapper">
      <div className="dashboard-trend-legend" aria-label="Series de tendencia">
        {SERIES.map((series) => (
          <span key={series.key} className={series.className}>
            <i aria-hidden="true" />
            {series.label}
          </span>
        ))}
      </div>

      <div className="dashboard-trend-scroll">
        <svg
          className="dashboard-trend-chart"
          role="img"
          aria-label="Tendencia de infracciones por periodo"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          {gridValues.map((value, index) => {
            const y = getY(value, maxValue);
            return (
              <g key={`grid-${index}`}>
                <line className="dashboard-trend-grid-line" x1={PADDING_LEFT} x2={WIDTH - PADDING_RIGHT} y1={y} y2={y} />
                <text className="dashboard-trend-y-label" x={PADDING_LEFT - 12} y={y + 4} textAnchor="end">
                  {formatNumber(value)}
                </text>
              </g>
            );
          })}

          <line className="dashboard-trend-axis" x1={PADDING_LEFT} x2={PADDING_LEFT} y1={PADDING_TOP} y2={HEIGHT - PADDING_BOTTOM} />
          <line className="dashboard-trend-axis" x1={PADDING_LEFT} x2={WIDTH - PADDING_RIGHT} y1={HEIGHT - PADDING_BOTTOM} y2={HEIGHT - PADDING_BOTTOM} />

          {SERIES.map((series) => (
            <g key={series.key} className={series.className}>
              <polyline className="dashboard-trend-polyline" fill="none" points={buildPolyline(data, series.key, maxValue)} />
              {data.map((item, index) => (
                <circle
                  className="dashboard-trend-point"
                  cx={getX(index, data.length)}
                  cy={getY(item[series.key], maxValue)}
                  key={`${series.key}-${item.periodo}`}
                  r={4}
                >
                  <title>{`${series.label} · ${formatPeriodLabel(item.periodo, agrupacion)}: ${formatNumber(item[series.key])}`}</title>
                </circle>
              ))}
            </g>
          ))}

          {data.map((item, index) => {
            if (index % labelStep !== 0 && index !== data.length - 1) return null;
            return (
              <text
                className="dashboard-trend-x-label"
                key={`label-${item.periodo}`}
                x={getX(index, data.length)}
                y={HEIGHT - 28}
                textAnchor="middle"
              >
                {formatPeriodLabel(item.periodo, agrupacion)}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

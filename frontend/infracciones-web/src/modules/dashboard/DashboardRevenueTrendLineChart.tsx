import type {
  DashboardAgrupacion,
  DashboardIngresosTendenciaItem,
} from "../../types/dashboard.types";

import "./DashboardRevenueTrendLineChart.css";

interface DashboardRevenueTrendLineChartProps {
  agrupacion: DashboardAgrupacion;
  data: DashboardIngresosTendenciaItem[];
}

const WIDTH = 1040;
const HEIGHT = 340;
const PADDING_LEFT = 86;
const PADDING_RIGHT = 28;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 62;
const GRID_LINES = 4;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 0,
    notation: value >= 1000000 ? "compact" : "standard",
    style: "currency",
  }).format(value);
}

function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPeriodLabel(value: string, agrupacion: DashboardAgrupacion): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (agrupacion === "anio") {
    return new Intl.DateTimeFormat("es-MX", { year: "numeric" }).format(date);
  }

  if (agrupacion === "dia") {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    year: "2-digit",
  }).format(date);
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

function getLabelStep(total: number): number {
  if (total <= 12) return 1;
  if (total <= 24) return 2;
  return Math.ceil(total / 12);
}

function formatVariation(value: number | null): string {
  if (value === null) return "sin periodo anterior comparable";
  if (value === 0) return "sin cambio vs periodo anterior";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}% vs periodo anterior`;
}

export function DashboardRevenueTrendLineChart({
  agrupacion,
  data,
}: DashboardRevenueTrendLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="dashboard-revenue-trend-empty">
        Sin ingresos para los filtros aplicados.
      </div>
    );
  }

  const maxValue = Math.max(1, ...data.map((item) => item.totalIngresos));
  const labelStep = getLabelStep(data.length);
  const gridValues = Array.from({ length: GRID_LINES + 1 }, (_, index) =>
    Math.round((maxValue * index) / GRID_LINES),
  ).reverse();
  const points = data
    .map(
      (item, index) =>
        `${getX(index, data.length)},${getY(item.totalIngresos, maxValue)}`,
    )
    .join(" ");

  return (
    <div className="dashboard-revenue-trend-wrapper">
      <div className="dashboard-revenue-trend-legend">
        <span>
          <i aria-hidden="true" />
          Ingresos registrados
        </span>
        <small>Fecha de pago</small>
      </div>

      <div className="dashboard-revenue-trend-scroll">
        <svg
          className="dashboard-revenue-trend-chart"
          role="img"
          aria-label="Tendencia de ingresos por periodo"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        >
          {gridValues.map((value) => {
            const y = getY(value, maxValue);
            return (
              <g key={`revenue-grid-${value}-${y}`}>
                <line
                  className="dashboard-revenue-trend-grid-line"
                  x1={PADDING_LEFT}
                  x2={WIDTH - PADDING_RIGHT}
                  y1={y}
                  y2={y}
                />
                <text
                  className="dashboard-revenue-trend-y-label"
                  x={PADDING_LEFT - 12}
                  y={y + 4}
                  textAnchor="end"
                >
                  {formatCurrency(value)}
                </text>
              </g>
            );
          })}

          <line
            className="dashboard-revenue-trend-axis"
            x1={PADDING_LEFT}
            x2={PADDING_LEFT}
            y1={PADDING_TOP}
            y2={HEIGHT - PADDING_BOTTOM}
          />
          <line
            className="dashboard-revenue-trend-axis"
            x1={PADDING_LEFT}
            x2={WIDTH - PADDING_RIGHT}
            y1={HEIGHT - PADDING_BOTTOM}
            y2={HEIGHT - PADDING_BOTTOM}
          />

          <polyline
            className="dashboard-revenue-trend-polyline"
            fill="none"
            points={points}
          />

          {data.map((item, index) => (
            <circle
              className="dashboard-revenue-trend-point"
              cx={getX(index, data.length)}
              cy={getY(item.totalIngresos, maxValue)}
              key={`revenue-${item.periodo}`}
              r={4.5}
            >
              <title>{`${formatPeriodLabel(item.periodo, agrupacion)} · ${formatCurrencyExact(item.totalIngresos)} · ${item.totalPagos} pago(s) · promedio ${formatCurrencyExact(item.promedioPago)} · ${formatVariation(item.variacionIngresosVsPeriodoAnteriorPct)}`}</title>
            </circle>
          ))}

          {data.map((item, index) => {
            if (index % labelStep !== 0 && index !== data.length - 1) {
              return null;
            }

            return (
              <text
                className="dashboard-revenue-trend-x-label"
                key={`revenue-label-${item.periodo}`}
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

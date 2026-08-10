import type {
  DashboardAgrupacion,
  DashboardAnaliticaResumenResponse,
  DashboardIngresosPorClaveResponse,
  DashboardIngresosTendenciaResponse,
} from "../../types/dashboard.types";
import { DashboardRevenueTrendLineChart } from "./DashboardRevenueTrendLineChart";

import "./DashboardRevenueOverview.css";

interface DashboardRevenueOverviewProps {
  agrupacion: DashboardAgrupacion;
  claveConcepto: string;
  loading: boolean;
  resumen: DashboardAnaliticaResumenResponse | null;
  tendencia: DashboardIngresosTendenciaResponse | null;
  porClave: DashboardIngresosPorClaveResponse | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

function formatVariation(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "Sin periodo anterior comparable";
  }

  if (value === 0) {
    return "Sin cambio vs periodo anterior";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(2)}% vs periodo anterior`;
}

function getCoveragePercentage(identified: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (identified / total) * 100));
}

export function DashboardRevenueOverview({
  agrupacion,
  claveConcepto,
  loading,
  resumen,
  tendencia,
  porClave,
}: DashboardRevenueOverviewProps) {
  const ingresos = resumen?.ingresos;
  const latestTrend = tendencia?.series.at(-1);
  const selectedKey = claveConcepto.trim().toUpperCase();
  const totalIngresos = ingresos?.totalIngresos ?? 0;
  const ingresosIdentificados = ingresos?.ingresosConClaveIdentificada ?? 0;
  const ingresosSinDesglose = ingresos?.ingresosSinDesgloseClave ?? 0;
  const coveragePct = getCoveragePercentage(ingresosIdentificados, totalIngresos);
  const claves = porClave?.claves ?? [];

  return (
    <section className="dashboard-revenue-overview" aria-label="Analitica de ingresos">
      <div className="dashboard-section-heading">
        <div>
          <p className="section-label">Recaudacion</p>
          <h2>Ingresos y claves de concepto</h2>
        </div>
        <span>
          {selectedKey
            ? `Clave seleccionada: ${selectedKey}`
            : agrupacion === "mes"
              ? "Tendencia mensual por fecha de pago"
              : `Agrupado por ${agrupacion}`}
        </span>
      </div>

      <div className="dashboard-revenue-kpis">
        <article className="dashboard-revenue-kpi dashboard-revenue-kpi-total">
          <span>Ingresos</span>
          <strong>{formatCurrency(totalIngresos)}</strong>
          <small>
            {formatVariation(latestTrend?.variacionIngresosVsPeriodoAnteriorPct)}
          </small>
        </article>
        <article className="dashboard-revenue-kpi dashboard-revenue-kpi-payments">
          <span>Pagos</span>
          <strong>{formatNumber(ingresos?.totalPagos ?? 0)}</strong>
          <small>Líneas de captura registradas</small>
        </article>
        <article className="dashboard-revenue-kpi dashboard-revenue-kpi-average">
          <span>Promedio por pago</span>
          <strong>{formatCurrency(ingresos?.promedioPago ?? 0)}</strong>
          <small>Promedio dentro de los filtros</small>
        </article>
        <article className="dashboard-revenue-kpi dashboard-revenue-kpi-identified">
          <span>Con clave identificada</span>
          <strong>{formatCurrency(ingresosIdentificados)}</strong>
          <small>
            {selectedKey
              ? `Monto atribuido a ${selectedKey}`
              : `${coveragePct.toFixed(2)}% del ingreso filtrado`}
          </small>
        </article>
        <article className="dashboard-revenue-kpi dashboard-revenue-kpi-historical">
          <span>Sin desglose histórico</span>
          <strong>{formatCurrency(ingresosSinDesglose)}</strong>
          <small>
            {selectedKey
              ? "No aplica al filtrar una clave"
              : "Pagos anteriores sin conceptos asociados"}
          </small>
        </article>
      </div>

      {!selectedKey ? (
        <article className="dashboard-revenue-coverage" aria-label="Cobertura de claves">
          <div className="dashboard-revenue-coverage-header">
            <div>
              <strong>Cobertura del desglose por claves</strong>
              <small>
                El histórico sin conceptos se conserva separado y no se reclasifica.
              </small>
            </div>
            <span>{coveragePct.toFixed(2)}%</span>
          </div>
          <div className="dashboard-revenue-coverage-track" aria-hidden="true">
            <span style={{ width: `${coveragePct}%` }} />
          </div>
        </article>
      ) : null}

      <div className="dashboard-revenue-layout">
        <article className="dashboard-panel dashboard-revenue-trend-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Tendencia</p>
              <h2>
                {selectedKey
                  ? `Ingresos de la clave ${selectedKey}`
                  : "Tendencia de ingresos"}
              </h2>
            </div>
            <span>
              {agrupacion === "mes" ? "Meses en eje horizontal" : "Periodo en eje horizontal"}
            </span>
          </div>

          {loading ? (
            <div className="dashboard-revenue-trend-loading">
              Actualizando ingresos...
            </div>
          ) : (
            <DashboardRevenueTrendLineChart
              agrupacion={agrupacion}
              data={tendencia?.series ?? []}
            />
          )}
        </article>

        <article className="dashboard-panel dashboard-revenue-keys-panel">
          <div className="dashboard-panel-header">
            <div>
              <p className="section-label">Claves</p>
              <h2>Monto recaudado por clave</h2>
            </div>
            <span>
              {formatCurrency(porClave?.totalIdentificado ?? 0)} identificado
            </span>
          </div>

          {loading ? (
            <div className="dashboard-revenue-table-empty">Actualizando claves...</div>
          ) : claves.length ? (
            <div className="dashboard-revenue-table-wrap">
              <table className="dashboard-revenue-table">
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Pagos</th>
                    <th>Monto</th>
                    <th>Participacion</th>
                  </tr>
                </thead>
                <tbody>
                  {claves.map((item) => (
                    <tr key={item.idConceptoPago}>
                      <td>
                        <strong>{item.claveConcepto}</strong>
                      </td>
                      <td>{formatNumber(item.totalPagos)}</td>
                      <td>{formatCurrency(item.monto)}</td>
                      <td>
                        <div className="dashboard-revenue-share-cell">
                          <div className="dashboard-revenue-share-track" aria-hidden="true">
                            <span
                              style={{
                                width: `${Math.min(100, Math.max(0, item.participacionPct))}%`,
                              }}
                            />
                          </div>
                          <span>{formatPercentage(item.participacionPct)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="dashboard-revenue-table-empty">
              Sin claves con monto para los filtros aplicados.
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

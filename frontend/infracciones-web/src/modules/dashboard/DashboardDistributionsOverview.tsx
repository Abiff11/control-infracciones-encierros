import type {
  DashboardDistribucionesResponse,
  DashboardDistribucionTerritorialItem,
} from "../../types/dashboard.types";

import "./DashboardDistributionsOverview.css";

interface DashboardDistributionsOverviewProps {
  data: DashboardDistribucionesResponse | null;
  loading: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-MX").format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    currency: "MXN",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function getMaxValue(values: number[]): number {
  return Math.max(1, ...values);
}

function HorizontalValueBar({
  value,
  maxValue,
}: {
  value: number;
  maxValue: number;
}) {
  const width = value <= 0 ? 0 : Math.max(4, (value / maxValue) * 100);

  return (
    <div className="dashboard-distribution-bar" aria-hidden="true">
      <span style={{ width: `${Math.min(100, width)}%` }} />
    </div>
  );
}

function TerritorialTable({
  items,
  title,
}: {
  items: DashboardDistribucionTerritorialItem[];
  title: string;
}) {
  const maxInfracciones = getMaxValue(items.map((item) => item.totalInfracciones));

  return (
    <article className="dashboard-panel dashboard-distribution-panel">
      <div className="dashboard-panel-header">
        <div>
          <p className="section-label">Territorio</p>
          <h2>{title}</h2>
        </div>
        <span>{formatNumber(items.length)} registro(s)</span>
      </div>

      {items.length ? (
        <div className="dashboard-distribution-table-wrap">
          <table className="dashboard-distribution-table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Expedientes</th>
                <th>Infracciones</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.nombre}</strong>
                    <HorizontalValueBar
                      value={item.totalInfracciones}
                      maxValue={maxInfracciones}
                    />
                  </td>
                  <td>{formatNumber(item.totalExpedientes)}</td>
                  <td>{formatNumber(item.totalInfracciones)}</td>
                  <td>{formatCurrency(item.totalIngresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-distribution-empty">Sin datos para mostrar.</div>
      )}
    </article>
  );
}

export function DashboardDistributionsOverview({
  data,
  loading,
}: DashboardDistributionsOverviewProps) {
  const motivos = data?.motivos ?? [];
  const tipos = data?.tiposProcedimiento ?? [];
  const encierros = data?.encierros ?? [];
  const estados = data?.estadosOperativos ?? [];
  const maxMotivo = getMaxValue(motivos.map((item) => item.totalInfracciones));
  const maxEstado = getMaxValue(estados.map((item) => item.total));

  return (
    <section className="dashboard-distributions" aria-label="Distribuciones del dashboard">
      <div className="dashboard-section-heading">
        <div>
          <p className="section-label">Distribuciones</p>
          <h2>Territorio, motivos, tipos y encierros</h2>
        </div>
        <span>Infracciones por fecha de infracción · ingresos por fecha de pago</span>
      </div>

      {loading ? (
        <div className="dashboard-distribution-loading">
          Actualizando distribuciones...
        </div>
      ) : (
        <div className="dashboard-distribution-grid">
          <TerritorialTable
            items={data?.delegaciones ?? []}
            title="Infracciones e ingresos por delegación"
          />

          <TerritorialTable
            items={data?.regiones ?? []}
            title="Infracciones e ingresos por región"
          />

          <article className="dashboard-panel dashboard-distribution-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="section-label">Motivos</p>
                <h2>Infracciones por motivo</h2>
              </div>
            </div>
            {motivos.length ? (
              <div className="dashboard-distribution-list">
                {motivos.map((item) => (
                  <div className="dashboard-distribution-list-row" key={item.idMotivo}>
                    <div>
                      <strong>{item.nombreMotivo}</strong>
                      <HorizontalValueBar
                        value={item.totalInfracciones}
                        maxValue={maxMotivo}
                      />
                    </div>
                    <span>{formatNumber(item.totalInfracciones)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-distribution-empty">
                Sin motivos para los filtros aplicados.
              </div>
            )}
          </article>

          <article className="dashboard-panel dashboard-distribution-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="section-label">Expedientes</p>
                <h2>Por tipo de expediente</h2>
              </div>
            </div>
            {tipos.length ? (
              <div className="dashboard-distribution-simple-table-wrap">
                <table className="dashboard-distribution-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Expedientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipos.map((item) => (
                      <tr key={item.idTipoProcedimiento}>
                        <td>
                          <strong>{item.nombreTipoProcedimiento}</strong>
                          <small>{item.claveTipoProcedimiento}</small>
                        </td>
                        <td>{formatNumber(item.totalExpedientes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-distribution-empty">
                Sin tipos para los filtros aplicados.
              </div>
            )}
          </article>

          <article className="dashboard-panel dashboard-distribution-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="section-label">Encierros</p>
                <h2>Situación por encierro</h2>
              </div>
            </div>
            {encierros.length ? (
              <div className="dashboard-distribution-table-wrap">
                <table className="dashboard-distribution-table">
                  <thead>
                    <tr>
                      <th>Encierro</th>
                      <th>Expedientes</th>
                      <th>Actualmente</th>
                      <th>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encierros.map((item) => (
                      <tr key={item.idEncierro}>
                        <td><strong>{item.nombreEncierro}</strong></td>
                        <td>{formatNumber(item.totalExpedientes)}</td>
                        <td>{formatNumber(item.actualmenteEnEncierro)}</td>
                        <td>{formatCurrency(item.totalIngresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dashboard-distribution-empty">
                Sin encierros para los filtros aplicados.
              </div>
            )}
          </article>

          <article className="dashboard-panel dashboard-distribution-panel">
            <div className="dashboard-panel-header">
              <div>
                <p className="section-label">Flujo operativo</p>
                <h2>Estado actual de expedientes</h2>
              </div>
            </div>
            <div className="dashboard-distribution-list">
              {estados.map((item) => (
                <div className="dashboard-distribution-list-row" key={item.estado}>
                  <div>
                    <strong>{item.label}</strong>
                    <HorizontalValueBar value={item.total} maxValue={maxEstado} />
                  </div>
                  <span>{formatNumber(item.total)}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

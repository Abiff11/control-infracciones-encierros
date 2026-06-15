import type {
  InfraccionListItem,
  PaginationMeta,
} from './infracciones.types';

interface InfraccionesListPageProps {
  error: string | null;
  anio: string;
  folioInfraccion: string;
  items: InfraccionListItem[];
  loading: boolean;
  meta: PaginationMeta | null;
  onAnioChange: (value: string) => void;
  onFolioInfraccionChange: (value: string) => void;
  onNavigateCreate: () => void;
  onRefresh: () => void;
}

function getInfractorLabel(item: InfraccionListItem): string {
  const parts = [
    item.infractor.nombre,
    item.infractor.apellidoPaterno,
    item.infractor.apellidoMaterno,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return parts.join(' ');
}

function InfraccionesListPage({
  error,
  anio,
  folioInfraccion,
  items,
  loading,
  meta,
  onAnioChange,
  onFolioInfraccionChange,
  onNavigateCreate,
  onRefresh,
}: InfraccionesListPageProps) {
  return (
    <section className="page-stack">
      <header className="page-header page-header-row">
        <div>
          <p className="eyebrow">Consulta</p>
          <h1>Infracciones</h1>
          <p className="page-description">
            Tabla básica de consulta para validar el endpoint protegido
            <code>GET /infracciones</code>.
          </p>
        </div>

        <button className="button-primary" type="button" onClick={onNavigateCreate}>
          Nueva infracción
        </button>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Filtro simple</p>
            <h2>Buscar por folio y año</h2>
          </div>
        </div>

        <div className="form-grid form-grid-2">
          <input
            type="number"
            min="1900"
            value={anio}
            onChange={(event) => onAnioChange(event.target.value)}
            placeholder="2025"
          />

          <input
            type="text"
            value={folioInfraccion}
            onChange={(event) => onFolioInfraccionChange(event.target.value)}
            placeholder="INF-2026-0001"
          />
        </div>

        <div className="button-row">
          <button className="button-secondary" type="button" onClick={onRefresh} disabled={loading}>
            {loading ? 'Actualizando...' : 'Refrescar'}
          </button>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Resultados</p>
            <h2>Listado operativo</h2>
          </div>

          {meta ? (
            <p className="meta-copy">
              Total {meta.total} · Página {meta.page} de {meta.totalPages}
            </p>
          ) : null}
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Estatus</th>
                <th>Infractor</th>
                <th>Placas</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    {loading
                      ? 'Cargando infracciones...'
                      : 'No hay infracciones para mostrar.'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.idInfraccion}>
                    <td>{item.folioInfraccion}</td>
                    <td>{item.fechaInfraccion}</td>
                    <td>{item.horaInfraccion}</td>
                    <td>{item.estatusInfraccion.nombreEstatus}</td>
                    <td>{getInfractorLabel(item)}</td>
                    <td>{item.vehiculo.placas ?? 'Sin placas'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default InfraccionesListPage;

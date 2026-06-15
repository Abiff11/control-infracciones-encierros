import type {
  CatalogosBundle,
} from '../catalogos/catalogos.types';
import type { PaginationMeta } from '../infracciones/infracciones.types';
import type { LoginResponseUsuario } from '../../lib/api';
import { swaggerUrl } from '../../lib/api';

import type { PageKey } from '../../app/app.types';

interface DashboardPageProps {
  catalogs: CatalogosBundle | null;
  infraccionesMeta: PaginationMeta | null;
  apiStatusLabel: string;
  notice: string | null;
  user: LoginResponseUsuario;
  onNavigate: (page: PageKey) => void;
}

const QUICK_ACTIONS: Array<{ key: PageKey; label: string }> = [
  { key: 'infracciones', label: 'Infracciones' },
  { key: 'nueva-infraccion', label: 'Nueva infracción' },
  { key: 'encierros-vehiculos', label: 'Vehículos en encierro' },
  { key: 'flujo-operativo', label: 'Flujo operativo' },
];

function DashboardPage({
  catalogs,
  infraccionesMeta,
  apiStatusLabel,
  notice,
  user,
  onNavigate,
}: DashboardPageProps) {
  const catalogCount = catalogs
    ? catalogs.regiones.length +
      catalogs.roles.length +
      catalogs.delegaciones.length +
      catalogs.sexos.length +
      catalogs.servicios.length +
      catalogs.clasesVehiculo.length +
      catalogs.marcasVehiculo.length +
      catalogs.lineasVehiculo.length +
      catalogs.tiposProcedimiento.length +
      catalogs.operativos.length +
      catalogs.estatusInfraccion.length +
      catalogs.motivos.length +
      catalogs.encierros.length
    : 0;

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Resumen operativo</h1>
          <p className="page-description">
            Punto de entrada para revisar sesión, estado del backend y navegar
            entre los flujos operativos.
          </p>
        </div>
      </header>

      <section className="card-grid">
        <article className="summary-card">
          <p className="card-label">Usuario</p>
          <h2>{user.nombreUsuario}</h2>
          <p className="card-muted">{user.email}</p>
        </article>

        <article className="summary-card">
          <p className="card-label">Rol</p>
          <h2>{user.rol?.nombreRol ?? 'Sin rol'}</h2>
          <p className="card-muted">
            {user.activo ? 'Usuario activo' : 'Usuario inactivo'}
          </p>
        </article>

        <article className="summary-card">
          <p className="card-label">Estado API</p>
          <h2>{apiStatusLabel}</h2>
          <p className="card-muted">
            {infraccionesMeta
              ? `${infraccionesMeta.total} infracciones en la última consulta`
              : 'Sin consulta de infracciones aún'}
          </p>
        </article>

        <article className="summary-card">
          <p className="card-label">Catálogos</p>
          <h2>{catalogs ? `${catalogCount} registros cargados` : 'Cargando'}</h2>
          <a className="inline-link" href={swaggerUrl} target="_blank" rel="noreferrer">
            Swagger / docs
          </a>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="section-label">Acciones rápidas</p>
            <h2>Navegación principal</h2>
          </div>
        </div>

        <div className="actions-grid">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.key}
              className="button-secondary"
              type="button"
              onClick={() => onNavigate(action.key)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      {notice ? <div className="notice notice-error">{notice}</div> : null}
    </section>
  );
}

export default DashboardPage;

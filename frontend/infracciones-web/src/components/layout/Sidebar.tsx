import type { PageKey } from '../../app/app.types';
import type { NavigationItem } from '../../app/navigation';
import type { LoginResponseUsuario } from '../../types/auth.types';
import '../../app/App.institutional.css';

const INSTITUTIONAL_LOGO_SRC = `${import.meta.env.BASE_URL}policia-vial-estatal-oaxaca-seeklogo.png`;
const SWAGGER_ROLES = new Set(['ADMIN', 'SUPERADMIN', 'SUPER_ADMIN']);
const INFRACCIONES_HIDDEN_KEYS = new Set<SidebarItem['key']>([
  'encierros-vehiculos',
  'importaciones',
  'catalogos',
  'usuarios',
]);

export interface SidebarItem {
  key: PageKey;
  label: string;
}

interface SidebarProps {
  items: NavigationItem[];
  currentPage: PageKey;
  swaggerUrl: string;
  user: LoginResponseUsuario;
  onLogout: () => void | Promise<void>;
  onNavigate: (page: PageKey) => void;
}

function normalizeGroupLabel(group: NavigationItem['group']): string {
  const labels: Record<NavigationItem['group'], string> = {
    Consulta: 'Consulta operativa',
    Operacion: 'Operación',
    Encierros: 'Encierros',
    Administracion: 'Administración',
    Tecnico: 'Administración',
  };

  return labels[group] ?? group;
}

function canAccessTechnicalTools(user: LoginResponseUsuario): boolean {
  const roleName = user.rol?.nombreRol?.toUpperCase();
  return Boolean(roleName && SWAGGER_ROLES.has(roleName));
}

export function Sidebar({ currentPage, items, onLogout, onNavigate, swaggerUrl, user }: SidebarProps) {
  const roleName = user.rol?.nombreRol?.toUpperCase();
  const isAdmin = roleName === 'ADMIN';
  const showSwagger = canAccessTechnicalTools(user);
  const visibleItems = items.filter((item) => {
    if (isAdmin) {
      return true;
    }

    if (roleName === 'INFRACCIONES') {
      return !INFRACCIONES_HIDDEN_KEYS.has(item.key);
    }

    return item.key !== 'usuarios';
  });
  const groups = Array.from(new Set(visibleItems.map((item) => item.group)));

  return (
    <aside className="sidebar institutional-sidebar">
      <div className="sidebar-rail" aria-hidden="true">
        <div className="brand-logo-wrap sidebar-rail-logo">
          <img
            className="institutional-logo sidebar-logo"
            src={INSTITUTIONAL_LOGO_SRC}
            alt=""
          />
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="brand sidebar-brand">
          <div className="brand-logo-wrap sidebar-logo-wrap">
            <img
              className="institutional-logo sidebar-logo"
              src={INSTITUTIONAL_LOGO_SRC}
              alt="Policía Vial Estatal de Oaxaca"
            />
          </div>
          <div className="sidebar-title-wrap">
            <p className="eyebrow sidebar-eyebrow">Sistema institucional</p>
            <strong>Control de Infracciones</strong>
            <small>Infracciones y encierros</small>
          </div>
        </div>

        <div className="sidebar-session-card" aria-label="Sesión activa">
          <span className="sidebar-session-label">Usuario</span>
          <strong>{user.nombreUsuario}</strong>
          <span>{user.rol?.nombreRol ?? 'Sin rol asignado'}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {groups.map((group) => (
            <div key={group} className="sidebar-nav-group">
              <p className="sidebar-nav-title">{normalizeGroupLabel(group)}</p>
              {visibleItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <button
                    key={item.key}
                    className={`nav-item ${currentPage === item.key ? 'is-active' : ''}`}
                    type="button"
                    onClick={() => onNavigate(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          ))}

          {showSwagger ? (
            <div className="sidebar-nav-group">
              <p className="sidebar-nav-title">Técnico</p>
              <a className="nav-item nav-link" href={swaggerUrl} target="_blank" rel="noreferrer">
                Swagger
              </a>
            </div>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <button className="secondary-button sidebar-logout" type="button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}

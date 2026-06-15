import type { PageKey } from '../../app/app.types';

export interface SidebarItem {
  key: PageKey;
  label: string;
}

interface SidebarProps {
  items: SidebarItem[];
  currentPage: PageKey;
  swaggerUrl: string;
  onNavigate: (page: PageKey) => void;
}

export function Sidebar({ currentPage, items, onNavigate, swaggerUrl }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo-wrap">
          <span className="badge">CIE</span>
        </div>
        <div>
          <strong>Control operativo</strong>
          <small>Infracciones y encierros</small>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        <div className="sidebar-nav-group">
          <p className="sidebar-nav-title">Operacion</p>
          {items.map((item) => (
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

        <div className="sidebar-nav-group">
          <p className="sidebar-nav-title">Tecnico</p>
          <a className="nav-item nav-link" href={swaggerUrl} target="_blank" rel="noreferrer">
            Swagger
          </a>
        </div>
      </nav>
    </aside>
  );
}

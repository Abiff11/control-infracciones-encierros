import type { PageKey } from '../../app/app.types';
import type { NavigationItem } from '../../app/navigation';

export interface SidebarItem {
  key: PageKey;
  label: string;
}

interface SidebarProps {
  items: NavigationItem[];
  currentPage: PageKey;
  swaggerUrl: string;
  onNavigate: (page: PageKey) => void;
}

export function Sidebar({ currentPage, items, onNavigate, swaggerUrl }: SidebarProps) {
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return (
    <aside className="sidebar">
      <div className="sidebar-rail" aria-hidden="true">
        <div className="brand-logo-wrap sidebar-rail-logo">
          <span className="badge">CIE</span>
        </div>
      </div>

      <div className="sidebar-panel">
        <div className="brand sidebar-brand">
          <div className="brand-logo-wrap">
            <span className="badge">CIE</span>
          </div>
          <div className="sidebar-title-wrap">
            <strong>Control operativo</strong>
            <small>Infracciones y encierros</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Menu principal">
          {groups.map((group) => (
            <div key={group} className="sidebar-nav-group">
              <p className="sidebar-nav-title">{group}</p>
              {items
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

          <div className="sidebar-nav-group">
            <p className="sidebar-nav-title">Tecnico</p>
            <a className="nav-item nav-link" href={swaggerUrl} target="_blank" rel="noreferrer">
              Swagger
            </a>
          </div>
        </nav>
      </div>
    </aside>
  );
}

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
      <nav className="sidebar-nav" aria-label="Menu principal">
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

        <a className="nav-item nav-link" href={swaggerUrl} target="_blank" rel="noreferrer">
          Swagger
        </a>
      </nav>
    </aside>
  );
}

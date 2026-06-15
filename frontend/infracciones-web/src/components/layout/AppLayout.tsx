import type { ReactNode } from 'react';

interface AppLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppLayout({ children, header, sidebar }: AppLayoutProps) {
  return (
    <main className="dashboard-shell">
      {sidebar}

      <div className="main-stage">
        {header}
        <section className="content-section">{children}</section>
      </div>
    </main>
  );
}

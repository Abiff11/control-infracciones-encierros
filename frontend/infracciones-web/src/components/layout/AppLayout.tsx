import type { ReactNode } from 'react';

interface AppLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

export function AppLayout({ children, header, sidebar }: AppLayoutProps) {
  return (
    <main className="app-shell">
      {header}
      <div className="app-layout">
        {sidebar}
        <section className="content">{children}</section>
      </div>
    </main>
  );
}

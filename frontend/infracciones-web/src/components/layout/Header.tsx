import type { ReactNode } from 'react';

interface HeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function Header({ action, description, eyebrow, title }: HeaderProps) {
  return (
    <header className="page-header page-header-row">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </header>
  );
}

import type { ReactNode } from 'react';

interface InfoGridItem {
  label: string;
  value: ReactNode;
  span?: 1 | 2;
}

interface InfoGridProps {
  items: InfoGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

function formatValue(value: ReactNode): ReactNode {
  if (value === null || value === undefined || value === '') {
    return 'Sin informacion registrada';
  }

  return value;
}

export function InfoGrid({ className, columns = 2, items }: InfoGridProps) {
  return (
    <dl className={['info-grid', `info-grid-${columns}`, className].filter(Boolean).join(' ')}>
      {items.map((item) => (
        <div
          key={item.label}
          className={item.span === 2 ? 'info-item info-item-span-2' : 'info-item'}
        >
          <dt className="info-label">{item.label}</dt>
          <dd className="info-value">{formatValue(item.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

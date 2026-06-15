import type { ReactNode } from 'react';

interface TimelineItem {
  id: string | number;
  title: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="timeline-header">
              <strong>{item.title}</strong>
              {item.meta ? <div className="timeline-meta">{item.meta}</div> : null}
            </div>
            {item.description ? <div className="timeline-description">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

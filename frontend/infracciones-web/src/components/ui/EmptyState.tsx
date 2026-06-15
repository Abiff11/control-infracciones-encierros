interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  className,
  description,
  title = 'Sin informacion registrada.',
}: EmptyStateProps) {
  return (
    <div className={['empty-state-card', className].filter(Boolean).join(' ')}>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

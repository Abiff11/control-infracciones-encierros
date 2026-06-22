import { useEffect, type PropsWithChildren } from 'react';

import { Button } from './Button';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  size?: 'default' | 'wide';
  eyebrowLabel?: string;
  className?: string;
  onClose: () => void;
}

export function Modal({
  children,
  className,
  description,
  eyebrowLabel = 'Detalle',
  onClose,
  open,
  size = 'default',
  title,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className={`modal-card ${size === 'wide' ? 'modal-card-wide' : ''} ${
          className ?? ''
        }`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">{eyebrowLabel}</p>
            <h2>{title}</h2>
            {description ? <p className="page-description">{description}</p> : null}
          </div>

          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </header>

        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

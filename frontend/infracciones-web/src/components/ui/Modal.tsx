import type { PropsWithChildren } from 'react';

import { Button } from './Button';

interface ModalProps extends PropsWithChildren {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
}

export function Modal({ children, description, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">Detalle</p>
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

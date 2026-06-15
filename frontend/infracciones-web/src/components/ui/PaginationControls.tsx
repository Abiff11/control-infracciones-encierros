import { Button } from './Button';

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  const computedTotalPages = Math.max(
    1,
    totalPages ?? (total === 0 ? 1 : Math.ceil(total / limit)),
  );
  const currentPage = Math.min(Math.max(page, 1), computedTotalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  return (
    <div className="pagination-bar">
      <p className="meta-copy">
        Mostrando {from}-{to} de {total} · Página {currentPage} de {computedTotalPages}
      </p>

      <div className="button-row pagination-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
        >
          Primera
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage >= computedTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Siguiente
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={currentPage >= computedTotalPages}
          onClick={() => onPageChange(computedTotalPages)}
        >
          Última
        </Button>
      </div>
    </div>
  );
}

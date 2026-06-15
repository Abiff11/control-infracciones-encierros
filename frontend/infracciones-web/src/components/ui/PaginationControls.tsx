import { Button } from './Button';

interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
}

type PaginationItem =
  | {
      type: 'page';
      page: number;
    }
  | {
      type: 'ellipsis';
      key: string;
    };

const PAGE_WINDOW = 1;
const EDGE_WINDOW = 5;

function getVisiblePageItems(currentPage: number, totalPages: number): PaginationItem[] {
  const pages = new Set<number>([1, totalPages]);

  for (
    let page = Math.max(1, currentPage - PAGE_WINDOW);
    page <= Math.min(totalPages, currentPage + PAGE_WINDOW);
    page += 1
  ) {
    pages.add(page);
  }

  if (currentPage <= EDGE_WINDOW - 1) {
    for (let page = 2; page <= Math.min(totalPages, EDGE_WINDOW); page += 1) {
      pages.add(page);
    }
  }

  if (currentPage >= totalPages - (EDGE_WINDOW - 2)) {
    for (let page = Math.max(1, totalPages - (EDGE_WINDOW - 1)); page < totalPages; page += 1) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((left, right) => left - right);
  const items: PaginationItem[] = [];

  for (const page of sortedPages) {
    const previousItem = items[items.length - 1];
    const previousPage = previousItem?.type === 'page' ? previousItem.page : null;

    if (previousPage !== null && page - previousPage > 1) {
      if (page - previousPage === 2) {
        items.push({ type: 'page', page: previousPage + 1 });
      } else {
        items.push({ type: 'ellipsis', key: `${previousPage}-${page}` });
      }
    }

    items.push({ type: 'page', page });
  }

  return items;
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
  const visiblePageItems = getVisiblePageItems(currentPage, computedTotalPages);

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

        {visiblePageItems.map((item) =>
          item.type === 'ellipsis' ? (
            <span key={item.key} className="meta-copy" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={item.page}
              type="button"
              variant={item.page === currentPage ? 'primary' : 'secondary'}
              aria-current={item.page === currentPage ? 'page' : undefined}
              disabled={item.page === currentPage}
              onClick={() => onPageChange(item.page)}
            >
              {item.page}
            </Button>
          ),
        )}

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

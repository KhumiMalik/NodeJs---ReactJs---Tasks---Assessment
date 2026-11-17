import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '../../types/api';
import { Button } from './Button';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ meta, onPageChange, disabled = false }: PaginationProps) {
  const { currentPage, lastPage, perPage, total } = meta;
  if (total === 0) return null;

  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 sm:px-6"
    >
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{' '}
        <span className="font-medium">{total}</span>
      </p>
      {lastPage > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={disabled || currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-sm text-slate-600" aria-current="page">
            Page {currentPage} of {lastPage}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={disabled || currentPage >= lastPage}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  );
}

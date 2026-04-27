'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  className?: string;
  /** Mostrar "total de itens" */
  showTotal?: boolean;
  disabled?: boolean;
};

export function ListPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
  showTotal = true,
  disabled = false,
}: Props) {
  if (totalPages <= 1 && !showTotal) {
    return null;
  }
  if (total === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 border-t px-2 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      {showTotal ? (
        <p className="tabular-nums">
          {from}–{to} de {total}
        </p>
      ) : (
        <span />
      )}
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(1)}
            aria-label="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 tabular-nums">
            Pág. {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <span />
      )}
    </div>
  );
}

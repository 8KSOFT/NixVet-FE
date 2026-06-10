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
  const safeTotal = Number.isFinite(total) && total >= 0 ? total : 0;
  const safeTotalPages = Number.isFinite(totalPages) && totalPages >= 1 ? totalPages : 1;

  if (safeTotalPages <= 1 && !showTotal) {
    return null;
  }
  if (safeTotal === 0) {
    return null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, safeTotal);
  const fmt = (n: number) => n.toLocaleString('pt-BR');

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 px-2 py-3 text-sm',
        className,
      )}
    >
      {showTotal ? (
        <p className="tabular-nums text-gray-400">
          {fmt(from)}–{fmt(to)} de {fmt(safeTotal)}
        </p>
      ) : (
        <span />
      )}
      {safeTotalPages > 1 ? (
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
            Pág. {fmt(page)} / {fmt(safeTotalPages)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || page >= safeTotalPages}
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
            disabled={disabled || page >= safeTotalPages}
            onClick={() => onPageChange(safeTotalPages)}
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

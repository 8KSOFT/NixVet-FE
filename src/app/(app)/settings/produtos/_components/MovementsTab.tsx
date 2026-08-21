'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Product, StockMovementReason } from '@/app/types/product';
import { useStockMovementsQuery } from '@/hooks/apiHooks/useStock';

const ALL_VALUE = '__all__';

const REASONS: StockMovementReason[] = [
  'inventory_adjustment',
  'breakage',
  'expired',
  'internal_use',
  'loss',
  'invoice_entry',
  'invoice_entry_reversal',
  'sale',
  'sale_reversal',
  'budget_approval',
  'hospitalization_consumption',
  'hospitalization_consumption_adjustment',
  'hospitalization_consumption_reversal',
];

interface MovementsTabProps {
  products: Product[];
}

export function MovementsTab({ products }: MovementsTabProps) {
  const { t } = useTranslation();
  const [productId, setProductId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  const { data, isLoading } = useStockMovementsQuery({
    product_id: productId ?? undefined,
    reason: reason ?? undefined,
  });

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={productId ?? ALL_VALUE} onValueChange={(v) => setProductId(v === ALL_VALUE ? null : v)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t('settingsProdutos.movements.filterProduct')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('settingsProdutos.movements.allProducts')}</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reason ?? ALL_VALUE} onValueChange={(v) => setReason(v === ALL_VALUE ? null : v)}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={t('settingsProdutos.movements.filterReason')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>{t('settingsProdutos.movements.allReasons')}</SelectItem>
            {REASONS.map((r) => (
              <SelectItem key={r} value={r}>
                {t(`settingsProdutos.movements.reasons.${r}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('settingsProdutos.movements.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-300">
          <Table className="min-w-full border-collapse bg-white text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-300 h-15">
                <TableHead>{t('settingsProdutos.movements.colDate')}</TableHead>
                <TableHead>{t('settingsProdutos.movements.colProduct')}</TableHead>
                <TableHead>{t('settingsProdutos.movements.colReason')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.movements.colDelta')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.movements.colBalance')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((movement) => (
                <TableRow key={movement.id} className="border-b border-gray-300 h-15">
                  <TableCell>{new Date(movement.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{productById.get(movement.product_id)?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`settingsProdutos.movements.reasons.${movement.reason}`)}</Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${movement.delta < 0 ? 'text-destructive' : 'text-emerald-600'}`}
                  >
                    {movement.delta > 0 ? '+' : ''}
                    {movement.delta}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{movement.new_stock}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

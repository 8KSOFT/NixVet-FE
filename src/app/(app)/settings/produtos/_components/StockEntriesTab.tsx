'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Product, Supplier } from '@/app/types/product';
import { useStockEntriesQuery } from '@/hooks/apiHooks/useStock';
import { StockEntryFormDialog } from './StockEntryFormDialog';
import { StockEntryDetailDialog } from './StockEntryDetailDialog';

interface StockEntriesTabProps {
  products: Product[];
  suppliers: Supplier[];
}

export function StockEntriesTab({ products, suppliers }: StockEntriesTabProps) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const { data, isLoading } = useStockEntriesQuery();
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const supplierName = (id: string | null | undefined) => (id ? suppliers.find((s) => s.id === id)?.name : null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 size-4" /> {t('settingsProdutos.entries.new')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('settingsProdutos.entries.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-300">
          <Table className="min-w-full border-collapse bg-white text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-300 h-15">
                <TableHead>{t('settingsProdutos.entries.entryDateLabel')}</TableHead>
                <TableHead>{t('settingsProdutos.supplierLabel')}</TableHead>
                <TableHead>{t('settingsProdutos.entries.invoiceNumberLabel')}</TableHead>
                <TableHead>{t('settingsProdutos.entries.paymentStatusColumn')}</TableHead>
                <TableHead>{t('settingsProdutos.entries.statusColumn')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.entries.totalLabel')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`h-15 cursor-pointer border-b border-gray-300 hover:bg-muted/50${entry.status === 'canceled' ? ' opacity-50' : ''}`}
                  onClick={() => setDetailId(entry.id)}
                >
                  <TableCell>{new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{supplierName(entry.supplier_id) ?? '—'}</TableCell>
                  <TableCell>{entry.invoice_number ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={entry.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {entry.payment_status === 'paid'
                        ? t('settingsProdutos.entries.paid')
                        : t('settingsProdutos.entries.pending')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'canceled' ? 'destructive' : 'outline'}>
                      {entry.status === 'canceled'
                        ? t('settingsProdutos.entries.statusCanceled')
                        : t('settingsProdutos.entries.statusConfirmed')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{fmt(entry.total_amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <StockEntryFormDialog open={formOpen} onOpenChange={setFormOpen} products={products} suppliers={suppliers} />
      <StockEntryDetailDialog entryId={detailId} onOpenChange={(open) => !open && setDetailId(null)} suppliers={suppliers} />
    </div>
  );
}

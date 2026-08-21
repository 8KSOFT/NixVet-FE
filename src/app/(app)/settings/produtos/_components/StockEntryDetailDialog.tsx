'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Supplier } from '@/app/types/product';
import { useCancelStockEntryMutation, useStockEntryQuery } from '@/hooks/apiHooks/useStock';

interface StockEntryDetailDialogProps {
  entryId: string | null;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
}

export function StockEntryDetailDialog({ entryId, onOpenChange, suppliers }: StockEntryDetailDialogProps) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const { data: entry, isLoading } = useStockEntryQuery(entryId);
  const cancelEntry = useCancelStockEntryMutation();
  const [reason, setReason] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const supplierName = entry?.supplier_id ? suppliers.find((s) => s.id === entry.supplier_id)?.name : null;

  const handleCancel = async () => {
    if (!entry || !reason.trim()) {
      toast.error(t('settingsProdutos.entries.cancelReasonRequired'));
      return;
    }
    try {
      await cancelEntry.mutateAsync({ id: entry.id, reason: reason.trim() });
      setShowCancelForm(false);
      setReason('');
    } catch {
      toast.error(t('settingsProdutos.entries.cancelError'));
    }
  };

  return (
    <DashboardCreateFormDialog
      open={!!entryId}
      onOpenChange={(next) => {
        if (!next) {
          setShowCancelForm(false);
          setReason('');
        }
        onOpenChange(next);
      }}
      title={t('settingsProdutos.entries.detailTitle')}
      contentClassName="max-w-[min(calc(100%-4rem),56rem)] sm:max-w-[min(calc(100%-4rem),56rem)]"
    >
      {isLoading || !entry ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">{t('settingsProdutos.supplierLabel')}</p>
              <p className="font-medium">{supplierName ?? t('settingsProdutos.supplierNone')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('settingsProdutos.entries.invoiceNumberLabel')}</p>
              <p className="font-medium">{entry.invoice_number ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('settingsProdutos.entries.entryDateLabel')}</p>
              <p className="font-medium">{new Date(`${entry.entry_date}T12:00:00`).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('settingsProdutos.entries.totalLabel')}</p>
              <p className="font-semibold">{fmt(entry.total_amount)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={entry.payment_status === 'paid' ? 'default' : 'secondary'}>
              {entry.payment_status === 'paid' ? t('settingsProdutos.entries.paid') : t('settingsProdutos.entries.pending')}
            </Badge>
            <Badge variant={entry.status === 'canceled' ? 'destructive' : 'outline'}>
              {entry.status === 'canceled'
                ? t('settingsProdutos.entries.statusCanceled')
                : t('settingsProdutos.entries.statusConfirmed')}
            </Badge>
          </div>

          {entry.status === 'canceled' && entry.cancel_reason ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {t('settingsProdutos.entries.canceledReasonPrefix')}: {entry.cancel_reason}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-gray-300">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-12">
                  <TableHead>{t('settingsProdutos.entries.colProduct')}</TableHead>
                  <TableHead className="text-right">{t('settingsProdutos.entries.colQuantity')}</TableHead>
                  <TableHead className="text-right">{t('settingsProdutos.entries.colUnitCost')}</TableHead>
                  <TableHead className="text-right">{t('settingsProdutos.entries.previousCostColumn')}</TableHead>
                  <TableHead className="text-right">{t('settingsProdutos.entries.newCostColumn')}</TableHead>
                  <TableHead className="text-right">{t('settingsProdutos.entries.colLineTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entry.items ?? []).map((item) => (
                  <TableRow key={item.id} className="border-b border-gray-300 h-12">
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(item.unit_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(item.previous_cost_price)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmt(item.new_cost_price)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(item.line_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {entry.status === 'confirmed' ? (
            showCancelForm ? (
              <div className="space-y-2 rounded-md border border-destructive/30 p-3">
                <Label htmlFor="cancel-reason">{t('settingsProdutos.entries.cancelReasonLabel')}</Label>
                <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCancelForm(false)}>
                    {t('settingsProdutos.cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={cancelEntry.isPending}
                  >
                    {cancelEntry.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {t('settingsProdutos.entries.confirmCancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button type="button" variant="destructive" size="sm" onClick={() => setShowCancelForm(true)}>
                  {t('settingsProdutos.entries.cancelEntryButton')}
                </Button>
              </div>
            )
          ) : null}
        </div>
      )}
    </DashboardCreateFormDialog>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Product } from '@/app/types/product';
import { useCostHistoryQuery, useCostVariationsQuery } from '@/hooks/apiHooks/useStock';

const PERIOD_OPTIONS = [30, 90, 180, 365] as const;

interface CostHistoryTabProps {
  products: Product[];
}

export function CostHistoryTab({ products }: CostHistoryTabProps) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const [productId, setProductId] = useState<string | null>(products[0]?.id ?? null);
  const [periodDays, setPeriodDays] = useState<number>(90);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - periodDays);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  }, [periodDays]);

  const { data: history = [], isLoading } = useCostHistoryQuery(productId, startDate, endDate);
  const { data: variations = [] } = useCostVariationsQuery(startDate, endDate);

  const chartData = useMemo(
    () =>
      history.map((point) => ({
        name: new Date(`${point.entry_date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        custo: point.new_cost_price,
      })),
    [history],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={productId ?? undefined} onValueChange={setProductId}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder={t('settingsProdutos.costHistory.selectProduct')} />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((days) => (
              <SelectItem key={days} value={String(days)}>
                {t('settingsProdutos.costHistory.periodDays', { count: days })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('settingsProdutos.costHistory.chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!productId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('settingsProdutos.costHistory.selectProduct')}</p>
          ) : isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('settingsProdutos.costHistory.empty')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(Number(v))} width={80} />
                <Tooltip formatter={(v) => [fmt(Number(v)), t('settingsProdutos.costHistory.tooltipCost')]} />
                <Line type="monotone" dataKey="custo" stroke="#3b82f6" strokeWidth={2} dot connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-300">
          <Table className="min-w-full border-collapse bg-white text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-300 h-12">
                <TableHead>{t('settingsProdutos.entries.entryDateLabel')}</TableHead>
                <TableHead>{t('settingsProdutos.supplierLabel')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.entries.colQuantity')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.entries.colUnitCost')}</TableHead>
                <TableHead className="text-right">{t('settingsProdutos.costHistory.colAverageCost')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((point, i) => (
                <TableRow key={`${point.entry_id}-${i}`} className="border-b border-gray-300 h-12">
                  <TableCell>{new Date(`${point.entry_date}T12:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{point.supplier_name ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{point.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(point.unit_cost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmt(point.new_cost_price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {variations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('settingsProdutos.costHistory.variationsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {variations.map((v) => (
              <div key={v.product_id} className="flex items-center justify-between text-sm">
                <span className="truncate">{v.product_name}</span>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">
                    {fmt(v.first_cost)} → {fmt(v.last_cost)}
                  </span>
                  <Badge variant={v.variation_percentage >= 0 ? 'destructive' : 'default'}>
                    {v.variation_percentage > 0 ? '+' : ''}
                    {v.variation_percentage}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

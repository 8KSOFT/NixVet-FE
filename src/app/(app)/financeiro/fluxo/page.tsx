'use client';

import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { useCurrencyFormatter, CURRENCY_BY_LANGUAGE, resolveAppLanguage } from '@/lib/i18n/currency';

const CashFlowChart = dynamic(() => import('./CashFlowChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-64 w-full" />,
});

interface CashFlowDay {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  cumulative_balance: number;
}

interface CashFlow {
  days: CashFlowDay[];
  summary: {
    total_inflows: number;
    total_outflows: number;
    final_balance: number;
    negative_days: number;
    first_negative_day: string | null;
  };
}

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
}

const RANGE_OPTIONS = [30, 60, 90];

export default function FluxoCaixaPage() {
  const { t, i18n } = useTranslation();
  const fmt = useCurrencyFormatter();
  const currencySymbol = CURRENCY_BY_LANGUAGE[resolveAppLanguage(i18n.language)].symbol;
  const [days, setDays] = useState(60);
  const [data, setData] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CashFlow>(`/financial-reports/fluxo-caixa?days=${days}`);
      setData(res.data);
    } catch {
      toast.error(t('financeiroFluxo.loadError'));
    } finally {
      setLoading(false);
    }
  }, [days, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gráfico: apenas dias com movimentação (mantém o acumulado de todos).
  const chartData = (data?.days ?? [])
    .filter((d) => d.inflow > 0 || d.outflow > 0 || d.cumulative_balance !== 0)
    .map((d) => ({
      name: fmtDate(d.date).slice(0, 5),
      entrada: d.inflow,
      saida: -d.outflow,
      saldo: d.cumulative_balance,
    }));

  const movementDays = (data?.days ?? []).filter((d) => d.inflow > 0 || d.outflow > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroFluxo.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('financeiroFluxo.subtitle')}
          </p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? 'default' : 'outline'}
              onClick={() => setDays(r)}
              className="flex-1 sm:flex-none"
            >
              {t('financeiroFluxo.rangeButton', { days: r })}
            </Button>
          ))}
        </div>
      </div>

      {data && data.summary.negative_days > 0 && data.summary.first_negative_day && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {t('financeiroFluxo.negativeBalancePrefix')} <strong>{fmtDate(data.summary.first_negative_day)}</strong>
            {t('financeiroFluxo.negativeBalanceSuffix')}
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('financeiroFluxo.expectedInflows', { days })}
            </CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-green-600">{fmt(data?.summary.total_inflows)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('financeiroFluxo.expectedOutflows', { days })}
            </CardTitle>
            <TrendingDown className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-red-600">{fmt(data?.summary.total_outflows)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroFluxo.projectedBalance')}</CardTitle>
            <Wallet className={cn('size-4', (data?.summary.final_balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <p className={cn('text-2xl font-bold', (data?.summary.final_balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600')}>
                {fmt(data?.summary.final_balance)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('financeiroFluxo.projectionTitle', { days })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('financeiroFluxo.noMovementInPeriod')}</p>
          ) : (
            <CashFlowChart chartData={chartData} fmt={fmt} t={t} currencySymbol={currencySymbol} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('financeiroFluxo.movementDaysTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : movementDays.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('financeiroFluxo.noMovementDays')}</p>
          ) : (
            <>
              {/* Desktop: tabela de 5 colunas */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
                <Table className="min-w-full text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroFluxo.columnDate')}</TableHead>
                      <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroFluxo.columnInflows')}</TableHead>
                      <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroFluxo.columnOutflows')}</TableHead>
                      <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroFluxo.columnNet')}</TableHead>
                      <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroFluxo.columnCumulativeBalance')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementDays.map((d) => (
                      <TableRow key={d.date} className={cn(d.cumulative_balance < 0 && 'bg-red-50')}>
                        <TableCell className="border border-slate-200 px-3 py-2.5 text-slate-600">{fmtDate(d.date)}</TableCell>
                        <TableCell className="border border-slate-200 px-3 py-2.5 text-right tabular-nums text-green-700">
                          {d.inflow > 0 ? fmt(d.inflow) : '—'}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-2.5 text-right tabular-nums text-red-700">
                          {d.outflow > 0 ? fmt(d.outflow) : '—'}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-2.5 text-right tabular-nums text-slate-600">{fmt(d.net)}</TableCell>
                        <TableCell
                          className={cn(
                            'border border-slate-200 px-3 py-2.5 text-right font-medium tabular-nums',
                            d.cumulative_balance < 0 ? 'text-red-700' : 'text-slate-700',
                          )}
                        >
                          {fmt(d.cumulative_balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards — 5 colunas de valor monetário não cabem lado
                  a lado num viewport de telefone, mesmo com scroll dentro do
                  card (que o usuário nem deveria precisar usar). */}
              <div className="space-y-2 md:hidden">
                {movementDays.map((d) => (
                  <div
                    key={d.date}
                    className={cn('rounded-lg border border-slate-200 p-3', d.cumulative_balance < 0 && 'bg-red-50')}
                  >
                    <p className="text-sm font-medium text-slate-700">{fmtDate(d.date)}</p>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{t('financeiroFluxo.columnInflows')}</p>
                        <p className="tabular-nums text-green-700">{d.inflow > 0 ? fmt(d.inflow) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{t('financeiroFluxo.columnOutflows')}</p>
                        <p className="tabular-nums text-red-700">{d.outflow > 0 ? fmt(d.outflow) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{t('financeiroFluxo.columnNet')}</p>
                        <p className="tabular-nums text-slate-600">{fmt(d.net)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">{t('financeiroFluxo.columnCumulativeBalance')}</p>
                        <p className={cn('font-medium tabular-nums', d.cumulative_balance < 0 ? 'text-red-700' : 'text-slate-700')}>
                          {fmt(d.cumulative_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

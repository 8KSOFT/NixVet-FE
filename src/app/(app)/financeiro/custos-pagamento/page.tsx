'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useCustosPagamentoQuery } from '@/hooks/apiHooks/useFinancialReports';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import { useIsMobile } from '@/hooks/use-mobile';

const PaymentMethodsChart = dynamic(() => import('./PaymentMethodsChart'), {
  ssr: false,
  loading: () => <Skeleton className="h-60 w-full" />,
});

function CustosPagamentoPageContent() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const isMobile = useIsMobile(768);

  const METHOD_LABELS: Record<string, string> = {
    pix: t('financeiroCustos.methods.pix'),
    cash: t('financeiroCustos.methods.cash'),
    debit: t('financeiroCustos.methods.debit'),
    credit_1x: t('financeiroCustos.methods.credit1x'),
    credit_installment: t('financeiroCustos.methods.creditInstallment'),
    boleto: t('financeiroCustos.methods.boleto'),
  };

  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const { data = {}, isLoading: loading, error } = useCustosPagamentoQuery(period);

  useEffect(() => {
    if (error) toast.error(getApiErrorMessage(error, t('financeiroCustos.loadError')));
  }, [error, t]);

  const methods = Object.entries(data);
  const totalVolume = methods.reduce((s, [, v]) => s + v.volume, 0);
  const totalFees = methods.reduce((s, [, v]) => s + v.fee_total, 0);
  const netRevenue = totalVolume - totalFees;
  const pixOnlySavings = totalFees;

  const chartData = methods.map(([method, v]) => ({
    name: METHOD_LABELS[method] ?? method,
    value: v.volume,
  }));

  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroCustos.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('financeiroCustos.subtitle')}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              {period} <ChevronDown className="ml-2 size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {periods.map((p) => (
              <DropdownMenuItem key={p} onClick={() => setPeriod(p)}>
                {p}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t('financeiroCustos.totalFeesLabel'), value: totalFees, color: 'text-orange-500' },
          { label: t('financeiroCustos.netRevenueLabel'), value: netRevenue, color: 'text-green-600' },
          { label: t('financeiroCustos.pixSavingsLabel'), value: pixOnlySavings, color: 'text-blue-600' },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-32" />
              ) : (
                <p className={`text-2xl font-bold ${color}`}>{fmt(value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('financeiroCustos.distributionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <PaymentMethodsChart chartData={chartData} isMobile={isMobile} fmt={fmt} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('financeiroCustos.detailTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <>
                {/* Desktop: tabela */}
                <div className="hidden md:block">
                  <Table className="min-w-full border-collapse bg-white text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-gray-300 h-15">
                        <TableHead>{t('financeiroCustos.methodColumn')}</TableHead>
                        <TableHead className="text-right">{t('financeiroCustos.volumeColumn')}</TableHead>
                        <TableHead className="text-right">{t('financeiroCustos.totalCostColumn')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {methods.map(([method, v]) => (
                        <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={method}>
                          <TableCell>{METHOD_LABELS[method] ?? method}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(v.volume)}</TableCell>
                          <TableCell className="text-right tabular-nums text-orange-500">{fmt(v.fee_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: cards — tabela de 3 colunas ainda estourava a
                    largura da tela (nomes de método longos + 2 valores
                    monetários não cabem lado a lado num viewport de 375px). */}
                <div className="space-y-2 md:hidden">
                  {methods.map(([method, v]) => (
                    <div key={method} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <span className="text-sm font-medium">{METHOD_LABELS[method] ?? method}</span>
                      <div className="text-right">
                        <p className="text-sm tabular-nums">{fmt(v.volume)}</p>
                        <p className="text-xs tabular-nums text-orange-500">{fmt(v.fee_total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CustosPagamentoPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('financeiroCustos.featureName')}>
      <CustosPagamentoPageContent />
    </PlanUpgradeGate>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Download, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PlanUpgradeGate } from '@/components/billing/PlanUpgradeGate';
import type { DRECompareMode, DREDiff } from '@/app/types/financial-report';
import {
  useDREComparisonQuery,
  useDREQuery,
  useExportDREMutation,
  useFinancialKPIsQuery,
  useMonthlyDREQuery,
} from '@/hooks/apiHooks/useFinancialReports';
import { useCurrencyFormatter, CURRENCY_BY_LANGUAGE, resolveAppLanguage } from '@/lib/i18n/currency';

/** Mapeia a categoria bruta (vinda da API) para o sufixo da chave de tradução em financeiroDre.categories.*. */
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  consultation: 'consultation',
  hospitalization: 'hospitalization',
  exam: 'exam',
  procedure: 'procedure',
  vaccine: 'vaccine',
  product: 'product',
  medication: 'medication',
  material: 'material',
  card_fee: 'cardFee',
  medication_purchase: 'medicationPurchase',
  material_purchase: 'materialPurchase',
  lab_cost: 'labCost',
  rent: 'rent',
  personnel: 'personnel',
  utilities: 'utilities',
  marketing: 'marketing',
  equipment: 'equipment',
  tax: 'tax',
  diaria: 'diaria',
  other: 'other',
};

/** Mapeia o método de pagamento bruto (vindo da API) para o sufixo da chave de tradução em financeiroDre.methods.*. */
const METHOD_LABEL_KEYS: Record<string, string> = {
  cash: 'cash',
  pix: 'pix',
  debit: 'debit',
  credit_1x: 'credit1x',
  credit_2_6x: 'credit26x',
  credit_7_12x: 'credit712x',
  boleto: 'boleto',
  transfer: 'transfer',
};

/** Mapeia o modo de comparação para o sufixo da chave de tradução em financeiroDre.compareModes.*. */
const COMPARE_LABEL_KEYS: Record<DRECompareMode, string> = {
  none: 'none',
  prev_month: 'prevMonth',
  prev_year: 'prevYear',
};

function fmtPct(n: number) {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** Variação formatada com sinal; `inverse` para custos (aumento = ruim). */
function DiffBadge({ diff, inverse }: { diff: DREDiff; inverse?: boolean }) {
  if (diff.diff_pct === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const up = diff.diff_amount >= 0;
  const good = inverse ? !up : up;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-green-600' : 'text-red-600')}>
      {up ? '↑' : '↓'} {up ? '+' : ''}
      {diff.diff_pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

function SummaryCard({
  title,
  value,
  subtext,
  extra,
  icon: Icon,
  color,
  loading,
  fmt,
}: {
  title: string;
  value: number;
  subtext?: string;
  extra?: React.ReactNode;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  fmt: (value: number | string | null | undefined) => string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn('size-4', color)} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <>
            <p className={cn('text-2xl font-bold', color)}>{fmt(value)}</p>
            {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            {extra}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DRERow({
  label,
  value,
  pct,
  diff,
  diffInverse,
  bold,
  indent,
  color,
  fmt,
}: {
  label: string;
  value: number;
  /** Percentual sobre a receita líquida, exibido ao lado do valor. */
  pct?: number;
  diff?: DREDiff;
  diffInverse?: boolean;
  bold?: boolean;
  indent?: boolean;
  color?: string;
  fmt: (value: number | string | null | undefined) => string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2',
        indent ? 'pl-6' : 'border-t border-border',
        bold && 'font-semibold',
      )}
    >
      <span className={cn('min-w-0 flex-1 pr-2 text-sm', indent && 'text-muted-foreground')}>{label}</span>
      <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
        <span className={cn('text-sm tabular-nums', color ?? 'text-foreground', bold && 'font-semibold')}>
          {fmt(value)}
        </span>
        {pct !== undefined && (
          <span className="text-xs text-muted-foreground">{fmtPct(pct)}</span>
        )}
        {diff && <DiffBadge diff={diff} inverse={diffInverse} />}
      </span>
    </div>
  );
}

function FinanceiroDREPageContent() {
  const { t, i18n } = useTranslation();
  const fmt = useCurrencyFormatter();
  const currencySymbol = CURRENCY_BY_LANGUAGE[resolveAppLanguage(i18n.language)].symbol;
  const now = new Date();
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [compare, setCompare] = useState<DRECompareMode>('none');

  const { data: dre, isLoading: loadingDRE, isError: dreError } = useDREQuery(period);
  const { data: monthly = [], isLoading: loadingMonthly } = useMonthlyDREQuery();
  const { data: kpis } = useFinancialKPIsQuery(period);
  const { data: comparison } = useDREComparisonQuery(period, compare);
  const loading = loadingDRE || loadingMonthly;
  const exportDRE = useExportDREMutation();

  const activeComparison = compare !== 'none' ? comparison : undefined;

  useEffect(() => {
    if (dreError) toast.error(t('financeiroDre.loadError'));
  }, [dreError, t]);

  const catLabel = (cat: string) => {
    const key = CATEGORY_LABEL_KEYS[cat];
    return key ? t(`financeiroDre.categories.${key}`) : cat;
  };

  const methodLabel = (method: string) => {
    const key = METHOD_LABEL_KEYS[method];
    return key ? t(`financeiroDre.methods.${key}`) : method;
  };

  const compareLabel = (mode: DRECompareMode) => t(`financeiroDre.compareModes.${COMPARE_LABEL_KEYS[mode]}`);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    try {
      const blob = await exportDRE.mutateAsync({ period, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dre-${period}.${format === 'xlsx' ? 'xlsx' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('financeiroDre.exportError'));
    }
  };

  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Percentuais sobre a receita líquida (mockup: pct inline nas linhas de custo)
  const pctOfNet = (v: number) =>
    dre && dre.net_revenue > 0 ? (v / dre.net_revenue) * 100 : 0;

  const chartData = monthly.map((m) => ({
    name: m.period.split('-').reverse().join('/'),
    receita: Number(m.gross_revenue),
    ebitda: Number(m.ebitda ?? 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroDre.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('financeiroDre.subtitle')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {t('financeiroDre.compareButton', { mode: compareLabel(compare) })} <ChevronDown className="ml-2 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(COMPARE_LABEL_KEYS) as DRECompareMode[]).map((m) => (
                <DropdownMenuItem key={m} onClick={() => setCompare(m)}>
                  {compareLabel(m)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Período + Exportar formam um par no mobile (período estica,
              exportar vira só ícone) — no desktop viram 3 botões soltos de
              novo via `sm:contents`, que desmonta este wrapper sem mudar a
              ordem/hierarquia dos irmãos. */}
          <div className="flex items-center gap-2 sm:contents">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 sm:w-auto sm:flex-none">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="shrink-0"
                  aria-label={t('financeiroDre.exportButton')}
                  title={t('financeiroDre.exportButton')}
                >
                  <Download className="size-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('financeiroDre.exportButton')}</span>
                  <ChevronDown className="hidden size-3 sm:ml-2 sm:inline" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>{t('financeiroDre.exportPdf')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>{t('financeiroDre.exportXlsx')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* KPIs gerenciais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.avgTicket')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold">{fmt(kpis.ticket_medio)}</p>
                <p className="text-xs text-muted-foreground">
                  {t('financeiroDre.appointmentsCount', { count: kpis.total_atendimentos })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.grossMargin')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p
                className={cn(
                  'text-2xl font-bold',
                  kpis.margem_bruta_pct > 40
                    ? 'text-green-600'
                    : kpis.margem_bruta_pct < 20
                      ? 'text-red-600'
                      : 'text-foreground',
                )}
              >
                {fmtPct(kpis.margem_bruta_pct)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.momGrowth')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-24" />
            ) : kpis.crescimento_mom_pct === null ? (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            ) : (
              <>
                <p
                  className={cn(
                    'flex items-center gap-1 text-2xl font-bold',
                    kpis.crescimento_mom_pct >= 0 ? 'text-green-600' : 'text-red-600',
                  )}
                >
                  {kpis.crescimento_mom_pct >= 0 ? (
                    <TrendingUp className="size-5" />
                  ) : (
                    <TrendingDown className="size-5" />
                  )}
                  {fmtPct(Math.abs(kpis.crescimento_mom_pct))}
                </p>
                <p className="text-xs text-muted-foreground">{t('financeiroDre.vsPreviousMonth')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.privateRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold text-blue-600">{fmt(kpis.receita_particular)}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
                    style={{ width: `${Math.min(100, kpis.pct_particular)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('financeiroDre.pctOfTotal', { pct: fmtPct(kpis.pct_particular) })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.healthPlanRevenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold text-purple-600">{fmt(kpis.receita_plano)}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-purple-600"
                    style={{ width: `${Math.min(100, kpis.pct_plano)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('financeiroDre.pctOfTotal', { pct: fmtPct(kpis.pct_plano) })}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroDre.mainMethod')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-24" />
            ) : kpis.metodo_principal ? (
              <p className="text-2xl font-bold">
                {methodLabel(kpis.metodo_principal)}
                <span className="ml-2 text-base font-medium text-muted-foreground">
                  {fmtPct(kpis.mix_pagamento[kpis.metodo_principal] ?? 0)}
                </span>
              </p>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resumo DRE — 4 cards (mockup) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t('financeiroDre.grossRevenue')}
          value={dre?.gross_revenue ?? 0}
          extra={activeComparison && <DiffBadge diff={activeComparison.gross_revenue} />}
          icon={TrendingUp}
          color="text-green-600"
          loading={loading}
          fmt={fmt}
        />
        <SummaryCard
          title={t('financeiroDre.grossMargin')}
          value={dre?.gross_profit ?? 0}
          subtext={dre ? t('financeiroDre.pctOfNetRevenue', { pct: fmtPct(dre.gross_margin_pct ?? 0) }) : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.gross_profit} />}
          icon={DollarSign}
          color={(dre?.gross_profit ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}
          loading={loading}
          fmt={fmt}
        />
        <SummaryCard
          title={t('financeiroDre.operatingExpenses')}
          value={dre?.opex ?? 0}
          subtext={dre ? t('financeiroDre.pctOfRevenue', { pct: fmtPct(pctOfNet(dre.opex)) }) : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.opex} inverse />}
          icon={TrendingDown}
          color="text-orange-500"
          loading={loading}
          fmt={fmt}
        />
        <SummaryCard
          title={t('financeiroDre.ebitda')}
          value={dre?.ebitda ?? 0}
          subtext={dre ? fmtPct(dre.ebitda_margin_pct ?? 0) : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.ebitda} />}
          icon={BarChart2}
          color={(dre?.ebitda ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={loading}
          fmt={fmt}
        />
      </div>

      {/* Gráfico + DRE detalhado lado a lado (mockup) */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('financeiroDre.chartTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 10 }}
                  formatter={(v, name) => [fmt(Number(v)), name === 'receita' ? t('financeiroDre.grossRevenue') : t('financeiroDre.ebitda')]}
                />
                <Bar dataKey="receita" fill="#3b82f6" radius={[3, 3, 0, 0]} name="receita" />
                <Bar dataKey="ebitda" fill="#22c55e" radius={[3, 3, 0, 0]} name="ebitda" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t('financeiroDre.detailTitle', { period })}
            {activeComparison && ` ${t('financeiroDre.vsPeriod', { period: activeComparison.prev_period })}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : dre ? (
            <div>
              <DRERow
                label={t('financeiroDre.rowGrossRevenue')}
                value={dre.gross_revenue}
                diff={activeComparison?.gross_revenue}
                bold
                color="text-green-600"
                fmt={fmt}
              />
              {Object.entries(dre.breakdown.by_category).map(([cat, val]) => (
                <DRERow key={cat} label={catLabel(cat)} value={val} indent fmt={fmt} />
              ))}
              <DRERow label={t('financeiroDre.rowDeductions')} value={dre.deductions} bold fmt={fmt} />
              <DRERow label={t('financeiroDre.rowNetRevenue')} value={dre.net_revenue} bold color="text-blue-600" fmt={fmt} />
              <DRERow
                label={t('financeiroDre.rowCmv')}
                value={dre.cmv}
                pct={pctOfNet(dre.cmv)}
                diff={activeComparison?.cmv}
                diffInverse
                bold
                fmt={fmt}
              />
              {Object.entries(dre.breakdown.cmv_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`cmv-${cat}`} label={catLabel(cat)} value={val} indent fmt={fmt} />
              ))}
              <DRERow
                label={t('financeiroDre.rowGrossProfit')}
                value={dre.gross_profit}
                pct={dre.gross_margin_pct ?? 0}
                diff={activeComparison?.gross_profit}
                bold
                color={dre.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}
                fmt={fmt}
              />
              <DRERow
                label={t('financeiroDre.rowOpex')}
                value={dre.opex}
                pct={pctOfNet(dre.opex)}
                diff={activeComparison?.opex}
                diffInverse
                bold
                fmt={fmt}
              />
              {Object.entries(dre.breakdown.opex_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`opex-${cat}`} label={catLabel(cat)} value={val} indent fmt={fmt} />
              ))}
              <DRERow
                label={t('financeiroDre.rowEbitda')}
                value={dre.ebitda}
                pct={dre.ebitda_margin_pct ?? 0}
                diff={activeComparison?.ebitda}
                bold
                color={dre.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}
                fmt={fmt}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

export default function FinanceiroDREPage() {
  const { t } = useTranslation();
  return (
    <PlanUpgradeGate requiredPlan="clinica" feature={t('financeiroDre.featureName')}>
      <FinanceiroDREPageContent />
    </PlanUpgradeGate>
  );
}

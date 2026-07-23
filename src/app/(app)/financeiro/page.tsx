'use client';

import React, { useEffect, useState } from 'react';
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
import type { DRECompareMode, DREDiff } from '@/app/types/financial-report';
import {
  useDREComparisonQuery,
  useDREQuery,
  useExportDREMutation,
  useFinancialKPIsQuery,
  useMonthlyDREQuery,
} from '@/hooks/apiHooks/useFinancialReports';

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consultas',
  hospitalization: 'Internações',
  exam: 'Exames',
  procedure: 'Procedimentos',
  vaccine: 'Vacinas',
  product: 'Produtos',
  medication: 'Medicamentos',
  material: 'Materiais',
  card_fee: 'Taxa de Cartão',
  medication_purchase: 'Compra de Medicamentos',
  material_purchase: 'Compra de Materiais',
  lab_cost: 'Custo de Laboratório',
  rent: 'Aluguel',
  personnel: 'Pessoal',
  utilities: 'Energia / Água / Internet',
  marketing: 'Marketing',
  equipment: 'Equipamento',
  tax: 'Impostos',
  diaria: 'Diárias',
  other: 'Outros',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'PIX',
  debit: 'Débito',
  credit_1x: 'Crédito à vista',
  credit_2_6x: 'Crédito 2-6x',
  credit_7_12x: 'Crédito 7-12x',
  boleto: 'Boleto',
  transfer: 'Transferência',
};

const COMPARE_LABELS: Record<DRECompareMode, string> = {
  none: '— (sem comparar)',
  prev_month: 'Mês anterior',
  prev_year: 'Mesmo mês do ano anterior',
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(n: number) {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function catLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
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
}: {
  title: string;
  value: number;
  subtext?: string;
  extra?: React.ReactNode;
  icon: React.ElementType;
  color: string;
  loading: boolean;
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
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-2',
        indent ? 'pl-6' : 'border-t border-border',
        bold && 'font-semibold',
      )}
    >
      <span className={cn('text-sm', indent && 'text-muted-foreground')}>{label}</span>
      <span className="flex items-center gap-2">
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

export default function FinanceiroDREPage() {
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
    if (dreError) toast.error('Erro ao carregar DRE');
  }, [dreError]);

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
      toast.error('Erro ao exportar');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro — DRE</h1>
          <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Comparar: {COMPARE_LABELS[compare]} <ChevronDown className="ml-2 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(COMPARE_LABELS) as DRECompareMode[]).map((m) => (
                <DropdownMenuItem key={m} onClick={() => setCompare(m)}>
                  {COMPARE_LABELS[m]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
              <Button size="sm">
                <Download className="mr-2 size-4" />
                Exportar para Contador
                <ChevronDown className="ml-2 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Exportar PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>Exportar Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs gerenciais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold">{fmt(kpis.ticket_medio)}</p>
                <p className="text-xs text-muted-foreground">{kpis.total_atendimentos} atendimentos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem Bruta</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Crescimento MoM</CardTitle>
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
                <p className="text-xs text-muted-foreground">vs. mês anterior</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Particular</CardTitle>
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
                <p className="mt-1 text-xs text-muted-foreground">{fmtPct(kpis.pct_particular)} do total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Planos</CardTitle>
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
                <p className="mt-1 text-xs text-muted-foreground">{fmtPct(kpis.pct_plano)} do total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Método Principal</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !kpis ? (
              <Skeleton className="h-7 w-24" />
            ) : kpis.metodo_principal ? (
              <p className="text-2xl font-bold">
                {METHOD_LABELS[kpis.metodo_principal] ?? kpis.metodo_principal}
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
          title="Receita Bruta"
          value={dre?.gross_revenue ?? 0}
          extra={activeComparison && <DiffBadge diff={activeComparison.gross_revenue} />}
          icon={TrendingUp}
          color="text-green-600"
          loading={loading}
        />
        <SummaryCard
          title="Margem Bruta"
          value={dre?.gross_profit ?? 0}
          subtext={dre ? `${fmtPct(dre.gross_margin_pct ?? 0)} da receita líquida` : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.gross_profit} />}
          icon={DollarSign}
          color={(dre?.gross_profit ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}
          loading={loading}
        />
        <SummaryCard
          title="Desp. Operacionais"
          value={dre?.opex ?? 0}
          subtext={dre ? `${fmtPct(pctOfNet(dre.opex))} da receita` : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.opex} inverse />}
          icon={TrendingDown}
          color="text-orange-500"
          loading={loading}
        />
        <SummaryCard
          title="EBITDA"
          value={dre?.ebitda ?? 0}
          subtext={dre ? fmtPct(dre.ebitda_margin_pct ?? 0) : undefined}
          extra={activeComparison && <DiffBadge diff={activeComparison.ebitda} />}
          icon={BarChart2}
          color={(dre?.ebitda ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={loading}
        />
      </div>

      {/* Gráfico + DRE detalhado lado a lado (mockup) */}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Receita Bruta × EBITDA — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v, name) => [fmt(Number(v)), name === 'receita' ? 'Receita Bruta' : 'EBITDA']} />
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
            DRE Detalhado — {period}
            {activeComparison && ` vs ${activeComparison.prev_period}`}
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
                label="(+) RECEITA BRUTA"
                value={dre.gross_revenue}
                diff={activeComparison?.gross_revenue}
                bold
                color="text-green-600"
              />
              {Object.entries(dre.breakdown.by_category).map(([cat, val]) => (
                <DRERow key={cat} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow label="(-) Deduções / Glosas" value={dre.deductions} bold />
              <DRERow label="(=) RECEITA LÍQUIDA" value={dre.net_revenue} bold color="text-blue-600" />
              <DRERow
                label="(-) CMV — Custo Direto"
                value={dre.cmv}
                pct={pctOfNet(dre.cmv)}
                diff={activeComparison?.cmv}
                diffInverse
                bold
              />
              {Object.entries(dre.breakdown.cmv_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`cmv-${cat}`} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow
                label="(=) MARGEM BRUTA"
                value={dre.gross_profit}
                pct={dre.gross_margin_pct ?? 0}
                diff={activeComparison?.gross_profit}
                bold
                color={dre.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}
              />
              <DRERow
                label="(-) DESPESAS OPERACIONAIS"
                value={dre.opex}
                pct={pctOfNet(dre.opex)}
                diff={activeComparison?.opex}
                diffInverse
                bold
              />
              {Object.entries(dre.breakdown.opex_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`opex-${cat}`} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow
                label="(=) EBITDA"
                value={dre.ebitda}
                pct={dre.ebitda_margin_pct ?? 0}
                diff={activeComparison?.ebitda}
                bold
                color={dre.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

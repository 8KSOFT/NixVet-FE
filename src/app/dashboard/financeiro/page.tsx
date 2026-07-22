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
import api from '@/lib/axios';
import { toast } from 'sonner';

interface DRE {
  gross_revenue: number;
  deductions: number;
  net_revenue: number;
  cmv: number;
  gross_profit: number;
  gross_margin_pct: number;
  opex: number;
  ebitda: number;
  ebitda_margin_pct: number;
  operational_costs: number;
  breakdown: {
    by_category: Record<string, number>;
    by_payment_source: { particular: number; health_plan: number };
    by_payment_method: Record<string, number>;
    cmv_by_category?: Record<string, number>;
    opex_by_category?: Record<string, number>;
  };
}

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

function catLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
}

function fmtPct(n: number) {
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

interface MonthlyDRE extends DRE {
  period: string;
}

interface KPIs {
  ticket_medio: number;
  total_atendimentos: number;
  margem_bruta_pct: number;
  ebitda_margin_pct: number | null;
  crescimento_mom_pct: number | null;
  receita_particular: number;
  receita_plano: number;
  pct_particular: number;
  pct_plano: number;
  mix_pagamento: Record<string, number>;
  metodo_principal: string | null;
}

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

interface DREDiff {
  current: number;
  previous: number;
  diff_amount: number;
  diff_pct: number | null;
}

interface DREComparison {
  period: string;
  prev_period: string;
  gross_revenue: DREDiff;
  deductions: DREDiff;
  net_revenue: DREDiff;
  cmv: DREDiff;
  gross_profit: DREDiff;
  opex: DREDiff;
  ebitda: DREDiff;
}

type CompareMode = 'none' | 'prev_month' | 'prev_year';

const COMPARE_LABELS: Record<CompareMode, string> = {
  none: '— (sem comparar)',
  prev_month: 'Mês anterior',
  prev_year: 'Mesmo mês do ano anterior',
};

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

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
  bold,
  indent,
  color,
}: {
  label: string;
  value: number;
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
      <span className={cn('text-sm tabular-nums', color ?? 'text-foreground', bold && 'font-semibold')}>
        {fmt(value)}
      </span>
    </div>
  );
}

export default function FinanceiroDREPage() {
  const now = new Date();
  const [period, setPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [dre, setDRE] = useState<DRE | null>(null);
  const [monthly, setMonthly] = useState<MonthlyDRE[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [compare, setCompare] = useState<CompareMode>('none');
  const [comparison, setComparison] = useState<DREComparison | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDRE = async () => {
    setLoading(true);
    try {
      const [dreRes, monthlyRes, kpisRes, compareRes] = await Promise.all([
        api.get<DRE>(`/financial-reports/dre?period=${period}`),
        api.get<MonthlyDRE[]>('/financial-reports/dre/monthly'),
        api.get<KPIs>(`/financial-reports/kpis?period=${period}`),
        compare !== 'none'
          ? api.get<DREComparison>(`/financial-reports/dre?period=${period}&compare=${compare}`)
          : Promise.resolve(null),
      ]);
      setDRE(dreRes.data);
      setMonthly(monthlyRes.data);
      setKpis(kpisRes.data);
      setComparison(compareRes ? compareRes.data : null);
    } catch {
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDRE(); }, [period, compare]);

  const handleExport = async (format: 'pdf' | 'xlsx') => {
    try {
      const res = await api.get(`/financial-reports/dre/export?period=${period}&format=${format}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
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

  const chartData = monthly.map((m) => ({
    name: m.period.split('-').reverse().join('/'),
    receita: Number(m.gross_revenue),
    liquida: Number(m.net_revenue),
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
              {(Object.keys(COMPARE_LABELS) as CompareMode[]).map((m) => (
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Receita Bruta"
          value={dre?.gross_revenue ?? 0}
          extra={comparison && <DiffBadge diff={comparison.gross_revenue} />}
          icon={TrendingUp}
          color="text-green-600"
          loading={loading}
        />
        <SummaryCard
          title="Receita Líquida"
          value={dre?.net_revenue ?? 0}
          extra={comparison && <DiffBadge diff={comparison.net_revenue} />}
          icon={DollarSign}
          color="text-blue-600"
          loading={loading}
        />
        <SummaryCard
          title="Margem Bruta"
          value={dre?.gross_profit ?? 0}
          subtext={dre ? fmtPct(dre.gross_margin_pct ?? 0) : undefined}
          extra={comparison && <DiffBadge diff={comparison.gross_profit} />}
          icon={TrendingUp}
          color={(dre?.gross_profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={loading}
        />
        <SummaryCard
          title="Custos CMV"
          value={dre?.cmv ?? 0}
          extra={comparison && <DiffBadge diff={comparison.cmv} inverse />}
          icon={TrendingDown}
          color="text-orange-500"
          loading={loading}
        />
        <SummaryCard
          title="OPEX"
          value={dre?.opex ?? 0}
          extra={comparison && <DiffBadge diff={comparison.opex} inverse />}
          icon={TrendingDown}
          color="text-orange-500"
          loading={loading}
        />
        <SummaryCard
          title="EBITDA"
          value={dre?.ebitda ?? 0}
          subtext={dre ? fmtPct(dre.ebitda_margin_pct ?? 0) : undefined}
          extra={comparison && <DiffBadge diff={comparison.ebitda} />}
          icon={BarChart2}
          color={(dre?.ebitda ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={loading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Receita Bruta — Últimos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="receita" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Receita Bruta" />
                <Bar dataKey="liquida" fill="#22c55e" radius={[3, 3, 0, 0]} name="Receita Líquida" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            DRE Detalhado — {period}
            {comparison && ` vs ${comparison.prev_period}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : comparison ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Linha DRE</th>
                    <th className="py-2 text-right">{comparison.period}</th>
                    <th className="py-2 text-right">{comparison.prev_period}</th>
                    <th className="py-2 text-right">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      { label: '(+) RECEITA BRUTA', diff: comparison.gross_revenue, bold: true },
                      { label: '(-) Deduções / Glosas', diff: comparison.deductions, inverse: true },
                      { label: '(=) RECEITA LÍQUIDA', diff: comparison.net_revenue, bold: true, color: 'text-blue-600' },
                      { label: '(-) CMV — Custo de Mercadoria', diff: comparison.cmv, inverse: true },
                      { label: '(=) MARGEM BRUTA', diff: comparison.gross_profit, bold: true, color: comparison.gross_profit.current >= 0 ? 'text-green-600' : 'text-red-600' },
                      { label: '(-) DESPESAS OPERACIONAIS', diff: comparison.opex, inverse: true },
                      { label: '(=) EBITDA / RESULTADO', diff: comparison.ebitda, bold: true, color: comparison.ebitda.current >= 0 ? 'text-green-600' : 'text-red-600' },
                    ] as { label: string; diff: DREDiff; bold?: boolean; color?: string; inverse?: boolean }[]
                  ).map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <td className={cn('py-2', row.bold && 'font-semibold')}>{row.label}</td>
                      <td className={cn('py-2 text-right tabular-nums', row.color, row.bold && 'font-semibold')}>
                        {fmt(row.diff.current)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{fmt(row.diff.previous)}</td>
                      <td className="py-2 text-right">
                        <DiffBadge diff={row.diff} inverse={row.inverse} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : dre ? (
            <div>
              <DRERow label="(+) RECEITA BRUTA" value={dre.gross_revenue} bold />
              {Object.entries(dre.breakdown.by_category).map(([cat, val]) => (
                <DRERow key={cat} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow label="(-) Deduções / Glosas" value={dre.deductions} bold />
              <DRERow label="(=) RECEITA LÍQUIDA" value={dre.net_revenue} bold color="text-blue-600" />
              <DRERow label="(-) CMV — Custo de Mercadoria" value={dre.cmv} bold />
              {Object.entries(dre.breakdown.cmv_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`cmv-${cat}`} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow
                label={`(=) MARGEM BRUTA (${fmtPct(dre.gross_margin_pct ?? 0)})`}
                value={dre.gross_profit}
                bold
                color={dre.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}
              />
              <DRERow label="(-) DESPESAS OPERACIONAIS" value={dre.opex} bold />
              {Object.entries(dre.breakdown.opex_by_category ?? {}).map(([cat, val]) => (
                <DRERow key={`opex-${cat}`} label={catLabel(cat)} value={val} indent />
              ))}
              <DRERow
                label={`(=) EBITDA / RESULTADO (${fmtPct(dre.ebitda_margin_pct ?? 0)})`}
                value={dre.ebitda}
                bold
                color={dre.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

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
  operational_costs: number;
  gross_profit: number;
  breakdown: {
    by_category: Record<string, number>;
    by_payment_source: { particular: number; health_plan: number };
    by_payment_method: Record<string, number>;
  };
}

interface MonthlyDRE extends DRE {
  period: string;
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
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
          <p className={cn('text-2xl font-bold', color)}>{fmt(value)}</p>
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
  const [loading, setLoading] = useState(true);

  const fetchDRE = async () => {
    setLoading(true);
    try {
      const [dreRes, monthlyRes] = await Promise.all([
        api.get<DRE>(`/financial-reports/dre?period=${period}`),
        api.get<MonthlyDRE[]>('/financial-reports/dre/monthly'),
      ]);
      setDRE(dreRes.data);
      setMonthly(monthlyRes.data);
    } catch {
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDRE(); }, [period]);

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Receita Bruta" value={dre?.gross_revenue ?? 0} icon={TrendingUp} color="text-green-600" loading={loading} />
        <SummaryCard title="Receita Líquida" value={dre?.net_revenue ?? 0} icon={DollarSign} color="text-blue-600" loading={loading} />
        <SummaryCard title="Custos Operacionais" value={dre?.operational_costs ?? 0} icon={TrendingDown} color="text-orange-500" loading={loading} />
        <SummaryCard
          title="Resultado"
          value={dre?.gross_profit ?? 0}
          icon={BarChart2}
          color={(dre?.gross_profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
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
          <CardTitle className="text-sm font-medium">DRE Detalhado — {period}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : dre ? (
            <div>
              <DRERow label="(+) RECEITA BRUTA" value={dre.gross_revenue} bold />
              {Object.entries(dre.breakdown.by_category).map(([cat, val]) => (
                <DRERow key={cat} label={cat} value={val} indent />
              ))}
              <DRERow label="(-) DEDUÇÕES" value={dre.deductions} bold />
              <DRERow label="(=) RECEITA LÍQUIDA" value={dre.net_revenue} bold color="text-blue-600" />
              <DRERow label="(-) CUSTOS OPERACIONAIS" value={dre.operational_costs} bold />
              <DRERow
                label="(=) RESULTADO"
                value={dre.gross_profit}
                bold
                color={dre.gross_profit >= 0 ? 'text-green-600' : 'text-red-600'}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
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

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');
}

const RANGE_OPTIONS = [30, 60, 90];

export default function FluxoCaixaPage() {
  const [days, setDays] = useState(60);
  const [data, setData] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<CashFlow>(`/financial-reports/fluxo-caixa?days=${days}`);
      setData(res.data);
    } catch {
      toast.error('Erro ao carregar fluxo de caixa');
    } finally {
      setLoading(false);
    }
  }, [days]);

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fluxo de Caixa Projetado</h1>
          <p className="text-sm text-muted-foreground">
            Entradas por liquidação esperada e saídas por vencimento das contas a pagar.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? 'default' : 'outline'}
              onClick={() => setDays(r)}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {data && data.summary.negative_days > 0 && data.summary.first_negative_day && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Saldo projetado negativo a partir de <strong>{fmtDate(data.summary.first_negative_day)}</strong>.
            Antecipe recebimentos ou adie pagamentos.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entradas Previstas ({days}d)
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
              Saídas Previstas ({days}d)
            </CardTitle>
            <TrendingDown className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-red-600">{fmt(data?.summary.total_outflows)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Projetado</CardTitle>
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
          <CardTitle className="text-sm font-medium">Projeção — próximos {days} dias</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem movimentação prevista no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} stackOffset="sign">
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v, name) => [
                    fmt(Math.abs(Number(v))),
                    name === 'entrada' ? 'Entrada' : name === 'saida' ? 'Saída' : 'Saldo acumulado',
                  ]}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar dataKey="entrada" stackId="mov" fill="#22c55e" name="entrada" />
                <Bar dataKey="saida" stackId="mov" fill="#ef4444" name="saida" />
                <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} dot={false} name="saldo" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Dias com movimentação</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : movementDays.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem movimentação prevista.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Data</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Entradas</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Saídas</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Líquido</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Saldo Acumulado</TableHead>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

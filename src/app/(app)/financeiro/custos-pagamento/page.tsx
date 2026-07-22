'use client';

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  debit: 'Débito',
  credit_1x: 'Crédito 1x',
  credit_installment: 'Crédito Parcelado',
  boleto: 'Boleto',
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

type PieLabelPayload = {
  name?: string;
  percent?: number;
};

function formatPieLabel(payload: PieLabelPayload): string {
  return `${payload.name ?? ''} (${((payload.percent ?? 0) * 100).toFixed(0)}%)`;
}

export default function CustosPagamentoPage() {
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const { data = {}, isLoading: loading, error } = useCustosPagamentoQuery(period);

  useEffect(() => {
    if (error) toast.error(getApiErrorMessage(error, 'Erro ao carregar dados'));
  }, [error]);

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
          <h1 className="text-2xl font-bold">Custos por Forma de Pagamento</h1>
          <p className="text-sm text-muted-foreground">Análise de taxas e volume transacionado</p>
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
          { label: 'Total em Taxas no Período', value: totalFees, color: 'text-orange-500' },
          { label: 'Receita Líquida (após taxas)', value: netRevenue, color: 'text-green-600' },
          { label: 'Se 100% fosse PIX, teria a mais', value: pixOnlySavings, color: 'text-blue-600' },
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
            <CardTitle className="text-sm font-medium">Distribuição por Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius="70%" dataKey="value" label={formatPieLabel}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Detalhamento por Método</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>Forma</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

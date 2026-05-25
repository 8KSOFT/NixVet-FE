'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, DollarSign, TrendingDown, Percent } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '@/lib/axios';

interface Summary {
  gross_revenue: number;
  total_cost: number;
  net_revenue: number;
  margin_pct: number;
}

interface PeriodItem {
  date: string;
  gross: number;
  net: number;
}

interface RevenueItem {
  description: string | null;
  item_type: string;
  quantity: number;
  charged_amount: number;
  cost_amount: number;
  net_amount: number;
  payment_source: 'particular' | 'health_plan';
  health_plan_name: string | null;
}

interface AnalysisData {
  summary: Summary;
  by_period: PeriodItem[];
  items: RevenueItem[];
}

interface HealthPlan {
  id: string;
  name: string;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function today() {
  return new Date().toISOString().substring(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
}

export default function ReceitaLiquidaPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [healthPlanId, setHealthPlanId] = useState('all');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    api.get('/health-plans', { params: { limit: 200 } }).then((res) => {
      const d = res.data?.items ?? res.data?.data ?? res.data ?? [];
      setPlans(Array.isArray(d) ? d : []);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from, to };
      if (healthPlanId !== 'all') params.health_plan_id = healthPlanId;
      const res = await api.get('/financial-reports/revenue-analysis', { params });
      setData(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? 'Erro ao carregar análise');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const sortedItems = data
    ? [...data.items].sort((a, b) =>
        sortDir === 'desc' ? b.net_amount - a.net_amount : a.net_amount - b.net_amount
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold text-primary">Análise de Receita Líquida</h1>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">De</p>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Até</p>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Convênio</p>
              <Select value={healthPlanId} onValueChange={setHealthPlanId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="particular">Particular</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-primary" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {data && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Receita Bruta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtBRL(data.summary.gross_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" /> Custo (Lab/Proc)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{fmtBRL(data.summary.total_cost)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" /> Receita Líquida
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{fmtBRL(data.summary.net_revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-500" /> Margem
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-500">{data.summary.margin_pct.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico por período */}
          {data.by_period.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.by_period}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${Number(v).toFixed(0)}`} />
                    <Tooltip
                      formatter={(value) => fmtBRL(Number(value))}
                    />
                    <Legend />
                    <Bar dataKey="gross" name="Receita Bruta" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="net" name="Receita Líquida" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabela breakdown */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Detalhamento por item</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              >
                Receita Líquida {sortDir === 'desc' ? '↓' : '↑'}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cobrado</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma receita no período
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{item.description ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.item_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtBRL(item.charged_amount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{fmtBRL(item.cost_amount)}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.net_amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtBRL(item.net_amount)}
                      </TableCell>
                      <TableCell>
                        {item.payment_source === 'particular' ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300">Particular</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300">{item.health_plan_name ?? 'Convênio'}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

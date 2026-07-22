'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, CircleDollarSign, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';

type ReceivableStatus = 'pending' | 'received' | 'partial' | 'glossed' | 'contested';

interface Receivable {
  id: string;
  health_plan_id: string;
  health_plan?: { id: string; name: string } | null;
  financial_entry_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  expected_repasse_date: string;
  expected_amount: number;
  status: ReceivableStatus;
  received_amount: number;
  glosa_amount: number;
  glosa_reason: string | null;
  received_at: string | null;
}

interface AgingBucket {
  count: number;
  amount: number;
}

interface Aging {
  on_time: AgingBucket;
  late_1_30: AgingBucket;
  late_31_60: AgingBucket;
  late_61_90: AgingBucket;
  late_over_90: AgingBucket;
  total_pending: number;
  total_glossed: number;
  by_plan: Record<
    string,
    {
      plan_name: string;
      on_time: AgingBucket;
      late_1_30: AgingBucket;
      late_31_60: AgingBucket;
      late_61_90: AgingBucket;
      late_over_90: AgingBucket;
      total: number;
    }
  >;
}

interface HealthPlan {
  id: string;
  name: string;
}

const STATUS_META: Record<ReceivableStatus, { label: string; variant: 'secondary' | 'destructive' | 'default' | 'outline'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  received: { label: 'Recebido', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  partial: { label: 'Parcial', variant: 'default', className: 'bg-orange-500 hover:bg-orange-500' },
  glossed: { label: 'Glosado', variant: 'destructive' },
  contested: { label: 'Contestado', variant: 'outline' },
};

const REFERENCE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  hospitalization: 'Internação',
  exam: 'Exame',
  surgical_procedure: 'Procedimento',
};

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PlanosSaudeReceivablesPage() {
  const now = new Date();
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [aging, setAging] = useState<Aging | null>(null);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de recebimento
  const [receiving, setReceiving] = useState<Receivable | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedAt, setReceivedAt] = useState(todayISO());

  // Modal de glosa
  const [glossing, setGlossing] = useState<Receivable | null>(null);
  const [glosaAmount, setGlosaAmount] = useState('');
  const [glosaReason, setGlosaReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (planFilter !== 'all') params.set('health_plan_id', planFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (monthFilter !== 'all') params.set('month', monthFilter);
      const [listRes, agingRes, plansRes] = await Promise.all([
        api.get<Receivable[]>(`/health-plans/receivables?${params.toString()}`),
        api.get<Aging>('/health-plans/receivables/aging'),
        api.get<HealthPlan[]>('/health-plans'),
      ]);
      setReceivables(Array.isArray(listRes.data) ? listRes.data : []);
      setAging(agingRes.data);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
    } catch {
      toast.error('Erro ao carregar recebíveis de planos');
    } finally {
      setLoading(false);
    }
  }, [planFilter, statusFilter, monthFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lateTotal = aging
    ? aging.late_1_30.amount + aging.late_31_60.amount + aging.late_61_90.amount + aging.late_over_90.amount
    : 0;

  const openReceive = (r: Receivable) => {
    setReceiving(r);
    setReceivedAmount(String(r.expected_amount));
    setReceivedAt(todayISO());
  };

  const submitReceive = async () => {
    if (!receiving) return;
    const amount = Number(receivedAmount) || 0;
    if (amount <= 0) {
      toast.error('Informe o valor recebido');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/health-plans/receivables/${receiving.id}/received`, {
        received_amount: amount,
        received_at: receivedAt,
      });
      toast.success('Recebimento registrado');
      setReceiving(null);
      fetchData();
    } catch {
      toast.error('Erro ao registrar recebimento');
    } finally {
      setSubmitting(false);
    }
  };

  const openGlosa = (r: Receivable) => {
    setGlossing(r);
    setGlosaAmount(String(r.expected_amount));
    setGlosaReason('');
  };

  const submitGlosa = async () => {
    if (!glossing) return;
    const amount = Number(glosaAmount) || 0;
    if (amount <= 0) {
      toast.error('Informe o valor glosado');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/health-plans/receivables/${glossing.id}/glosa`, {
        glosa_amount: amount,
        glosa_reason: glosaReason || undefined,
      });
      toast.success('Glosa registrada');
      setGlossing(null);
      fetchData();
    } catch {
      toast.error('Erro ao registrar glosa');
    } finally {
      setSubmitting(false);
    }
  };

  const contest = async (r: Receivable) => {
    try {
      await api.patch(`/health-plans/receivables/${r.id}/contest`, {});
      toast.success('Glosa contestada');
      fetchData();
    } catch {
      toast.error('Erro ao contestar glosa');
    }
  };

  const agingCols: { key: keyof Aging['by_plan'][string]; label: string; late?: boolean }[] = [
    { key: 'on_time', label: 'No prazo' },
    { key: 'late_1_30', label: '1-30d atraso', late: true },
    { key: 'late_31_60', label: '31-60d', late: true },
    { key: 'late_61_90', label: '61-90d', late: true },
    { key: 'late_over_90', label: '+90d', late: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planos de Saúde — A Receber</h1>
        <p className="text-sm text-muted-foreground">
          Repasses esperados dos planos, aging de atrasos e controle de glosas.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Receber (no prazo)</CardTitle>
            <CircleDollarSign className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-blue-600">{fmt(aging?.on_time.amount)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Atraso</CardTitle>
            <AlertTriangle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-red-600">{fmt(lateTotal)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Glosado</CardTitle>
            <FileWarning className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-orange-500">{fmt(aging?.total_glossed)}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de aging por plano */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Aging por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : !aging || Object.keys(aging.by_plan).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum repasse pendente.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Plano</TableHead>
                    {agingCols.map((c) => (
                      <TableHead
                        key={String(c.key)}
                        className={cn(
                          'border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em]',
                          c.late ? 'text-red-600' : 'text-slate-600',
                        )}
                      >
                        {c.label}
                      </TableHead>
                    ))}
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(aging.by_plan).map(([planId, row]) => (
                    <TableRow key={planId}>
                      <TableCell className="border border-slate-200 px-3 py-3 font-medium text-slate-700">{row.plan_name}</TableCell>
                      {agingCols.map((c) => {
                        const bucket = row[c.key] as AgingBucket;
                        return (
                          <TableCell
                            key={String(c.key)}
                            className={cn(
                              'border border-slate-200 px-3 py-3 text-right tabular-nums',
                              c.late && bucket.amount > 0 ? 'bg-red-50 font-medium text-red-700' : 'text-slate-600',
                            )}
                          >
                            {bucket.amount > 0 ? fmt(bucket.amount) : '—'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="border border-slate-200 px-3 py-3 text-right font-semibold tabular-nums text-slate-700">
                        {fmt(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista detalhada */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Repasses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Plano</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="received">Recebido</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="glossed">Glosado</SelectItem>
                  <SelectItem value="contested">Contestado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mês do repasse</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : receivables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum repasse encontrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-full text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Plano</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Referência</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Valor Esperado</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Data Repasse</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Status</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivables.map((r) => {
                    const meta = STATUS_META[r.status];
                    const overdue =
                      (r.status === 'pending' || r.status === 'partial') && r.expected_repasse_date < todayISO();
                    return (
                      <TableRow key={r.id} className={cn(overdue && 'bg-red-50/50')}>
                        <TableCell className="border border-slate-200 px-3 py-3 font-medium text-slate-700">
                          {r.health_plan?.name ?? '—'}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          {r.reference_type ? (REFERENCE_LABELS[r.reference_type] ?? r.reference_type) : '—'}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-right tabular-nums text-slate-600">
                          {fmt(r.expected_amount)}
                          {r.status === 'partial' && (
                            <span className="block text-xs text-orange-600">recebido {fmt(r.received_amount)}</span>
                          )}
                        </TableCell>
                        <TableCell className={cn('border border-slate-200 px-3 py-3', overdue ? 'font-medium text-red-700' : 'text-slate-600')}>
                          {new Date(`${r.expected_repasse_date}T12:00:00`).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3">
                          <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-right">
                          {r.status === 'pending' || r.status === 'partial' || r.status === 'contested' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openReceive(r)}>
                                <CheckCircle className="mr-1 size-3.5" />
                                Receber
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openGlosa(r)}>
                                Glosa
                              </Button>
                            </div>
                          ) : r.status === 'glossed' ? (
                            <Button size="sm" variant="outline" onClick={() => contest(r)}>
                              Contestar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de recebimento */}
      <Dialog open={!!receiving} onOpenChange={(o) => !o && setReceiving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>
          {receiving && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{receiving.health_plan?.name}</span>
                  <span className="font-semibold">{fmt(receiving.expected_amount)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="recv-amount">Valor recebido (R$)</Label>
                <Input
                  id="recv-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={receivedAmount}
                  onChange={(ev) => setReceivedAmount(ev.target.value)}
                />
                {Number(receivedAmount) > 0 && Number(receivedAmount) < Number(receiving.expected_amount) && (
                  <p className="mt-1 text-xs text-orange-600">
                    Recebimento parcial — glosa de {fmt(Number(receiving.expected_amount) - Number(receivedAmount))}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="recv-date">Data do recebimento</Label>
                <Input
                  id="recv-date"
                  type="date"
                  value={receivedAt}
                  onChange={(ev) => setReceivedAt(ev.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiving(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={submitReceive} disabled={submitting}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de glosa */}
      <Dialog open={!!glossing} onOpenChange={(o) => !o && setGlossing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Glosa</DialogTitle>
          </DialogHeader>
          {glossing && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{glossing.health_plan?.name}</span>
                  <span className="font-semibold">{fmt(glossing.expected_amount)}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="glosa-amount">Valor glosado (R$)</Label>
                <Input
                  id="glosa-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={glosaAmount}
                  onChange={(ev) => setGlosaAmount(ev.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="glosa-reason">Motivo</Label>
                <Textarea
                  id="glosa-reason"
                  value={glosaReason}
                  onChange={(ev) => setGlosaReason(ev.target.value)}
                  rows={3}
                  placeholder="Ex.: procedimento não coberto"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlossing(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={submitGlosa} disabled={submitting}>
              Registrar Glosa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

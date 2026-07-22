'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock, CircleDollarSign, MoreHorizontal, Plus, Wallet } from 'lucide-react';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

type PayableStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

interface Payable {
  id: string;
  description: string;
  supplier: string | null;
  category: string;
  due_date: string;
  amount: number;
  status: PayableStatus;
  paid_at: string | null;
  payment_method: string | null;
  recurrence: string;
  notes: string | null;
  document_url: string | null;
  financial_entry_id: string | null;
}

interface PayablesSummary {
  total_month: number;
  paid: number;
  pending: number;
  overdue: number;
  overdue_amount: number;
  due_7_days: number;
  by_category: Record<string, number>;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'rent', label: 'Aluguel' },
  { value: 'personnel', label: 'Pessoal / Salários' },
  { value: 'utilities', label: 'Energia/Água/Internet' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipamentos' },
  { value: 'tax', label: 'Impostos / Taxas' },
  { value: 'lab_cost', label: 'Custo de Laboratório' },
  { value: 'medication_purchase', label: 'Compra de Medicamentos' },
  { value: 'material_purchase', label: 'Compra de Materiais' },
  { value: 'other', label: 'Outros' },
];

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none', label: 'Não repete' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'yearly', label: 'Anual' },
];

const PAY_METHODS: { value: string; label: string }[] = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'debit', label: 'Débito' },
  { value: 'transfer', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
];

const STATUS_META: Record<PayableStatus, { label: string; variant: 'secondary' | 'destructive' | 'default' | 'outline'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  overdue: { label: 'Vencida', variant: 'destructive' },
  paid: { label: 'Paga', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function catLabel(cat: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? cat;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function plusDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM = {
  description: '',
  supplier: '',
  category: '',
  amount: '',
  due_date: plusDaysISO(30),
  recurrence: 'none',
  notes: '',
  document_url: '',
};

// Ordenação: vencidas primeiro → pendentes por vencimento → pagas → canceladas.
const STATUS_ORDER: Record<PayableStatus, number> = { overdue: 0, pending: 1, paid: 2, cancelled: 3 };

export default function ContasPagarPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [month, setMonth] = useState(currentMonth);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [payables, setPayables] = useState<Payable[]>([]);
  const [summary, setSummary] = useState<PayablesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Drawer de criação/edição
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Dialog de pagamento
  const [paying, setPaying] = useState<Payable | null>(null);
  const [payMethod, setPayMethod] = useState('');
  const [payDate, setPayDate] = useState(todayISO());
  const [submittingPay, setSubmittingPay] = useState(false);

  const setField = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const [listRes, summaryRes] = await Promise.all([
        api.get<Payable[]>(`/payables?${params.toString()}`),
        api.get<PayablesSummary>(`/payables/summary?month=${month}`),
      ]);
      const list = Array.isArray(listRes.data) ? listRes.data : [];
      list.sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        return a.due_date.localeCompare(b.due_date);
      });
      setPayables(list);
      setSummary(summaryRes.data);
    } catch {
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, due_date: plusDaysISO(30) });
    setDrawerOpen(true);
  };

  const openEdit = (p: Payable) => {
    setEditing(p);
    setForm({
      description: p.description,
      supplier: p.supplier ?? '',
      category: p.category,
      amount: String(p.amount),
      due_date: p.due_date,
      recurrence: p.recurrence ?? 'none',
      notes: p.notes ?? '',
      document_url: p.document_url ?? '',
    });
    setDrawerOpen(true);
  };

  const submitForm = async () => {
    const amount = Number(form.amount) || 0;
    if (!form.description || !form.category || amount <= 0 || !form.due_date) {
      toast.error('Preencha descrição, categoria, valor e vencimento');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description,
        supplier: form.supplier || undefined,
        category: form.category,
        amount,
        due_date: form.due_date,
        recurrence: form.recurrence,
        notes: form.notes || undefined,
        document_url: form.document_url || undefined,
      };
      if (editing) {
        await api.patch(`/payables/${editing.id}`, payload);
        toast.success('Conta atualizada');
      } else {
        await api.post('/payables', payload);
        toast.success('Conta criada');
      }
      setDrawerOpen(false);
      fetchData();
    } catch {
      toast.error('Erro ao salvar conta');
    } finally {
      setSaving(false);
    }
  };

  const openPay = (p: Payable) => {
    setPaying(p);
    setPayMethod('');
    setPayDate(todayISO());
  };

  const submitPay = async () => {
    if (!paying || !payMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    setSubmittingPay(true);
    try {
      await api.patch(`/payables/${paying.id}/pay`, { payment_method: payMethod, paid_at: payDate });
      toast.success('Conta paga e lançamento financeiro criado');
      setPaying(null);
      fetchData();
    } catch {
      toast.error('Erro ao registrar pagamento');
    } finally {
      setSubmittingPay(false);
    }
  };

  const cancelPayable = async (p: Payable) => {
    try {
      await api.patch(`/payables/${p.id}/cancel`, {});
      toast.success('Conta cancelada');
      fetchData();
    } catch {
      toast.error('Erro ao cancelar conta');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">
            Controle de despesas com vencimento; ao pagar, o lançamento financeiro é criado automaticamente.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nova Conta
        </Button>
      </div>

      {summary && summary.overdue > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            Você tem {summary.overdue} conta{summary.overdue === 1 ? '' : 's'} vencida{summary.overdue === 1 ? '' : 's'} totalizando{' '}
            <strong>{fmt(summary.overdue_amount)}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vencido</CardTitle>
            <AlertTriangle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-red-600">{fmt(summary?.overdue_amount)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">A Vencer em 7 dias</CardTitle>
            <CalendarClock className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-orange-500">{fmt(summary?.due_7_days)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total previsto no mês</CardTitle>
            <CircleDollarSign className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-blue-600">{fmt(summary?.total_month)}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Vencida</SelectItem>
              <SelectItem value="paid">Paga</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Contas do mês {month}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Vencimento</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Fornecedor</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Descrição</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Categoria</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Valor</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Status</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payables.map((p) => {
                    const meta = STATUS_META[p.status];
                    return (
                      <TableRow key={p.id} className={cn(p.status === 'overdue' && 'bg-red-50/50')}>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          {new Date(`${p.due_date}T12:00:00`).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">{p.supplier ?? '—'}</TableCell>
                        <TableCell className="max-w-[260px] truncate border border-slate-200 px-3 py-3 text-slate-600">{p.description}</TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                          <Badge variant="secondary">{catLabel(p.category)}</Badge>
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-right tabular-nums text-slate-600">{fmt(p.amount)}</TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3">
                          <Badge variant={meta.variant} className={meta.className}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="border border-slate-200 px-3 py-3 text-right">
                          {p.status === 'pending' || p.status === 'overdue' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openPay(p)}>
                                <Wallet className="mr-1 size-3.5" />
                                Pagar
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(p)}>Editar</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => cancelPayable(p)}>
                                    Cancelar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : p.status === 'paid' ? (
                            <Link
                              href="/financeiro/lancamentos"
                              target="_blank"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Ver lançamento
                            </Link>
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

      {/* Drawer de criação/edição */}
      <Sheet open={drawerOpen} onOpenChange={(o) => !o && setDrawerOpen(false)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? 'Editar conta' : 'Nova conta a pagar'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="p-description">Descrição *</Label>
              <Input
                id="p-description"
                value={form.description}
                onChange={(ev) => setField('description', ev.target.value)}
                placeholder="Ex.: Aluguel julho 2026"
              />
            </div>
            <div>
              <Label htmlFor="p-supplier">Fornecedor</Label>
              <Input
                id="p-supplier"
                value={form.supplier}
                onChange={(ev) => setField('supplier', ev.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-amount">Valor (R$) *</Label>
                <Input
                  id="p-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(ev) => setField('amount', ev.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="p-due">Vencimento *</Label>
                <Input
                  id="p-due"
                  type="date"
                  value={form.due_date}
                  onChange={(ev) => setField('due_date', ev.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Recorrência</Label>
              <Select value={form.recurrence} onValueChange={(v) => setField('recurrence', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-notes">Observações</Label>
              <Textarea
                id="p-notes"
                value={form.notes}
                onChange={(ev) => setField('notes', ev.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="p-doc">Documento (URL)</Label>
              <Input
                id="p-doc"
                value={form.document_url}
                onChange={(ev) => setField('document_url', ev.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={saving}>
              {editing ? 'Salvar alterações' : 'Criar conta'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Dialog de confirmação de pagamento */}
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>

          {paying && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Descrição</span>
                  <span className="font-medium">{paying.description}</span>
                </div>
                {paying.supplier && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">Fornecedor</span>
                    <span>{paying.supplier}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-semibold">{fmt(paying.amount)}</span>
                </div>
              </div>

              <div>
                <Label>Forma de pagamento *</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pay-date">Data do pagamento</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(ev) => setPayDate(ev.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={submittingPay}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={submitPay}
              disabled={submittingPay || !payMethod}
            >
              <Wallet className="mr-2 size-4" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

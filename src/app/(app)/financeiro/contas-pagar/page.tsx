'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
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
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '@/lib/i18n/currency';

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
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();

  const CATEGORY_OPTIONS: { value: string; label: string }[] = [
    { value: 'rent', label: t('financeiroContasPagar.categories.rent') },
    { value: 'personnel', label: t('financeiroContasPagar.categories.personnel') },
    { value: 'utilities', label: t('financeiroContasPagar.categories.utilities') },
    { value: 'marketing', label: t('financeiroContasPagar.categories.marketing') },
    { value: 'equipment', label: t('financeiroContasPagar.categories.equipment') },
    { value: 'tax', label: t('financeiroContasPagar.categories.tax') },
    { value: 'lab_cost', label: t('financeiroContasPagar.categories.labCost') },
    { value: 'medication_purchase', label: t('financeiroContasPagar.categories.medicationPurchase') },
    { value: 'material_purchase', label: t('financeiroContasPagar.categories.materialPurchase') },
    { value: 'other', label: t('financeiroContasPagar.categories.other') },
  ];

  const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
    { value: 'none', label: t('financeiroContasPagar.recurrence.none') },
    { value: 'monthly', label: t('financeiroContasPagar.recurrence.monthly') },
    { value: 'weekly', label: t('financeiroContasPagar.recurrence.weekly') },
    { value: 'yearly', label: t('financeiroContasPagar.recurrence.yearly') },
  ];

  const PAY_METHODS: { value: string; label: string }[] = [
    { value: 'cash', label: t('financeiroContasPagar.payMethods.cash') },
    { value: 'pix', label: t('financeiroContasPagar.payMethods.pix') },
    { value: 'debit', label: t('financeiroContasPagar.payMethods.debit') },
    { value: 'transfer', label: t('financeiroContasPagar.payMethods.transfer') },
    { value: 'boleto', label: t('financeiroContasPagar.payMethods.boleto') },
  ];

  const STATUS_META: Record<PayableStatus, { label: string; variant: 'secondary' | 'destructive' | 'default' | 'outline'; className?: string }> = {
    pending: { label: t('financeiroContasPagar.statusPending'), variant: 'secondary' },
    overdue: { label: t('financeiroContasPagar.statusOverdue'), variant: 'destructive' },
    paid: { label: t('financeiroContasPagar.statusPaid'), variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
    cancelled: { label: t('financeiroContasPagar.statusCancelled'), variant: 'outline' },
  };

  const catLabel = (cat: string) => CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? cat;

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
      toast.error(t('financeiroContasPagar.loadError'));
    } finally {
      setLoading(false);
    }
  }, [month, statusFilter, categoryFilter, t]);

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
      toast.error(t('financeiroContasPagar.formValidationError'));
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
        toast.success(t('financeiroContasPagar.updateSuccess'));
      } else {
        await api.post('/payables', payload);
        toast.success(t('financeiroContasPagar.createSuccess'));
      }
      setDrawerOpen(false);
      fetchData();
    } catch {
      toast.error(t('financeiroContasPagar.saveError'));
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
      toast.error(t('financeiroContasPagar.selectPaymentMethodError'));
      return;
    }
    setSubmittingPay(true);
    try {
      await api.patch(`/payables/${paying.id}/pay`, { payment_method: payMethod, paid_at: payDate });
      toast.success(t('financeiroContasPagar.paySuccess'));
      setPaying(null);
      fetchData();
    } catch {
      toast.error(t('financeiroContasPagar.payError'));
    } finally {
      setSubmittingPay(false);
    }
  };

  const cancelPayable = async (p: Payable) => {
    try {
      await api.patch(`/payables/${p.id}/cancel`, {});
      toast.success(t('financeiroContasPagar.cancelSuccess'));
      fetchData();
    } catch {
      toast.error(t('financeiroContasPagar.cancelError'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroContasPagar.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('financeiroContasPagar.subtitle')}
          </p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('financeiroContasPagar.newButton')}
        </Button>
      </div>

      {summary && summary.overdue > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="size-4 shrink-0" />
          <span>
            {t('financeiroContasPagar.overdueAlert', { count: summary.overdue })}{' '}
            <strong>{fmt(summary.overdue_amount)}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroContasPagar.totalOverdue')}</CardTitle>
            <AlertTriangle className="size-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-red-600">{fmt(summary?.overdue_amount)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroContasPagar.dueIn7Days')}</CardTitle>
            <CalendarClock className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-orange-500">{fmt(summary?.due_7_days)}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('financeiroContasPagar.totalForecastMonth')}</CardTitle>
            <CircleDollarSign className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-7 w-28" /> : <p className="text-2xl font-bold text-blue-600">{fmt(summary?.total_month)}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 sm:flex-none">
          <Label className="text-xs text-muted-foreground">{t('financeiroContasPagar.monthLabel')}</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Categoria vai pro fim da linha no mobile (order-last) e ocupa a
            largura toda sozinha — Mês e Status ficam juntos numa linha
            (cabem: 130px + 150px + gap). Desktop mantém a ordem/tamanho de
            sempre (order-none desfaz o reordenamento). */}
        <div className="order-last w-full sm:order-none sm:w-auto">
          <Label className="text-xs text-muted-foreground">{t('financeiroContasPagar.categoryLabel')}</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('financeiroContasPagar.allCategories')}</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 flex-1 sm:flex-none">
          <Label className="text-xs text-muted-foreground">{t('financeiroContasPagar.statusLabel')}</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('financeiroContasPagar.allStatuses')}</SelectItem>
              <SelectItem value="pending">{t('financeiroContasPagar.statusPending')}</SelectItem>
              <SelectItem value="overdue">{t('financeiroContasPagar.statusOverdue')}</SelectItem>
              <SelectItem value="paid">{t('financeiroContasPagar.statusPaid')}</SelectItem>
              <SelectItem value="cancelled">{t('financeiroContasPagar.statusCancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('financeiroContasPagar.monthCardTitle', { month })}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : payables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('financeiroContasPagar.emptyState')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.tableHeaderDueDate')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.supplierLabel')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.descriptionLabel')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.categoryLabel')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.amountLabel')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.statusLabel')}</TableHead>
                    <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">{t('financeiroContasPagar.tableHeaderActions')}</TableHead>
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
                                {t('financeiroContasPagar.payButton')}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEdit(p)}>{t('financeiroContasPagar.editItem')}</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => cancelPayable(p)}>
                                    {t('financeiroContasPagar.cancel')}
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
                              {t('financeiroContasPagar.viewEntry')}
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

      {/* Modal de criação/edição — mesmo padrão (DashboardCreateFormDialog) usado
          no resto do financeiro (ex.: Novo Orçamento), em vez do Sheet lateral
          que essa tela usava antes e destoava do resto do app. */}
      <DashboardCreateFormDialog
        open={drawerOpen}
        onOpenChange={(o) => !o && setDrawerOpen(false)}
        title={editing ? t('financeiroContasPagar.editSheetTitle') : t('financeiroContasPagar.createSheetTitle')}
        contentClassName="md:max-w-lg"
        preventOutsideClose
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="border border-gray-300" onClick={() => setDrawerOpen(false)} disabled={saving}>
              {t('financeiroContasPagar.cancel')}
            </Button>
            <Button type="button" onClick={submitForm} disabled={saving}>
              {editing ? t('financeiroContasPagar.saveChangesButton') : t('financeiroContasPagar.createButton')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
          <div className="space-y-1">
            <Label htmlFor="p-description">{t('financeiroContasPagar.descriptionFieldLabel')}</Label>
            <Input
              id="p-description"
              value={form.description}
              onChange={(ev) => setField('description', ev.target.value)}
              placeholder={t('financeiroContasPagar.descriptionPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="p-supplier">{t('financeiroContasPagar.supplierLabel')}</Label>
              <Input
                id="p-supplier"
                value={form.supplier}
                onChange={(ev) => setField('supplier', ev.target.value)}
                placeholder={t('financeiroContasPagar.supplierPlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('financeiroContasPagar.categoryFieldLabel')}</Label>
              <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('financeiroContasPagar.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="p-amount">{t('financeiroContasPagar.amountFieldLabel')}</Label>
              <CurrencyInput
                id="p-amount"
                value={form.amount}
                onValueChange={(v) => setField('amount', v)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="p-due">{t('financeiroContasPagar.dueDateFieldLabel')}</Label>
              <Input
                id="p-due"
                type="date"
                value={form.due_date}
                onChange={(ev) => setField('due_date', ev.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('financeiroContasPagar.recurrenceFieldLabel')}</Label>
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
            <div className="space-y-1">
              <Label htmlFor="p-doc">{t('financeiroContasPagar.documentFieldLabel')}</Label>
              <Input
                id="p-doc"
                value={form.document_url}
                onChange={(ev) => setField('document_url', ev.target.value)}
                placeholder={t('financeiroContasPagar.documentPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="p-notes">{t('financeiroContasPagar.notesFieldLabel')}</Label>
            <Textarea
              id="p-notes"
              value={form.notes}
              onChange={(ev) => setField('notes', ev.target.value)}
              rows={3}
            />
          </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Dialog de confirmação de pagamento */}
      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('financeiroContasPagar.confirmPayment')}</DialogTitle>
          </DialogHeader>

          {paying && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('financeiroContasPagar.descriptionLabel')}</span>
                  <span className="font-medium">{paying.description}</span>
                </div>
                {paying.supplier && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-muted-foreground">{t('financeiroContasPagar.supplierLabel')}</span>
                    <span>{paying.supplier}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">{t('financeiroContasPagar.amountLabel')}</span>
                  <span className="font-semibold">{fmt(paying.amount)}</span>
                </div>
              </div>

              <div>
                <Label>{t('financeiroContasPagar.paymentMethodFieldLabel')}</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroContasPagar.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pay-date">{t('financeiroContasPagar.paymentDateFieldLabel')}</Label>
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
              {t('financeiroContasPagar.cancel')}
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={submitPay}
              disabled={submittingPay || !payMethod}
            >
              <Wallet className="mr-2 size-4" />
              {t('financeiroContasPagar.confirmPayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

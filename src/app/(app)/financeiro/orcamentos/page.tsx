'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, CheckCircle, Eye, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useProductsQuery } from '@/hooks/apiHooks/useProducts';
import { usePatientsListQuery } from '@/hooks/apiHooks/usePatients';
import { useVeterinariansQuery } from '@/hooks/apiHooks/useUsers';
import {
  useApproveBudgetMutation,
  useBudgetsQuery,
  useCancelBudgetMutation,
  useCreateBudgetMutation,
  useDownloadBudgetPdfMutation,
} from '@/hooks/apiHooks/useBudgets';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Budget, BudgetItem, BudgetItemType, BudgetPayload, BudgetType } from '@/app/types/budget';

type BudgetBadgeVariant = 'secondary' | 'default' | 'destructive';

interface BudgetFormItem {
  item_type: BudgetItemType;
  reference_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
}

interface BudgetFormValues {
  patient_id: string;
  veterinarian_id: string;
  type: BudgetType;
  valid_until: string;
  notes: string;
  items: BudgetFormItem[];
}

function emptyBudgetItem(): BudgetFormItem {
  return {
    item_type: 'procedure',
    reference_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    covered_by_plan: false,
    plan_coverage_amount: 0,
  };
}

function getStatusLabel(t: (key: string) => string, status: string): string {
  const labels: Record<string, string> = {
    draft: t('financeiroOrcamentos.statusDraft'),
    sent: t('financeiroOrcamentos.statusSent'),
    approved: t('financeiroOrcamentos.statusApproved'),
    rejected: t('financeiroOrcamentos.statusRejected'),
    expired: t('financeiroOrcamentos.statusExpired'),
    converted: t('financeiroOrcamentos.statusConverted'),
    cancelled: t('financeiroOrcamentos.statusCancelled'),
  };
  return labels[status] ?? status;
}

const STATUS_COLORS: Record<string, BudgetBadgeVariant> = {
  draft: 'secondary',
  sent: 'default',
  approved: 'default',
  rejected: 'destructive',
  expired: 'secondary',
  converted: 'default',
  cancelled: 'destructive',
};

/** Só faz sentido cancelar o que ainda não virou internação/consulta nem já foi cancelado. */
function canCancel(status: string) {
  return status !== 'cancelled' && status !== 'converted';
}

function computeTotals(items: BudgetItem[]) {
  const total = items.reduce((s, i) => s + Number(i.total_price), 0);
  const plan = items.reduce((s, i) => s + Number(i.plan_coverage_amount), 0);
  return { total, plan, tutor: total - plan };
}

export default function OrcamentosPage() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [toCancel, setToCancel] = useState<Budget | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const { data: patients = [] } = usePatientsListQuery();
  const { data: users = [] } = useVeterinariansQuery();
  const { data: products = [] } = useProductsQuery();

  const { data: budgets = [], isLoading: loading } = useBudgetsQuery();
  const createBudget = useCreateBudgetMutation();
  const approveBudget = useApproveBudgetMutation();
  const cancelBudget = useCancelBudgetMutation();
  const downloadBudgetPdf = useDownloadBudgetPdfMutation();

  const [form, setForm] = useState<BudgetFormValues>({
    patient_id: '',
    veterinarian_id: '',
    type: 'procedure',
    valid_until: '',
    notes: '',
    items: [emptyBudgetItem()],
  });

  const handleCreate = async () => {
    if (!form.patient_id) {
      toast.error(t('financeiroOrcamentos.selectPatientError'));
      return;
    }
    const invalidItem = form.items.find((item) =>
      item.item_type === 'product' ? !item.reference_id : !item.description.trim(),
    );
    if (invalidItem) {
      toast.error(t('financeiroOrcamentos.fillItemsError'));
      return;
    }

    const payload: BudgetPayload = {
      ...form,
      veterinarian_id: form.veterinarian_id || undefined,
      items: form.items.map((item) =>
        item.item_type === 'product'
          ? {
              item_type: 'product',
              reference_id: item.reference_id,
              quantity: item.quantity,
              discount_percentage: item.discount_percentage,
              covered_by_plan: item.covered_by_plan,
              plan_coverage_amount: item.plan_coverage_amount,
            }
          : {
              item_type: item.item_type,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount_percentage: item.discount_percentage,
              covered_by_plan: item.covered_by_plan,
              plan_coverage_amount: item.plan_coverage_amount,
            },
      ),
    };

    try {
      await createBudget.mutateAsync(payload);
      setOpenNew(false);
      setForm({
        patient_id: '',
        veterinarian_id: '',
        type: 'procedure',
        valid_until: '',
        notes: '',
        items: [emptyBudgetItem()],
      });
    } catch {
      toast.error(t('financeiroOrcamentos.createError'));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveBudget.mutateAsync(id);
    } catch {
      toast.error(t('financeiroOrcamentos.approveError'));
    }
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      const result = await cancelBudget.mutateAsync({
        id: toCancel.id,
        reason: cancelReason.trim() || undefined,
      });
      const kept = result?.financial?.kept_confirmed ?? 0;
      toast.success(
        kept > 0
          ? t('financeiroOrcamentos.cancelSuccessWithKept', { count: kept })
          : t('financeiroOrcamentos.cancelSuccess'),
      );
      setToCancel(null);
      setCancelReason('');
      if (selected?.id === toCancel.id) setSelected(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('financeiroOrcamentos.cancelError')));
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await downloadBudgetPdf.mutateAsync(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orcamento-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('financeiroOrcamentos.pdfError'));
    }
  };

  const addItem = () => {
    setForm((f) => ({
      ...f,
      items: [...f.items, emptyBudgetItem()],
    }));
  };

  const removeItem = (index: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const updateItem = <TKey extends keyof BudgetFormItem>(index: number, key: TKey, value: BudgetFormItem[TKey]) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      return { ...f, items };
    });
  };

  const setItemType = (index: number, itemType: BudgetItemType) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...emptyBudgetItem(), item_type: itemType, quantity: items[index].quantity };
      return { ...f, items };
    });
  };

  const selectItemProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    setForm((f) => {
      const items = [...f.items];
      items[index] = {
        ...items[index],
        reference_id: productId,
        description: product?.name ?? '',
        unit_price: product?.sale_price ?? 0,
      };
      return { ...f, items };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('financeiroOrcamentos.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('financeiroOrcamentos.subtitle')}</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          {t('financeiroOrcamentos.newBudget')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 rounded-lg border border-gray-300 bg-white p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
          {t('financeiroOrcamentos.emptyState')}
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>{t('financeiroOrcamentos.columnNumber')}</TableHead>
                  <TableHead>{t('financeiroOrcamentos.patient')}</TableHead>
                  <TableHead>{t('financeiroOrcamentos.type')}</TableHead>
                  <TableHead className="text-right">{t('financeiroOrcamentos.total')}</TableHead>
                  <TableHead className="text-right">{t('financeiroOrcamentos.planCoverage')}</TableHead>
                  <TableHead className="text-right">{t('financeiroOrcamentos.tutorPays')}</TableHead>
                  <TableHead>{t('financeiroOrcamentos.status')}</TableHead>
                  <TableHead>{t('financeiroOrcamentos.validity')}</TableHead>
                  <TableHead>{t('financeiroOrcamentos.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((b) => {
                  const totals = computeTotals(b.items ?? []);
                  const totalFmt = b.summary?.total_formatted ?? fmt(totals.total);
                  const planFmt = b.summary?.plan_coverage_formatted ?? fmt(totals.plan);
                  const tutorFmt = b.summary?.tutor_responsibility_formatted ?? fmt(totals.tutor);
                  return (
                    <TableRow className="cursor-pointer hover:bg-muted/50 border-b border-gray-300 h-15" key={b.id}>
                      <TableCell className="font-mono text-xs">{b.id.substring(0, 8).toUpperCase()}</TableCell>
                      <TableCell>{b.patient?.name}</TableCell>
                      <TableCell>
                        {b.type === 'procedure'
                          ? t('financeiroOrcamentos.typeProcedure')
                          : t('financeiroOrcamentos.typeHospitalization')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{totalFmt}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">{planFmt}</TableCell>
                      <TableCell className="text-right tabular-nums text-blue-600">{tutorFmt}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[b.status] ?? 'secondary'}>
                          {getStatusLabel(t, b.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.valid_until ? new Date(b.valid_until).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelected(b)} title={t('financeiroOrcamentos.viewAction')}>
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(b.id)} title={t('financeiroOrcamentos.pdfAction')}>
                            <FileText className="size-4" />
                          </Button>
                          {b.status === 'draft' || b.status === 'sent' ? (
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(b.id)} title={t('financeiroOrcamentos.approveAction')}>
                              <CheckCircle className="size-4 text-green-600" />
                            </Button>
                          ) : null}
                          {canCancel(b.status) ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setToCancel(b)}
                              title={t('financeiroOrcamentos.cancelIconTitle')}
                            >
                              <XCircle className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {budgets.map((b) => {
              const totals = computeTotals(b.items ?? []);
              const totalFmt = b.summary?.total_formatted ?? fmt(totals.total);
              const planFmt = b.summary?.plan_coverage_formatted ?? fmt(totals.plan);
              const tutorFmt = b.summary?.tutor_responsibility_formatted ?? fmt(totals.tutor);
              return (
                <div key={b.id} className="rounded-lg border border-gray-300 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{b.patient?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{b.id.substring(0, 8).toUpperCase()} ·{' '}
                        {b.type === 'procedure'
                          ? t('financeiroOrcamentos.typeProcedure')
                          : t('financeiroOrcamentos.typeHospitalization')}
                      </p>
                    </div>
                    <Badge variant={STATUS_COLORS[b.status] ?? 'secondary'} className="shrink-0">
                      {getStatusLabel(t, b.status)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('financeiroOrcamentos.total')}</p>
                      <p className="tabular-nums">{totalFmt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('financeiroOrcamentos.validity')}</p>
                      <p>{b.valid_until ? new Date(b.valid_until).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('financeiroOrcamentos.planCoverage')}</p>
                      <p className="tabular-nums text-green-600">{planFmt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('financeiroOrcamentos.tutorPays')}</p>
                      <p className="tabular-nums text-blue-600">{tutorFmt}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(b)} title={t('financeiroOrcamentos.viewAction')}>
                      <Eye className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(b.id)} title={t('financeiroOrcamentos.pdfAction')}>
                      <FileText className="size-4" />
                    </Button>
                    {b.status === 'draft' || b.status === 'sent' ? (
                      <Button variant="ghost" size="icon" onClick={() => handleApprove(b.id)} title={t('financeiroOrcamentos.approveAction')}>
                        <CheckCircle className="size-4 text-green-600" />
                      </Button>
                    ) : null}
                    {canCancel(b.status) ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setToCancel(b)}
                        title={t('financeiroOrcamentos.cancelIconTitle')}
                      >
                        <XCircle className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Novo Orçamento */}
      <DashboardCreateFormDialog
        open={openNew}
        onOpenChange={setOpenNew}
        title={t('financeiroOrcamentos.newBudget')}
        contentClassName="md:max-w-3xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="border border-gray-300" onClick={() => setOpenNew(false)}>
              {t('financeiroOrcamentos.cancel')}
            </Button>
            <Button type="button" onClick={handleCreate}>
              {t('financeiroOrcamentos.createBudgetButton')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t('financeiroOrcamentos.patient')}</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroOrcamentos.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('financeiroOrcamentos.veterinarian')}</Label>
                <Select
                  value={form.veterinarian_id || '_none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v === '_none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroOrcamentos.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">{t('financeiroOrcamentos.useAuthenticatedVet')}</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('financeiroOrcamentos.type')}</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: BudgetType) => setForm((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="procedure">{t('financeiroOrcamentos.typeProcedure')}</SelectItem>
                    <SelectItem value="hospitalization">{t('financeiroOrcamentos.typeHospitalization')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('financeiroOrcamentos.validUntilLabel')}</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>{t('financeiroOrcamentos.itemsLabel')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  {t('financeiroOrcamentos.addItemButton')}
                </Button>
              </div>
              <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-12">
                <span className="col-span-3">{t('financeiroOrcamentos.type')}</span>
                <span className="col-span-4">{t('financeiroOrcamentos.productDescriptionColumn')}</span>
                <span className="col-span-2">{t('financeiroOrcamentos.quantityColumn')}</span>
                <span className="col-span-2">{t('financeiroOrcamentos.unitPriceColumn')}</span>
                <span className="col-span-1" />
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-3 sm:grid-cols-12">
                    <Select value={item.item_type} onValueChange={(v: BudgetItemType) => setItemType(i, v)}>
                      <SelectTrigger className="col-span-2 h-9 sm:col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="procedure">{t('financeiroOrcamentos.itemTypeManual')}</SelectItem>
                        <SelectItem value="product">{t('financeiroOrcamentos.itemTypeProduct')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {item.item_type === 'product' ? (
                      <Select value={item.reference_id} onValueChange={(v) => selectItemProduct(i, v)}>
                        <SelectTrigger className="col-span-2 h-9 sm:col-span-4">
                          <SelectValue placeholder={t('financeiroOrcamentos.selectProductPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} — {p.sale_price_formatted ?? fmt(p.sale_price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={t('financeiroOrcamentos.descriptionColumn')}
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        className="col-span-2 h-9 sm:col-span-4"
                      />
                    )}

                    <Input
                      type="number"
                      min={1}
                      placeholder={t('financeiroOrcamentos.quantityColumn')}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      className="col-span-1 h-9 sm:col-span-2"
                    />
                    <CurrencyInput
                      placeholder={t('financeiroOrcamentos.unitPriceColumn')}
                      value={item.unit_price}
                      disabled={item.item_type === 'product'}
                      onValueChange={(v) => updateItem(i, 'unit_price', Number(v))}
                      wrapperClassName="col-span-1 sm:col-span-2"
                      className="h-9 disabled:opacity-70"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 h-9 justify-self-end text-muted-foreground hover:text-destructive sm:col-span-1"
                      onClick={() => removeItem(i)}
                      disabled={form.items.length === 1}
                      title={t('financeiroOrcamentos.removeItemTitle')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
        </div>
      </DashboardCreateFormDialog>

      {/* Modal Detalhe */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="md:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {t('financeiroOrcamentos.budgetDetailTitle', { id: selected.id.substring(0, 8).toUpperCase() })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="font-medium">{t('financeiroOrcamentos.patient')}:</span> {selected.patient?.name}
                </div>
                <div>
                  <span className="font-medium">{t('financeiroOrcamentos.veterinarian')}:</span>{' '}
                  {selected.veterinarian?.name ?? '—'}
                </div>
                <div>
                  <span className="font-medium">{t('financeiroOrcamentos.type')}:</span> {selected.type}
                </div>
                <div>
                  <span className="font-medium">{t('financeiroOrcamentos.status')}:</span>{' '}
                  {getStatusLabel(t, selected.status)}
                </div>
                {selected.status === 'cancelled' && (
                  <div className="md:col-span-2 text-destructive">
                    <span className="font-medium">{getStatusLabel(t, 'cancelled')}</span>
                    {selected.cancelled_at
                      ? ' ' +
                        t('financeiroOrcamentos.cancelledOnDate', {
                          date: new Date(selected.cancelled_at).toLocaleDateString('pt-BR'),
                        })
                      : ''}
                    {selected.cancellation_reason ? ` — ${selected.cancellation_reason}` : ''}
                  </div>
                )}
              </div>
              {/* Desktop: tabela de 4 colunas */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('financeiroOrcamentos.descriptionColumn')}</TableHead>
                      <TableHead className="text-right">{t('financeiroOrcamentos.quantityColumn')}</TableHead>
                      <TableHead className="text-right">{t('financeiroOrcamentos.unitColumnShort')}</TableHead>
                      <TableHead className="text-right">{t('financeiroOrcamentos.total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selected.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {item.description}
                            {item.reference_type === 'product' && (
                              <Badge variant="secondary" className="text-[10px]">
                                {t('financeiroOrcamentos.itemTypeProduct')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.unit_price_formatted ?? fmt(Number(item.unit_price))}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.total_price_formatted ?? fmt(Number(item.total_price))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: cards — descrição + qtd/unit./total não cabem numa
                  linha só de tabela num viewport de telefone. */}
              <div className="space-y-2 md:hidden">
                {(selected.items ?? []).map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.description}</span>
                      {item.reference_type === 'product' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">
                          {t('financeiroOrcamentos.itemTypeProduct')}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {item.quantity} × {item.unit_price_formatted ?? fmt(Number(item.unit_price))}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {item.total_price_formatted ?? fmt(Number(item.total_price))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {(() => {
                const totals = computeTotals(selected.items ?? []);
                const totalFmt = selected.summary?.total_formatted ?? fmt(totals.total);
                const planFmt = selected.summary?.plan_coverage_formatted ?? fmt(totals.plan);
                const tutorFmt = selected.summary?.tutor_responsibility_formatted ?? fmt(totals.tutor);
                return (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t('financeiroOrcamentos.grandTotal')}</span>
                      <span className="font-semibold">{totalFmt}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>{t('financeiroOrcamentos.coveredByPlan')}</span>
                      <span>{planFmt}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>{t('financeiroOrcamentos.tutorResponsibility')}</span>
                      <span>{tutorFmt}</span>
                    </div>
                  </div>
                );
              })()}

              {canCancel(selected.status) && (
                <div className="flex justify-end border-t pt-3">
                  <Button variant="outline" className="text-destructive" onClick={() => setToCancel(selected)}>
                    <XCircle className="mr-2 size-4" />
                    {t('financeiroOrcamentos.cancelBudgetButton')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmação de cancelamento */}
      <AlertDialog
        open={!!toCancel}
        onOpenChange={(open) => {
          if (!open) {
            setToCancel(null);
            setCancelReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('financeiroOrcamentos.cancelConfirmTitle', { id: toCancel?.id.substring(0, 8).toUpperCase() ?? '' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('financeiroOrcamentos.cancelConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cancel-reason">{t('financeiroOrcamentos.cancelReasonLabel')}</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              maxLength={500}
              placeholder={t('financeiroOrcamentos.cancelReasonPlaceholder')}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBudget.isPending}>{t('financeiroOrcamentos.back')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
              disabled={cancelBudget.isPending}
            >
              {cancelBudget.isPending ? t('financeiroOrcamentos.cancelling') : t('financeiroOrcamentos.cancelIconTitle')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

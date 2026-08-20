'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2, DollarSign, X, Check } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useExamAreasQuery,
  useExamsPagedQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
  useDeleteExamMutation,
  useExamPlanPricesQuery,
  useSaveExamPlanPriceMutation,
  useDeleteExamPlanPriceMutation,
} from '@/hooks/apiHooks/useExamCatalog';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import { useCurrencyFormatter } from '@/lib/i18n/currency';
import type { Exam } from '@/app/types/exam-request';

type FormValues = {
  name: string;
  area_id?: string;
  private_price?: string;
  lab_cost?: string;
  tax_percentage?: string;
  is_third_party?: boolean;
};

function PlanPricesDialog({
  exam,
  open,
  onClose,
}: {
  exam: Exam;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const [addMode, setAddMode] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newReimbursement, setNewReimbursement] = useState('');

  const { data: prices = [], isLoading: loading } = useExamPlanPricesQuery(exam.id, open);
  const { data: plans = [] } = useHealthPlansListQuery();
  const saveMutation = useSaveExamPlanPriceMutation(exam.id);
  const deleteMutation = useDeleteExamPlanPriceMutation(exam.id);
  const saving = saveMutation.isPending;

  useEffect(() => {
    if (open) {
      setAddMode(false);
    }
  }, [open]);

  const handleSaveNew = async () => {
    if (!newPlanId || !newPlanPrice) return;
    try {
      await saveMutation.mutateAsync({
        health_plan_id: newPlanId,
        plan_price: parseFloat(newPlanPrice),
        reimbursement: newReimbursement ? parseFloat(newReimbursement) : 0,
      });
      setAddMode(false);
      setNewPlanId('');
      setNewPlanPrice('');
      setNewReimbursement('');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsExams.saveError')));
    }
  };

  const handleDelete = async (healthPlanId: string) => {
    try {
      await deleteMutation.mutateAsync(healthPlanId);
    } catch {
      toast.error(t('settingsExams.removeError'));
    }
  };

  const usedPlanIds = new Set(prices.map((p) => p.health_plan_id));
  const availablePlans = plans.filter((p) => !usedPlanIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('settingsExams.planPricesTitle', { name: exam.name })}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {prices.length === 0 && !addMode ? (
              <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
                {t('settingsExams.emptyPlans')}
              </div>
            ) : (
              <>
                {/* Desktop / tablet: tabela */}
                <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>{t('settingsExams.columnPlan')}</TableHead>
                      <TableHead>{t('settingsExams.columnChargedValue')}</TableHead>
                      <TableHead>{t('settingsExams.columnReimbursement')}</TableHead>
                      <TableHead className="w-15" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prices.map((p) => (
                      <TableRow className="border-b border-gray-300 h-15" key={p.id}>
                        <TableCell>{p.health_plan_name ?? p.health_plan_id}</TableCell>
                        <TableCell>{fmt(p.plan_price)}</TableCell>
                        <TableCell>{fmt(p.reimbursement)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsExams.removeTooltip')}
                            aria-label={t('settingsExams.removeTooltip')}
                            onClick={() => handleDelete(p.health_plan_id)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {addMode && (
                      <TableRow className="border-b border-gray-300 h-15">
                        <TableCell>
                          <Select value={newPlanId} onValueChange={setNewPlanId}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder={t('settingsExams.selectPlanPlaceholder')} />
                            </SelectTrigger>
                            <SelectContent>
                              {availablePlans.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <CurrencyInput className="h-8" value={newPlanPrice} onValueChange={setNewPlanPrice} />
                        </TableCell>
                        <TableCell>
                          <CurrencyInput className="h-8" value={newReimbursement} onValueChange={setNewReimbursement} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="p-0"
                            title={t('settingsExams.saveTooltip')}
                            aria-label={t('settingsExams.saveTooltip')}
                            disabled={saving}
                            onClick={handleSaveNew}
                          >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile: cards */}
                <div className="space-y-2 md:hidden">
                  {prices.map((p) => (
                    <div key={p.id} className="rounded-lg border border-gray-300 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">{p.health_plan_name ?? p.health_plan_id}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 p-0"
                          title={t('settingsExams.removeTooltip')}
                          aria-label={t('settingsExams.removeTooltip')}
                          onClick={() => handleDelete(p.health_plan_id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('settingsExams.columnChargedValue')}</p>
                          <p className="tabular-nums">{fmt(p.plan_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('settingsExams.columnReimbursement')}</p>
                          <p className="tabular-nums">{fmt(p.reimbursement)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {addMode && (
                    <div className="space-y-3 rounded-lg border border-gray-300 p-3">
                      <div className="space-y-1.5">
                        <Label>{t('settingsExams.columnPlan')}</Label>
                        <Select value={newPlanId} onValueChange={setNewPlanId}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('settingsExams.selectPlanPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePlans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>{t('settingsExams.columnChargedValue')}</Label>
                          <CurrencyInput value={newPlanPrice} onValueChange={setNewPlanPrice} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>{t('settingsExams.reimbursementLabel')}</Label>
                          <CurrencyInput value={newReimbursement} onValueChange={setNewReimbursement} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddMode(false)}>
                          {t('settingsExams.cancel')}
                        </Button>
                        <Button size="sm" disabled={saving} onClick={handleSaveNew} className="bg-primary">
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          {t('settingsExams.save')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!addMode && availablePlans.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setAddMode(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" /> {t('settingsExams.addPlanButton')}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsExamsPage() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [planPricesFor, setPlanPricesFor] = useState<Exam | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>();

  const { data: areas = [] } = useExamAreasQuery();
  const { data, isLoading: loading } = useExamsPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateExamMutation();
  const updateMutation = useUpdateExamMutation();
  const deleteMutation = useDeleteExamMutation();

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', area_id: undefined, private_price: '', lab_cost: '', tax_percentage: '', is_third_party: false });
    setModalOpen(true);
  };

  const openEdit = (row: Exam) => {
    setEditingId(row.id);
    const areaId = row.exam_area_id ?? row.exam_area?.id;
    reset({
      name: row.name,
      area_id: areaId ? String(areaId) : undefined,
      private_price: row.private_price != null ? String(row.private_price) : '',
      lab_cost: row.lab_cost != null ? String(row.lab_cost) : '',
      tax_percentage: row.tax_percentage != null ? String(row.tax_percentage) : '',
      is_third_party: !!row.is_third_party,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsExams.removeError')));
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      area_id: values.area_id ? Number(values.area_id) : undefined,
      private_price: values.private_price ? parseFloat(values.private_price) : undefined,
      lab_cost: values.lab_cost ? parseFloat(values.lab_cost) : undefined,
      tax_percentage: values.tax_percentage ? parseFloat(values.tax_percentage) : 0,
      is_third_party: !!values.is_third_party,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('settingsExams.saveError')));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">{t('settingsExams.title')}</h1>
      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardContent className="px-0 pt-0 sm:px-6 sm:pt-6">
          <Button onClick={openCreate} className="mb-4 w-full bg-primary sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> {t('settingsExams.newExam')}
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              {/* Desktop / tablet: tabela */}
              <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>{t('settingsExams.columnName')}</TableHead>
                    <TableHead>{t('settingsExams.columnArea')}</TableHead>
                    <TableHead>{t('settingsExams.columnPrivate')}</TableHead>
                    <TableHead>{t('settingsExams.columnLabCost')}</TableHead>
                    <TableHead>{t('settingsExams.columnMargin')}</TableHead>
                    <TableHead className="w-[140px]">{t('settingsExams.columnActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => {
                    const margin =
                      r.private_price && r.lab_cost && r.private_price > 0
                        ? ((r.private_price - r.lab_cost) / r.private_price * 100).toFixed(0) + '%'
                        : '—';
                    return (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.exam_area?.name ?? r.exam_area_id ?? '—'}</TableCell>
                        <TableCell>{fmt(r.private_price)}</TableCell>
                        <TableCell>{fmt(r.lab_cost)}</TableCell>
                        <TableCell>
                          {margin !== '—' ? (
                            <Badge variant="secondary">{margin}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title={t('settingsExams.editTooltip')}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setPlanPricesFor(r)} title={t('settingsExams.planPricesTooltip')}>
                              <DollarSign className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                {list.map((r) => {
                  const margin =
                    r.private_price && r.lab_cost && r.private_price > 0
                      ? ((r.private_price - r.lab_cost) / r.private_price * 100).toFixed(0) + '%'
                      : '—';
                  return (
                    <div key={r.id} className="rounded-lg border border-gray-300 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.exam_area?.name ?? r.exam_area_id ?? '—'}</p>
                        </div>
                        {margin !== '—' && <Badge variant="secondary" className="shrink-0">{margin}</Badge>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">{t('settingsExams.columnPrivate')}</p>
                          <p className="tabular-nums">{fmt(r.private_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t('settingsExams.columnLabCost')}</p>
                          <p className="tabular-nums">{fmt(r.lab_cost)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title={t('settingsExams.editTooltip')}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setPlanPricesFor(r)} title={t('settingsExams.planPricesTooltip')}>
                          <DollarSign className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <ListPagination
                page={listPage}
                totalPages={listTotalPages}
                total={listTotal}
                pageSize={API_PAGE_SIZE}
                onPageChange={setListPage}
                disabled={loading}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardCreateFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingId ? t('settingsExams.editExam') : t('settingsExams.newExam')}
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setModalOpen(false)}
            >
              {t('settingsExams.cancel')}
            </Button>
            <Button type="submit" form="exam-form" className="bg-primary">
              {editingId ? t('settingsExams.save') : t('settingsExams.create')}
            </Button>
          </div>
        }
      >
        <form id="exam-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>{t('settingsExams.areaLabel')}</Label>
            <Controller
              name="area_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settingsExams.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t('settingsExams.nameLabel')}</Label>
            <Input id="name" placeholder={t('settingsExams.namePlaceholder')} {...register('name', { required: true })} />
            {errors.name && <p className="text-sm text-destructive">{t('settingsExams.requiredField')}</p>}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">{t('settingsExams.pricingSectionTitle')}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="private_price">{t('settingsExams.privatePriceLabel')}</Label>
                <Controller
                  name="private_price"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput id="private_price" value={field.value} onValueChange={field.onChange} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lab_cost">{t('settingsExams.labCostLabel')}</Label>
                <Controller
                  name="lab_cost"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput id="lab_cost" value={field.value} onValueChange={field.onChange} />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_percentage">{t('settingsExams.taxLabel')}</Label>
                <Input
                  id="tax_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="0"
                  {...register('tax_percentage')}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" {...register('is_third_party')} className="size-4" />
                {t('settingsExams.thirdPartyLabel')}
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('settingsExams.taxHint')}
            </p>
          </div>
        </form>
      </DashboardCreateFormDialog>

      {planPricesFor && (
        <PlanPricesDialog
          exam={planPricesFor}
          open={!!planPricesFor}
          onClose={() => setPlanPricesFor(null)}
        />
      )}
    </div>
  );
}

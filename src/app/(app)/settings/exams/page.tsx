'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import type { Exam } from '@/app/types/exam-request';

type FormValues = {
  name: string;
  area_id?: string;
  private_price?: string;
  lab_cost?: string;
  tax_percentage?: string;
  is_third_party?: boolean;
};

function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function PlanPricesDialog({
  exam,
  open,
  onClose,
}: {
  exam: Exam;
  open: boolean;
  onClose: () => void;
}) {
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
      toast.success('Preço salvo');
      setAddMode(false);
      setNewPlanId('');
      setNewPlanPrice('');
      setNewReimbursement('');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  const handleDelete = async (healthPlanId: string) => {
    try {
      await deleteMutation.mutateAsync(healthPlanId);
      toast.success('Removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const usedPlanIds = new Set(prices.map((p) => p.health_plan_id));
  const availablePlans = plans.filter((p) => !usedPlanIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preços por convênio — {exam.name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto border border-gray-300 rounded-lg">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Convênio</TableHead>
                  <TableHead>Valor cobrado</TableHead>
                  <TableHead>Reembolso recebido</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {prices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
                      Nenhum convênio configurado
                    </TableCell>
                  </TableRow>
                )}
                {prices.map((p) => (
                  <TableRow className="border-b border-gray-300 h-15" key={p.id}>
                    <TableCell>{p.health_plan_name ?? p.health_plan_id}</TableCell>
                    <TableCell>{fmtBRL(p.plan_price)}</TableCell>
                    <TableCell>{fmtBRL(p.reimbursement)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0"
                        title="Remover"
                        aria-label="Remover"
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
                          <SelectValue placeholder="Selecionar convênio" />
                        </SelectTrigger>
                        <SelectContent>
                          {availablePlans.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="h-8"
                        value={newPlanPrice}
                        onChange={(e) => setNewPlanPrice(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className="h-8"
                        value={newReimbursement}
                        onChange={(e) => setNewReimbursement(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="p-0"
                        title="Salvar"
                        aria-label="Salvar"
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
            {!addMode && availablePlans.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setAddMode(true)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar convênio
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsExamsPage() {
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
      toast.success('Removido');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover'));
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
        toast.success('Atualizado');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Criado');
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Exames</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo exame
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Nome</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Particular</TableHead>
                    <TableHead>Custo Lab</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
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
                        <TableCell>{fmtBRL(r.private_price)}</TableCell>
                        <TableCell>{fmtBRL(r.lab_cost)}</TableCell>
                        <TableCell>
                          {margin !== '—' ? (
                            <Badge variant="secondary">{margin}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setPlanPricesFor(r)} title="Preços por convênio">
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar exame' : 'Novo exame'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Área de exame</Label>
              <Controller
                name="area_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Nome do exame" {...register('name', { required: true })} />
              {errors.name && <p className="text-red-500 text-xs mt-1">Campo obrigatório</p>}
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Precificação</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="private_price">Preço Particular (R$)</Label>
                  <Input
                    id="private_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...register('private_price')}
                  />
                </div>
                <div>
                  <Label htmlFor="lab_cost">Custo Lab (R$)</Label>
                  <Input
                    id="lab_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...register('lab_cost')}
                  />
                </div>
                <div>
                  <Label htmlFor="tax_percentage">Imposto (%)</Label>
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
                  Exame de laboratório terceiro
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Imposto é adicionado por cima do preço (cliente paga preço + imposto). Margem = preço − custo.
              </p>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-primary">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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

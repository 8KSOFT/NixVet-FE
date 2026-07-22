'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardCreateFormDialog } from '@/components/dashboard-create-form-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Pencil, Trash2, Loader2, DollarSign, X, Check, EyeOff } from 'lucide-react';
import { getApiErrorMessage } from '@/app/utils/api-error-message';
import { API_PAGE_SIZE } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';
import {
  useSurgicalProcedureCategoriesQuery,
  useSurgicalProceduresPagedQuery,
  useCreateSurgicalProcedureMutation,
  useUpdateSurgicalProcedureMutation,
  useDeleteSurgicalProcedureMutation,
  useSurgicalProcedurePlanPricesQuery,
  useSaveSurgicalProcedurePlanPriceMutation,
  useDeleteSurgicalProcedurePlanPriceMutation,
} from '@/hooks/apiHooks/useSurgicalProcedures';
import { useHealthPlansListQuery } from '@/hooks/apiHooks/useHealthPlans';
import type { SurgicalProcedure } from '@/app/types/surgical-procedure';

type FormValues = {
  name: string;
  category_id?: string;
  private_price?: string;
  cost_price?: string;
  tax_percentage?: string;
};

function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

/** Itens base do catálogo global não têm tenant_id — só a clínica dona de um item personalizado pode editá-lo/excluí-lo. */
function isBaseProcedure(procedure: SurgicalProcedure) {
  return procedure.tenant_id == null;
}

function PlanPricesDialog({
  procedure,
  open,
  onClose,
}: {
  procedure: SurgicalProcedure;
  open: boolean;
  onClose: () => void;
}) {
  const [addMode, setAddMode] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newReimbursement, setNewReimbursement] = useState('');

  const { data: prices = [], isLoading: loading } = useSurgicalProcedurePlanPricesQuery(procedure.id, open);
  const { data: plans = [] } = useHealthPlansListQuery();
  const saveMutation = useSaveSurgicalProcedurePlanPriceMutation(procedure.id);
  const deleteMutation = useDeleteSurgicalProcedurePlanPriceMutation(procedure.id);
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
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  const handleDelete = async (healthPlanId: string) => {
    try {
      await deleteMutation.mutateAsync(healthPlanId);
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const usedPlanIds = new Set(prices.map((p) => p.health_plan_id));
  const availablePlans = plans.filter((p) => !usedPlanIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Preços por convênio — {procedure.name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {prices.length === 0 && !addMode ? (
              <div className="rounded-lg border border-gray-300 bg-white py-8 text-center text-sm text-slate-500">
                Nenhum convênio configurado
              </div>
            ) : (
              <>
                {/* Desktop / tablet: tabela */}
                <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
                <Table className="min-w-full border-collapse bg-white text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-300 h-15">
                      <TableHead>Convênio</TableHead>
                      <TableHead>Valor cobrado</TableHead>
                      <TableHead>Reembolso recebido</TableHead>
                      <TableHead className="w-15" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
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
                          title="Remover"
                          aria-label="Remover"
                          onClick={() => handleDelete(p.health_plan_id)}
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Valor cobrado</p>
                          <p className="tabular-nums">{fmtBRL(p.plan_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Reembolso recebido</p>
                          <p className="tabular-nums">{fmtBRL(p.reimbursement)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {addMode && (
                    <div className="space-y-3 rounded-lg border border-gray-300 p-3">
                      <div className="space-y-1.5">
                        <Label>Convênio</Label>
                        <Select value={newPlanId} onValueChange={setNewPlanId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar convênio" />
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
                          <Label>Valor cobrado</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={newPlanPrice}
                            onChange={(e) => setNewPlanPrice(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Reembolso</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={newReimbursement}
                            onChange={(e) => setNewReimbursement(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setAddMode(false)}>
                          Cancelar
                        </Button>
                        <Button size="sm" disabled={saving} onClick={handleSaveNew} className="bg-primary">
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Salvar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            {!addMode && availablePlans.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setAddMode(true)} className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-1" /> Adicionar convênio
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsSurgicalProceduresPage() {
  const [listPage, setListPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [planPricesFor, setPlanPricesFor] = useState<SurgicalProcedure | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>();

  const { data: categories = [] } = useSurgicalProcedureCategoriesQuery();
  const { data, isLoading: loading } = useSurgicalProceduresPagedQuery(listPage);
  const list = data?.items ?? [];
  const listTotal = data?.total ?? 0;
  const listTotalPages = data?.totalPages ?? 1;
  const createMutation = useCreateSurgicalProcedureMutation();
  const updateMutation = useUpdateSurgicalProcedureMutation();
  const deleteMutation = useDeleteSurgicalProcedureMutation();

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', category_id: undefined, private_price: '', cost_price: '', tax_percentage: '' });
    setModalOpen(true);
  };

  const openEdit = (row: SurgicalProcedure) => {
    setEditingId(row.id);
    const catId = row.category_id ?? row.category?.id;
    reset({
      name: row.name,
      category_id: catId ? String(catId) : undefined,
      private_price: row.private_price != null ? String(row.private_price) : '',
      cost_price: row.cost_price != null ? String(row.cost_price) : '',
      tax_percentage: row.tax_percentage != null ? String(row.tax_percentage) : '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover'));
    }
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      name: values.name,
      category_id: values.category_id ? Number(values.category_id) : undefined,
      private_price: values.private_price ? parseFloat(values.private_price) : undefined,
      cost_price: values.cost_price ? parseFloat(values.cost_price) : undefined,
      tax_percentage: values.tax_percentage ? parseFloat(values.tax_percentage) : 0,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold mb-6">Procedimentos cirúrgicos</h1>
      <Card className="rounded-none border-0 bg-transparent py-0 shadow-none sm:rounded-xl sm:border sm:border-border/80 sm:bg-card sm:py-6 sm:shadow-(--shadow-card)">
        <CardContent className="px-0 pt-0 sm:px-6 sm:pt-6">
          <Button onClick={openCreate} className="mb-4 w-full bg-primary sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Novo procedimento
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Particular</TableHead>
                    <TableHead>Custo</TableHead>
                    <TableHead>Margem</TableHead>
                    <TableHead className="w-[140px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((r) => {
                    const margin =
                      r.private_price && r.cost_price && r.private_price > 0
                        ? ((r.private_price - r.cost_price) / r.private_price * 100).toFixed(0) + '%'
                        : '—';
                    const isBase = isBaseProcedure(r);
                    return (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.category?.name ?? r.category_id ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={isBase ? 'outline' : 'secondary'}>
                            {isBase ? 'Base' : 'Personalizado'}
                          </Badge>
                        </TableCell>
                        <TableCell>{fmtBRL(r.private_price)}</TableCell>
                        <TableCell>{fmtBRL(r.cost_price)}</TableCell>
                        <TableCell>
                          {margin !== '—' ? (
                            <Badge variant="secondary">{margin}</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {!isBase && (
                              <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Editar">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setPlanPricesFor(r)} title="Preços por convênio">
                              <DollarSign className="w-4 h-4 text-blue-500" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  title={isBase ? 'Ocultar para minha clínica' : 'Remover'}
                                >
                                  {isBase ? <EyeOff className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {isBase ? 'Ocultar este procedimento base?' : 'Remover este procedimento?'}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {isBase
                                      ? 'O item continua disponível para as demais clínicas — apenas deixa de aparecer para a sua.'
                                      : 'Esta ação não pode ser desfeita.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(r.id)}>
                                    {isBase ? 'Ocultar' : 'Remover'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                    r.private_price && r.cost_price && r.private_price > 0
                      ? ((r.private_price - r.cost_price) / r.private_price * 100).toFixed(0) + '%'
                      : '—';
                  const isBase = isBaseProcedure(r);
                  return (
                    <div key={r.id} className="rounded-lg border border-gray-300 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.category?.name ?? r.category_id ?? '—'}</p>
                        </div>
                        <Badge variant={isBase ? 'outline' : 'secondary'} className="shrink-0">
                          {isBase ? 'Base' : 'Personalizado'}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Particular</p>
                          <p className="tabular-nums">{fmtBRL(r.private_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Custo</p>
                          <p className="tabular-nums">{fmtBRL(r.cost_price)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Margem</p>
                          <p>{margin !== '—' ? <Badge variant="secondary">{margin}</Badge> : '—'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                        {!isBase && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(r)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setPlanPricesFor(r)} title="Preços por convênio">
                          <DollarSign className="w-4 h-4 text-blue-500" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              title={isBase ? 'Ocultar para minha clínica' : 'Remover'}
                            >
                              {isBase ? <EyeOff className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {isBase ? 'Ocultar este procedimento base?' : 'Remover este procedimento?'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {isBase
                                  ? 'O item continua disponível para as demais clínicas — apenas deixa de aparecer para a sua.'
                                  : 'Esta ação não pode ser desfeita.'}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>
                                {isBase ? 'Ocultar' : 'Remover'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
        title={editingId ? 'Editar procedimento' : 'Novo procedimento'}
        contentClassName="modal-responsive"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border border-gray-300"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="surgical-procedure-form" className="bg-primary">
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        }
      >
        <form id="surgical-procedure-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Nome do procedimento" {...register('name', { required: true })} />
            {errors.name && <p className="text-sm text-destructive">Campo obrigatório</p>}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Precificação</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Label htmlFor="cost_price">Custo Interno (R$)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...register('cost_price')}
                />
              </div>
              <div className="space-y-2">
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
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Imposto é adicionado por cima do preço (cliente paga preço + imposto). Margem = preço − custo.
            </p>
          </div>
        </form>
      </DashboardCreateFormDialog>

      {planPricesFor && (
        <PlanPricesDialog
          procedure={planPricesFor}
          open={!!planPricesFor}
          onClose={() => setPlanPricesFor(null)}
        />
      )}
    </div>
  );
}

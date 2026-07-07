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
import api from '@/lib/axios';
import { API_PAGE_SIZE, fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import { ListPagination } from '@/components/list-pagination';

interface Category {
  id: number;
  name: string;
}

interface SurgicalProcedure {
  id: number;
  name: string;
  surgical_procedure_category_id?: number;
  surgical_procedure_category?: Category;
  private_price?: number | null;
  cost_price?: number | null;
  tax_percentage?: number | null;
}

interface HealthPlan {
  id: string;
  name: string;
}

interface PlanPrice {
  id: string;
  health_plan_id: string;
  health_plan_name: string | null;
  plan_price: number;
  reimbursement: number;
}

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

function PlanPricesDialog({
  procedure,
  open,
  onClose,
}: {
  procedure: SurgicalProcedure;
  open: boolean;
  onClose: () => void;
}) {
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [plans, setPlans] = useState<HealthPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newReimbursement, setNewReimbursement] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [priceRes, planRes] = await Promise.all([
        api.get(`/catalog/surgical-procedures/${procedure.id}/plan-prices`),
        api.get('/health-plans', { params: { limit: 200 } }),
      ]);
      setPrices(priceRes.data);
      const planData = planRes.data?.items ?? planRes.data?.data ?? planRes.data ?? [];
      setPlans(Array.isArray(planData) ? planData : []);
    } catch {
      toast.error('Erro ao carregar preços por convênio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
      setAddMode(false);
    }
  }, [open]);

  const handleSaveNew = async () => {
    if (!newPlanId || !newPlanPrice) return;
    setSaving(true);
    try {
      await api.put(`/catalog/surgical-procedures/${procedure.id}/plan-prices`, {
        health_plan_id: newPlanId,
        plan_price: parseFloat(newPlanPrice),
        reimbursement: newReimbursement ? parseFloat(newReimbursement) : 0,
      });
      toast.success('Preço salvo');
      setAddMode(false);
      setNewPlanId('');
      setNewPlanPrice('');
      setNewReimbursement('');
      void load();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (healthPlanId: string) => {
    try {
      await api.delete(`/catalog/surgical-procedures/${procedure.id}/plan-prices/${healthPlanId}`);
      toast.success('Removido');
      void load();
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
          <DialogTitle>Preços por convênio — {procedure.name}</DialogTitle>
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

export default function SettingsSurgicalProceduresPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<SurgicalProcedure[]>([]);
  const [loading, setLoading] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listTotalPages, setListTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [planPricesFor, setPlanPricesFor] = useState<SurgicalProcedure | null>(null);
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>();

  const fetchCategories = async () => {
    try {
      const rows = await fetchAllListPages<Category>('/catalog/surgical-procedure-categories');
      setCategories(rows);
    } catch {
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/catalog/surgical-procedures', { params: listQueryParams(listPage) });
      const p = parseListResponse<SurgicalProcedure>(res.data, listPage);
      setList(p.items);
      setListTotal(p.total);
      setListTotalPages(p.totalPages);
    } catch {
      toast.error('Erro ao carregar procedimentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  useEffect(() => {
    void fetchProcedures();
  }, [listPage]);

  const openCreate = () => {
    setEditingId(null);
    reset({ name: '', category_id: undefined, private_price: '', cost_price: '', tax_percentage: '' });
    setModalOpen(true);
  };

  const openEdit = (row: SurgicalProcedure) => {
    setEditingId(row.id);
    const catId = row.surgical_procedure_category_id ?? row.surgical_procedure_category?.id;
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
      await api.delete(`/catalog/surgical-procedures/${id}`);
      toast.success('Removido');
      void fetchProcedures();
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
        await api.put(`/catalog/surgical-procedures/${editingId}`, payload);
        toast.success('Atualizado');
      } else {
        await api.post('/catalog/surgical-procedures', payload);
        toast.success('Criado');
      }
      setModalOpen(false);
      void fetchProcedures();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar'));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-heading font-bold text-primary mb-6">Procedimentos cirúrgicos</h1>
      <Card>
        <CardContent className="pt-6">
          <Button onClick={openCreate} className="mb-4 bg-primary">
            <Plus className="w-4 h-4 mr-2" /> Novo procedimento
          </Button>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full border-collapse bg-white text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-300 h-15">
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
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
                    return (
                      <TableRow className="border-b border-gray-300 h-15" key={r.id}>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.surgical_procedure_category?.name ?? r.surgical_procedure_category_id ?? '—'}</TableCell>
                        <TableCell>{fmtBRL(r.private_price)}</TableCell>
                        <TableCell>{fmtBRL(r.cost_price)}</TableCell>
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
            <DialogTitle>{editingId ? 'Editar procedimento' : 'Novo procedimento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
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
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Nome do procedimento" {...register('name', { required: true })} />
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
          procedure={planPricesFor}
          open={!!planPricesFor}
          onClose={() => setPlanPricesFor(null)}
        />
      )}
    </div>
  );
}

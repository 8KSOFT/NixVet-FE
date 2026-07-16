'use client';

import React, { useState } from 'react';
import { Plus, FileText, CheckCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  useCreateBudgetMutation,
  useDownloadBudgetPdfMutation,
} from '@/hooks/apiHooks/useBudgets';
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

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  sent: 'Enviado',
  approved: 'Aprovado',
  rejected: 'Recusado',
  expired: 'Expirado',
  converted: 'Convertido',
};

const STATUS_COLORS: Record<string, BudgetBadgeVariant> = {
  draft: 'secondary',
  sent: 'default',
  approved: 'default',
  rejected: 'destructive',
  expired: 'secondary',
  converted: 'default',
};

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function computeTotals(items: BudgetItem[]) {
  const total = items.reduce((s, i) => s + Number(i.total_price), 0);
  const plan = items.reduce((s, i) => s + Number(i.plan_coverage_amount), 0);
  return { total, plan, tutor: total - plan };
}

export default function OrcamentosPage() {
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Budget | null>(null);
  const { data: patients = [] } = usePatientsListQuery();
  const { data: users = [] } = useVeterinariansQuery();
  const { data: products = [] } = useProductsQuery();

  const { data: budgets = [], isLoading: loading } = useBudgetsQuery();
  const createBudget = useCreateBudgetMutation();
  const approveBudget = useApproveBudgetMutation();
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
      toast.error('Selecione o paciente');
      return;
    }
    const invalidItem = form.items.find((item) =>
      item.item_type === 'product' ? !item.reference_id : !item.description.trim(),
    );
    if (invalidItem) {
      toast.error('Preencha o produto ou a descrição de todos os itens');
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
      toast.success('Orçamento criado');
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
      toast.error('Erro ao criar orçamento');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveBudget.mutateAsync(id);
      toast.success('Orçamento aprovado');
    } catch {
      toast.error('Erro ao aprovar');
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
      toast.error('Erro ao gerar PDF');
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
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie orçamentos para procedimentos e internações</p>
        </div>
        <Button onClick={() => setOpenNew(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 size-4" />
          Novo Orçamento
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
          Nenhum orçamento encontrado
        </div>
      ) : (
        <>
          {/* Desktop / tablet: tabela */}
          <div className="hidden overflow-x-auto rounded-lg border border-gray-300 md:block">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-300 h-15">
                  <TableHead>Nº</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Plano Cobre</TableHead>
                  <TableHead className="text-right">Tutor Paga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Ações</TableHead>
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
                      <TableCell>{b.type === 'procedure' ? 'Procedimento' : 'Internação'}</TableCell>
                      <TableCell className="text-right tabular-nums">{totalFmt}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">{planFmt}</TableCell>
                      <TableCell className="text-right tabular-nums text-blue-600">{tutorFmt}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[b.status] ?? 'secondary'}>
                          {STATUS_LABELS[b.status] ?? b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b.valid_until ? new Date(b.valid_until).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelected(b)} title="Visualizar">
                            <Eye className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(b.id)} title="PDF">
                            <FileText className="size-4" />
                          </Button>
                          {b.status === 'draft' || b.status === 'sent' ? (
                            <Button variant="ghost" size="icon" onClick={() => handleApprove(b.id)} title="Aprovar">
                              <CheckCircle className="size-4 text-green-600" />
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
                        #{b.id.substring(0, 8).toUpperCase()} · {b.type === 'procedure' ? 'Procedimento' : 'Internação'}
                      </p>
                    </div>
                    <Badge variant={STATUS_COLORS[b.status] ?? 'secondary'} className="shrink-0">
                      {STATUS_LABELS[b.status] ?? b.status}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="tabular-nums">{totalFmt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Validade</p>
                      <p>{b.valid_until ? new Date(b.valid_until).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plano Cobre</p>
                      <p className="tabular-nums text-green-600">{planFmt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tutor Paga</p>
                      <p className="tabular-nums text-blue-600">{tutorFmt}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-200 pt-2">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(b)} title="Visualizar">
                      <Eye className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(b.id)} title="PDF">
                      <FileText className="size-4" />
                    </Button>
                    {b.status === 'draft' || b.status === 'sent' ? (
                      <Button variant="ghost" size="icon" onClick={() => handleApprove(b.id)} title="Aprovar">
                        <CheckCircle className="size-4 text-green-600" />
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
        title="Novo Orçamento"
        contentClassName="modal-responsive sm:max-w-3xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="border border-gray-300" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate}>
              Criar Orçamento
            </Button>
          </div>
        }
      >
        <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Veterinário</Label>
                <Select
                  value={form.veterinarian_id || '_none'}
                  onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v === '_none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Usar veterinário autenticado</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(value: BudgetType) => setForm((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="procedure">Procedimento</SelectItem>
                    <SelectItem value="hospitalization">Internação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Válido até</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Itens</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Adicionar Item
                </Button>
              </div>
              <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-12">
                <span className="col-span-3">Tipo</span>
                <span className="col-span-4">Produto / Descrição</span>
                <span className="col-span-2">Qtd</span>
                <span className="col-span-2">Valor unit.</span>
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
                        <SelectItem value="procedure">Manual</SelectItem>
                        <SelectItem value="product">Produto</SelectItem>
                      </SelectContent>
                    </Select>

                    {item.item_type === 'product' ? (
                      <Select value={item.reference_id} onValueChange={(v) => selectItemProduct(i, v)}>
                        <SelectTrigger className="col-span-2 h-9 sm:col-span-4">
                          <SelectValue placeholder="Selecione o produto" />
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
                        placeholder="Descrição"
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                        className="col-span-2 h-9 sm:col-span-4"
                      />
                    )}

                    <Input
                      type="number"
                      min={1}
                      placeholder="Qtd"
                      value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      className="col-span-1 h-9 sm:col-span-2"
                    />
                    <CurrencyInput
                      placeholder="Valor unit."
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
                      title="Remover item"
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
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Orçamento #{selected.id.substring(0, 8).toUpperCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="font-medium">Paciente:</span> {selected.patient?.name}
                </div>
                <div>
                  <span className="font-medium">Veterinário:</span> {selected.veterinarian?.name ?? '—'}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {selected.type}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {STATUS_LABELS[selected.status]}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                                Produto
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
              {(() => {
                const t = computeTotals(selected.items ?? []);
                const totalFmt = selected.summary?.total_formatted ?? fmt(t.total);
                const planFmt = selected.summary?.plan_coverage_formatted ?? fmt(t.plan);
                const tutorFmt = selected.summary?.tutor_responsibility_formatted ?? fmt(t.tutor);
                return (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Total Geral</span>
                      <span className="font-semibold">{totalFmt}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Coberto pelo Plano</span>
                      <span>{planFmt}</span>
                    </div>
                    <div className="flex justify-between text-blue-600">
                      <span>Responsabilidade do Tutor</span>
                      <span>{tutorFmt}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

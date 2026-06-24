'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, FileText, CheckCircle, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/axios';
import { toast } from 'sonner';

interface BudgetItem {
  id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  covered_by_plan: boolean;
  plan_coverage_amount: number;
}

interface Budget {
  id: string;
  type: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  patient: { id: string; name: string };
  veterinarian: { id: string; name: string };
  items: BudgetItem[];
  created_at: string;
}

interface Patient {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

type BudgetType = 'procedure' | 'hospitalization';
type BudgetBadgeVariant = 'secondary' | 'default' | 'destructive';

interface BudgetFormItem {
  item_type: string;
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

function getArrayResponseData<TItem>(responseData: unknown): TItem[] {
  if (Array.isArray(responseData)) {
    return responseData as TItem[];
  }

  const responseEnvelope = responseData as { data?: TItem[] };
  return Array.isArray(responseEnvelope.data) ? responseEnvelope.data : [];
}

function computeTotals(items: BudgetItem[]) {
  const total = items.reduce((s, i) => s + Number(i.total_price), 0);
  const plan = items.reduce((s, i) => s + Number(i.plan_coverage_amount), 0);
  return { total, plan, tutor: total - plan };
}

export default function OrcamentosPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [selected, setSelected] = useState<Budget | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [form, setForm] = useState<BudgetFormValues>({
    patient_id: '',
    veterinarian_id: '',
    type: 'procedure',
    valid_until: '',
    notes: '',
    items: [{ item_type: 'procedure', description: '', quantity: 1, unit_price: 0, discount_percentage: 0, covered_by_plan: false, plan_coverage_amount: 0 }],
  });

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Budget[]>('/budgets');
      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
    api.get<Patient[] | { data?: Patient[] }>('/patients').then((r) => setPatients(getArrayResponseData<Patient>(r.data))).catch(() => {});
    api.get<User[] | { data?: User[] }>('/users').then((r) => setUsers(getArrayResponseData<User>(r.data))).catch(() => {});
  }, [fetchBudgets]);

  const handleCreate = async () => {
    try {
      await api.post('/budgets', form);
      toast.success('Orçamento criado');
      setOpenNew(false);
      fetchBudgets();
    } catch {
      toast.error('Erro ao criar orçamento');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/budgets/${id}/approve`);
      toast.success('Orçamento aprovado');
      fetchBudgets();
    } catch {
      toast.error('Erro ao aprovar');
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const res = await api.get(`/budgets/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
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
      items: [...f.items, { item_type: 'procedure', description: '', quantity: 1, unit_price: 0, discount_percentage: 0, covered_by_plan: false, plan_coverage_amount: 0 }],
    }));
  };

  const updateItem = <TKey extends keyof BudgetFormItem>(
    index: number,
    key: TKey,
    value: BudgetFormItem[TKey],
  ) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      return { ...f, items };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie orçamentos para procedimentos e internações</p>
        </div>
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="mr-2 size-4" />
          Novo Orçamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
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
                {budgets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      Nenhum orçamento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  budgets.map((b) => {
                    const totals = computeTotals(b.items ?? []);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell>{b.patient?.name}</TableCell>
                        <TableCell>{b.type === 'procedure' ? 'Procedimento' : 'Internação'}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(totals.total)}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">{fmt(totals.plan)}</TableCell>
                        <TableCell className="text-right tabular-nums text-blue-600">{fmt(totals.tutor)}</TableCell>
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
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Novo Orçamento */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Paciente</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm((f) => ({ ...f, patient_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Veterinário</Label>
                <Select value={form.veterinarian_id} onValueChange={(v) => setForm((f) => ({ ...f, veterinarian_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(value: BudgetType) => setForm((f) => ({ ...f, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="procedure">Procedimento</SelectItem>
                    <SelectItem value="hospitalization">Internação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Válido até</Label>
                <Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Itens</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>+ Adicionar Item</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 rounded-lg border p-3">
                    <Input placeholder="Descrição" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} className="col-span-2" />
                    <Input type="number" placeholder="Qtd" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} />
                    <Input type="number" placeholder="Valor unit." value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Criar Orçamento</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhe */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Orçamento #{selected.id.substring(0, 8).toUpperCase()}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="font-medium">Paciente:</span> {selected.patient?.name}</div>
                <div><span className="font-medium">Veterinário:</span> {selected.veterinarian?.name}</div>
                <div><span className="font-medium">Tipo:</span> {selected.type}</div>
                <div><span className="font-medium">Status:</span> {STATUS_LABELS[selected.status]}</div>
              </div>
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
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(Number(item.unit_price))}</TableCell>
                      <TableCell className="text-right">{fmt(Number(item.total_price))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(() => {
                const t = computeTotals(selected.items ?? []);
                return (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span>Total Geral</span><span className="font-semibold">{fmt(t.total)}</span></div>
                    <div className="flex justify-between text-green-600"><span>Coberto pelo Plano</span><span>{fmt(t.plan)}</span></div>
                    <div className="flex justify-between text-blue-600"><span>Responsabilidade do Tutor</span><span>{fmt(t.tutor)}</span></div>
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

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, Clock, Wallet, Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
import api from '@/lib/axios';
import { toast } from 'sonner';

type Status = 'suggested' | 'confirmed' | 'cancelled';

interface FinancialEntry {
  id: string;
  entry_date: string;
  type: string;
  category: string;
  payment_source: string;
  payment_method: string;
  status: Status;
  base_amount: number | null;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  discount_amount: number;
  reference_type: string | null;
  description: string | null;
}

interface PaymentOption {
  method: string;
  fee_percentage: number;
  settlement_days: number;
  modality: 'a_vista' | 'a_prazo';
  client_pays: number;
  fee_amount: number;
  clinic_receives: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  hospitalization: 'Internação',
  procedure: 'Procedimento',
  exam: 'Exame',
  vaccine: 'Vacina',
  product: 'Produto',
  medication: 'Medicamento',
  material: 'Material',
  other: 'Outro',
  // Custos e despesas (lançamento manual)
  medication_purchase: 'Compra de Medicamentos',
  material_purchase: 'Compra de Materiais',
  lab_cost: 'Custo de Laboratório',
  rent: 'Aluguel',
  personnel: 'Pessoal',
  utilities: 'Energia/Água/Internet',
  marketing: 'Marketing',
  equipment: 'Equipamento',
  tax: 'Impostos',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  debit: 'Débito',
  credit_1x: 'Crédito à vista',
  credit_2_6x: 'Crédito 2-6x',
  credit_7_12x: 'Crédito 7-12x',
  credit_installment: 'Crédito parcelado',
  boleto: 'Boleto',
  transfer: 'Transferência',
};

// Tipos de lançamento manual e categorias por tipo.
const TYPE_LABELS: Record<string, string> = {
  revenue: 'Receita',
  cost: 'Custo Direto / CMV',
  expense: 'Despesa Operacional',
};

const CATEGORIES_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  revenue: [
    { value: 'consultation', label: 'Consulta' },
    { value: 'hospitalization', label: 'Internação' },
    { value: 'exam', label: 'Exame' },
    { value: 'procedure', label: 'Procedimento' },
    { value: 'product', label: 'Produto' },
    { value: 'medication', label: 'Medicamento' },
    { value: 'other', label: 'Outro' },
  ],
  cost: [
    { value: 'medication_purchase', label: 'Compra de Medicamentos' },
    { value: 'lab_cost', label: 'Custo de Laboratório' },
    { value: 'material', label: 'Materiais' },
    { value: 'other', label: 'Outro' },
  ],
  expense: [
    { value: 'rent', label: 'Aluguel' },
    { value: 'personnel', label: 'Pessoal' },
    { value: 'utilities', label: 'Energia/Água/Internet' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'equipment', label: 'Equipamento' },
    { value: 'tax', label: 'Impostos' },
    { value: 'other', label: 'Outro' },
  ],
};

const MANUAL_METHODS = ['cash', 'pix', 'debit', 'credit_1x', 'credit_2_6x', 'credit_7_12x', 'boleto', 'transfer'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// Todas as categorias (para o filtro), agrupadas a partir das categorias por tipo.
const ALL_CATEGORY_OPTIONS = Object.values(CATEGORIES_BY_TYPE)
  .flat()
  .filter((c, i, arr) => arr.findIndex((x) => x.value === c.value) === i);

const PAGE_SIZE = 50;

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function methodLabel(m: string) {
  return METHOD_LABELS[m] ?? m;
}

const STATUS_TABS: { key: Status; label: string }[] = [
  { key: 'suggested', label: 'Sugeridos' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'cancelled', label: 'Cancelados' },
];

export default function LancamentosPage() {
  const [status, setStatus] = useState<Status>('suggested');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros avançados
  const [fromDate, setFromDate] = useState(monthStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Debounce da busca por texto (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Ao mudar qualquer filtro, volta para a primeira página.
  useEffect(() => {
    setOffset(0);
  }, [status, fromDate, toDate, typeFilter, categoryFilter, debouncedSearch]);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams({ status });
    if (fromDate && toDate) {
      params.set('from', fromDate);
      params.set('to', toDate);
    }
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    return params;
  }, [status, fromDate, toDate, typeFilter, categoryFilter, debouncedSearch]);

  const clearFilters = () => {
    setFromDate(monthStartISO());
    setToDate(todayISO());
    setTypeFilter('all');
    setCategoryFilter('all');
    setSearch('');
  };

  const exportList = async () => {
    try {
      const params = buildFilterParams();
      const res = await api.get(`/financial-reports/entries/export?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lancamentos.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao exportar lançamentos');
    }
  };

  // Dialog de confirmação
  const [confirmEntry, setConfirmEntry] = useState<FinancialEntry | null>(null);
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Dialog de lançamento manual
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'expense',
    category: '',
    entry_date: todayISO(),
    gross_amount: '',
    discount_amount: '',
    payment_method: '',
    payment_source: 'particular',
    description: '',
  });

  const setField = (field: string, value: string) =>
    setForm((f) => ({
      ...f,
      [field]: value,
      // Categoria depende do tipo — resetar ao trocar o tipo.
      ...(field === 'type' ? { category: '' } : {}),
    }));

  const formGross = Number(form.gross_amount) || 0;
  const formDiscount = Number(form.discount_amount) || 0;
  const formNet = Math.max(0, Math.round((formGross - formDiscount) * 100) / 100);

  const openCreate = () => {
    setForm({
      type: 'expense',
      category: '',
      entry_date: todayISO(),
      gross_amount: '',
      discount_amount: '',
      payment_method: '',
      payment_source: 'particular',
      description: '',
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!form.category || !form.payment_method || formGross <= 0) {
      toast.error('Preencha tipo, categoria, valor e forma de pagamento');
      return;
    }
    setCreating(true);
    try {
      await api.post('/financial-reports/entries', {
        entry_date: form.entry_date,
        type: form.type,
        category: form.category,
        payment_source: form.type === 'revenue' ? form.payment_source : 'particular',
        payment_method: form.payment_method,
        gross_amount: formGross,
        discount_amount: formDiscount,
        net_amount: formNet,
        fee_amount: 0,
        description: form.description || `${TYPE_LABELS[form.type]} — ${form.category}`,
        status: 'confirmed',
      });
      toast.success('Lançamento criado com sucesso');
      setCreateOpen(false);
      // Lançamento manual nasce confirmado → mostra a aba certa.
      if (status !== 'confirmed') setStatus('confirmed');
      else fetchEntries();
    } catch {
      toast.error('Erro ao criar lançamento');
    } finally {
      setCreating(false);
    }
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildFilterParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(offset));
      const res = await api.get<{ rows: FinancialEntry[]; count: number }>(
        `/financial-reports/entries?${params.toString()}`,
      );
      // Compatibilidade: aceita tanto {rows,count} quanto array simples.
      const data = res.data as any;
      if (Array.isArray(data)) {
        setEntries(data);
        setTotal(data.length);
      } else {
        setEntries(Array.isArray(data.rows) ? data.rows : []);
        setTotal(Number(data.count) || 0);
      }
    } catch {
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  }, [buildFilterParams, offset]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openConfirm = async (entry: FinancialEntry) => {
    setConfirmEntry(entry);
    setSelectedMethod('');
    setDiscount('');
    setOptions([]);
    try {
      const base = Number(entry.base_amount ?? entry.gross_amount);
      const res = await api.get<PaymentOption[]>(
        `/financial-reports/entries/payment-options?amount=${base}`,
      );
      setOptions(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar formas de pagamento');
    }
  };

  const discountNum = Number(discount) || 0;
  const baseAmount = Number(confirmEntry?.base_amount ?? confirmEntry?.gross_amount ?? 0);
  const netBase = Math.max(0, baseAmount - discountNum);

  // Recalcula à vista/a prazo no cliente conforme o desconto (gross-up).
  const displayOptions = useMemo(() => {
    return options.map((o) => {
      const fee = o.fee_percentage / 100;
      const clientPays = fee > 0 ? netBase / (1 - fee) : netBase;
      return {
        ...o,
        client_pays: Math.round(clientPays * 100) / 100,
        fee_amount: Math.round((clientPays - netBase) * 100) / 100,
        clinic_receives: Math.round(netBase * 100) / 100,
      };
    });
  }, [options, netBase]);

  const submitConfirm = async () => {
    if (!confirmEntry || !selectedMethod) {
      toast.error('Selecione a forma de pagamento');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/financial-reports/entries/${confirmEntry.id}/confirm`, {
        payment_method: selectedMethod,
        discount_amount: discountNum,
      });
      toast.success('Lançamento confirmado');
      setConfirmEntry(null);
      fetchEntries();
    } catch {
      toast.error('Erro ao confirmar lançamento');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEntry = async (entry: FinancialEntry) => {
    try {
      await api.patch(`/financial-reports/entries/${entry.id}/cancel`, {});
      toast.success('Lançamento cancelado');
      fetchEntries();
    } catch {
      toast.error('Erro ao cancelar lançamento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lançamentos Financeiros</h1>
          <p className="text-sm text-muted-foreground">
            Lançamentos sugeridos automaticamente; confirme a forma de pagamento usada para registrar o valor real.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Lançamento
        </Button>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.key}
            variant={status === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatus(tab.key)}
          >
            {tab.key === 'suggested' && <Clock className="mr-2 size-4" />}
            {tab.key === 'confirmed' && <CheckCircle className="mr-2 size-4" />}
            {tab.key === 'cancelled' && <XCircle className="mr-2 size-4" />}
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Filtros avançados */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">De</Label>
          <Input
            type="date"
            className="w-[150px]"
            value={fromDate}
            onChange={(ev) => setFromDate(ev.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Até</Label>
          <Input
            type="date"
            className="w-[150px]"
            value={toDate}
            onChange={(ev) => setToDate(ev.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Tipo</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {(typeFilter !== 'all' ? CATEGORIES_BY_TYPE[typeFilter] ?? [] : ALL_CATEGORY_OPTIONS).map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1">
          <Label className="text-xs text-muted-foreground">Busca</Label>
          <Input
            type="text"
            placeholder="Buscar na descrição..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Limpar filtros
        </Button>
        <Button variant="outline" size="sm" onClick={exportList}>
          ↓ Exportar (.xlsx)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {STATUS_TABS.find((t) => t.key === status)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento {status === 'suggested' ? 'sugerido' : status === 'confirmed' ? 'confirmado' : 'cancelado'}.
            </p>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <Table className="min-w-full border-collapse bg-white text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Data</TableHead>
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Categoria</TableHead>
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Descrição</TableHead>
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">
                    {status === 'confirmed' ? 'Recebido' : 'Valor à vista'}
                  </TableHead>
                  {status === 'confirmed' && <TableHead className="border-l border-slate-200 px-3 py-2 text-left text-[11px] uppercase tracking-[0.12em] text-slate-600">Forma</TableHead>}
                  <TableHead className="border-l border-slate-200 px-3 py-2 text-right text-[11px] uppercase tracking-[0.12em] text-slate-600">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">{new Date(e.entry_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">
                      <Badge variant="secondary">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                    </TableCell>
                    <TableCell className="border border-slate-200 px-3 py-3 text-slate-600 max-w-[280px] truncate">{e.description ?? '—'}</TableCell>
                    <TableCell className="border border-slate-200 px-3 py-3 text-right tabular-nums text-slate-600">
                      {status === 'confirmed' ? fmt(e.net_amount) : fmt(e.base_amount ?? e.gross_amount)}
                    </TableCell>
                    {status === 'confirmed' && <TableCell className="border border-slate-200 px-3 py-3 text-slate-600">{methodLabel(e.payment_method)}</TableCell>}
                    <TableCell className="border border-slate-200 px-3 py-3 text-right text-slate-600">
                      {status === 'suggested' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => openConfirm(e)}>
                            Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => cancelEntry(e)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}

          {!loading && total > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Exibindo {entries.length} de {total} lançamento{total === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmEntry} onOpenChange={(o) => !o && setConfirmEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar lançamento</DialogTitle>
          </DialogHeader>

          {confirmEntry && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {CATEGORY_LABELS[confirmEntry.category] ?? confirmEntry.category}
                  </span>
                  <span className="font-medium">{confirmEntry.description ?? '—'}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Valor base (à vista)</span>
                  <span className="font-semibold">{fmt(baseAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-3">
                <div>
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={discount}
                    onChange={(ev) => setDiscount(ev.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">Valor real (recebido): </span>
                  <span className="font-semibold">{fmt(netBase)}</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Forma de pagamento usada</Label>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {displayOptions.length === 0 ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    displayOptions.map((o) => (
                      <button
                        type="button"
                        key={o.method}
                        onClick={() => setSelectedMethod(o.method)}
                        className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition ${
                          selectedMethod === o.method
                            ? 'border-primary ring-1 ring-primary'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{methodLabel(o.method)}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.modality === 'a_vista' ? 'À vista' : `A prazo · taxa ${o.fee_percentage}%`}
                            {o.settlement_days > 0 ? ` · ${o.settlement_days}d p/ receber` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{fmt(o.client_pays)}</div>
                          <div className="text-xs text-muted-foreground">
                            Recebe {fmt(o.clinic_receives)}
                            {o.fee_amount > 0 ? ` · taxa ${fmt(o.fee_amount)}` : ''}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmEntry(null)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={submitConfirm} disabled={submitting || !selectedMethod}>
              <Wallet className="mr-2 size-4" />
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de lançamento manual */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lançamento manual</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(CATEGORIES_BY_TYPE[form.type] ?? []).map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="entry-date">Data *</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={form.entry_date}
                  onChange={(ev) => setField('entry_date', ev.target.value)}
                />
              </div>
              <div>
                <Label>Forma de pagamento *</Label>
                <Select value={form.payment_method} onValueChange={(v) => setField('payment_method', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{methodLabel(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gross-amount">Valor bruto (R$) *</Label>
                <Input
                  id="gross-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.gross_amount}
                  onChange={(ev) => setField('gross_amount', ev.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="discount-amount">Desconto (R$)</Label>
                <Input
                  id="discount-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount_amount}
                  onChange={(ev) => setField('discount_amount', ev.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            <p className="text-right text-sm">
              <span className="text-muted-foreground">Valor líquido: </span>
              <span className="font-semibold">{fmt(formNet)}</span>
            </p>

            {form.type === 'revenue' && (
              <div>
                <Label>Fonte</Label>
                <Select value={form.payment_source} onValueChange={(v) => setField('payment_source', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">Particular</SelectItem>
                    <SelectItem value="health_plan">Plano de Saúde</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="entry-description">Descrição</Label>
              <Textarea
                id="entry-description"
                value={form.description}
                onChange={(ev) => setField('description', ev.target.value)}
                placeholder="Ex.: Aluguel julho 2026"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              <Plus className="mr-2 size-4" />
              Criar lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

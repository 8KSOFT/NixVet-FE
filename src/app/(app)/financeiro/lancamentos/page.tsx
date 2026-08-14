'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Plus,
  TrendingUp,
  TrendingDown,
  Search,
  Banknote,
  QrCode,
  CreditCard,
  Barcode,
  ArrowLeftRight,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FinancialEntry, FinancialEntryStatus, PaymentOption } from '@/app/types/financial-report';
import {
  useCancelEntryMutation,
  useConfirmEntryMutation,
  useCreateEntryMutation,
  useExportEntriesMutation,
  useFinancialEntriesQuery,
  useFinancialEntriesSummaryQuery,
  usePaymentOptionsMutation,
} from '@/hooks/apiHooks/useFinancialReports';

type Status = FinancialEntryStatus;

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

const METHOD_ICONS: Record<string, React.ElementType> = {
  cash: Banknote,
  pix: QrCode,
  debit: CreditCard,
  credit_1x: CreditCard,
  credit_2_6x: CreditCard,
  credit_7_12x: CreditCard,
  credit_installment: CreditCard,
  boleto: Barcode,
  transfer: ArrowLeftRight,
};

/** "Sugerido via X" — de onde o lançamento automático veio. */
const ORIGIN_LABELS: Record<string, string> = {
  consultation: 'Sugerido via agenda',
  hospitalization: 'Sugerido via internação',
  budget: 'Sugerido via orçamento',
  product_sale: 'Sugerido via venda',
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

// Todas as categorias (para o filtro), agrupadas a partir das categorias por tipo.
const ALL_CATEGORY_OPTIONS = Object.values(CATEGORIES_BY_TYPE)
  .flat()
  .filter((c, i, arr) => arr.findIndex((x) => x.value === c.value) === i);

const PAGE_SIZE = 50;

function fmt(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCompact(n: number | null | undefined) {
  return Number(n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function fmtPct(n: number | null) {
  if (n === null) return null;
  const abs = Math.round(Math.abs(n));
  return `${n >= 0 ? '↑' : '↓'} ${abs}% vs. período anterior`;
}

function methodLabel(m: string) {
  return METHOD_LABELS[m] ?? m;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

const EMPTY_FORM = {
  type: 'expense',
  category: '',
  entry_date: '',
  gross_amount: '',
  discount_amount: '',
  payment_method: '',
  payment_source: 'particular',
  description: '',
};

// ─── Primitivos que faltavam (seguindo os tokens wa-* já usados no app) ──────

/** Card de resumo — chip de ícone + rótulo + valor + variação. O card
 * "result" (Resultado do período) ganha o tratamento sólido em destaque. */
function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone,
  tone,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  delta?: string | null;
  deltaTone?: 'in' | 'out' | 'neutral';
  tone: 'in' | 'out' | 'warn' | 'result';
  loading: boolean;
}) {
  if (tone === 'result') {
    return (
      <div className="flex flex-col gap-2.5 rounded-xl bg-wa-brand-600 px-5 py-4.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-white/85">{label}</span>
          <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-white/16">
            <Icon className="size-3.75 text-white" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7.5 w-28 bg-white/20" />
        ) : (
          <span className="text-[26px] font-extrabold tracking-[-0.01em] text-white">{value}</span>
        )}
        {delta && <span className="text-xs font-semibold text-wa-brand-100">{delta}</span>}
      </div>
    );
  }

  const chip = tone === 'in' ? 'bg-wa-in-bg' : tone === 'out' ? 'bg-wa-out-bg' : 'bg-wa-warn-bg';
  const iconColor = tone === 'in' ? 'text-wa-in' : tone === 'out' ? 'text-wa-out' : 'text-wa-warn';
  const deltaColor =
    deltaTone === 'in' ? 'text-wa-in' : deltaTone === 'out' ? 'text-wa-out' : 'text-wa-ink-3';

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-wa-line bg-white px-5 py-4.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-wa-ink-2">{label}</span>
        <div className={cn('flex size-7.5 shrink-0 items-center justify-center rounded-lg', chip)}>
          <Icon className={cn('size-3.75', iconColor)} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7.5 w-24" />
      ) : (
        <span className="text-[26px] font-extrabold tracking-[-0.01em] text-wa-ink">{value}</span>
      )}
      {delta && <span className={cn('text-xs font-semibold', deltaColor)}>{delta}</span>}
    </div>
  );
}

/** Mini-card compacto (scroll horizontal no mobile) — mesma info do StatCard, sem delta. */
function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone: 'in' | 'out' | 'warn';
  loading: boolean;
}) {
  const chip = tone === 'in' ? 'bg-wa-in-bg' : tone === 'out' ? 'bg-wa-out-bg' : 'bg-wa-warn-bg';
  const iconColor = tone === 'in' ? 'text-wa-in' : tone === 'out' ? 'text-wa-out' : 'text-wa-warn';
  return (
    <div className="flex w-37.5 shrink-0 flex-col gap-2 rounded-xl border border-wa-line bg-white px-3.5 py-3.25">
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-wa-ink-2">{label}</span>
        <div className={cn('flex size-6.5 shrink-0 items-center justify-center rounded-[7px]', chip)}>
          <Icon className={cn('size-3.25', iconColor)} />
        </div>
      </div>
      {loading ? <Skeleton className="h-5.5 w-16" /> : <span className="text-lg font-extrabold text-wa-ink">{value}</span>}
    </div>
  );
}

/** Badge de categoria — verde para receita, vermelho para custo/despesa. */
function CategoryBadge({ category, type }: { category: string; type: string }) {
  const isIn = type === 'revenue';
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        isIn ? 'bg-wa-in-bg text-wa-in' : 'bg-wa-out-bg text-wa-out',
      )}
    >
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

/** Valor com sinal e cor conforme o tipo (entrada/saída). */
function EntryAmount({ entry, status, className }: { entry: FinancialEntry; status: Status; className?: string }) {
  const isIn = entry.type === 'revenue';
  const amount = status === 'confirmed' ? entry.net_amount : (entry.base_amount ?? entry.gross_amount);
  return (
    <span className={cn('font-bold tabular-nums whitespace-nowrap', isIn ? 'text-wa-in' : 'text-wa-out', className)}>
      {isIn ? '+ ' : '− '}
      {fmt(amount)}
    </span>
  );
}

/** Ícone + rótulo da forma de pagamento. */
function PaymentMethodTag({ method }: { method: string }) {
  const Icon = METHOD_ICONS[method] ?? Banknote;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-wa-ink-2">
      <Icon className="size-3.5 shrink-0" />
      {methodLabel(method)}
    </span>
  );
}

/** Pill "Confirmar" — dispara o dialog de confirmação já existente. */
function ConfirmButton({ onClick, full }: { onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-wa-brand-100 bg-wa-brand-50 px-2.75 py-1.5 text-xs font-semibold text-wa-brand-600 transition-colors hover:bg-wa-brand-100',
        full && 'w-full py-2.25 text-[12.5px]',
      )}
    >
      <CheckCircle className="size-3.5" />
      Confirmar
    </button>
  );
}

const STATUS_TABS: { key: Status; label: string; icon: React.ElementType }[] = [
  { key: 'suggested', label: 'Sugeridos', icon: Clock },
  { key: 'confirmed', label: 'Confirmados', icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelados', icon: XCircle },
];

export default function LancamentosPage() {
  const [status, setStatus] = useState<Status>('suggested');

  // Filtros avançados
  const [fromDate, setFromDate] = useState(monthStartISO());
  const [toDate, setToDate] = useState(todayISO());
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [offset, setOffset] = useState(0);

  // Debounce da busca por texto (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Ao mudar qualquer filtro, volta para a primeira página.
  useEffect(() => {
    setOffset(0);
  }, [status, fromDate, toDate, typeFilter, categoryFilter, debouncedSearch]);

  const filters = useMemo(
    () => ({
      status,
      from: fromDate || undefined,
      to: toDate || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [status, fromDate, toDate, typeFilter, categoryFilter, debouncedSearch, offset],
  );

  const { data: page, isLoading: loading } = useFinancialEntriesQuery(filters);
  const entries = page?.rows ?? [];
  const total = page?.count ?? 0;

  const { data: summary, isLoading: summaryLoading } = useFinancialEntriesSummaryQuery(fromDate, toDate);

  const clearFilters = () => {
    setFromDate(monthStartISO());
    setToDate(todayISO());
    setTypeFilter('all');
    setCategoryFilter('all');
    setSearch('');
  };

  const exportEntriesMutation = useExportEntriesMutation();
  const exportList = async () => {
    try {
      const blob = await exportEntriesMutation.mutateAsync({ ...filters, limit: undefined, offset: undefined });
      const url = URL.createObjectURL(blob);
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

  const paymentOptions = usePaymentOptionsMutation();
  const confirmEntryMutation = useConfirmEntryMutation();
  const cancelEntryMutation = useCancelEntryMutation();
  const submitting = confirmEntryMutation.isPending;

  // Dialog de lançamento manual
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const createEntryMutation = useCreateEntryMutation();
  const creating = createEntryMutation.isPending;

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
    setForm({ ...EMPTY_FORM, entry_date: todayISO() });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!form.category || !form.payment_method || formGross <= 0) {
      toast.error('Preencha tipo, categoria, valor e forma de pagamento');
      return;
    }
    try {
      await createEntryMutation.mutateAsync({
        entry_date: form.entry_date,
        type: form.type as 'revenue' | 'cost' | 'expense',
        category: form.category,
        payment_source: form.type === 'revenue' ? (form.payment_source as 'particular' | 'health_plan') : 'particular',
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
    } catch {
      toast.error('Erro ao criar lançamento');
    }
  };

  const openConfirm = async (entry: FinancialEntry) => {
    setConfirmEntry(entry);
    setSelectedMethod('');
    setDiscount('');
    setOptions([]);
    try {
      const base = Number(entry.base_amount ?? entry.gross_amount);
      const result = await paymentOptions.mutateAsync(base);
      setOptions(result);
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
    try {
      await confirmEntryMutation.mutateAsync({
        id: confirmEntry.id,
        paymentMethod: selectedMethod,
        discountAmount: discountNum,
      });
      setConfirmEntry(null);
    } catch {
      toast.error('Erro ao confirmar lançamento');
    }
  };

  const cancelEntry = async (entry: FinancialEntry) => {
    try {
      await cancelEntryMutation.mutateAsync(entry.id);
    } catch {
      toast.error('Erro ao cancelar lançamento');
    }
  };

  const emptyMessage =
    status === 'suggested' ? 'Nenhum lançamento sugerido.' : status === 'confirmed' ? 'Nenhum lançamento confirmado.' : 'Nenhum lançamento cancelado.';

  return (
    <div className="space-y-5 pb-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-wa-ink">Lançamentos Financeiros</h1>
          <p className="mt-1 text-sm text-wa-ink-2">
            Lançamentos sugeridos automaticamente; confirme a forma de pagamento usada para registrar o valor real.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="hidden shrink-0 gap-1.5 rounded-wa font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)] md:inline-flex"
        >
          <Plus className="size-4" />
          Lançamento
        </Button>
      </div>

      {/* ── Mobile: hero (Resultado) + mini-cards em scroll horizontal ── */}
      <div className="flex flex-col gap-3 md:hidden">
        <StatCard
          tone="result"
          label="Resultado do período"
          value={fmt(summary?.result)}
          delta={fmtPct(summary?.result_diff_pct ?? null)}
          icon={Wallet}
          loading={summaryLoading}
        />
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <MiniStat tone="in" label="Receitas" value={fmtCompact(summary?.revenue)} icon={TrendingUp} loading={summaryLoading} />
          <MiniStat tone="out" label="Despesas" value={fmtCompact(summary?.expense)} icon={TrendingDown} loading={summaryLoading} />
          <MiniStat tone="warn" label="Pendentes" value={String(summary?.pending_count ?? 0)} icon={Clock} loading={summaryLoading} />
        </div>
      </div>

      {/* ── Desktop: 4 cards de resumo ── */}
      <div className="hidden gap-3.5 md:grid md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="in"
          label="Receitas do período"
          value={fmt(summary?.revenue)}
          delta={fmtPct(summary?.revenue_diff_pct ?? null)}
          deltaTone="in"
          icon={TrendingUp}
          loading={summaryLoading}
        />
        <StatCard
          tone="out"
          label="Despesas do período"
          value={fmt(summary?.expense)}
          delta={fmtPct(summary?.expense_diff_pct ?? null)}
          deltaTone="out"
          icon={TrendingDown}
          loading={summaryLoading}
        />
        <StatCard
          tone="warn"
          label="Pendentes de confirmação"
          value={String(summary?.pending_count ?? 0)}
          delta={summary ? `${fmt(summary.pending_amount)} em sugestões` : undefined}
          deltaTone="neutral"
          icon={Clock}
          loading={summaryLoading}
        />
        <StatCard
          tone="result"
          label="Resultado do período"
          value={fmt(summary?.result)}
          delta={fmtPct(summary?.result_diff_pct ?? null)}
          icon={Wallet}
          loading={summaryLoading}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.75 rounded-wa border px-4 py-2.25 text-[13.5px] font-semibold transition-colors',
                active
                  ? 'border-wa-brand-600 bg-wa-brand-600 text-white'
                  : 'border-wa-line bg-white text-wa-ink-2 hover:bg-wa-line-2',
              )}
            >
              <tab.icon className="size-3.75" />
              {tab.label}
              {tab.key === 'suggested' && summary && summary.pending_count > 0 && (
                <span
                  className={cn(
                    'rounded-full px-1.75 py-0.25 text-[11.5px] font-bold',
                    active ? 'bg-white/25 text-white' : 'bg-wa-line-2 text-wa-ink-2',
                  )}
                >
                  {summary.pending_count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Busca (mobile) ── */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 rounded-wa border border-wa-line bg-white px-3.5 py-2.5">
          <Search className="size-3.75 shrink-0 text-wa-ink-3" />
          <input
            type="text"
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            placeholder="Buscar na descrição..."
            className="w-full border-none bg-transparent text-[13px] text-wa-ink outline-none placeholder:text-wa-ink-3"
          />
        </div>
      </div>

      {/* ── Filtros (desktop) ── */}
      <div className="hidden flex-wrap items-end gap-3.5 rounded-xl border border-wa-line bg-white p-4.5 md:flex">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">De</Label>
          <Input
            type="date"
            className="h-9.5 w-37.5 rounded-[9px] border-wa-line text-[13.5px]"
            value={fromDate}
            onChange={(ev) => setFromDate(ev.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">Até</Label>
          <Input
            type="date"
            className="h-9.5 w-37.5 rounded-[9px] border-wa-line text-[13.5px]"
            value={toDate}
            onChange={(ev) => setToDate(ev.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">Tipo</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9.5 w-42.5 rounded-[9px] border-wa-line text-[13.5px]">
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
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">Categoria</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9.5 w-47.5 rounded-[9px] border-wa-line text-[13.5px]">
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
        <div className="flex min-w-50 flex-1 flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">Busca</Label>
          <Input
            type="text"
            className="h-9.5 rounded-[9px] border-wa-line text-[13.5px]"
            placeholder="Buscar na descrição..."
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="pb-2.25 text-[13px] font-semibold whitespace-nowrap text-wa-ink-2 hover:text-wa-ink"
        >
          Limpar filtros
        </button>
        <button
          type="button"
          onClick={exportList}
          className="inline-flex h-9.5 items-center gap-1.75 rounded-[9px] border border-wa-line bg-white px-3.5 text-[13px] font-semibold whitespace-nowrap text-wa-ink hover:bg-wa-line-2"
        >
          <Download className="size-3.5" />
          Exportar (.xlsx)
        </button>
      </div>

      {/* ── Desktop: tabela ── */}
      <div className="hidden overflow-hidden rounded-xl border border-wa-line bg-white md:block">
        <div className="flex items-center justify-between border-b border-wa-line-2 px-5 py-4">
          <h2 className="text-[15px] font-bold text-wa-ink">{STATUS_TABS.find((t) => t.key === status)?.label}</h2>
          <span className="rounded-full bg-wa-line-2 px-2.25 py-0.5 text-[12.5px] text-wa-ink-3">
            {total} lançamento{total === 1 ? '' : 's'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-wa-ink-3">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">Descrição</th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">Categoria</th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">Data</th>
                  {status === 'confirmed' && (
                    <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">Forma de pagamento</th>
                  )}
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-right text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">
                    {status === 'confirmed' ? 'Recebido' : 'Valor à vista'}
                  </th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const origin = e.reference_type ? ORIGIN_LABELS[e.reference_type] : null;
                  return (
                    <tr key={e.id} className="last:[&>td]:border-b-0">
                      <td className="border-b border-wa-line-2 px-5 py-3.5">
                        <div className="text-[13.5px] font-semibold text-wa-ink">{e.description ?? '—'}</div>
                        {origin && <div className="mt-0.5 text-xs text-wa-ink-3">{origin}</div>}
                      </td>
                      <td className="border-b border-wa-line-2 px-5 py-3.5">
                        <CategoryBadge category={e.category} type={e.type} />
                      </td>
                      <td className="border-b border-wa-line-2 px-5 py-3.5 text-[13.5px] text-wa-ink">
                        {new Date(e.entry_date).toLocaleDateString('pt-BR')}
                      </td>
                      {status === 'confirmed' && (
                        <td className="border-b border-wa-line-2 px-5 py-3.5">
                          <PaymentMethodTag method={e.payment_method} />
                        </td>
                      )}
                      <td className="border-b border-wa-line-2 px-5 py-3.5 text-right">
                        <EntryAmount entry={e} status={status} />
                      </td>
                      <td className="border-b border-wa-line-2 px-5 py-3.5 text-right">
                        {status === 'suggested' ? (
                          <div className="flex items-center justify-end gap-2">
                            <ConfirmButton onClick={() => openConfirm(e)} />
                            <button
                              type="button"
                              onClick={() => cancelEntry(e)}
                              title="Cancelar"
                              aria-label="Cancelar"
                              className="text-wa-ink-3 transition-colors hover:text-wa-out"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-wa-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && total > 0 && (
          <div className="flex items-center justify-between border-t border-wa-line-2 px-5 py-3.5 text-sm text-wa-ink-2">
            <span>
              Exibindo {entries.length} de {total} lançamento{total === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile: lista de cards ── */}
      <div className="flex flex-col gap-2.5 pb-16 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-wa-ink-3">{emptyMessage}</p>
        ) : (
          entries.map((e) => {
            const origin = e.reference_type ? ORIGIN_LABELS[e.reference_type] : null;
            return (
              <div key={e.id} className="rounded-xl border border-wa-line bg-white p-3.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-wa-ink">{e.description ?? '—'}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-wa-ink-3">
                      {origin ?? new Date(e.entry_date).toLocaleDateString('pt-BR')}
                      {origin ? ` · ${new Date(e.entry_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}
                    </div>
                  </div>
                  <EntryAmount entry={e} status={status} className="text-[15px]" />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  <CategoryBadge category={e.category} type={e.type} />
                  <PaymentMethodTag method={e.payment_method} />
                </div>
                {status === 'suggested' ? (
                  <ConfirmButton full onClick={() => openConfirm(e)} />
                ) : null}
              </div>
            );
          })
        )}

        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-1 text-sm text-wa-ink-2">
            <span>Exibindo {entries.length} de {total}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                Próximo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── FAB (mobile) — no desktop o botão do header já cobre isso ── */}
      <button
        type="button"
        onClick={openCreate}
        className="fixed right-5 bottom-20 z-30 flex items-center gap-1.75 rounded-full bg-wa-brand-600 px-5 py-3.25 text-[13.5px] font-bold text-white shadow-[0_8px_20px_rgba(18,179,127,0.35)] transition-colors hover:bg-wa-brand-700 md:hidden"
      >
        <Plus className="size-4" />
        Lançamento
      </button>

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

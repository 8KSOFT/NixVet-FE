'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import { CurrencyInput } from '@/components/ui/currency-input';
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
import { useCurrencyFormatter, resolveAppLanguage, CURRENCY_BY_LANGUAGE } from '@/lib/i18n/currency';

type Status = FinancialEntryStatus;

// Mapeia o código bruto da categoria (vindo do backend) para a chave de
// tradução em `financeiroLancamentos.categoryLabels`.
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  consultation: 'consultation',
  hospitalization: 'hospitalization',
  procedure: 'procedure',
  exam: 'exam',
  vaccine: 'vaccine',
  product: 'product',
  medication: 'medication',
  material: 'material',
  other: 'other',
  // Custos e despesas (lançamento manual)
  medication_purchase: 'medicationPurchase',
  material_purchase: 'materialPurchase',
  lab_cost: 'labCost',
  rent: 'rent',
  personnel: 'personnel',
  utilities: 'utilities',
  marketing: 'marketing',
  equipment: 'equipment',
  tax: 'tax',
};

const METHOD_LABEL_KEYS: Record<string, string> = {
  cash: 'cash',
  pix: 'pix',
  debit: 'debit',
  credit_1x: 'credit1x',
  credit_2_6x: 'credit26x',
  credit_7_12x: 'credit712x',
  credit_installment: 'creditInstallment',
  boleto: 'boleto',
  transfer: 'transfer',
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
const ORIGIN_LABEL_KEYS: Record<string, string> = {
  consultation: 'consultation',
  hospitalization: 'hospitalization',
  budget: 'budget',
  product_sale: 'productSale',
};

// Tipos de lançamento manual e categorias por tipo.
// (a chave de tradução do tipo é o próprio valor: revenue/cost/expense)

const CATEGORIES_BY_TYPE: Record<string, { value: string; labelKey: string }[]> = {
  revenue: [
    { value: 'consultation', labelKey: 'consultation' },
    { value: 'hospitalization', labelKey: 'hospitalization' },
    { value: 'exam', labelKey: 'exam' },
    { value: 'procedure', labelKey: 'procedure' },
    { value: 'product', labelKey: 'product' },
    { value: 'medication', labelKey: 'medication' },
    { value: 'other', labelKey: 'other' },
  ],
  cost: [
    { value: 'medication_purchase', labelKey: 'medicationPurchase' },
    { value: 'lab_cost', labelKey: 'labCost' },
    // Nota: aqui o rótulo é "Materiais" (plural) — diferente de
    // CATEGORY_LABEL_KEYS.material ("Material", singular, usado no badge da
    // tabela). Comportamento original preservado via chave própria.
    { value: 'material', labelKey: 'materialsCost' },
    { value: 'other', labelKey: 'other' },
  ],
  expense: [
    { value: 'rent', labelKey: 'rent' },
    { value: 'personnel', labelKey: 'personnel' },
    { value: 'utilities', labelKey: 'utilities' },
    { value: 'marketing', labelKey: 'marketing' },
    { value: 'equipment', labelKey: 'equipment' },
    { value: 'tax', labelKey: 'tax' },
    { value: 'other', labelKey: 'other' },
  ],
};

const MANUAL_METHODS = ['cash', 'pix', 'debit', 'credit_1x', 'credit_2_6x', 'credit_7_12x', 'boleto', 'transfer'];

// Todas as categorias (para o filtro), agrupadas a partir das categorias por tipo.
const ALL_CATEGORY_OPTIONS = Object.values(CATEGORIES_BY_TYPE)
  .flat()
  .filter((c, i, arr) => arr.findIndex((x) => x.value === c.value) === i);

const PAGE_SIZE = 50;

function categoryLabel(category: string, t: TFunction): string {
  const key = CATEGORY_LABEL_KEYS[category];
  return key ? t(`financeiroLancamentos.categoryLabels.${key}`) : category;
}

function categoryOptionLabel(labelKey: string, t: TFunction): string {
  return t(`financeiroLancamentos.categoryLabels.${labelKey}`);
}

function methodLabel(method: string, t: TFunction): string {
  const key = METHOD_LABEL_KEYS[method];
  return key ? t(`financeiroLancamentos.methodLabels.${key}`) : method;
}

function originLabel(referenceType: string, t: TFunction): string | null {
  const key = ORIGIN_LABEL_KEYS[referenceType];
  return key ? t(`financeiroLancamentos.originLabels.${key}`) : null;
}

function typeLabel(type: string, t: TFunction): string {
  return t(`financeiroLancamentos.typeLabels.${type}`);
}

function fmtPct(n: number | null, t: TFunction) {
  if (n === null) return null;
  const abs = Math.round(Math.abs(n));
  return t('financeiroLancamentos.deltaVsPreviousPeriod', { arrow: n >= 0 ? '↑' : '↓', pct: abs });
}

/** Formatação compacta (sem casas decimais) usada nos mini-cards mobile. Segue
 * o mesmo símbolo/locale do idioma ativo que `useCurrencyFormatter`, mas sem
 * decimais — por isso não reaproveita o hook compartilhado diretamente. */
function useCompactCurrencyFormatter() {
  const { i18n } = useTranslation();
  const lang = resolveAppLanguage(i18n.language);
  const { symbol, locale } = CURRENCY_BY_LANGUAGE[lang];
  return (n: number | null | undefined) =>
    `${symbol} ${Number(n ?? 0).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
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
  const { t } = useTranslation();
  const isIn = type === 'revenue';
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        isIn ? 'bg-wa-in-bg text-wa-in' : 'bg-wa-out-bg text-wa-out',
      )}
    >
      {categoryLabel(category, t)}
    </span>
  );
}

/** Valor com sinal e cor conforme o tipo (entrada/saída). */
function EntryAmount({ entry, status, className }: { entry: FinancialEntry; status: Status; className?: string }) {
  const fmt = useCurrencyFormatter();
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
  const { t } = useTranslation();
  const Icon = METHOD_ICONS[method] ?? Banknote;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-wa-ink-2">
      <Icon className="size-3.5 shrink-0" />
      {methodLabel(method, t)}
    </span>
  );
}

/** Pill "Confirmar" — dispara o dialog de confirmação já existente. */
function ConfirmButton({ onClick, full }: { onClick: () => void; full?: boolean }) {
  const { t } = useTranslation();
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
      {t('financeiroLancamentos.confirmButton')}
    </button>
  );
}

export default function LancamentosPage() {
  const { t } = useTranslation();
  const fmt = useCurrencyFormatter();
  const fmtCompact = useCompactCurrencyFormatter();

  const STATUS_TABS: { key: Status; label: string; icon: React.ElementType }[] = [
    { key: 'suggested', label: t('financeiroLancamentos.statusTabs.suggested'), icon: Clock },
    { key: 'confirmed', label: t('financeiroLancamentos.statusTabs.confirmed'), icon: CheckCircle },
    { key: 'cancelled', label: t('financeiroLancamentos.statusTabs.cancelled'), icon: XCircle },
  ];

  const TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'revenue', label: typeLabel('revenue', t) },
    { value: 'cost', label: typeLabel('cost', t) },
    { value: 'expense', label: typeLabel('expense', t) },
  ];

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
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
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
      toast.error(t('financeiroLancamentos.exportError'));
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
      toast.error(t('financeiroLancamentos.createValidationError'));
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
        description: form.description || `${typeLabel(form.type, t)} — ${form.category}`,
        status: 'confirmed',
      });
      toast.success(t('financeiroLancamentos.createSuccess'));
      setCreateOpen(false);
      // Lançamento manual nasce confirmado → mostra a aba certa.
      if (status !== 'confirmed') setStatus('confirmed');
    } catch {
      toast.error(t('financeiroLancamentos.createError'));
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
      toast.error(t('financeiroLancamentos.paymentOptionsLoadError'));
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
      toast.error(t('financeiroLancamentos.selectPaymentMethodError'));
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
      toast.error(t('financeiroLancamentos.confirmError'));
    }
  };

  const cancelEntry = async (entry: FinancialEntry) => {
    try {
      await cancelEntryMutation.mutateAsync(entry.id);
    } catch {
      toast.error(t('financeiroLancamentos.cancelError'));
    }
  };

  const emptyMessage =
    status === 'suggested'
      ? t('financeiroLancamentos.emptyStateSuggested')
      : status === 'confirmed'
        ? t('financeiroLancamentos.emptyStateConfirmed')
        : t('financeiroLancamentos.emptyStateCancelled');

  return (
    <div className="space-y-5 pb-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-wa-ink">{t('financeiroLancamentos.title')}</h1>
          <p className="mt-1 text-sm text-wa-ink-2">
            {t('financeiroLancamentos.subtitle')}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="hidden shrink-0 gap-1.5 rounded-wa font-bold shadow-[0_8px_18px_-6px_rgba(18,179,127,0.45)] md:inline-flex"
        >
          <Plus className="size-4" />
          {t('financeiroLancamentos.newEntryButton')}
        </Button>
      </div>

      {/* ── Mobile: hero (Resultado) + mini-cards em grade (sem scroll lateral) ── */}
      <div className="flex flex-col gap-3 md:hidden">
        <StatCard
          tone="result"
          label={t('financeiroLancamentos.statResultLabel')}
          value={fmt(summary?.result)}
          delta={fmtPct(summary?.result_diff_pct ?? null, t)}
          icon={Wallet}
          loading={summaryLoading}
        />
        <div className="flex flex-wrap gap-2.5">
          <MiniStat tone="in" label={t('financeiroLancamentos.statRevenueShortLabel')} value={fmtCompact(summary?.revenue)} icon={TrendingUp} loading={summaryLoading} />
          <MiniStat tone="out" label={t('financeiroLancamentos.statExpenseShortLabel')} value={fmtCompact(summary?.expense)} icon={TrendingDown} loading={summaryLoading} />
          <MiniStat tone="warn" label={t('financeiroLancamentos.statPendingShortLabel')} value={String(summary?.pending_count ?? 0)} icon={Clock} loading={summaryLoading} />
        </div>
      </div>

      {/* ── Desktop: 4 cards de resumo ── */}
      <div className="hidden gap-3.5 md:grid md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="in"
          label={t('financeiroLancamentos.statRevenueLabel')}
          value={fmt(summary?.revenue)}
          delta={fmtPct(summary?.revenue_diff_pct ?? null, t)}
          deltaTone="in"
          icon={TrendingUp}
          loading={summaryLoading}
        />
        <StatCard
          tone="out"
          label={t('financeiroLancamentos.statExpenseLabel')}
          value={fmt(summary?.expense)}
          delta={fmtPct(summary?.expense_diff_pct ?? null, t)}
          deltaTone="out"
          icon={TrendingDown}
          loading={summaryLoading}
        />
        <StatCard
          tone="warn"
          label={t('financeiroLancamentos.statPendingLabel')}
          value={String(summary?.pending_count ?? 0)}
          delta={summary ? t('financeiroLancamentos.pendingAmountSuggested', { amount: fmt(summary.pending_amount) }) : undefined}
          deltaTone="neutral"
          icon={Clock}
          loading={summaryLoading}
        />
        <StatCard
          tone="result"
          label={t('financeiroLancamentos.statResultLabel')}
          value={fmt(summary?.result)}
          delta={fmtPct(summary?.result_diff_pct ?? null, t)}
          icon={Wallet}
          loading={summaryLoading}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-2">
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
            placeholder={t('financeiroLancamentos.searchPlaceholder')}
            className="w-full border-none bg-transparent text-[13px] text-wa-ink outline-none placeholder:text-wa-ink-3"
          />
        </div>
      </div>

      {/* ── Filtros (desktop) ── */}
      <div className="hidden flex-wrap items-end gap-3.5 rounded-xl border border-wa-line bg-white p-4.5 md:flex">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">{t('financeiroLancamentos.fromLabel')}</Label>
          <Input
            type="date"
            className="h-9.5 w-37.5 rounded-[9px] border-wa-line text-[13.5px]"
            value={fromDate}
            onChange={(ev) => setFromDate(ev.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">{t('financeiroLancamentos.toLabel')}</Label>
          <Input
            type="date"
            className="h-9.5 w-37.5 rounded-[9px] border-wa-line text-[13.5px]"
            value={toDate}
            onChange={(ev) => setToDate(ev.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">{t('financeiroLancamentos.filterTypeLabel')}</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9.5 w-42.5 rounded-[9px] border-wa-line text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('financeiroLancamentos.allTypesOption')}</SelectItem>
              {TYPE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">{t('financeiroLancamentos.filterCategoryLabel')}</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9.5 w-47.5 rounded-[9px] border-wa-line text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('financeiroLancamentos.allCategoriesOption')}</SelectItem>
              {(typeFilter !== 'all' ? CATEGORIES_BY_TYPE[typeFilter] ?? [] : ALL_CATEGORY_OPTIONS).map((c) => (
                <SelectItem key={c.value} value={c.value}>{categoryOptionLabel(c.labelKey, t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-50 flex-1 flex-col gap-1.5">
          <Label className="text-xs font-semibold text-wa-ink-2">{t('financeiroLancamentos.filterSearchLabel')}</Label>
          <Input
            type="text"
            className="h-9.5 rounded-[9px] border-wa-line text-[13.5px]"
            placeholder={t('financeiroLancamentos.searchPlaceholder')}
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={clearFilters}
          className="pb-2.25 text-[13px] font-semibold whitespace-nowrap text-wa-ink-2 hover:text-wa-ink"
        >
          {t('financeiroLancamentos.clearFiltersButton')}
        </button>
        <button
          type="button"
          onClick={exportList}
          className="inline-flex h-9.5 items-center gap-1.75 rounded-[9px] border border-wa-line bg-white px-3.5 text-[13px] font-semibold whitespace-nowrap text-wa-ink hover:bg-wa-line-2"
        >
          <Download className="size-3.5" />
          {t('financeiroLancamentos.exportButton')}
        </button>
      </div>

      {/* ── Desktop: tabela ── */}
      <div className="hidden overflow-hidden rounded-xl border border-wa-line bg-white md:block">
        <div className="flex items-center justify-between border-b border-wa-line-2 px-5 py-4">
          <h2 className="text-[15px] font-bold text-wa-ink">{STATUS_TABS.find((tab) => tab.key === status)?.label}</h2>
          <span className="rounded-full bg-wa-line-2 px-2.25 py-0.5 text-[12.5px] text-wa-ink-3">
            {t('financeiroLancamentos.entryCount', { count: total })}
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
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">{t('financeiroLancamentos.tableHeaderDescription')}</th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">{t('financeiroLancamentos.tableHeaderCategory')}</th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">{t('financeiroLancamentos.tableHeaderDate')}</th>
                  {status === 'confirmed' && (
                    <th className="border-b border-wa-line-2 px-5 py-2.75 text-left text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">{t('financeiroLancamentos.tableHeaderPaymentMethod')}</th>
                  )}
                  <th className="border-b border-wa-line-2 px-5 py-2.75 text-right text-xs font-semibold tracking-wide text-wa-ink-3 uppercase">
                    {status === 'confirmed' ? t('financeiroLancamentos.tableHeaderReceived') : t('financeiroLancamentos.tableHeaderCashValue')}
                  </th>
                  <th className="border-b border-wa-line-2 px-5 py-2.75" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const origin = e.reference_type ? originLabel(e.reference_type, t) : null;
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
                              title={t('financeiroLancamentos.cancel')}
                              aria-label={t('financeiroLancamentos.cancel')}
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
              {t('financeiroLancamentos.showingCountOfTotal', { shown: entries.length, count: total })}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                {t('financeiroLancamentos.previousPage')}
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                {t('financeiroLancamentos.nextPage')}
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
            const origin = e.reference_type ? originLabel(e.reference_type, t) : null;
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
            <span>{t('financeiroLancamentos.showingCountOfTotalShort', { shown: entries.length, count: total })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>
                {t('financeiroLancamentos.previousPage')}
              </Button>
              <Button variant="outline" size="sm" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}>
                {t('financeiroLancamentos.nextPage')}
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
        {t('financeiroLancamentos.newEntryButton')}
      </button>

      <Dialog open={!!confirmEntry} onOpenChange={(o) => !o && setConfirmEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('financeiroLancamentos.confirmDialogTitle')}</DialogTitle>
          </DialogHeader>

          {confirmEntry && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {categoryLabel(confirmEntry.category, t)}
                  </span>
                  <span className="font-medium">{confirmEntry.description ?? '—'}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">{t('financeiroLancamentos.baseAmountLabel')}</span>
                  <span className="font-semibold">{fmt(baseAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 items-end gap-3">
                <div>
                  <Label htmlFor="discount">{t('financeiroLancamentos.discountLabel')}</Label>
                  <CurrencyInput id="discount" value={discount} onValueChange={setDiscount} />
                </div>
                <div className="text-right text-sm">
                  <span className="text-muted-foreground">{t('financeiroLancamentos.netReceivedLabel')}</span>
                  <span className="font-semibold">{fmt(netBase)}</span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('financeiroLancamentos.paymentMethodUsedLabel')}</Label>
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
                          <div className="font-medium">{methodLabel(o.method, t)}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.modality === 'a_vista'
                              ? t('financeiroLancamentos.paymentModalityCash')
                              : t('financeiroLancamentos.paymentModalityInstallment', { pct: o.fee_percentage })}
                            {o.settlement_days > 0 ? t('financeiroLancamentos.settlementDaysSuffix', { days: o.settlement_days }) : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{fmt(o.client_pays)}</div>
                          <div className="text-xs text-muted-foreground">
                            {t('financeiroLancamentos.clinicReceivesAmount', { amount: fmt(o.clinic_receives) })}
                            {o.fee_amount > 0 ? t('financeiroLancamentos.feeAmountSuffix', { amount: fmt(o.fee_amount) }) : ''}
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
              {t('financeiroLancamentos.cancel')}
            </Button>
            <Button onClick={submitConfirm} disabled={submitting || !selectedMethod}>
              <Wallet className="mr-2 size-4" />
              {t('financeiroLancamentos.confirmReceiptButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de lançamento manual */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('financeiroLancamentos.createDialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('financeiroLancamentos.typeRequiredLabel')}</Label>
                <Select value={form.type} onValueChange={(v) => setField('type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroLancamentos.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('financeiroLancamentos.categoryRequiredLabel')}</Label>
                <Select value={form.category} onValueChange={(v) => setField('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroLancamentos.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(CATEGORIES_BY_TYPE[form.type] ?? []).map((c) => (
                      <SelectItem key={c.value} value={c.value}>{categoryOptionLabel(c.labelKey, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="entry-date">{t('financeiroLancamentos.dateRequiredLabel')}</Label>
                <Input
                  id="entry-date"
                  type="date"
                  value={form.entry_date}
                  onChange={(ev) => setField('entry_date', ev.target.value)}
                />
              </div>
              <div>
                <Label>{t('financeiroLancamentos.paymentMethodRequiredLabel')}</Label>
                <Select value={form.payment_method} onValueChange={(v) => setField('payment_method', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('financeiroLancamentos.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{methodLabel(m, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="gross-amount">{t('financeiroLancamentos.grossAmountLabel')}</Label>
                <CurrencyInput
                  id="gross-amount"
                  value={form.gross_amount}
                  onValueChange={(v) => setField('gross_amount', v)}
                />
              </div>
              <div>
                <Label htmlFor="discount-amount">{t('financeiroLancamentos.discountLabel')}</Label>
                <CurrencyInput
                  id="discount-amount"
                  value={form.discount_amount}
                  onValueChange={(v) => setField('discount_amount', v)}
                />
              </div>
            </div>

            <p className="text-right text-sm">
              <span className="text-muted-foreground">{t('financeiroLancamentos.netAmountLabel')}</span>
              <span className="font-semibold">{fmt(formNet)}</span>
            </p>

            {form.type === 'revenue' && (
              <div>
                <Label>{t('financeiroLancamentos.sourceLabel')}</Label>
                <Select value={form.payment_source} onValueChange={(v) => setField('payment_source', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particular">{t('financeiroLancamentos.sourceParticularOption')}</SelectItem>
                    <SelectItem value="health_plan">{t('financeiroLancamentos.sourceHealthPlanOption')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="entry-description">{t('financeiroLancamentos.descriptionLabel')}</Label>
              <Textarea
                id="entry-description"
                value={form.description}
                onChange={(ev) => setField('description', ev.target.value)}
                placeholder={t('financeiroLancamentos.descriptionPlaceholder')}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              {t('financeiroLancamentos.cancel')}
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              <Plus className="mr-2 size-4" />
              {t('financeiroLancamentos.createEntryButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  CashFlow,
  CreateFinancialEntryPayload,
  DRE,
  DRECompareMode,
  DREComparison,
  FinancialEntriesFilters,
  FinancialEntriesPage,
  FinancialEntry,
  FinancialEntryStatus,
  FinancialKPIs,
  MonthlyDRE,
  PaymentMethodCostData,
  PaymentOption,
  PaymentSetting,
  PaymentSettingPayload,
  RevenueAnalysis,
} from '@/app/types/financial-report';

export const financialReportKeys = {
  all: ['financial-reports'] as const,
  entries: (filters: FinancialEntriesFilters) => [...financialReportKeys.all, 'entries', filters] as const,
  dre: (period: string) => [...financialReportKeys.all, 'dre', period] as const,
  dreComparison: (period: string, compare: DRECompareMode) =>
    [...financialReportKeys.all, 'dre-comparison', period, compare] as const,
  dreMonthly: () => [...financialReportKeys.all, 'dre-monthly'] as const,
  kpis: (period: string) => [...financialReportKeys.all, 'kpis', period] as const,
  cashFlow: (days: number) => [...financialReportKeys.all, 'cash-flow', days] as const,
  custosPagamento: (period: string) => [...financialReportKeys.all, 'custos-pagamento', period] as const,
  revenueAnalysis: (from: string, to: string, healthPlanId: string) =>
    [...financialReportKeys.all, 'revenue-analysis', { from, to, healthPlanId }] as const,
  paymentSettings: () => [...financialReportKeys.all, 'payment-settings'] as const,
};

function buildEntriesParams(filters: FinancialEntriesFilters): URLSearchParams {
  const params = new URLSearchParams({ status: filters.status });
  if (filters.from && filters.to) {
    params.set('from', filters.from);
    params.set('to', filters.to);
  }
  if (filters.type) params.set('type', filters.type);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));
  return params;
}

/** Taxas/prazos de liquidação por forma de pagamento — usado em Settings/Pagamentos. */
export function usePaymentSettingsQuery() {
  return useQuery({
    queryKey: financialReportKeys.paymentSettings(),
    queryFn: async () => {
      const { data } = await api.get<PaymentSetting[]>('/financial-reports/payment-settings');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdatePaymentSettingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ method, payload }: { method: string; payload: PaymentSettingPayload }) => {
      const { data } = await api.patch(`/financial-reports/payment-settings/${method}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialReportKeys.paymentSettings() });
    },
  });
}

/** Lançamentos financeiros (sugeridos/confirmados/cancelados) com filtros e paginação. */
export function useFinancialEntriesQuery(filters: FinancialEntriesFilters) {
  return useQuery({
    queryKey: financialReportKeys.entries(filters),
    queryFn: async (): Promise<FinancialEntriesPage> => {
      const params = buildEntriesParams(filters);
      const { data } = await api.get<FinancialEntriesPage | FinancialEntry[]>(
        `/financial-reports/entries?${params.toString()}`,
      );
      // Compatibilidade: aceita tanto {rows,count} quanto array simples.
      if (Array.isArray(data)) {
        return { rows: data, count: data.length, limit: data.length, offset: 0 };
      }
      return {
        rows: Array.isArray(data.rows) ? data.rows : [],
        count: Number(data.count) || 0,
        limit: Number(data.limit) || 50,
        offset: Number(data.offset) || 0,
      };
    },
  });
}

/** Criação de lançamento manual (despesa/custo/receita). */
export function useCreateEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateFinancialEntryPayload) => {
      const { data } = await api.post<FinancialEntry>('/financial-reports/entries', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
    },
  });
}

/** Exportação XLSX da lista filtrada de lançamentos. */
export function useExportEntriesMutation() {
  return useMutation({
    mutationFn: async (filters: FinancialEntriesFilters) => {
      const params = buildEntriesParams(filters);
      const { data } = await api.get(`/financial-reports/entries/export?${params.toString()}`, {
        responseType: 'blob',
      });
      return data as Blob;
    },
  });
}

/** Simulação de formas de pagamento para um valor — disparada sob demanda (não é dado de tela). */
export function usePaymentOptionsMutation() {
  return useMutation({
    mutationFn: async (amount: number) => {
      const { data } = await api.get<PaymentOption[]>(`/financial-reports/entries/payment-options?amount=${amount}`);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useConfirmEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      paymentMethod,
      discountAmount,
    }: {
      id: string;
      paymentMethod: string;
      discountAmount: number;
    }) => {
      const { data } = await api.patch(`/financial-reports/entries/${id}/confirm`, {
        payment_method: paymentMethod,
        discount_amount: discountAmount,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
    },
  });
}

export function useCancelEntryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/financial-reports/entries/${id}/cancel`, {});
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
    },
  });
}

/** DRE (Demonstrativo de Resultado) de um período (YYYY-MM). */
export function useDREQuery(period: string) {
  return useQuery({
    queryKey: financialReportKeys.dre(period),
    queryFn: async () => {
      const { data } = await api.get<DRE>(`/financial-reports/dre?period=${period}`);
      return data;
    },
    enabled: !!period,
  });
}

/** DRE comparativo com o mês anterior ou mesmo mês do ano anterior. */
export function useDREComparisonQuery(period: string, compare: DRECompareMode) {
  return useQuery({
    queryKey: financialReportKeys.dreComparison(period, compare),
    queryFn: async () => {
      const { data } = await api.get<DREComparison>(
        `/financial-reports/dre?period=${period}&compare=${compare}`,
      );
      return data;
    },
    enabled: !!period && compare !== 'none',
  });
}

/** KPIs gerenciais do período (ticket médio, margens, MoM, mix de pagamento). */
export function useFinancialKPIsQuery(period: string) {
  return useQuery({
    queryKey: financialReportKeys.kpis(period),
    queryFn: async () => {
      const { data } = await api.get<FinancialKPIs>(`/financial-reports/kpis?period=${period}`);
      return data;
    },
    enabled: !!period,
  });
}

/** Fluxo de caixa projetado (entradas por liquidação + saídas de contas a pagar). */
export function useCashFlowQuery(days: number) {
  return useQuery({
    queryKey: financialReportKeys.cashFlow(days),
    queryFn: async () => {
      const { data } = await api.get<CashFlow>(`/financial-reports/fluxo-caixa?days=${days}`);
      return data;
    },
  });
}

/** DRE mensal (últimos meses) — usado no gráfico. */
export function useMonthlyDREQuery() {
  return useQuery({
    queryKey: financialReportKeys.dreMonthly(),
    queryFn: async () => {
      const { data } = await api.get<MonthlyDRE[]>('/financial-reports/dre/monthly');
      return Array.isArray(data) ? data : [];
    },
  });
}

/** Exportação do DRE (PDF/Excel) — retorna o Blob para o chamador decidir como salvar. */
export function useExportDREMutation() {
  return useMutation({
    mutationFn: async ({ period, format }: { period: string; format: 'pdf' | 'xlsx' }) => {
      const { data } = await api.get(`/financial-reports/dre/export?period=${period}&format=${format}`, {
        responseType: 'blob',
      });
      return data as Blob;
    },
  });
}

/** Custos por forma de pagamento em um período (YYYY-MM). */
export function useCustosPagamentoQuery(period: string) {
  return useQuery({
    queryKey: financialReportKeys.custosPagamento(period),
    queryFn: async () => {
      const { data } = await api.get<Record<string, PaymentMethodCostData>>(
        `/financial-reports/custos-pagamento?period=${period}`,
      );
      return data;
    },
    enabled: !!period,
  });
}

/** Análise de receita líquida por período/convênio. */
export function useRevenueAnalysisQuery(from: string, to: string, healthPlanId: string) {
  return useQuery({
    queryKey: financialReportKeys.revenueAnalysis(from, to, healthPlanId),
    queryFn: async () => {
      const params: Record<string, string> = { from, to };
      if (healthPlanId !== 'all') params.health_plan_id = healthPlanId;
      const { data } = await api.get<RevenueAnalysis>('/financial-reports/revenue-analysis', { params });
      return data;
    },
    enabled: !!from && !!to,
  });
}

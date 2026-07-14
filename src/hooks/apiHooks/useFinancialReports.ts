'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  DRE,
  FinancialEntry,
  FinancialEntryStatus,
  MonthlyDRE,
  PaymentMethodCostData,
  PaymentOption,
  PaymentSetting,
  PaymentSettingPayload,
  RevenueAnalysis,
} from '@/app/types/financial-report';

export const financialReportKeys = {
  all: ['financial-reports'] as const,
  entries: (status: FinancialEntryStatus) => [...financialReportKeys.all, 'entries', status] as const,
  dre: (period: string) => [...financialReportKeys.all, 'dre', period] as const,
  dreMonthly: () => [...financialReportKeys.all, 'dre-monthly'] as const,
  custosPagamento: (period: string) => [...financialReportKeys.all, 'custos-pagamento', period] as const,
  revenueAnalysis: (from: string, to: string, healthPlanId: string) =>
    [...financialReportKeys.all, 'revenue-analysis', { from, to, healthPlanId }] as const,
  paymentSettings: () => [...financialReportKeys.all, 'payment-settings'] as const,
};

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

/** Lançamentos financeiros (sugeridos/confirmados/cancelados). */
export function useFinancialEntriesQuery(status: FinancialEntryStatus) {
  return useQuery({
    queryKey: financialReportKeys.entries(status),
    queryFn: async () => {
      const { data } = await api.get<FinancialEntry[]>(`/financial-reports/entries?status=${status}`);
      return Array.isArray(data) ? data : [];
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

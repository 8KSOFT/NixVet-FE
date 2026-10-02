'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import { financialReportKeys } from '@/hooks/apiHooks/useFinancialReports';

export type ReceivableStatus = 'pending' | 'received' | 'partial' | 'glossed' | 'contested';

export interface Receivable {
  id: string;
  health_plan_id: string;
  health_plan?: { id: string; name: string } | null;
  financial_entry_id: string | null;
  reference_id: string | null;
  reference_type: string | null;
  expected_repasse_date: string;
  expected_amount: number;
  status: ReceivableStatus;
  received_amount: number;
  glosa_amount: number;
  glosa_reason: string | null;
  received_at: string | null;
}

export interface AgingBucket {
  count: number;
  amount: number;
}

export interface Aging {
  on_time: AgingBucket;
  late_1_30: AgingBucket;
  late_31_60: AgingBucket;
  late_61_90: AgingBucket;
  late_over_90: AgingBucket;
  total_pending: number;
  total_glossed: number;
  by_plan: Record<
    string,
    {
      plan_name: string;
      on_time: AgingBucket;
      late_1_30: AgingBucket;
      late_31_60: AgingBucket;
      late_61_90: AgingBucket;
      late_over_90: AgingBucket;
      total: number;
    }
  >;
}

export interface ReceivablesFilters {
  /** 'all' = sem filtro. */
  healthPlanId: string;
  /** 'all' = sem filtro. */
  status: string;
  /** 'all' = sem filtro; senão YYYY-MM. */
  month: string;
}

export const healthPlanReceivableKeys = {
  all: ['health-plan-receivables'] as const,
  lists: () => [...healthPlanReceivableKeys.all, 'list'] as const,
  list: (filters: ReceivablesFilters, page = 1) =>
    [...healthPlanReceivableKeys.lists(), filters, { page }] as const,
  aging: () => [...healthPlanReceivableKeys.all, 'aging'] as const,
};

/** Repasses a receber dos convênios, com os filtros da tela, paginados no servidor. */
export function useHealthPlanReceivablesQuery(filters: ReceivablesFilters, page = 1) {
  return useQuery({
    queryKey: healthPlanReceivableKeys.list(filters, page),
    queryFn: async () => {
      const { data } = await api.get('/health-plans/receivables', {
        params: listQueryParams(page, undefined, {
          health_plan_id: filters.healthPlanId !== 'all' ? filters.healthPlanId : undefined,
          status: filters.status !== 'all' ? filters.status : undefined,
          month: filters.month !== 'all' ? filters.month : undefined,
        }),
      });
      return parseListResponse<Receivable>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Aging dos repasses pendentes (não depende dos filtros da lista). */
export function useHealthPlanReceivablesAgingQuery() {
  return useQuery({
    queryKey: healthPlanReceivableKeys.aging(),
    queryFn: async () => {
      const { data } = await api.get<Aging>('/health-plans/receivables/aging');
      return data;
    },
  });
}

/**
 * Baixa, glosa e contestação mudam a lista e o aging, e também o que entra no
 * fluxo de caixa projetado e na análise de receita — por isso os relatórios
 * financeiros são invalidados junto.
 */
function useInvalidateReceivables() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: healthPlanReceivableKeys.all });
    queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
  };
}

// `silent`: a tela já mostra o toast de cada ação; o automático duplicaria.

export function useMarkReceivableReceivedMutation() {
  const invalidate = useInvalidateReceivables();
  return useMutation({
    mutationFn: async ({ id, receivedAmount, receivedAt }: { id: string; receivedAmount: number; receivedAt: string }) => {
      const { data } = await api.patch(`/health-plans/receivables/${id}/received`, {
        received_amount: receivedAmount,
        received_at: receivedAt,
      });
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useGlosaReceivableMutation() {
  const invalidate = useInvalidateReceivables();
  return useMutation({
    mutationFn: async ({ id, glosaAmount, glosaReason }: { id: string; glosaAmount: number; glosaReason?: string }) => {
      const { data } = await api.patch(`/health-plans/receivables/${id}/glosa`, {
        glosa_amount: glosaAmount,
        glosa_reason: glosaReason,
      });
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useContestReceivableMutation() {
  const invalidate = useInvalidateReceivables();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/health-plans/receivables/${id}/contest`, {});
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

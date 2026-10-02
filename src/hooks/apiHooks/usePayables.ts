'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import { financialReportKeys } from '@/hooks/apiHooks/useFinancialReports';

export type PayableStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Payable {
  id: string;
  description: string;
  supplier: string | null;
  category: string;
  due_date: string;
  amount: number;
  status: PayableStatus;
  paid_at: string | null;
  payment_method: string | null;
  recurrence: string;
  notes: string | null;
  document_url: string | null;
  financial_entry_id: string | null;
}

export interface PayablesSummary {
  total_month: number;
  paid: number;
  pending: number;
  overdue: number;
  overdue_amount: number;
  due_7_days: number;
  by_category: Record<string, number>;
}

export interface PayablesFilters {
  month: string;
  /** 'all' = sem filtro. */
  status: string;
  /** 'all' = sem filtro. */
  category: string;
}

export interface PayablePayload {
  description: string;
  supplier?: string;
  category: string;
  amount: number;
  due_date: string;
  recurrence: string;
  notes?: string;
  document_url?: string;
}

export const payableKeys = {
  all: ['payables'] as const,
  lists: () => [...payableKeys.all, 'list'] as const,
  list: (filters: PayablesFilters, page = 1) => [...payableKeys.lists(), filters, { page }] as const,
  summary: (month: string) => [...payableKeys.all, 'summary', month] as const,
};

// Ordenação: vencidas primeiro → pendentes por vencimento → pagas → canceladas.
const STATUS_ORDER: Record<PayableStatus, number> = { overdue: 0, pending: 1, paid: 2, cancelled: 3 };

/**
 * Contas a pagar do mês, paginadas no servidor (ordem do servidor: vencimento
 * crescente). A ordem por status (vencidas → pendentes → pagas → canceladas)
 * é aplicada só dentro da página — o backend não ordena por status.
 */
export function usePayablesQuery(filters: PayablesFilters, page = 1) {
  return useQuery({
    queryKey: payableKeys.list(filters, page),
    queryFn: async () => {
      const { data } = await api.get('/payables', {
        params: listQueryParams(page, undefined, {
          month: filters.month,
          status: filters.status !== 'all' ? filters.status : undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
        }),
      });
      const result = parseListResponse<Payable>(data, page);
      const items = [...result.items].sort((a, b) => {
        const so = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (so !== 0) return so;
        return a.due_date.localeCompare(b.due_date);
      });
      return { ...result, items };
    },
    enabled: !!filters.month,
    placeholderData: keepPreviousData,
  });
}

/** Cards de resumo do mês (vencido, próximos 7 dias, previsto). */
export function usePayablesSummaryQuery(month: string) {
  return useQuery({
    queryKey: payableKeys.summary(month),
    queryFn: async () => {
      const { data } = await api.get<PayablesSummary>(`/payables/summary?month=${month}`);
      return data;
    },
    enabled: !!month,
  });
}

/**
 * Conta a pagar mexe em mais que a própria lista: pagar gera saída confirmada
 * (DRE, KPIs) e qualquer alteração de valor/vencimento/cancelamento muda a
 * projeção do fluxo de caixa. Sem invalidar os relatórios, essas telas ficavam
 * mostrando o número antigo até o cache expirar.
 */
function useInvalidatePayables() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: payableKeys.all });
    queryClient.invalidateQueries({ queryKey: financialReportKeys.all });
  };
}

// As mutations abaixo são `silent`: a tela já mostra o toast próprio de cada
// ação, e o toast automático do envelope duplicaria a mensagem.

export function useCreatePayableMutation() {
  const invalidate = useInvalidatePayables();
  return useMutation({
    mutationFn: async (payload: PayablePayload) => {
      const { data } = await api.post('/payables', payload);
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useUpdatePayableMutation() {
  const invalidate = useInvalidatePayables();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PayablePayload }) => {
      const { data } = await api.patch(`/payables/${id}`, payload);
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function usePayPayableMutation() {
  const invalidate = useInvalidatePayables();
  return useMutation({
    mutationFn: async ({ id, paymentMethod, paidAt }: { id: string; paymentMethod: string; paidAt: string }) => {
      const { data } = await api.patch(`/payables/${id}/pay`, { payment_method: paymentMethod, paid_at: paidAt });
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

export function useCancelPayableMutation() {
  const invalidate = useInvalidatePayables();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/payables/${id}/cancel`, {});
      return data;
    },
    meta: { silent: true },
    onSuccess: invalidate,
  });
}

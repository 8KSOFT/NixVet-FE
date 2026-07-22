'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { API_PAGE_SIZE, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { FinanceDashboardData, FinanceFilter, FinanceTenantRow } from '@/app/types/superadmin-finance';

export const superadminFinanceKeys = {
  all: ['superadmin-finance'] as const,
  dashboard: (from: string, to: string) => [...superadminFinanceKeys.all, 'dashboard', { from, to }] as const,
  tenants: (filter: FinanceFilter, from: string, to: string, page: number) =>
    [...superadminFinanceKeys.all, 'tenants', { filter, from, to, page }] as const,
};

export function useSuperadminFinanceDashboardQuery(from: string, to: string) {
  return useQuery({
    queryKey: superadminFinanceKeys.dashboard(from, to),
    queryFn: async () => {
      const { data } = await api.get<FinanceDashboardData>('/superadmin/finance/dashboard', {
        params: { from, to },
      });
      return data;
    },
  });
}

export function useSuperadminFinanceTenantsQuery(
  filter: FinanceFilter,
  from: string,
  to: string,
  page: number,
) {
  return useQuery({
    queryKey: superadminFinanceKeys.tenants(filter, from, to, page),
    queryFn: async () => {
      const { data } = await api.get('/superadmin/finance/tenants', {
        params: listQueryParams(page, API_PAGE_SIZE, { filter, from, to }),
      });
      return parseListResponse<FinanceTenantRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

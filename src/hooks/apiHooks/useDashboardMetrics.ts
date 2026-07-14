'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { DashboardMetrics } from '@/app/types/dashboard-metrics';

export const dashboardMetricsKeys = {
  all: ['dashboard-metrics'] as const,
};

export function useDashboardMetricsQuery() {
  return useQuery({
    queryKey: dashboardMetricsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<DashboardMetrics>('/metrics/dashboard');
      return data;
    },
  });
}

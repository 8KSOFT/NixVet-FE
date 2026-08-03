'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  SupportArticle,
  SupportGap,
  SupportStats,
  SupportTicket,
} from '@/app/types/support';

export const supportAdminKeys = {
  all: ['support-admin'] as const,
  stats: () => [...supportAdminKeys.all, 'stats'] as const,
  articles: (filters: { q?: string; status?: string; module?: string }) =>
    [...supportAdminKeys.all, 'articles', filters] as const,
  gaps: (status: string) => [...supportAdminKeys.all, 'gaps', status] as const,
  tickets: (status: string) => [...supportAdminKeys.all, 'tickets', status] as const,
};

export interface ArticlePayload {
  slug?: string;
  title: string;
  summary?: string;
  content: string;
  module: string;
  keywords?: string;
  status?: 'draft' | 'published';
}

export function useSupportStatsQuery() {
  return useQuery({
    queryKey: supportAdminKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<SupportStats>('/superadmin/support/stats');
      return data;
    },
  });
}

export function useAdminArticlesQuery(filters: { q?: string; status?: string; module?: string }) {
  return useQuery({
    queryKey: supportAdminKeys.articles(filters),
    queryFn: async () => {
      const { data } = await api.get<SupportArticle[]>('/superadmin/support/articles', {
        params: filters,
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSaveArticleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: ArticlePayload }) => {
      const { data } = id
        ? await api.patch<SupportArticle>(`/superadmin/support/articles/${id}`, payload)
        : await api.post<SupportArticle>('/superadmin/support/articles', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAdminKeys.all });
    },
  });
}

export function useDeleteArticleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/superadmin/support/articles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAdminKeys.all });
    },
  });
}

export function useSupportGapsQuery(status = 'pending') {
  return useQuery({
    queryKey: supportAdminKeys.gaps(status),
    queryFn: async () => {
      const { data } = await api.get<SupportGap[]>('/superadmin/support/gaps', {
        params: status ? { status } : {},
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdateGapMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      article_id,
    }: {
      id: string;
      status: 'pending' | 'answered' | 'dismissed';
      article_id?: string;
    }) => {
      const { data } = await api.patch(`/superadmin/support/gaps/${id}`, { status, article_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAdminKeys.all });
    },
  });
}

export function useAdminTicketsQuery(status = '') {
  return useQuery({
    queryKey: supportAdminKeys.tickets(status),
    queryFn: async () => {
      const { data } = await api.get<SupportTicket[]>('/superadmin/support/tickets', {
        params: status ? { status } : {},
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdateTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status?: string;
      priority?: string;
      resolution?: string;
    }) => {
      const { data } = await api.patch(`/superadmin/support/tickets/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAdminKeys.all });
    },
  });
}

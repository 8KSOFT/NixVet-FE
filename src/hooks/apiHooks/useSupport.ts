'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  SupportArticle,
  SupportArticleSummary,
  SupportChatResponse,
  SupportConversation,
  SupportConversationDetail,
  SupportTicket,
} from '@/app/types/support';

export const supportKeys = {
  all: ['support'] as const,
  articles: (q: string, module: string) => [...supportKeys.all, 'articles', { q, module }] as const,
  article: (slug: string) => [...supportKeys.all, 'article', slug] as const,
  conversations: () => [...supportKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...supportKeys.all, 'conversation', id] as const,
  tickets: () => [...supportKeys.all, 'tickets'] as const,
};

export function useSupportArticlesQuery(q = '', module = '') {
  return useQuery({
    queryKey: supportKeys.articles(q, module),
    queryFn: async () => {
      const { data } = await api.get<SupportArticleSummary[]>('/support/articles', {
        params: { ...(q ? { q } : {}), ...(module ? { module } : {}) },
      });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSupportArticleQuery(slug: string | null) {
  return useQuery({
    queryKey: supportKeys.article(slug ?? ''),
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await api.get<SupportArticle>(`/support/articles/${slug}`);
      return data;
    },
  });
}

export function useSupportChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { message: string; conversation_id?: string; module?: string }) => {
      const { data } = await api.post<SupportChatResponse>('/support/chat', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
    },
  });
}

export function useSupportConversationsQuery() {
  return useQuery({
    queryKey: supportKeys.conversations(),
    queryFn: async () => {
      const { data } = await api.get<SupportConversation[]>('/support/conversations');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useSupportConversationQuery(id: string | null) {
  return useQuery({
    queryKey: supportKeys.conversation(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get<SupportConversationDetail>(`/support/conversations/${id}`);
      return data;
    },
  });
}

export function useSupportFeedbackMutation() {
  return useMutation({
    mutationFn: async ({ messageId, helpful }: { messageId: string; helpful: boolean }) => {
      const { data } = await api.post(`/support/messages/${messageId}/feedback`, { helpful });
      return data;
    },
  });
}

export function useSupportTicketsQuery() {
  return useQuery({
    queryKey: supportKeys.tickets(),
    queryFn: async () => {
      const { data } = await api.get<SupportTicket[]>('/support/tickets');
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useCreateSupportTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      subject: string;
      description: string;
      conversation_id?: string;
      module?: string;
      priority?: 'low' | 'normal' | 'high';
    }) => {
      const { data } = await api.post<SupportTicket>('/support/tickets', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.conversations() });
    },
  });
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type {
  AlertConversation,
  Conversation,
  ConversationMetrics,
  WhatsappConversationStats,
  WhatsappMessage,
} from '@/app/types/whatsapp-conversation';

/** Polling enquanto a aba está visível (react-query pausa `refetchInterval` com a aba oculta). */
export const WHATSAPP_REFRESH_MS = 5000;

export const whatsappConversationKeys = {
  all: ['whatsapp-conversations'] as const,
  lists: () => [...whatsappConversationKeys.all, 'list'] as const,
  list: (archived: 'true' | 'false', classification: string) =>
    [...whatsappConversationKeys.lists(), { archived, classification }] as const,
  metrics: () => [...whatsappConversationKeys.all, 'metrics'] as const,
  alerts: (minutes: number) => [...whatsappConversationKeys.all, 'alerts', minutes] as const,
  stats: () => [...whatsappConversationKeys.all, 'stats'] as const,
  messages: (conversationId: string) => [...whatsappConversationKeys.all, 'messages', conversationId] as const,
};

export function useWhatsappConversationsQuery(archived: 'true' | 'false', classification: string) {
  return useQuery({
    queryKey: whatsappConversationKeys.list(archived, classification),
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 50, order: 'desc', archived };
      if (classification) params.classification = classification;
      const { data } = await api.get<{ data: Conversation[]; total: number }>('/whatsapp/conversations', { params });
      return data?.data ?? [];
    },
    refetchInterval: WHATSAPP_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useConversationMetricsQuery() {
  return useQuery({
    queryKey: whatsappConversationKeys.metrics(),
    queryFn: async () => {
      const { data } = await api.get<ConversationMetrics>('/conversations/metrics');
      return data ?? null;
    },
    refetchInterval: WHATSAPP_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useConversationAlertsQuery(minutes: number) {
  return useQuery({
    queryKey: whatsappConversationKeys.alerts(minutes),
    queryFn: async () => {
      const { data } = await api.get<{ conversations: AlertConversation[] }>('/conversations/alerts', {
        params: { minutes },
      });
      return data?.conversations ?? [];
    },
    refetchInterval: WHATSAPP_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useWhatsappConversationStatsQuery() {
  return useQuery({
    queryKey: whatsappConversationKeys.stats(),
    queryFn: async () => {
      const { data } = await api.get<WhatsappConversationStats>('/whatsapp/conversations/stats');
      return data ?? null;
    },
    refetchInterval: WHATSAPP_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useWhatsappMessagesQuery(conversationId: string | null) {
  return useQuery({
    queryKey: whatsappConversationKeys.messages(conversationId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<{ data: WhatsappMessage[]; total: number }>(
        `/whatsapp/conversations/${conversationId}/messages`,
        { params: { limit: 100 } },
      );
      return (data?.data ?? []).reverse();
    },
    enabled: !!conversationId,
    refetchInterval: WHATSAPP_REFRESH_MS,
    refetchIntervalInBackground: false,
  });
}

export function useSuggestRepliesMutation() {
  return useMutation({
    mutationFn: async ({ context, lastMessage }: { context: string; lastMessage: string }) => {
      const { data } = await api.post<{ suggested_replies?: string[] }>('/ai/suggest-replies', {
        context,
        lastMessage,
      });
      return data?.suggested_replies ?? [];
    },
  });
}

export function useSendWhatsappMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const { data } = await api.post('/whatsapp/send', { conversation_id: conversationId, text });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.messages(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function useResumeAiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/resume-ai`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function usePauseAiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/pause-ai`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function useArchiveConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/archive`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function useUnarchiveConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/unarchive`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function useCloseByPhoneMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, classification }: { phone: string; classification: string }) => {
      const { data } = await api.post('/whatsapp/conversations/close-by-phone', { phone, classification });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.metrics() });
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.all });
    },
  });
}

export function useClassifyConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, classification }: { conversationId: string; classification: string }) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/classify`, { classification });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.lists() });
    },
  });
}

export function useCloseConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      classification,
      note,
    }: {
      conversationId: string;
      classification: string;
      note: string;
    }) => {
      const { data } = await api.post(`/whatsapp/conversations/${conversationId}/close`, { classification, note });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whatsappConversationKeys.all });
    },
  });
}

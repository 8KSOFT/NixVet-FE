'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ChatbotSettings } from '@/app/types/chatbot-settings';

export const chatbotSettingsKeys = {
  all: ['chatbot-settings'] as const,
};

export function useChatbotSettingsQuery() {
  return useQuery({
    queryKey: chatbotSettingsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<ChatbotSettings>('/chatbot-settings');
      return data ?? {};
    },
  });
}

export function useSaveChatbotSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ChatbotSettings) => {
      const { data } = await api.put('/chatbot-settings', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotSettingsKeys.all });
    },
  });
}

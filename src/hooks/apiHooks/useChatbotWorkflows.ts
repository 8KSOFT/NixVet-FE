'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { BackendEdge, BackendNode, WorkflowData, WorkflowItem } from '@/app/types/chatbot-workflow';

export const chatbotWorkflowKeys = {
  all: ['chatbot-workflows'] as const,
  lists: () => [...chatbotWorkflowKeys.all, 'list'] as const,
  list: (page: number) => [...chatbotWorkflowKeys.lists(), { page }] as const,
  detail: (id: string) => [...chatbotWorkflowKeys.all, 'detail', id] as const,
};

export function useChatbotWorkflowsPagedQuery(page: number) {
  return useQuery({
    queryKey: chatbotWorkflowKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/chatbot-workflows', { params: listQueryParams(page) });
      return parseListResponse<WorkflowItem>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useChatbotWorkflowQuery(id: string) {
  return useQuery({
    queryKey: chatbotWorkflowKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<WorkflowData>(`/chatbot-workflows/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateChatbotWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; nodes: BackendNode[]; edges: BackendEdge[] }) => {
      const { data } = await api.post<WorkflowItem>('/chatbot-workflows', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.lists() });
    },
  });
}

export function useSeedDefaultChatbotWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/chatbot-workflows/seed-default');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.lists() });
    },
  });
}

export function useActivateChatbotWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/chatbot-workflows/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.lists() });
    },
  });
}

export function useDeleteChatbotWorkflowMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/chatbot-workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.lists() });
    },
  });
}

export function useSaveChatbotWorkflowMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; is_active: boolean; nodes: BackendNode[]; edges: BackendEdge[] }) => {
      const { data } = await api.put(`/chatbot-workflows/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: chatbotWorkflowKeys.lists() });
    },
  });
}

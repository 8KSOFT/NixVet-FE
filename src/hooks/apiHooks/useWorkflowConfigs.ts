'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type { WorkflowConfig, WorkflowConfigPayload } from '@/app/types/workflow-config';

export const workflowConfigKeys = {
  all: ['workflow-configs'] as const,
  lists: () => [...workflowConfigKeys.all, 'list'] as const,
  list: (page: number) => [...workflowConfigKeys.lists(), { page }] as const,
};

export function useWorkflowConfigsPagedQuery(page: number) {
  return useQuery({
    queryKey: workflowConfigKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/workflow-configs', { params: listQueryParams(page) });
      return parseListResponse<WorkflowConfig>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateWorkflowConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WorkflowConfigPayload) => {
      const { data } = await api.post('/workflow-configs', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowConfigKeys.all });
    },
  });
}

export function useDeleteWorkflowConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/workflow-configs/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowConfigKeys.all });
    },
  });
}

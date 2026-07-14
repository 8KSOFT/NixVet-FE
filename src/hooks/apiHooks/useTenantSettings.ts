'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { CreateTenantPayload, TenantMe, TenantMePayload } from '@/app/types/tenant';

export const tenantSettingsKeys = {
  all: ['tenant-settings'] as const,
  me: () => [...tenantSettingsKeys.all, 'me'] as const,
};

/** Perfil do tenant/clínica logada — compartilhado entre Settings, Números de WhatsApp e Chatbot Workflows. */
export function useTenantMeQuery(enabled = true) {
  return useQuery({
    queryKey: tenantSettingsKeys.me(),
    queryFn: async () => {
      const { data } = await api.get<TenantMe>('/tenants/me');
      return data;
    },
    enabled,
  });
}

export function useUpdateTenantMeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TenantMePayload) => {
      const { data } = await api.put<TenantMe>('/tenants/me', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tenantSettingsKeys.me(), data);
    },
  });
}

/** Criação de clínica de teste — disponível para superadmin na tela de Settings. */
export function useCreateTenantMutation() {
  return useMutation({
    mutationFn: async (payload: CreateTenantPayload) => {
      const { data } = await api.post('/tenants', payload);
      return data;
    },
  });
}

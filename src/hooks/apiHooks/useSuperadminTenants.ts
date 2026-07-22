'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { listQueryParams, parseListResponse } from '@/lib/pagination';
import type {
  CreateSuperadminTenantPayload,
  PatchSuperadminTenantPayload,
  ProvisionSuperadminWhatsappPayload,
  ResetAdminPasswordPayload,
  SuperadminTenantDetail,
  SuperadminTenantRow,
} from '@/app/types/tenant';

export const superadminTenantKeys = {
  all: ['superadmin-tenants'] as const,
  lists: () => [...superadminTenantKeys.all, 'list'] as const,
  list: (page: number) => [...superadminTenantKeys.lists(), { page }] as const,
  detail: (id: string) => [...superadminTenantKeys.all, 'detail', id] as const,
};

export function useSuperadminTenantsQuery(page: number) {
  return useQuery({
    queryKey: superadminTenantKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/superadmin/tenants', { params: listQueryParams(page) });
      return parseListResponse<SuperadminTenantRow>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

export function useSuperadminTenantQuery(id: string) {
  return useQuery({
    queryKey: superadminTenantKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<SuperadminTenantDetail>(`/superadmin/tenants/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSuperadminTenantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSuperadminTenantPayload) => {
      const { data } = await api.post('/superadmin/tenants', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superadminTenantKeys.lists() });
    },
  });
}

export function usePatchSuperadminTenantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PatchSuperadminTenantPayload }) => {
      const { data } = await api.patch(`/superadmin/tenants/${id}`, payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: superadminTenantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: superadminTenantKeys.detail(variables.id) });
    },
  });
}

export function useResetSuperadminTenantAdminPasswordMutation() {
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ResetAdminPasswordPayload }) => {
      const { data } = await api.post(`/superadmin/tenants/${id}/reset-admin-password`, payload);
      return data;
    },
  });
}

export function useProvisionSuperadminWhatsappMutation() {
  return useMutation({
    mutationFn: async (payload: ProvisionSuperadminWhatsappPayload) => {
      const { data } = await api.post('/whatsapp/provision', payload);
      return data;
    },
  });
}

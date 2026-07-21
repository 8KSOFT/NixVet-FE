'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { AccessProfile, AccessProfilePayload } from '@/app/types/access-profile';
import { userKeys } from '@/hooks/apiHooks/useUsers';

export const accessProfileKeys = {
  all: ['access-control-profiles'] as const,
  lists: () => [...accessProfileKeys.all, 'list'] as const,
  list: (page: number) => [...accessProfileKeys.lists(), { page }] as const,
  listAll: () => [...accessProfileKeys.all, 'list-all'] as const,
};

/** Perfis de acesso visíveis para o tenant (customizados + sistema) — lista paginada. */
export function useAccessProfilesPagedQuery(page: number) {
  return useQuery({
    queryKey: accessProfileKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/access-control/profiles', { params: listQueryParams(page) });
      return parseListResponse<AccessProfile>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Lista completa de perfis — usada no seletor de perfis ao vincular a um usuário. */
export function useAccessProfilesListQuery(enabled = true) {
  return useQuery({
    queryKey: accessProfileKeys.listAll(),
    queryFn: () => fetchAllListPages<AccessProfile>('/access-control/profiles'),
    enabled,
  });
}

export function useCreateAccessProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AccessProfilePayload) => {
      const { data } = await api.post<AccessProfile>('/access-control/profiles', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessProfileKeys.all });
    },
  });
}

export function useUpdateAccessProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<AccessProfilePayload> }) => {
      const { data } = await api.patch<AccessProfile>(`/access-control/profiles/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessProfileKeys.all });
      // perfis já vinculados a usuários podem ter mudado nome/permissões
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteAccessProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/access-control/profiles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accessProfileKeys.all });
    },
  });
}

'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { fetchAllListPages, listQueryParams, parseListResponse } from '@/lib/pagination';
import type { Permission, PermissionPayload } from '@/app/types/permission';

export const permissionKeys = {
  all: ['access-control-permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
  list: (page: number) => [...permissionKeys.lists(), { page }] as const,
  listAll: () => [...permissionKeys.all, 'list-all'] as const,
};

/** Catálogo de permissões — lista paginada, usada na tela de gestão de Permissões. */
export function usePermissionsPagedQuery(page: number) {
  return useQuery({
    queryKey: permissionKeys.list(page),
    queryFn: async () => {
      const { data } = await api.get('/access-control/permissions', { params: listQueryParams(page) });
      return parseListResponse<Permission>(data, page);
    },
    placeholderData: keepPreviousData,
  });
}

/** Lista completa de permissões — usada no seletor de permissões ao montar um perfil de acesso. */
export function usePermissionsListQuery(enabled = true) {
  return useQuery({
    queryKey: permissionKeys.listAll(),
    queryFn: () => fetchAllListPages<Permission>('/access-control/permissions'),
    enabled,
  });
}

export function useCreatePermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PermissionPayload) => {
      const { data } = await api.post<Permission>('/access-control/permissions', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

export function useUpdatePermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<PermissionPayload> }) => {
      const { data } = await api.patch<Permission>(`/access-control/permissions/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

export function useDeletePermissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/access-control/permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.all });
    },
  });
}

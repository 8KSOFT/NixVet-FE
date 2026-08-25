'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { ClinicNotification, NotificationsPaged } from '@/app/types/notification';

export const notificationKeys = {
  all: ['notifications'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

/** Contador do sino — polling contínuo (60s), inclusive com a aba em segundo plano. */
export function useUnreadNotificationsCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      // A API devolve { count: number } (já desembrulhado do envelope pelo interceptor
      // do axios) — `Number(data ?? 0)` direto virava NaN (Number({}) === NaN), e o
      // React Query nunca considerava NaN "igual" ao NaN anterior (NaN !== NaN),
      // então cada render achava que o resultado tinha mudado e disparava outro
      // render — loop infinito silencioso (sem erro de "Maximum update depth" porque
      // passa pelo ciclo assíncrono de efeitos do React, não por setState síncrono).
      const { data } = await api.get<{ count: number }>('/notifications/unread-count', {
        params: { attention_only: true },
      });
      return Number(data?.count ?? 0);
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true,
  });
}

/** Lista do painel de notificações — só busca quando o sheet está aberto. */
export function useNotificationsListQuery(enabled: boolean) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<NotificationsPaged | ClinicNotification[]>('/notifications', {
        params: { attention_only: true, limit: 50, page: 1 },
      });
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    },
    enabled,
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/notifications/${id}/read`);
      return data;
    },
    meta: { silent: true },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
      queryClient.setQueryData<ClinicNotification[]>(notificationKeys.list(), (prev) =>
        prev?.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notifications/read-all');
      return data;
    },
    meta: { silent: true },
    onSuccess: () => {
      queryClient.setQueryData(notificationKeys.unreadCount(), 0);
      queryClient.setQueryData<ClinicNotification[]>(notificationKeys.list(), (prev) =>
        prev?.map((n) => ({ ...n, is_read: true })),
      );
    },
  });
}

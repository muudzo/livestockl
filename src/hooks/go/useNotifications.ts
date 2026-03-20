import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { goWs } from '../../lib/goWebSocket';
import { mockNotifications } from '../../app/data/mockData';

export function useNotifications() {
  const user = useGoAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['go-notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) return mockNotifications;
      return goApi.notifications.list();
    },
  });

  const userId = user?.id;
  useEffect(() => {
    if (!userId || !isGoBackendConfigured) return;

    const unsub = goWs.subscribe(`notifications:${userId}`, () => {
      queryClient.invalidateQueries({ queryKey: ['go-notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['go-notifications-unread', userId] });
    });

    return () => { unsub(); };
  }, [userId, queryClient]);

  return query;
}

export function useUnreadCount() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-notifications-unread', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return mockNotifications.filter((n: any) => !n.read).length;
      }
      const result = await goApi.notifications.unreadCount();
      return result.count;
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!isGoBackendConfigured) return;
      return goApi.notifications.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['go-notifications-unread'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!isGoBackendConfigured) return;
      return goApi.notifications.markAllRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['go-notifications-unread'] });
    },
  });
}

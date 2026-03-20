import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { goWs } from '../../lib/goWebSocket';
import { mockLivestock } from '../../app/data/mockData';

export function useBids(livestockId: string | undefined) {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const query = useQuery({
    queryKey: ['go-bids', livestockId],
    enabled: !!livestockId,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        const item = mockLivestock.find(i => i.id === livestockId);
        return (item as any)?.bids || [];
      }
      return goApi.bids.list(livestockId!);
    },
  });

  useEffect(() => {
    if (!livestockId || !isGoBackendConfigured) return;

    const unsub = goWs.subscribe(`bids:${livestockId}`, () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['go-bids', livestockId] });
        queryClient.invalidateQueries({ queryKey: ['go-livestock', livestockId] });
      }, 1000);
    });

    return () => {
      clearTimeout(debounceRef.current);
      unsub();
    };
  }, [livestockId, queryClient]);

  return query;
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ livestockId, amount }: { livestockId: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isGoBackendConfigured) {
        const item = mockLivestock.find(i => i.id === livestockId);
        if (item && (item as any).sellerId === user.id) {
          throw new Error('Cannot bid on your own listing');
        }
        return { id: 'mock-bid-' + Date.now(), amount };
      }

      return goApi.bids.place({ livestock_id: livestockId, amount });
    },
    onSuccess: (_, { livestockId }) => {
      queryClient.invalidateQueries({ queryKey: ['go-bids', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['go-livestock', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['go-livestock'] });
    },
  });
}

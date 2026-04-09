import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockLivestock } from '../app/data/mockData';
import { useAuthStore } from '../stores/authStore';
import { frontendLogger } from '../lib/logger';

export function useBids(livestockId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bids', livestockId],
    enabled: !!livestockId,
    staleTime: 10_000,        // 10s — bids must be near-realtime, not 5min global default
    refetchInterval: 15_000,  // Poll every 15s as fallback when Realtime drops
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        const item = mockLivestock.find(i => i.id === livestockId);
        return item?.bids || [];
      }

      const { data, error } = await supabase
        .from('bids')
        .select('*, profiles!user_id(first_name, last_name)')
        .eq('livestock_id', livestockId!)
        .order('amount', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for bid updates
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!livestockId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`bids:${livestockId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `livestock_id=eq.${livestockId}` },
        () => {
          clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['bids', livestockId] });
            queryClient.invalidateQueries({ queryKey: ['livestock', 'detail', livestockId] });
          }, 1000);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Realtime subscription failed for bids:${livestockId}, falling back to polling`);
        }
      });

    return () => {
      clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [livestockId, queryClient]);

  return query;
}

export function usePlaceBid() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ livestockId, amount }: { livestockId: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        // Validate seller cannot bid on own listing in demo mode
        const item = mockLivestock.find(i => i.id === livestockId);
        if (item && (item as any).sellerId === user.id) {
          throw new Error('Cannot bid on your own listing');
        }
        return { id: 'mock-bid-' + Date.now(), amount };
      }

      frontendLogger.info('bid_placed', { livestockId, amount, userId: user.id });

      // Use atomic database function for bid placement
      const { data, error } = await (supabase.rpc as any)('place_bid', {
        p_livestock_id: livestockId,
        p_user_id: user.id,
        p_amount: amount,
      });

      if (error) {
        frontendLogger.error('bid_failed', { livestockId, amount, error: error.message });
        throw error;
      }
      return { id: data, amount };
    },
    onSuccess: (_, { livestockId }) => {
      queryClient.invalidateQueries({ queryKey: ['bids', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['livestock', 'detail', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
    },
  });
}

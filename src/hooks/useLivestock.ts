import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockLivestock } from '../app/data/mockData';
import { useAuthStore } from '../stores/authStore';
import { frontendLogger } from '../lib/logger';

const PAGE_SIZE = 20;

export function useLivestockList(category?: string, search?: string) {
  const searchTrim = (search || '').trim().toLowerCase();
  return useInfiniteQuery({
    queryKey: ['livestock', 'list', category, searchTrim],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      if (!isSupabaseConfigured) {
        let items = category && category !== 'All'
          ? mockLivestock.filter(i => i.category === category)
          : mockLivestock;
        if (searchTrim) {
          items = items.filter(i =>
            i.title?.toLowerCase().includes(searchTrim) ||
            i.breed?.toLowerCase().includes(searchTrim) ||
            i.location?.toLowerCase().includes(searchTrim) ||
            i.description?.toLowerCase().includes(searchTrim)
          );
        }
        return items.slice(pageParam, pageParam + PAGE_SIZE);
      }

      let query = supabase
        .from('livestock_items')
        .select('*, profiles!seller_id(first_name, last_name, avatar_url, verified, rating, sales_count)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      if (searchTrim) {
        // Server-side search across title/breed/location/description. Escape
        // % and , which are special in PostgREST's .or() syntax.
        const safe = searchTrim.replace(/[%,()]/g, ' ');
        query = query.or(
          `title.ilike.%${safe}%,breed.ilike.%${safe}%,location.ilike.%${safe}%,description.ilike.%${safe}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined; // No more pages
      return allPages.flat().length; // Next offset
    },
  });
}

export function useLivestockItem(id: string | undefined) {
  const viewCountedRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['livestock', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        const item = mockLivestock.find(i => i.id === id);
        if (!item) throw new Error('Item not found');
        return item;
      }

      const { data, error } = await supabase
        .from('livestock_items')
        .select('*, profiles!seller_id(first_name, last_name, avatar_url, verified, rating, sales_count)')
        .eq('id', id!)
        .single();

      if (error) throw error;

      return data;
    },
  });

  // Increment view count once per item ID, outside of queryFn
  useEffect(() => {
    if (id && isSupabaseConfigured && viewCountedRef.current !== id) {
      const key = `viewed_${id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        viewCountedRef.current = id;
        (supabase.rpc as any)('increment_view_count', { p_item_id: id })
          .then((res: any) => {
            if (res?.error) {
              frontendLogger.error('view_count_rpc_failed', { id, error: res.error.message });
            }
          })
          .catch((err: any) => {
            frontendLogger.error('view_count_rpc_threw', { id, error: err?.message });
          });
      } else {
        viewCountedRef.current = id;
      }
    }
  }, [id]);

  return query;
}

export function usePrefetchLivestockItem() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: ['livestock', 'detail', id],
      queryFn: async () => {
        if (!isSupabaseConfigured) {
          return mockLivestock.find(i => i.id === id) || null;
        }
        const { data, error } = await supabase
          .from('livestock_items')
          .select('*, profiles!seller_id(first_name, last_name, avatar_url, verified, rating, sales_count)')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      },
      staleTime: 1000 * 60 * 5,
    });
  };
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async (listing: {
      title: string;
      category: string;
      breed: string;
      age: string;
      weight: string;
      description: string;
      location: string;
      health: string;
      starting_price: number;
      duration_days: number;
      image_urls: string[];
      auction_format?: 'live' | 'timed';
      verified_bidders_only?: boolean;
      is_demo?: boolean;
      transport_available?: boolean;
      pickup_lat?: number | null;
      pickup_lng?: number | null;
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        return { id: 'mock-' + Date.now() };
      }

      const endTime = new Date();
      endTime.setDate(endTime.getDate() + listing.duration_days);

      const { data, error } = await supabase
        .from('livestock_items')
        .insert({
          ...listing,
          seller_id: user!.id,
          current_bid: 0,
          end_time: endTime.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function useMyListings() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['my-listings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return mockLivestock.slice(0, 2);
      }

      const { data, error } = await supabase
        .from('livestock_items')
        .select('*')
        .eq('seller_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Client-side trigger for end_expired_auctions().
 * On Vercel Hobby, the cron only runs once/day. This hook fires a one-shot
 * RPC call when a user views a listing that is past end_time but still 'active',
 * ensuring the winner gets determined promptly. The DB function uses an advisory
 * lock so concurrent calls are safe and idempotent.
 */
export function useEndExpiredAuctions(item: { status?: string; end_time?: string } | null | undefined) {
  const queryClient = useQueryClient();
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (!item || !isSupabaseConfigured || triggeredRef.current) return;

    const status = item.status ?? (item as any).status;
    const endTime = item.end_time ?? (item as any).end_time;

    if (status !== 'active' || !endTime) return;

    const isExpired = new Date(endTime).getTime() <= Date.now();
    if (!isExpired) return;

    triggeredRef.current = true;
    (supabase.rpc as any)('end_expired_auctions')
      .then(() => {
        // Refetch the item and bids so the UI updates immediately
        queryClient.invalidateQueries({ queryKey: ['livestock'] });
        queryClient.invalidateQueries({ queryKey: ['bids'] });
        queryClient.invalidateQueries({ queryKey: ['won-items'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .catch((err: any) => {
        // Cron will catch it on next run, but log so we can see it on the dashboard
        frontendLogger.error('end_expired_auctions_rpc_failed', { error: err?.message });
      });
  }, [item, queryClient]);
}

export function useWonItems() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['won-items', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return mockLivestock.filter(item =>
          item.bids.some(bid => bid.userId === user?.id && bid.isWinner)
        );
      }

      // Embed agent_bids (FK: agent_bids.bid_id → bids.id) so we can tell
      // which wins were placed by an agent and pull the agent name onto
      // the card.
      const { data: winningBids, error } = await supabase
        .from('bids')
        .select(`
          id,
          livestock_id,
          amount,
          livestock_items(*),
          agent_bids(agent_id, strategy, agents(id, name, agent_type))
        `)
        .eq('user_id', user!.id)
        .eq('is_winner', true)
        .limit(50);

      if (error) throw error;
      if (!winningBids?.length) return [];

      // Fetch any payment orders tied to these listings so we can surface
      // agent-settlement state (Paid / Blocked / Retrying) on the card.
      const livestockIds = winningBids.map((b: any) => b.livestock_id).filter(Boolean);
      const { data: orders } = livestockIds.length
        ? await supabase
            .from('agent_payment_orders')
            .select('livestock_id, paynow_reference, status, method, amount')
            .in('livestock_id', livestockIds)
        : { data: [] as any[] };

      const ordersByListing = new Map<string, any>();
      for (const o of orders || []) ordersByListing.set(o.livestock_id, o);

      return winningBids
        .map((b: any) => {
          const item = b.livestock_items;
          if (!item) return null;
          const agentBid = Array.isArray(b.agent_bids) ? b.agent_bids[0] : b.agent_bids;
          const agent = agentBid?.agents;
          return {
            ...item,
            __agent: agent
              ? { id: agent.id, name: agent.name, type: agent.agent_type, strategy: agentBid?.strategy }
              : null,
            __paymentOrder: ordersByListing.get(item.id) || null,
          };
        })
        .filter(Boolean);
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      breed?: string;
      age?: string;
      weight?: string;
      description?: string;
      location?: string;
      health?: string;
      starting_price?: number;
      image_urls?: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        return { id, ...updates };
      }

      let query = supabase
        .from('livestock_items')
        .update(updates)
        .eq('id', id)
        .eq('seller_id', user.id);

      // If starting_price is being updated, atomically verify bid_count is 0
      if (updates.starting_price !== undefined) {
        query = query.eq('bid_count', 0);
      }

      const { data, error } = await query.select().single();

      if (error) {
        if (updates.starting_price !== undefined && error.code === 'PGRST116') {
          throw new Error('Cannot change starting price after bids have been placed');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform', 'stats'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return { animalsTransacted: 1247, activeListings: 89, registeredUsers: 3200 };
      }
      const [sold, active, users] = await Promise.all([
        supabase.from('livestock_items').select('id', { count: 'exact', head: true }).in('status', ['ended', 'sold']),
        supabase.from('livestock_items').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);
      return {
        animalsTransacted: sold.count ?? 0,
        activeListings: active.count ?? 0,
        registeredUsers: users.count ?? 0,
      };
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        return { id };
      }

      // Single atomic delete -- checks bid_count and status in the same query
      const { data, error } = await supabase
        .from('livestock_items')
        .delete()
        .eq('id', id)
        .eq('seller_id', user.id)
        .eq('status', 'active')
        .eq('bid_count', 0)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Cannot delete: listing has bids or is no longer active');
      }
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });
}

// Compress and resize image client-side before upload
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : resolve(file),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = objectUrl;
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, userId }: { file: File; userId: string }) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      const timestamp = Date.now();

      // Upload thumbnail (200px wide, q=0.6 — ~15-30KB for card listings)
      const thumbnail = await compressImage(file, 200, 0.6);
      const thumbPath = `${userId}/${timestamp}_thumb.jpg`;

      const { error: thumbError } = await supabase.storage
        .from('livestock-images')
        .upload(thumbPath, thumbnail, { contentType: 'image/jpeg' });
      if (thumbError) throw thumbError;

      // Upload full-size (800px wide, q=0.8 — ~100-200KB for detail view)
      const full = await compressImage(file, 800, 0.8);
      const fullPath = `${userId}/${timestamp}.jpg`;

      const { error: fullError } = await supabase.storage
        .from('livestock-images')
        .upload(fullPath, full, { contentType: 'image/jpeg' });
      if (fullError) throw fullError;

      // Return the full-size URL (thumbnail derived via naming convention)
      const { data: { publicUrl } } = supabase.storage
        .from('livestock-images')
        .getPublicUrl(fullPath);

      return publicUrl;
    },
  });
}

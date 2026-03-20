import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { mockLivestock } from '../../app/data/mockData';

const PAGE_SIZE = 20;

export function useLivestockList(category?: string) {
  return useQuery({
    queryKey: ['go-livestock', category],
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        const items = category && category !== 'All'
          ? mockLivestock.filter(i => i.category === category)
          : mockLivestock;
        return items;
      }
      return goApi.livestock.list(category);
    },
  });
}

export function useLivestockItem(id: string | undefined) {
  const viewCountedRef = useRef<string | null>(null);

  const query = useQuery({
    queryKey: ['go-livestock', id],
    enabled: !!id,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        const item = mockLivestock.find(i => i.id === id);
        if (!item) throw new Error('Item not found');
        return item;
      }
      return goApi.livestock.get(id!);
    },
  });

  useEffect(() => {
    if (id && isGoBackendConfigured && viewCountedRef.current !== id) {
      const key = `go_viewed_${id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        viewCountedRef.current = id;
        goApi.livestock.incrementView(id).catch(() => {});
      } else {
        viewCountedRef.current = id;
      }
    }
  }, [id]);

  return query;
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

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
    }) => {
      if (!user) throw new Error('Not authenticated');
      if (!isGoBackendConfigured) {
        return { id: 'mock-' + Date.now() };
      }
      return goApi.livestock.create(listing);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-livestock'] });
      queryClient.invalidateQueries({ queryKey: ['go-my-listings'] });
    },
  });
}

export function useMyListings() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-my-listings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return mockLivestock.slice(0, 2);
      }
      return goApi.livestock.mine();
    },
  });
}

export function useWonItems() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-won-items', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return mockLivestock.filter(item =>
          (item as any).bids?.some((bid: any) => bid.userId === user?.id && bid.isWinner)
        );
      }
      return goApi.livestock.won();
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

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
      if (!isGoBackendConfigured) {
        return { id, ...updates };
      }
      return goApi.livestock.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-livestock'] });
      queryClient.invalidateQueries({ queryKey: ['go-my-listings'] });
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!isGoBackendConfigured) {
        return { id };
      }
      return goApi.livestock.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-livestock'] });
      queryClient.invalidateQueries({ queryKey: ['go-my-listings'] });
    },
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
      if (!isGoBackendConfigured) {
        return `https://placeholder.com/${userId}/${Date.now()}.jpg`;
      }
      const result = await goApi.upload.image(file, userId);
      return result.url;
    },
  });
}

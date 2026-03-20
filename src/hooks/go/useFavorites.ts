import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';

// Demo mode: persist favorites in Zustand + localStorage
interface DemoFavoritesState {
  favoriteIds: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
}

const useDemoFavoritesStore = create<DemoFavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      add: (id: string) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.includes(id)
            ? state.favoriteIds
            : [...state.favoriteIds, id],
        })),
      remove: (id: string) =>
        set((state) => ({
          favoriteIds: state.favoriteIds.filter((fid) => fid !== id),
        })),
      has: (id: string) => get().favoriteIds.includes(id),
    }),
    { name: 'zimlivestock-go-favorites' }
  )
);

export function useFavorites() {
  const user = useGoAuthStore((s) => s.user);
  const demoFavorites = useDemoFavoritesStore((s) => s.favoriteIds);

  return useQuery({
    queryKey: ['go-favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return demoFavorites;
      }
      return goApi.favorites.list();
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);
  const demoStore = useDemoFavoritesStore();

  return useMutation({
    mutationFn: async (livestockId: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isGoBackendConfigured) {
        if (demoStore.has(livestockId)) {
          demoStore.remove(livestockId);
        } else {
          demoStore.add(livestockId);
        }
        return;
      }

      return goApi.favorites.toggle(livestockId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-favorites', user?.id] });
    },
  });
}

export function useIsFavorite(livestockId: string): boolean {
  const { data: favoriteIds } = useFavorites();
  return favoriteIds?.includes(livestockId) ?? false;
}

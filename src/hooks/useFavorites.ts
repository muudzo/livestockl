import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useDemoFavoritesStore } from '../stores/demoFavoritesStore';

export function useFavorites() {
  const user = useAuthStore((s) => s.user);
  const demoFavorites = useDemoFavoritesStore((s) => s.favoriteIds);

  return useQuery({
    queryKey: ['favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return demoFavorites;
      }

      const { data, error } = await supabase
        .from('favorites')
        .select('livestock_id')
        .eq('user_id', user!.id);

      if (error) throw error;
      return data.map((row: { livestock_id: string }) => row.livestock_id);
    },
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const demoStore = useDemoFavoritesStore();

  return useMutation({
    mutationFn: async (livestockId: string) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        if (demoStore.has(livestockId)) {
          demoStore.remove(livestockId);
        } else {
          demoStore.add(livestockId);
        }
        return;
      }

      // Check if favorite exists
      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('livestock_id', livestockId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('livestock_id', livestockId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .upsert(
            { user_id: user.id, livestock_id: livestockId },
            { onConflict: 'user_id,livestock_id', ignoreDuplicates: true }
          );
        if (error) throw error;
      }
    },
    // Optimistic update — toggle instantly, revert on error
    onMutate: async (livestockId: string) => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] });
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id]);

      queryClient.setQueryData<string[]>(['favorites', user?.id], (old = []) =>
        old.includes(livestockId)
          ? old.filter(id => id !== livestockId)
          : [...old, livestockId]
      );

      return { previous };
    },
    onError: (_err, _livestockId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites', user?.id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
    },
  });
}

export function useIsFavorite(livestockId: string): boolean {
  const { data: favoriteIds } = useFavorites();
  return favoriteIds?.includes(livestockId) ?? false;
}

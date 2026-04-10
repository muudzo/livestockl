import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Standalone store so both useFavorites and authStore can import it
// without creating a circular dependency.
interface DemoFavoritesState {
  favoriteIds: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
}

export const useDemoFavoritesStore = create<DemoFavoritesState>()(
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
      clear: () => set({ favoriteIds: [] }),
    }),
    { name: 'zimlivestock-favorites' }
  )
);

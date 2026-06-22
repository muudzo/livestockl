import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { frontendLogger } from '../lib/logger';
import { useDemoFavoritesStore } from './demoFavoritesStore';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, meta: { first_name: string; last_name: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
}

let authSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,

      initialize: async () => {
        // Prevent double initialization (React StrictMode)
        if (get().initialized) return;

        if (!isSupabaseConfigured) {
          // Demo mode: persisted user is fine since there's no real security
          set({ initialized: true });
          return;
        }

        try {
          // If we have a persisted user, mark initialized immediately
          // so the app renders instantly. Validate in the background.
          const persistedUser = get().user;
          if (persistedUser) {
            set({ initialized: true });
          }

          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            if (persistedUser && persistedUser.id !== session.user.id) {
              set({ user: null });
            }

            // PII columns (email/phone/paynow_merchant_id) are column-revoked
            // from the API roles; owners read their full row via this RPC.
            const { data: profile } = await (supabase.rpc as any)('get_my_profile')
              .single();

            set({ user: profile, initialized: true });
          } else {
            set({ user: null, initialized: true });
          }
        } catch {
          set({ user: null, initialized: true });
        }

        // Clean up any existing subscription before creating new one
        authSubscription?.unsubscribe();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
            set({ user: null });
          } else if (session?.user) {
            // PII columns (email/phone/paynow_merchant_id) are column-revoked
            // from the API roles; owners read their full row via this RPC.
            const { data: profile } = await (supabase.rpc as any)('get_my_profile')
              .single();

            set({ user: profile });
          }
        });

        authSubscription = subscription;
      },

      login: async (email, password) => {
        if (!isSupabaseConfigured) {
          // Demo mode: simulate login
          set({
            loading: true,
          });
          await new Promise(r => setTimeout(r, 500));
          set({
            user: {
              id: 'demo-user',
              email,
              first_name: 'Demo',
              last_name: 'User',
              phone: '0771234567',
              avatar_url: null,
              verified: false,
              rating: 0,
              sales_count: 0,
              paynow_merchant_id: null,
              created_at: new Date().toISOString(),
            },
            loading: false,
          });
          return;
        }

        set({ loading: true });
        frontendLogger.info('auth_login_attempt', { email });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        set({ loading: false });
        if (error) {
          frontendLogger.error('auth_login_failed', { email, error: error.message });
          throw error;
        }
        frontendLogger.info('auth_login_success', { email });
      },

      signup: async (email, password, meta) => {
        if (!isSupabaseConfigured) {
          set({ loading: true });
          await new Promise(r => setTimeout(r, 500));
          set({
            user: {
              id: 'demo-user',
              email,
              first_name: meta.first_name,
              last_name: meta.last_name,
              phone: meta.phone,
              avatar_url: null,
              verified: false,
              rating: 0,
              sales_count: 0,
              paynow_merchant_id: null,
              created_at: new Date().toISOString(),
            },
            loading: false,
          });
          return;
        }

        set({ loading: true });
        frontendLogger.info('auth_signup_attempt', { email });
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: meta },
        });
        set({ loading: false });
        if (error) {
          frontendLogger.error('auth_signup_failed', { email, error: error.message });
          throw error;
        }
        frontendLogger.info('auth_signup_success', { email });
      },

      logout: async () => {
        frontendLogger.info('auth_logout');
        if (isSupabaseConfigured) {
          await supabase.auth.signOut();
        }
        set({ user: null });
        // Clear per-user local stores so the next user doesn't inherit state.
        // Reset both in-memory state and persisted localStorage copy.
        useDemoFavoritesStore.getState().clear();
      },
    }),
    {
      name: 'zimlivestock-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

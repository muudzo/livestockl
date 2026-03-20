import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { goApi, setAuthToken, isGoBackendConfigured } from '../lib/goApi';
import { goWs } from '../lib/goWebSocket';
import type { Profile } from '../lib/goApi';

interface GoAuthState {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, meta: { first_name: string; last_name: string; phone: string }) => Promise<void>;
  logout: () => void;
}

export const useGoAuthStore = create<GoAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      initialized: false,

      initialize: async () => {
        if (get().initialized) return;

        const token = get().token;
        if (token && isGoBackendConfigured) {
          setAuthToken(token);
          try {
            const user = await goApi.auth.me();
            set({ user, initialized: true });
            goWs.connect(token);
          } catch {
            // Token expired or invalid — clear
            set({ user: null, token: null, initialized: true });
            setAuthToken(null);
          }
        } else if (!isGoBackendConfigured) {
          // Demo mode — persisted user is fine
          set({ initialized: true });
        } else {
          set({ initialized: true });
        }
      },

      login: async (email, password) => {
        if (!isGoBackendConfigured) {
          set({ loading: true });
          await new Promise(r => setTimeout(r, 500));
          set({
            user: {
              id: 'demo-user',
              email,
              first_name: 'Demo',
              last_name: 'User',
              phone: '0771234567',
              verified: false,
              rating: 0,
              sales_count: 0,
              created_at: new Date().toISOString(),
            },
            token: 'demo-token',
            loading: false,
          });
          return;
        }

        set({ loading: true });
        try {
          const { token, user } = await goApi.auth.login({ email, password });
          setAuthToken(token);
          goWs.connect(token);
          set({ user, token, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      signup: async (email, password, meta) => {
        if (!isGoBackendConfigured) {
          set({ loading: true });
          await new Promise(r => setTimeout(r, 500));
          set({
            user: {
              id: 'demo-user',
              email,
              first_name: meta.first_name,
              last_name: meta.last_name,
              phone: meta.phone,
              verified: false,
              rating: 0,
              sales_count: 0,
              created_at: new Date().toISOString(),
            },
            token: 'demo-token',
            loading: false,
          });
          return;
        }

        set({ loading: true });
        try {
          const { token, user } = await goApi.auth.signup({ email, password, ...meta });
          setAuthToken(token);
          goWs.connect(token);
          set({ user, token, loading: false });
        } catch (e) {
          set({ loading: false });
          throw e;
        }
      },

      logout: () => {
        setAuthToken(null);
        goWs.disconnect();
        set({ user: null, token: null });
      },
    }),
    {
      name: 'zimlivestock-go-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

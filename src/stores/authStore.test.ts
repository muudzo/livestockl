import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));

import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({ user: null, loading: false, initialized: false });
  });

  it('starts with null user', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
  });

  it('login sets user in demo mode', async () => {
    await useAuthStore.getState().login('test@example.com', 'password');

    const state = useAuthStore.getState();
    expect(state.user).not.toBeNull();
    expect(state.user?.email).toBe('test@example.com');
    expect(state.user?.id).toBe('demo-user');
    expect(state.user?.first_name).toBe('Demo');
    expect(state.loading).toBe(false);
  });

  it('login sets loading to true during call', async () => {
    const promise = useAuthStore.getState().login('test@example.com', 'password');

    // Loading should be true while the 500ms timeout is pending
    expect(useAuthStore.getState().loading).toBe(true);

    await promise;
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('signup populates all metadata fields', async () => {
    await useAuthStore.getState().signup('farmer@zim.co.zw', 'password', {
      first_name: 'Tatenda',
      last_name: 'Nyemudzo',
      phone: '0771234567',
    });

    const state = useAuthStore.getState();
    expect(state.user?.first_name).toBe('Tatenda');
    expect(state.user?.last_name).toBe('Nyemudzo');
    expect(state.user?.phone).toBe('0771234567');
    expect(state.user?.email).toBe('farmer@zim.co.zw');
  });

  it('logout clears user', async () => {
    // Login first
    await useAuthStore.getState().login('test@example.com', 'password');
    expect(useAuthStore.getState().user).not.toBeNull();

    // Then logout
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('initialize is idempotent in demo mode', async () => {
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().initialized).toBe(true);

    // Second call should not change state
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().initialized).toBe(true);
  });

  it('persist only serializes user field', () => {
    const store = useAuthStore as any;
    const partialize = store.persist?.options?.partialize;
    if (partialize) {
      const result = partialize({ user: { id: '1' }, loading: true, initialized: true });
      expect(result).toEqual({ user: { id: '1' } });
      expect(result.loading).toBeUndefined();
      expect(result.initialized).toBeUndefined();
    }
  });
});

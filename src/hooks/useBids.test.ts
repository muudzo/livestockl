import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));
vi.mock('../lib/logger', () => import('../test/mocks/logger'));

import { useBids, usePlaceBid } from './useBids';
import { useAuthStore } from '../stores/authStore';
import { createWrapper } from '../test/utils';

describe('useBids', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false, initialized: false });
  });

  it('returns bids from mock data for known livestock ID', async () => {
    const { result } = renderHook(() => useBids('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('returns empty array for unknown livestock ID', async () => {
    const { result } = renderHook(() => useBids('nonexistent-id'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('is disabled when livestockId is undefined', () => {
    const { result } = renderHook(() => useBids(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePlaceBid', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, loading: false, initialized: false });
  });

  it('throws "Not authenticated" when no user', async () => {
    const { result } = renderHook(() => usePlaceBid(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ livestockId: '1', amount: 500 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('returns mock bid in demo mode when authenticated', async () => {
    useAuthStore.setState({
      user: { id: 'demo-user', email: 'test@test.com', first_name: 'Test', last_name: 'User', phone: '0771234567', avatar_url: null, verified: false, rating: 0, sales_count: 0, paynow_merchant_id: null, created_at: new Date().toISOString() },
    });

    const { result } = renderHook(() => usePlaceBid(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ livestockId: '1', amount: 500 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.amount).toBe(500);
    expect(result.current.data?.id).toMatch(/^mock-bid-/);
  });
});

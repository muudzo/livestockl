import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));

import { useLivestockList, useLivestockItem, useCreateListing, useDeleteListing, useUploadImage } from './useLivestock';
import { useAuthStore } from '../stores/authStore';
import { createWrapper } from '../test/utils';
import { mockLivestock } from '../app/data/mockData';

const TEST_USER = {
  id: 'demo-user', email: 'test@test.com', first_name: 'Test', last_name: 'User',
  phone: '0771234567', avatar_url: null, verified: false, rating: 0, sales_count: 0,
  created_at: new Date().toISOString(),
};

describe('useLivestockList', () => {
  it('returns all mock items when no category filter', async () => {
    const { result } = renderHook(() => useLivestockList(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(mockLivestock.length);
  });

  it('returns all mock items when category is "All"', async () => {
    const { result } = renderHook(() => useLivestockList('All'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(mockLivestock.length);
  });

  it('filters by category correctly', async () => {
    const { result } = renderHook(() => useLivestockList('Cattle'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const allCattle = result.current.data?.every(item => item.category === 'Cattle');
    expect(allCattle).toBe(true);
  });
});

describe('useLivestockItem', () => {
  it('returns item for known ID', async () => {
    const knownId = mockLivestock[0]?.id;
    if (!knownId) return;

    const { result } = renderHook(() => useLivestockItem(knownId), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(knownId);
  });

  it('throws for unknown ID', async () => {
    const { result } = renderHook(() => useLivestockItem('nonexistent'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Item not found');
  });
});

describe('useCreateListing', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('throws "Not authenticated" when no user', async () => {
    const { result } = renderHook(() => useCreateListing(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        title: 'Test Bull', category: 'Cattle', breed: 'Brahman', age: '3 years',
        weight: '500kg', description: 'A test bull', location: 'Harare',
        health: 'Excellent', starting_price: 1000, duration_days: 7, image_urls: ['url1'],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('returns mock listing ID in demo mode', async () => {
    useAuthStore.setState({ user: TEST_USER });

    const { result } = renderHook(() => useCreateListing(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        title: 'Test Bull', category: 'Cattle', breed: 'Brahman', age: '3 years',
        weight: '500kg', description: 'A test bull', location: 'Harare',
        health: 'Excellent', starting_price: 1000, duration_days: 7, image_urls: ['url1'],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toMatch(/^mock-/);
  });
});

describe('useDeleteListing', () => {
  it('throws "Not authenticated" when no user', async () => {
    useAuthStore.setState({ user: null });

    const { result } = renderHook(() => useDeleteListing(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: '1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });
});

describe('useUploadImage', () => {
  it('rejects non-image file types', async () => {
    const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });

    const pdfFile = new File(['fake'], 'document.pdf', { type: 'application/pdf' });

    await act(async () => {
      result.current.mutate({ file: pdfFile, userId: 'user-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Only JPEG, PNG, WebP, and GIF images are allowed');
  });

  it('rejects files over 5MB', async () => {
    const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });

    // Create a file that reports > 5MB
    const bigFile = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 6 * 1024 * 1024 });

    await act(async () => {
      result.current.mutate({ file: bigFile, userId: 'user-1' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Image must be less than 5MB');
  });
});

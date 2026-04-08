import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('../lib/supabase', () => import('../test/mocks/supabase'));

import { useBillPayAuth, useBillPayPay } from './useBillPay';
import { useAuthStore } from '../stores/authStore';
import { createWrapper } from '../test/utils';

const TEST_USER = {
  id: 'demo-user', email: 'test@test.com', first_name: 'Test', last_name: 'User',
  phone: '0771234567', avatar_url: null, verified: false, rating: 0, sales_count: 0,
  created_at: new Date().toISOString(),
};

describe('useBillPayAuth', () => {
  it('returns simulation result with correct shape in demo mode', async () => {
    const { result } = renderHook(() => useBillPayAuth(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ billerCode: 'ZETDC', accountNumber: '12345' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.simulation).toBe(true);
    expect(data.action).toBe('auth');
    expect(data.reference).toMatch(/^ZL-BP-SIM-/);
    expect(data.billerCode).toBe('ZETDC');
    expect(data.memberName).toBe('Demo Account Holder');
    expect(data.products).toHaveLength(1);
    expect(data.products[0].ReturnsVouchers).toBe(true); // ZETDC returns vouchers
  });

  it('returns non-voucher product for non-ZETDC biller', async () => {
    const { result } = renderHook(() => useBillPayAuth(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ billerCode: 'AIRTIME', accountNumber: '0771234567' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.products[0].ReturnsVouchers).toBe(false);
  });
});

describe('useBillPayPay', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('throws "Not authenticated" when no user', async () => {
    const { result } = renderHook(() => useBillPayPay(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        billerCode: 'ZETDC',
        accountNumber: '12345',
        amount: 50,
        reference: 'ZL-BP-SIM-TEST',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Not authenticated');
  });

  it('returns vouchers for ZETDC in demo mode', async () => {
    useAuthStore.setState({ user: TEST_USER });

    const { result } = renderHook(() => useBillPayPay(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        billerCode: 'ZETDC',
        accountNumber: '12345',
        amount: 50,
        reference: 'ZL-BP-SIM-TEST',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.simulation).toBe(true);
    expect(data.action).toBe('pay');
    expect(data.reference).toBe('ZL-BP-SIM-TEST');
    expect(data.vouchers).toHaveLength(1);
    expect(data.vouchers![0].VoucherCode).toBeTruthy();
  });

  it('returns no vouchers for non-ZETDC biller in demo mode', async () => {
    useAuthStore.setState({ user: TEST_USER });

    const { result } = renderHook(() => useBillPayPay(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        billerCode: 'AIRTIME',
        accountNumber: '0771234567',
        amount: 5,
        reference: 'ZL-BP-SIM-AIRTIME',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.vouchers).toEqual([]);
  });
});

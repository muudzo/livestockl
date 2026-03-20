import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goApi, isGoBackendConfigured } from '../../lib/goApi';
import { useGoAuthStore } from '../../stores/goAuthStore';
import { mockPayments } from '../../app/data/mockData';

export function usePaymentHistory() {
  const user = useGoAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['go-payments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isGoBackendConfigured) return mockPayments;
      return goApi.payments.list();
    },
  });
}

export function usePaymentStatus(reference: string | undefined) {
  return useQuery({
    queryKey: ['go-payment-status', reference],
    enabled: !!reference,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'paid' || status === 'failed') return false;
      return 5000;
    },
    queryFn: async () => {
      if (!isGoBackendConfigured) {
        return { status: 'pending' as const, reference };
      }
      return goApi.payments.poll(reference!);
    },
  });
}

export function useInitiatePayment() {
  const queryClient = useQueryClient();
  const user = useGoAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      livestockId,
      amount,
      method,
      phone,
    }: {
      livestockId: string;
      amount: number;
      method: 'EcoCash' | 'OneMoney' | 'Card';
      phone?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const reference = `ZL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

      if (!isGoBackendConfigured) {
        return { reference, status: 'pending' as const };
      }

      if (method === 'Card') {
        const result = await goApi.payments.initiateWeb({
          livestock_id: livestockId,
          amount,
          method,
          phone,
        });
        if (result.redirect_url) {
          window.location.href = result.redirect_url;
        }
        return { reference: result.reference, status: 'pending' as const };
      }

      // Mobile payment
      const result = await goApi.payments.initiateMobile({
        livestock_id: livestockId,
        amount,
        method,
        phone: phone!,
      });
      return { reference: result.reference, status: 'pending' as const };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['go-payments'] });
    },
  });
}

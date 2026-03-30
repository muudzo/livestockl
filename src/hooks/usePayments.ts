import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockPayments } from '../app/data/mockData';
import { useAuthStore } from '../stores/authStore';

export function usePaymentHistory() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['payments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) return mockPayments;

      const { data, error } = await supabase
        .from('payments')
        .select('*, livestock_items(title)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}

export function usePaymentStatus(reference: string | undefined) {
  return useQuery({
    queryKey: ['payment-status', reference],
    enabled: !!reference,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'paid' || status === 'failed') return false;
      return 5000;
    },
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return { status: 'pending' as const, reference };
      }

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('reference', reference!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useInitiatePayment() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({
      livestockId,
      amount,
      livestockTitle,
      method = 'Card',
      phone,
    }: {
      livestockId: string;
      amount: number;
      livestockTitle?: string;
      method?: 'EcoCash' | 'OneMoney' | 'Card';
      phone?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const reference = `ZL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();

      if (!isSupabaseConfigured) {
        return { reference, status: 'pending' as const };
      }

      // Check for existing pending/paid payments to prevent duplicates
      const { data: existing } = await supabase
        .from('payments')
        .select('reference, status')
        .eq('livestock_id', livestockId)
        .eq('user_id', user!.id)
        .in('status', ['pending', 'paid'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'paid') throw new Error('Already paid for this item');
        return { ...existing, status: 'pending' as const };
      }

      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          user_id: user!.id,
          livestock_id: livestockId,
          reference,
          amount,
          method,
          phone: phone || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Call Edge Function to initiate payment (Paynow or Stripe)
      const { data: result, error: fnError } = await supabase.functions.invoke('initiate-payment', {
        body: { reference, amount, livestockTitle, method, phone },
      });

      if (fnError) {
        await supabase.from('payments').delete().eq('reference', reference);
        throw new Error('Payment service unavailable. Please try again.');
      }

      if (result?.error) {
        await supabase.from('payments').delete().eq('reference', reference);
        throw new Error(result.error);
      }

      // Redirect to payment page (works for both Stripe and Paynow)
      if (result?.redirectUrl) {
        window.location.href = result.redirectUrl;
        return payment;
      }

      // Paynow fallback: submit signed form from browser (if direct call was blocked)
      if (result?.provider === 'paynow' && result?.formFields) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = result.formAction;
        form.target = '_self';
        for (const [key, value] of Object.entries(result.formFields as Record<string, string>)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

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

      // Check for existing paid payment (block true duplicates)
      const { data: existingPaid } = await supabase
        .from('payments')
        .select('reference, status')
        .eq('livestock_id', livestockId)
        .eq('user_id', user!.id)
        .eq('status', 'paid')
        .maybeSingle();

      if (existingPaid) throw new Error('Already paid for this item');

      // Delete any stale pending payments so we can retry
      await supabase
        .from('payments')
        .delete()
        .eq('livestock_id', livestockId)
        .eq('user_id', user!.id)
        .eq('status', 'pending');

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

      // Redirect to payment page (works for both Stripe and Paynow web checkout)
      if (result?.redirectUrl) {
        window.location.href = result.redirectUrl;
        return payment;
      }

      // Paynow express checkout (EcoCash/OneMoney): USSD sent to phone, go to status page
      if (result?.provider === 'paynow' && result?.pollUrl) {
        return { ...payment, reference, instructions: result.instructions };
      }

      // Paynow fallback: browser calls Paynow directly (Edge Function couldn't reach it)
      if (result?.provider === 'paynow' && result?.formFields) {
        const isMobileExpress = result.formFields.method && result.formFields.phone;
        const endpoint = isMobileExpress
          ? 'https://www.paynow.co.zw/interface/remotetransaction'
          : 'https://www.paynow.co.zw/interface/initiatetransaction';

        const formBody = Object.entries(result.formFields as Record<string, string>)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');

        const paynowRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody,
        });

        const paynowBody = await paynowRes.text();
        const params: Record<string, string> = {};
        for (const pair of paynowBody.split('&')) {
          const [key, ...rest] = pair.split('=');
          params[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
        }

        if (params.status?.toLowerCase() !== 'ok') {
          throw new Error(params.error || 'Paynow payment initiation failed');
        }

        // Save poll URL for status checking
        await supabase
          .from('payments')
          .update({ paynow_reference: params.pollurl || '' })
          .eq('reference', reference);

        // Express checkout: USSD sent to phone — go to payment status page
        if (isMobileExpress && params.instructions) {
          return { ...payment, reference, instructions: params.instructions };
        }

        // Web checkout: redirect to Paynow payment page
        if (params.browserurl) {
          window.location.href = params.browserurl;
          return payment;
        }
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

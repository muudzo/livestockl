import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockPayments } from '../app/data/mockData';
import { useAuthStore } from '../stores/authStore';
import { frontendLogger } from '../lib/logger';

export function usePaymentHistory() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['payments', user?.id],
    enabled: !!user,
    // Financial data: always revalidate against the server when reachable.
    // The global defaults (gcTime 24h + networkMode 'offlineFirst') are right
    // for the catalog but would let a stale 'pending'/'unpaid' payment row
    // linger; override so payment state is never served stale.
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    networkMode: 'online',
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

/**
 * Active Paynow poll fallback — invokes the payment-poll-sync edge
 * function every 20s while payment is pending. This is a belt-and-braces
 * path for delayed or missed webhooks: if Paynow never POSTs the
 * webhook, the UI would otherwise wait until the 10-min hard timeout.
 * With polling, the client can detect a terminal status within ~20s
 * of Paynow's state changing.
 *
 * - Only runs when Supabase is configured AND status is still pending
 * - Sync function is idempotent on the server (guarded by payment.status)
 * - On terminal response, invalidates usePaymentStatus so the UI updates
 */
export function usePaynowPoll(reference: string | undefined, currentStatus: string | undefined) {
  const queryClient = useQueryClient();
  const shouldPoll = isSupabaseConfigured && !!reference && currentStatus === 'pending';

  return useQuery({
    queryKey: ['paynow-poll-sync', reference],
    enabled: shouldPoll,
    refetchInterval: shouldPoll ? 20_000 : false,
    // Don't block the UI on this; it's purely a nudge to invalidate the DB poll
    retry: false,
    staleTime: 0,
    queryFn: async () => {
      if (!reference) return null;
      const { data, error } = await supabase.functions.invoke('payment-poll-sync', {
        body: { reference },
        headers: { 'x-request-id': reference },
      });
      if (error) {
        // Quietly degrade — DB poll still runs, webhook may still arrive
        return null;
      }
      // If the function reports terminal, invalidate so usePaymentStatus refetches immediately
      if (data?.status === 'paid' || data?.status === 'failed') {
        queryClient.invalidateQueries({ queryKey: ['payment-status', reference] });
      }
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
      transportRequestId,
      transportFee,
    }: {
      livestockId: string;
      amount: number;
      livestockTitle?: string;
      method?: 'EcoCash' | 'OneMoney' | 'Card';
      phone?: string;
      transportRequestId?: string;
      transportFee?: number;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const reference = `ZL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();
      // Idempotency: if this exact mutation retries (double-click, network
      // drop + resubmit, offline queue replay), the DB's unique index on
      // (user_id, idempotency_key) guarantees only ONE payment row exists.
      const idempotencyKey = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      frontendLogger.info('payment_initiated', { livestockId, amount, method, reference, idempotencyKey });

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
          idempotency_key: idempotencyKey,
          ...(transportRequestId ? { transport_request_id: transportRequestId } : {}),
          ...(transportFee != null && transportFee > 0 ? { transport_fee: transportFee } : {}),
        })
        .select()
        .single();

      if (error) throw error;

      // Call Edge Function to initiate payment (Paynow or Stripe)
      const { data: result, error: fnError } = await supabase.functions.invoke('initiate-payment', {
        body: { reference, amount, livestockTitle, method, phone },
        // Correlate frontend logs with edge logs: the edge logger keys on
        // x-request-id, so payment lines on both tiers share the reference.
        headers: { 'x-request-id': reference },
      });

      if (fnError) {
        frontendLogger.error('payment_edge_function_failed', { reference, error: fnError.message });
        await supabase.from('payments').delete().eq('reference', reference);
        throw new Error('Payment service unavailable. Please try again.');
      }

      if (result?.error) {
        frontendLogger.error('payment_provider_error', { reference, error: result.error, provider: result?.provider });
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
    onSuccess: (data, variables) => {
      frontendLogger.info('payment_created', { reference: data?.reference, method: variables.method });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error: Error) => {
      frontendLogger.error('payment_failed', { error: error.message });
    },
  });
}

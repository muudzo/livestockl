import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const BILLERS = [
  { code: 'ZETDC', name: 'ZESA Prepaid', icon: 'Zap', accountLabel: 'Meter Number', accountPlaceholder: 'e.g., 37132567431' },
  { code: 'AIRTIME', name: 'Airtime', icon: 'Phone', accountLabel: 'Phone Number', accountPlaceholder: 'e.g., 0771234567' },
  { code: 'COH', name: 'City of Harare', icon: 'Building2', accountLabel: 'Account Number', accountPlaceholder: 'e.g., 12345' },
  { code: 'UZ', name: 'University of Zimbabwe', icon: 'GraduationCap', accountLabel: 'Student ID', accountPlaceholder: 'e.g., R12345' },
  { code: 'NUST', name: 'NUST', icon: 'GraduationCap', accountLabel: 'Student ID', accountPlaceholder: 'e.g., N12345' },
  { code: 'ZINWA', name: 'ZINWA Water', icon: 'Droplet', accountLabel: 'Account Number', accountPlaceholder: 'e.g., ABC123' },
];

export { BILLERS };

export function useBillPayAuth() {
  return useMutation({
    mutationFn: async ({ billerCode, accountNumber, amount }: {
      billerCode: string;
      accountNumber: string;
      amount?: number;
    }) => {
      if (!isSupabaseConfigured) {
        return {
          status: 'ok',
          simulation: true,
          memberName: 'Demo Account Holder',
          accountBalance: 125.50,
          billerCode,
          accountNumber,
        };
      }

      const { data, error } = await supabase.functions.invoke('billpay', {
        body: { action: 'auth', billerCode, accountNumber, amount },
      });

      if (error) throw new Error('BillPay service unavailable');
      if (data?.status === 'error') throw new Error(data.error);
      return data;
    },
  });
}

export function useBillPayPay() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ billerCode, accountNumber, amount, reference }: {
      billerCode: string;
      accountNumber: string;
      amount: number;
      reference?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const ref = reference || `ZL-BP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

      if (!isSupabaseConfigured) {
        return { status: 'ok', simulation: true, reference: ref, message: 'Demo payment successful' };
      }

      const { data, error } = await supabase.functions.invoke('billpay', {
        body: { action: 'pay', billerCode, accountNumber, amount, reference: ref },
      });

      if (error) throw new Error('BillPay service unavailable');
      if (data?.status === 'error') throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-payments'] });
    },
  });
}

export function useBillPayHistory() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['bill-payments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}

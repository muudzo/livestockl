import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { BillPaymentDbStatus } from '../types/billpay';

// ─── Types ───

export interface BillerInfo {
  biller_code: string;
  biller_name: string;
  description?: string | null;
  icon_url?: string | null;
  logo_url?: string | null;
  enabled: boolean;
  member_number_field_label?: string | null;
  member_number_field_desc?: string | null;
  member_number_field_regex?: string | null;
  products: BillerProduct[];
}

export interface BillerProduct {
  Code: string;
  Name: string;
  Price: number | null;
  MinAmount: number | null;
  MaxAmount: number | null;
  AuthAmountMandated: boolean | null;
  ReturnsVouchers: boolean;
  RequiresForex: boolean | null;
  Enabled: boolean;
}

export interface AuthResult {
  status: string;
  simulation?: boolean;
  action: string;
  reference: string;
  billerCode: string;
  billerName?: string;
  accountNumber: string;
  memberName: string;
  accountBalance: number | null;
  accountDetails?: Record<string, string>;
  accountBalances?: Record<string, string>;
  products: BillerProduct[];
}

export interface PayResult {
  status: string;
  simulation?: boolean;
  action: string;
  reference: string;
  billerCode?: string;
  billpayReference?: string;
  billerPaymentReference?: string;
  vouchers?: VoucherData[];
  receiptSmses?: string[];
  displayData?: Record<string, string>;
  currency?: string;
  vendorCommission?: number;
  message?: string;
}

export interface VoucherData {
  SerialNumber: string;
  Pin: string;
  Batch: string;
  VoucherCode: string;
  ValidDays?: number | null;
  ExpiryDate?: string | null;
}

export interface BillPayment {
  id: string;
  reference: string;
  biller_code: string;
  biller_name: string;
  account_number: string;
  account_holder: string | null;
  amount: number;
  currency: string;
  status: BillPaymentDbStatus;
  vouchers: VoucherData[];
  receipt_smses: string[];
  display_data: Record<string, string>;
  vendor_commission: number;
  created_at: string;
}

// ─── Biller icons (Lucide icon names for curated billers) ───

export const BILLER_ICONS: Record<string, string> = {
  ZETDC: 'Zap',
  AIRTIME: 'Phone',
  COH: 'Building2',
  BCC: 'Building2',
  MAS: 'Building2',
  GWE: 'Building2',
  UZ: 'GraduationCap',
  NUST: 'GraduationCap',
  MSU: 'GraduationCap',
  GZU: 'GraduationCap',
  CIMAS: 'Heart',
  FMH: 'Heart',
  NLAC: 'Shield',
  DOVES: 'Shield',
  DSTV: 'Tv',
};

// ─── Hooks ───

/**
 * Fetch curated billers from billpay-billers Edge Function.
 * Cached for 1 hour (matches server-side cache TTL).
 */
export function useBillers() {
  return useQuery<BillerInfo[]>({
    queryKey: ['billers'],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return [];
      }

      const { data, error } = await supabase.functions.invoke('billpay-billers', {
        method: 'GET',
      });

      if (error) throw new Error('Failed to load billers');
      return data?.billers || [];
    },
  });
}

/**
 * AUTH mutation — verify account and get payment details.
 * Returns a reference that MUST be reused for PAY.
 */
export function useBillPayAuth() {
  return useMutation<AuthResult, Error, {
    billerCode: string;
    accountNumber: string;
    amount?: number;
    products?: BillerProduct[];
  }>({
    mutationFn: async ({ billerCode, accountNumber, amount, products }) => {
      if (!isSupabaseConfigured) {
        return {
          status: 'ok',
          simulation: true,
          action: 'auth',
          reference: `ZL-BP-SIM-${Date.now().toString(36).toUpperCase()}`,
          billerCode,
          accountNumber,
          memberName: 'Demo Account Holder',
          accountBalance: 245.00,
          accountDetails: { 'Account Status': 'Active' },
          products: [{
            Code: 'USD',
            Name: `${billerCode} Payment`,
            Price: amount || null,
            MinAmount: 1,
            MaxAmount: 10000,
            AuthAmountMandated: null,
            ReturnsVouchers: billerCode === 'ZETDC',
            RequiresForex: false,
            Enabled: true,
          }],
        } as AuthResult;
      }

      const { data, error } = await supabase.functions.invoke('billpay', {
        body: {
          action: 'auth',
          billerCode,
          accountNumber,
          amount,
          products,
        },
      });

      if (error) throw new Error('BillPay service unavailable');
      if (data?.status === 'error') throw new Error(data.error);
      return data as AuthResult;
    },
  });
}

/**
 * PAY mutation — process the payment.
 * MUST pass the reference from AUTH (same-reference requirement).
 */
export function useBillPayPay() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation<PayResult, Error, {
    billerCode: string;
    accountNumber: string;
    amount: number;
    reference: string; // REQUIRED — from AUTH response
    products?: BillerProduct[];
    totalAmount?: number;
    payerDetails?: Record<string, string>;
  }>({
    mutationFn: async ({ billerCode, accountNumber, amount, reference, products, totalAmount, payerDetails }) => {
      if (!user) throw new Error('Not authenticated');

      if (!isSupabaseConfigured) {
        return {
          status: 'ok',
          simulation: true,
          action: 'pay',
          reference,
          billerCode,
          message: 'Demo payment successful',
          vouchers: billerCode === 'ZETDC' ? [
            { SerialNumber: 'SIM001', Pin: '1234', Batch: 'SIM', VoucherCode: '1234-5678-9012-3456', ValidDays: 365 },
          ] : [],
          displayData: { Account: accountNumber, Amount: `US$${amount}`, Status: 'Paid' },
          currency: 'USD',
        } as PayResult;
      }

      const { data, error } = await supabase.functions.invoke('billpay', {
        body: {
          action: 'pay',
          billerCode,
          accountNumber,
          amount,
          reference, // Same reference from AUTH — critical
          products,
          totalAmount: totalAmount || amount,
          payerDetails,
        },
      });

      if (error) throw new Error('BillPay service unavailable');
      if (data?.status === 'error') throw new Error(data.error);
      return data as PayResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bill-payments'] });
    },
  });
}

/**
 * Poll payment status for non-terminal payments.
 * Follows the usePaymentStatus pattern with conditional refetchInterval.
 *
 * Terminal states (stop polling): paid, failed, reversed
 * Slow poll (30s): flagged
 * Normal poll (10s): being_processed, authorized, pending
 */
export function useBillPayStatus(reference: string | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['billpay-status', reference],
    enabled: !!reference && !!user,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 10000;
      if (['paid', 'failed', 'reversed'].includes(status)) return false;
      if (status === 'flagged') return 30000;
      return 10000;
    },
    queryFn: async () => {
      if (!reference || !isSupabaseConfigured) return null;

      // First check local DB for the status
      const { data: payment } = await supabase
        .from('bill_payments')
        .select('status, vouchers, receipt_smses, display_data, currency, vendor_commission, account_holder, amount, biller_code')
        .eq('reference', reference)
        .single();

      if (!payment) return null;

      // If still processing, trigger a server-side STATUS check
      if (['being_processed', 'flagged'].includes(payment.status ?? '')) {
        const { data } = await supabase.functions.invoke('billpay-status', {
          body: { reference, action: 'status' },
        });
        if (data?.status) {
          return {
            status: data.status as BillPaymentDbStatus,
            vouchers: data.vouchers || payment.vouchers,
            receiptSmses: data.receiptSmses || payment.receipt_smses,
            displayData: data.displayData || payment.display_data,
            currency: data.currency || payment.currency,
            vendorCommission: data.vendorCommission || payment.vendor_commission,
            statusCheckCount: data.statusCheckCount,
          };
        }
      }

      return {
        status: payment.status as BillPaymentDbStatus,
        vouchers: payment.vouchers,
        receiptSmses: payment.receipt_smses,
        displayData: payment.display_data,
        currency: payment.currency,
        vendorCommission: payment.vendor_commission,
      };
    },
  });
}

/**
 * Fetch vendor wallet balances.
 */
export function useWalletBalance() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ['billpay-wallets'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!isSupabaseConfigured) {
        return {
          simulation: true,
          wallets: [
            { Currency: 'USD', Balance: 500.00, Status: 'Open' },
            { Currency: 'ZWL', Balance: 25000.00, Status: 'Open' },
          ],
        };
      }

      const { data, error } = await supabase.functions.invoke('billpay-wallets', {
        method: 'GET',
      });

      if (error) throw new Error('Failed to load wallet balance');
      return data;
    },
  });
}

/**
 * Fetch user's bill payment history.
 * Includes all v1.33 response data: vouchers, receipts, commission.
 */
export function useBillPayHistory() {
  const user = useAuthStore((s) => s.user);

  return useQuery<BillPayment[]>({
    queryKey: ['bill-payments', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!isSupabaseConfigured) return [];

      const { data, error } = await supabase
        .from('bill_payments')
        .select('id, reference, biller_code, biller_name, account_number, account_holder, amount, currency, status, vouchers, receipt_smses, display_data, vendor_commission, created_at')
        .eq('user_id', user!.id)
        .in('status', ['paid', 'failed', 'being_processed', 'flagged', 'reversed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as unknown as BillPayment[];
    },
  });
}

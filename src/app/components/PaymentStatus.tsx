import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { usePaymentStatus } from "../../hooks/usePayments";
import { isSupabaseConfigured } from "../../lib/supabase";
import { Button } from "./ui/button";
import { PostSaleBillPayPrompt } from "./PostSaleBillPayPrompt";

type Status = 'pending' | 'success' | 'failed';

export function PaymentStatus() {
  const { ref } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || '';
  const stripeStatus = searchParams.get('stripe_status');

  // Use real polling when Supabase is configured
  const { data: paymentData } = usePaymentStatus(isSupabaseConfigured ? ref : undefined);

  // Demo mode simulation
  const [demoStatus, setDemoStatus] = useState<Status>('pending');

  useEffect(() => {
    if (!isSupabaseConfigured && demoStatus === 'pending') {
      const timer = setTimeout(() => setDemoStatus('success'), 5000);
      return () => clearTimeout(timer);
    }
  }, [demoStatus]);

  // Determine status: check Stripe redirect params first, then DB polling
  const getStatus = (): Status => {
    if (!isSupabaseConfigured) return demoStatus;

    // If webhook already updated the DB, use that
    if (paymentData?.status === 'paid') return 'success';
    if (paymentData?.status === 'failed') return 'failed';

    // If Stripe redirected with cancelled status
    if (stripeStatus === 'cancelled') return 'failed';

    // If Stripe says success but webhook hasn't fired yet, keep polling
    return 'pending';
  };

  const status = getStatus();

  const getIcon = () => {
    switch (status) {
      case 'pending': return <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />;
      case 'success': return <CheckCircle className="w-20 h-20 text-green-600" />;
      case 'failed': return <XCircle className="w-20 h-20 text-red-600" />;
    }
  };

  const getHeading = () => {
    switch (status) {
      case 'pending': return stripeStatus === 'success' ? 'Confirming Payment' : 'Payment Pending';
      case 'success': return 'Payment Successful';
      case 'failed': return stripeStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'pending':
        if (stripeStatus === 'success') return 'Your payment was received. Waiting for confirmation...';
        if (method === 'ecocash') return 'A USSD prompt has been sent to your phone. Dial *151*2*7# and enter your EcoCash PIN to approve the payment.';
        if (method === 'onemoney') return 'A USSD prompt has been sent to your phone. Follow the instructions to approve the payment.';
        return 'Waiting for payment confirmation...';
      case 'success': return 'Your payment has been confirmed. The seller will contact you shortly.';
      case 'failed':
        return stripeStatus === 'cancelled'
          ? 'You cancelled the payment. You can try again when ready.'
          : 'Payment could not be processed. Please try again or contact support.';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-6">{getIcon()}</div>
        <h1 className="text-2xl font-bold text-center mb-4">{getHeading()}</h1>
        <div className="bg-muted rounded-lg p-3 mb-4">
          <p className="text-center font-mono text-sm">REF: {ref?.toUpperCase()}</p>
        </div>
        <p className="text-center text-muted-foreground mb-6">{getMessage()}</p>

        {status === 'pending' && (
          <p className="text-center text-sm text-muted-foreground mb-6">Auto-checking every 5 seconds...</p>
        )}

        <Button onClick={() => navigate('/')} variant={status === 'success' ? 'default' : 'outline'} className="w-full">
          {status === 'success' ? 'Back to Marketplace' : 'Back to Home'}
        </Button>

        {status === 'failed' && (
          <Button onClick={() => navigate(-1)} className="w-full mt-3">Try Again</Button>
        )}

        {status === 'success' && <PostSaleBillPayPrompt />}
      </div>
    </div>
  );
}

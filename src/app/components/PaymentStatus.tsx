import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { usePaymentStatus, usePaynowPoll } from "../../hooks/usePayments";
import { isSupabaseConfigured } from "../../lib/supabase";
import { Button } from "./ui/button";
import { PostSaleBillPayPrompt } from "./PostSaleBillPayPrompt";

type Status = 'pending' | 'success' | 'failed';

const SOFT_TIMEOUT_MS = 2 * 60 * 1000;   // 2 minutes — show warning
const HARD_TIMEOUT_MS = 10 * 60 * 1000;  // 10 minutes — escalation

export function PaymentStatus() {
  const { ref } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const amount = searchParams.get('amount') || '0';
  const method = searchParams.get('method') || '';
  const stripeStatus = searchParams.get('stripe_status');

  // DB poll — updated when the Paynow webhook fires and writes to the DB
  const { data: paymentData } = usePaymentStatus(isSupabaseConfigured ? ref : undefined);

  // Active Paynow poll fallback — triggers payment-poll-sync edge function
  // every 20s while pending so we're not solely dependent on webhook delivery
  usePaynowPoll(ref, paymentData?.status ?? undefined);

  // Demo mode simulation
  const [demoStatus, setDemoStatus] = useState<Status>('pending');

  // Pending timeout tracking
  const pendingStartRef = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured && demoStatus === 'pending') {
      const timer = setTimeout(() => setDemoStatus('success'), 5000);
      return () => clearTimeout(timer);
    }
  }, [demoStatus]);

  // Track elapsed pending time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - pendingStartRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isSoftTimeout = elapsedMs >= SOFT_TIMEOUT_MS;
  const isHardTimeout = elapsedMs >= HARD_TIMEOUT_MS;

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
    if (status === 'pending' && isHardTimeout) return <AlertTriangle className="w-20 h-20 text-orange-500" />;
    if (status === 'pending' && isSoftTimeout) return <Clock className="w-20 h-20 text-yellow-500" />;
    switch (status) {
      case 'pending': return <Loader2 className="w-20 h-20 text-blue-600 animate-spin" />;
      case 'success': return <CheckCircle className="w-20 h-20 text-green-600" />;
      case 'failed': return <XCircle className="w-20 h-20 text-red-600" />;
    }
  };

  const getHeading = () => {
    if (status === 'pending' && isHardTimeout) return 'Payment Taking Too Long';
    if (status === 'pending' && isSoftTimeout) return 'Still Waiting...';
    switch (status) {
      case 'pending': return stripeStatus === 'success' ? 'Confirming Payment' : 'Payment Pending';
      case 'success': return 'Payment Successful';
      case 'failed': return stripeStatus === 'cancelled' ? 'Payment Cancelled' : 'Payment Failed';
    }
  };

  const getMessage = () => {
    if (status === 'pending' && isHardTimeout) {
      return 'We\'re still reconciling your payment with the provider. If you were charged, your payment is safe — please contact support with your reference number and we\'ll resolve this.';
    }
    if (status === 'pending' && isSoftTimeout) {
      return 'This is taking longer than usual. Please ensure you approved the payment on your phone. We\'re still checking...';
    }
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

  const formatElapsed = () => {
    const seconds = Math.floor(elapsedMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8" role="status" aria-live="polite">
        <div className="flex justify-center mb-6">{getIcon()}</div>
        <h1 className="text-2xl font-bold text-center mb-4">{getHeading()}</h1>
        <div className="bg-muted rounded-lg p-3 mb-4">
          <p className="text-center font-mono text-sm">REF: {ref?.toUpperCase()}</p>
        </div>
        <p className="text-center text-muted-foreground mb-6">{getMessage()}</p>

        {status === 'pending' && !isHardTimeout && (
          <p className="text-center text-sm text-muted-foreground mb-6">
            Checking payment status… ({formatElapsed()})
          </p>
        )}

        {status === 'pending' && isHardTimeout && (
          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-2">Need help?</p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              WhatsApp support or email with your reference: <span className="font-mono font-bold">{ref?.toUpperCase()}</span>
            </p>
          </div>
        )}

        <Button onClick={() => navigate('/')} variant={status === 'success' ? 'default' : 'outline'} className="w-full">
          {status === 'success' ? 'Back to Marketplace' : 'Back to Home'}
        </Button>

        {status === 'failed' && (
          <Button onClick={() => navigate(-1)} className="w-full mt-3">Try Again</Button>
        )}

        {status === 'pending' && isSoftTimeout && (
          <Button onClick={() => navigate(-1)} variant="outline" className="w-full mt-3">Try Again</Button>
        )}

        {status === 'success' && <PostSaleBillPayPrompt />}
      </div>
    </div>
  );
}

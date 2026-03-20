import { useState } from "react";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../stores/authStore";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { toast } from "sonner";

export function TestFlutterwavePayment() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const amount = 10; // US$10 test payment

  const handleTestPayment = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("test-flutterwave-checkout", {
        body: {
          amount,
          email: user.email,
          origin: window.location.origin,
        },
      });

      if (error) {
        toast.error("Edge Function error: " + error.message);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        toast.error("No redirect URL returned from Flutterwave");
      }
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-8 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#F5A623] flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Test Flutterwave Payment</h1>
          <p className="text-muted-foreground mt-2">
            This page lets you test the Flutterwave Checkout flow without needing a winning auction bid.
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Test item</span>
            <span className="font-medium">Livestock Purchase (Demo)</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Amount</span>
            <span className="font-bold text-primary">US$10.00</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm text-blue-900">
            <strong>Test card details:</strong>
          </p>
          <p className="text-sm text-blue-900">
            Card: <strong>5531 8866 5214 2950</strong>
          </p>
          <p className="text-sm text-blue-900">
            Expiry: <strong>09/32</strong> &middot; CVV: <strong>564</strong>
          </p>
          <p className="text-sm text-blue-900">
            PIN: <strong>3310</strong> &middot; OTP: <strong>12345</strong>
          </p>
        </div>

        <Button
          onClick={handleTestPayment}
          className="w-full h-12 text-lg font-semibold"
          disabled={loading}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Flutterwave...</>
          ) : (
            "Pay US$10.00 with Flutterwave"
          )}
        </Button>

        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /><span>Secured by Flutterwave (Test Mode)</span>
        </div>
      </div>
    </div>
  );
}

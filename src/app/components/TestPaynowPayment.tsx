import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export default function TestPaynowPayment() {
  const [amount, setAmount] = useState("1.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<{
    formAction: string;
    formFields: Record<string, string>;
  } | null>(null);

  // Check if we returned from Paynow
  const urlParams = new URLSearchParams(window.location.search);
  const returnedStatus = urlParams.get("status");

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get signed form data from Edge Function (hash computed server-side)
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/test-paynow-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ amount: Number(amount) }),
        }
      );

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }

      // Step 2: Set form data and submit — browser POSTs directly to Paynow
      // This bypasses the Edge Function connectivity blocker
      setFormData({
        formAction: data.formAction,
        formFields: data.formFields,
      });

      // Wait for React to render the hidden form, then submit
      setTimeout(() => {
        formRef.current?.submit();
      }, 100);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Paynow Test Checkout</h1>
        <p className="text-sm text-muted-foreground text-center">
          Client-side form submission — bypasses Edge Function connectivity blocker
        </p>

        {returnedStatus && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-800 font-medium">
              Returned from Paynow with status: {returnedStatus}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Amount (US$)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-background"
          />
        </div>

        <div className="bg-muted/50 border rounded p-3">
          <p className="text-xs text-muted-foreground">
            Payment method selection happens on Paynow's hosted page.
            You'll choose EcoCash, OneMoney, or Card there.
          </p>
        </div>

        <Button
          onClick={handlePay}
          disabled={loading || !amount}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Redirecting to Paynow...
            </>
          ) : (
            `Pay US$${amount} via Paynow`
          )}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>How it works:</strong></p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Edge Function computes SHA-512 hash (keeps key secret)</li>
            <li>Returns signed form data to browser</li>
            <li>Browser submits form directly to paynow.co.zw</li>
            <li>No server-to-Paynow connection needed</li>
          </ol>
        </div>
      </div>

      {/* Hidden form — submitted directly to Paynow from the browser */}
      {formData && (
        <form
          ref={formRef}
          method="POST"
          action={formData.formAction}
          style={{ display: "none" }}
        >
          {Object.entries(formData.formFields).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>
      )}
    </div>
  );
}

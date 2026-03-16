import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Method = "ecocash" | "onemoney" | "card";

export default function TestPaynowPayment() {
  const [amount, setAmount] = useState("1.00");
  const [method, setMethod] = useState<Method>("ecocash");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/test-paynow-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          phone: method !== "card" ? phone : undefined,
        }),
      });

      const data = await res.json();
      setResult(data);

      // If card payment, redirect to Paynow hosted page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Paynow Test Checkout</h1>
        <p className="text-sm text-muted-foreground text-center">
          Bypass auction flow — test Paynow directly
        </p>

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

        <div>
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <div className="flex gap-2">
            {(["ecocash", "onemoney", "card"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                  method === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {m === "ecocash" ? "EcoCash" : m === "onemoney" ? "OneMoney" : "Card"}
              </button>
            ))}
          </div>
        </div>

        {method !== "card" && (
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-background"
            />
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={loading || !amount || (method !== "card" && !phone)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Initiating...
            </>
          ) : (
            `Pay US$${amount} via ${method === "ecocash" ? "EcoCash" : method === "onemoney" ? "OneMoney" : "Card"}`
          )}
        </Button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-muted rounded p-3 space-y-2">
            <p className="text-sm font-medium">Response:</p>
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.reference && (
              <a
                href={`/payment-status/${result.reference}?method=${method}&amount=${amount}`}
                className="text-sm text-blue-600 underline block"
              >
                Go to Payment Status page
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

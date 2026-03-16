import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

const LOCAL_SERVER = "http://localhost:3000";

type Method = "EcoCash" | "OneMoney" | "Card";

export default function TestPaynowPayment() {
  const [amount, setAmount] = useState("1.00");
  const [method, setMethod] = useState<Method>("EcoCash");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const urlParams = new URLSearchParams(window.location.search);
  const returnedStatus = urlParams.get("status");

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const isMobile = method === "EcoCash" || method === "OneMoney";
      const endpoint = isMobile
        ? `${LOCAL_SERVER}/api/process-mobile-payment`
        : `${LOCAL_SERVER}/api/process-payment`;

      const body: any = {
        amount: Number(amount),
        description: "Benchmark test payment",
      };

      if (isMobile) {
        body.phone = phone;
        body.method = method;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResult(data);

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      setError(
        err.message.includes("Failed to fetch")
          ? "Can't reach local server. Run: node paynow-server.js"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">Paynow Test Checkout</h1>
        <p className="text-sm text-muted-foreground text-center">
          Uses local Express server + Paynow SDK (same as dummy site)
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

        <div>
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <div className="flex gap-2">
            {(["EcoCash", "OneMoney", "Card"] as Method[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2 px-3 rounded border text-sm font-medium transition-colors ${
                  method === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {method !== "Card" && (
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
          disabled={loading || !amount || (method !== "Card" && !phone)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting to Paynow...
            </>
          ) : (
            `Pay US$${amount} via ${method}`
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
            {result.pollUrl && (
              <p className="text-xs text-muted-foreground">
                Check your phone for the USSD prompt. Dial *151# if you missed it.
              </p>
            )}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs text-amber-800">
            <strong>Requires:</strong> Run <code>node paynow-server.js</code> in a separate terminal.
            This local Express server proxies calls to Paynow using the Node.js SDK.
          </p>
        </div>
      </div>
    </div>
  );
}

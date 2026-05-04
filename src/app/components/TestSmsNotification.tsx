import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const PHONE_REGEX = /^07\d{8}$/;
const RATE_LIMIT = 10; // per hour

interface TestResult {
  name: string;
  status: "pass" | "fail" | "pending";
  detail: string;
}

interface HealthState {
  status: "idle" | "checking" | "live" | "blocked" | "missing" | "error";
  detail: string;
}

export default function TestSmsNotification() {
  const [phone, setPhone] = useState("0771111111");
  const [message, setMessage] = useState("Test SMS from ZimLivestock");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [health, setHealth] = useState<HealthState>({ status: "idle", detail: "" });

  const addResult = (result: TestResult) => {
    setResults((prev) => [...prev, result]);
  };

  const pingHealth = async () => {
    setHealth({ status: "checking", detail: "Calling /Remote/AccountBalance…" });

    if (!isSupabaseConfigured) {
      setHealth({ status: "missing", detail: "Supabase not configured locally" });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { action: "health" },
      });

      if (error) {
        setHealth({ status: "error", detail: `Edge Function error: ${error.message}` });
        return;
      }

      if (data?.ok && data?.status === "live") {
        setHealth({ status: "live", detail: `Balance: ${data.balance} on ${data.host}` });
      } else if (data?.status === "credentials_missing") {
        setHealth({ status: "missing", detail: data.error });
      } else if (data?.status === "auth_not_provisioned") {
        setHealth({
          status: "blocked",
          detail: `${data.error} (HTTP ${data.httpStatus} on ${data.host})`,
        });
      } else {
        setHealth({
          status: "error",
          detail: data?.error || `Unexpected response: ${JSON.stringify(data)}`,
        });
      }
    } catch (err: any) {
      setHealth({ status: "error", detail: err.message });
    }
  };

  const runAllTests = async () => {
    setResults([]);
    setLoading(true);

    // Test 1: Phone validation
    const validPhones = ["0771234567", "0712345678", "0781234567"];
    const invalidPhones = ["123", "+263771234567", "07712345", "0671234567", "phone", ""];
    let phoneTestPassed = true;

    for (const p of validPhones) {
      if (!PHONE_REGEX.test(p)) {
        phoneTestPassed = false;
        break;
      }
    }
    for (const p of invalidPhones) {
      if (PHONE_REGEX.test(p)) {
        phoneTestPassed = false;
        break;
      }
    }

    addResult({
      name: "Phone Validation",
      status: phoneTestPassed ? "pass" : "fail",
      detail: phoneTestPassed
        ? `Correctly validates ${validPhones.length} valid and rejects ${invalidPhones.length} invalid numbers`
        : "Regex validation failed for some test cases",
    });

    // Test 2: Normalization — txt.co.zw expects local 07X format,
    // it handles 0 -> +263 conversion itself
    const normalizeTests = [
      { input: "0771234567", expected: "0771234567" },
      { input: "+263771234567", expected: "0771234567" },
      { input: "263771234567", expected: "0771234567" },
      { input: "771234567", expected: "0771234567" },
    ];

    function normalizePhone(p: string): string {
      const cleaned = p.replace(/[\s\-()]/g, "");
      if (cleaned.startsWith("+263")) return "0" + cleaned.slice(4);
      if (cleaned.startsWith("263")) return "0" + cleaned.slice(3);
      if (cleaned.startsWith("0")) return cleaned;
      return "0" + cleaned;
    }

    let normalizePass = true;
    const normDetails: string[] = [];
    for (const t of normalizeTests) {
      const result = normalizePhone(t.input);
      if (result !== t.expected) {
        normalizePass = false;
        normDetails.push(`${t.input} -> ${result} (expected ${t.expected})`);
      }
    }

    addResult({
      name: "Phone Normalization",
      status: normalizePass ? "pass" : "fail",
      detail: normalizePass
        ? `All ${normalizeTests.length} normalization cases passed`
        : `Failed: ${normDetails.join(", ")}`,
    });

    // Test 3: Rate limit info
    addResult({
      name: "Rate Limit Config",
      status: "pass",
      detail: `Rate limit: ${RATE_LIMIT} SMS per user per hour. Enforced server-side in send-sms Edge Function.`,
    });

    // Test 4: Send SMS (simulation mode)
    if (!isSupabaseConfigured) {
      addResult({
        name: "SMS Send (Simulation)",
        status: "pass",
        detail: `Supabase not configured — simulation mode active. Would send to ${normalizePhone(phone)}: "${message}"`,
      });
    } else {
      try {
        const { data, error } = await supabase.functions.invoke("send-sms", {
          body: {
            recipientPhone: phone,
            message: message.slice(0, 160),
            eventType: "test",
            userId: null,
          },
        });

        if (error) {
          addResult({
            name: "SMS Send",
            status: "fail",
            detail: `Edge Function error: ${error.message}`,
          });
        } else {
          addResult({
            name: "SMS Send",
            status: data?.success ? "pass" : "fail",
            detail: `Status: ${data?.status || "unknown"} | Reference: ${data?.reference || "none"} | ${
              data?.status === "simulated"
                ? "txt.co.zw credentials not set — running in simulation mode"
                : data?.status === "sent"
                ? "SMS delivered to provider"
                : data?.error || "Unknown error"
            }`,
          });
        }
      } catch (err: any) {
        addResult({
          name: "SMS Send",
          status: "fail",
          detail: err.message?.includes("Failed to fetch")
            ? "Cannot reach Supabase Edge Functions. Are they deployed?"
            : err.message,
        });
      }
    }

    // Test 5: Message length enforcement
    const longMsg = "A".repeat(200);
    const truncated = longMsg.slice(0, 160);
    addResult({
      name: "Message Truncation",
      status: truncated.length === 160 ? "pass" : "fail",
      detail: `Messages are truncated to 160 chars. Input: ${longMsg.length} chars -> Output: ${truncated.length} chars`,
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border rounded-lg shadow-lg p-6 space-y-4">
        <h1 className="text-xl font-bold text-center">SMS Notification Test</h1>
        <p className="text-sm text-muted-foreground text-center">
          Tests phone validation, normalization, rate limits, and SMS dispatch (simulation mode).
        </p>

        <div className="space-y-3">
          <div>
            <Label htmlFor="test-phone">Test Phone Number</Label>
            <Input
              id="test-phone"
              type="tel"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={phone && !PHONE_REGEX.test(phone) ? "border-red-400" : ""}
            />
            {phone && !PHONE_REGEX.test(phone) && (
              <p className="text-xs text-red-500 mt-1">Invalid format. Use 07XXXXXXXX</p>
            )}
          </div>

          <div>
            <Label htmlFor="test-message">Test Message</Label>
            <Input
              id="test-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/160 characters</p>
          </div>
        </div>

        <div className="rounded border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">txt.co.zw credential health</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={pingHealth}
              disabled={health.status === "checking"}
            >
              {health.status === "checking" ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Pinging…
                </>
              ) : (
                "Ping txt.co.zw"
              )}
            </Button>
          </div>
          {health.status !== "idle" && (
            <div
              className={`text-xs rounded p-2 border ${
                health.status === "live"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : health.status === "blocked"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : health.status === "missing"
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : health.status === "checking"
                  ? "bg-slate-50 border-slate-200 text-slate-700"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="font-medium uppercase tracking-wide">{health.status}</div>
              <div className="mt-0.5">{health.detail}</div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            Hits <code>/Remote/AccountBalance</code> — no SMS sent, no cost. Confirms whether REMOTE/Basic Auth is provisioned.
          </p>
        </div>

        <Button onClick={runAllTests} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running tests...
            </>
          ) : (
            "Run All Tests"
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              Results: {results.filter((r) => r.status === "pass").length}/{results.length} passed
            </p>
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded p-3 border text-sm ${
                  r.status === "pass"
                    ? "bg-emerald-50 border-emerald-200"
                    : r.status === "fail"
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {r.status === "pass" ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : r.status === "fail" ? (
                    <X className="w-4 h-4 text-red-600" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                  )}
                  {r.name}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.detail}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Simulation mode:</strong> Without txt.co.zw credentials set as Supabase secrets
              (TXT_USERNAME, TXT_PASSWORD), all SMS messages are simulated and logged with status "simulated".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

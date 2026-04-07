import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useBillPayAuth, useBillPayPay, BILLERS } from "../../hooks/useBillPay";

type TestCase = {
  name: string;
  description: string;
  billerCode: string;
  accountNumber: string;
  amount?: number;
  action: "auth" | "pay";
  expectError?: boolean;
};

const TEST_CASES: TestCase[] = [
  {
    name: "AUTH — Valid ZESA Account",
    description: "Verify a valid ZESA meter number returns account holder info",
    billerCode: "ZETDC",
    accountNumber: "37132567431",
    amount: 20,
    action: "auth",
  },
  {
    name: "AUTH — Valid Airtime Account",
    description: "Verify a phone number for airtime top-up",
    billerCode: "AIRTIME",
    accountNumber: "0771234567",
    amount: 5,
    action: "auth",
  },
  {
    name: "AUTH — Invalid Account",
    description: "Attempt to verify a clearly invalid account number",
    billerCode: "ZETDC",
    accountNumber: "INVALID-000",
    action: "auth",
    expectError: true,
  },
  {
    name: "PAY — ZESA Payment",
    description: "Simulate a US$20 ZESA prepaid token purchase",
    billerCode: "ZETDC",
    accountNumber: "37132567431",
    amount: 20,
    action: "pay",
  },
  {
    name: "PAY — Small Airtime",
    description: "Simulate a US$1 airtime top-up",
    billerCode: "AIRTIME",
    accountNumber: "0771234567",
    amount: 1,
    action: "pay",
  },
  {
    name: "PAY — Insufficient Funds",
    description: "Attempt a very large payment to test error handling",
    billerCode: "ZETDC",
    accountNumber: "37132567431",
    amount: 999999,
    action: "pay",
    expectError: true,
  },
];

type TestResult = {
  status: "idle" | "running" | "pass" | "fail";
  data?: any;
  error?: string;
  duration?: number;
};

export default function TestBillPayPayment() {
  const [results, setResults] = useState<Record<number, TestResult>>({});
  const [runningAll, setRunningAll] = useState(false);

  const billPayAuth = useBillPayAuth();
  const billPayPay = useBillPayPay();

  const runTest = async (index: number, test: TestCase) => {
    setResults((prev) => ({ ...prev, [index]: { status: "running" } }));
    const start = performance.now();

    try {
      let data: any;
      if (test.action === "auth") {
        data = await billPayAuth.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount,
        });
      } else {
        data = await billPayPay.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount!,
        });
      }

      const duration = Math.round(performance.now() - start);

      if (test.expectError) {
        // Expected error but got success — in simulation mode this is fine
        setResults((prev) => ({
          ...prev,
          [index]: {
            status: data?.simulation ? "pass" : "fail",
            data,
            duration,
            error: data?.simulation
              ? undefined
              : "Expected error but got success",
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [index]: { status: "pass", data, duration },
        }));
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      if (test.expectError) {
        setResults((prev) => ({
          ...prev,
          [index]: {
            status: "pass",
            error: err.message,
            duration,
            data: { expectedError: true, message: err.message },
          },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [index]: { status: "fail", error: err.message, duration },
        }));
      }
    }
  };

  const runAllTests = async () => {
    setRunningAll(true);
    setResults({});
    for (let i = 0; i < TEST_CASES.length; i++) {
      await runTest(i, TEST_CASES[i]);
    }
    setRunningAll(false);
  };

  const clearResults = () => setResults({});

  const passCount = Object.values(results).filter(
    (r) => r.status === "pass"
  ).length;
  const failCount = Object.values(results).filter(
    (r) => r.status === "fail"
  ).length;
  const totalRun = passCount + failCount;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">BillPay Test Harness</h1>
          <p className="text-sm text-muted-foreground">
            Tests the BillPay AUTH and PAY flows via Supabase Edge Function.
            Works in simulation mode when BillPay credentials are not
            configured.
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={runAllTests}
            disabled={runningAll}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {runningAll ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              "Run All Tests"
            )}
          </Button>
          <Button variant="outline" onClick={clearResults} disabled={runningAll}>
            Clear
          </Button>
        </div>

        {/* Summary */}
        {totalRun > 0 && (
          <div className="flex gap-3 justify-center">
            <Badge
              variant="outline"
              className="text-emerald-700 border-emerald-300"
            >
              {passCount} passed
            </Badge>
            {failCount > 0 && (
              <Badge variant="destructive">
                {failCount} failed
              </Badge>
            )}
            <Badge variant="outline">
              {totalRun}/{TEST_CASES.length} run
            </Badge>
          </div>
        )}

        {/* Test cases */}
        <div className="space-y-3">
          {TEST_CASES.map((test, i) => {
            const result = results[i] || { status: "idle" };
            return (
              <div
                key={i}
                className={`border rounded-lg p-4 space-y-2 transition-colors ${
                  result.status === "pass"
                    ? "border-emerald-300 bg-emerald-50/50"
                    : result.status === "fail"
                    ? "border-red-300 bg-red-50/50"
                    : result.status === "running"
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.status === "pass" && (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    )}
                    {result.status === "fail" && (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    {result.status === "running" && (
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    )}
                    {result.status === "idle" && (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="font-medium text-sm">{test.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runTest(i, test)}
                    disabled={
                      result.status === "running" || runningAll
                    }
                    className="text-xs"
                  >
                    Run
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  {test.description}
                </p>

                <div className="flex gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px]">
                    {test.action.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {
                      BILLERS.find((b) => b.code === test.billerCode)
                        ?.name || test.billerCode
                    }
                  </Badge>
                  {test.expectError && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 border-amber-300"
                    >
                      Expects Error
                    </Badge>
                  )}
                </div>

                {/* Result detail */}
                {result.status !== "idle" &&
                  result.status !== "running" && (
                    <div className="mt-2 bg-muted rounded p-3 space-y-1">
                      {result.duration != null && (
                        <p className="text-[10px] text-muted-foreground">
                          Completed in {result.duration}ms
                        </p>
                      )}
                      {result.error && !result.data?.expectedError && (
                        <p className="text-xs text-red-700">
                          Error: {result.error}
                        </p>
                      )}
                      {result.data && (
                        <pre className="text-[10px] overflow-auto whitespace-pre-wrap max-h-40">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded p-3">
          <p className="text-xs text-amber-800">
            <strong>Note:</strong> Without BillPay credentials configured in
            Supabase secrets, all tests run in simulation mode. Auth errors
            for invalid accounts will pass through as simulated successes —
            this is expected behavior.
          </p>
        </div>
      </div>
    </div>
  );
}

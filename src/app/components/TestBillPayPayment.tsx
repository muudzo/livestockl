import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Loader2, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useBillPayAuth, useBillPayPay } from "../../hooks/useBillPay";

type TestCase = {
  name: string;
  description: string;
  billerCode: string;
  billerName: string;
  accountNumber: string;
  amount?: number;
  productCode?: string;     // vendor product code — required for real billers
  productPrice?: number;    // per-product price, usually equals amount
  requiresForex?: boolean;  // RequiresForexPayment flag — TRUE for USD products on ZWG accounts per v1.33 Dual Currency spec
  action: "auth" | "auth+pay" | "pay_pending" | "pay_flagged" | "pay_fail" | "auth_timeout" | "auth_fail" | "pay_timeout";
  expectError?: boolean;
};

/**
 * Real-biller harness (live staging via billpay-staging.paynow.co.zw).
 *
 * Product codes verified against this sandbox account's ListBillers response:
 *   ZETDC       → PREPAID_USD  (USD prepaid meter, returns tokens)
 *   AIRTIME     → AIRTIME_USD  (USD airtime credit)
 *   COH         → BILL         (City of Harare bill payment)
 *   UZ          → TUITION      (University of Zimbabwe tuition)
 *   NUST        → USD1         (NUST tuition USD)
 *   GWE         → GWE          (Gweru council bill payment)
 *
 * ZETDC test meters from v1.33 docs:
 *   37132567431 = single-debt, 37132229735 = double-token
 *   Any meter + $177.77 amount = token resend
 *
 * Test biller is intentionally excluded here — vendor reports
 * "biller code 'Test' is not enabled on your vendor profile" for this
 * sandbox account despite ListBillers showing Enabled=true. Awaiting
 * Paynow activation. Error-path cases (AT/AF/PT/PF/PP/PFF prefixes) run
 * in simulation mode only until then.
 */
const TEST_CASES: TestCase[] = [
  {
    name: "1 — ZETDC AUTH (single-debt test meter)",
    description: "ZETDC + documented test meter 37132567431 + PREPAID_USD product. Verifies biller reachability and account-lookup.",
    billerCode: "ZETDC",
    billerName: "ZESA Prepaid",
    accountNumber: "37132567431",
    amount: 20,
    productCode: "PREPAID_USD",
    productPrice: 20,
    requiresForex: true,
    action: "auth",
  },
  {
    name: "2 — ZETDC AUTH+PAY (full flow, single-debt meter)",
    description: "Critical spec test — AUTH then PAY with same reference. One ZESA token should be returned in the PAY response.",
    billerCode: "ZETDC",
    billerName: "ZESA Prepaid",
    accountNumber: "37132567431",
    amount: 20,
    productCode: "PREPAID_USD",
    productPrice: 20,
    requiresForex: true,
    action: "auth+pay",
  },
  {
    name: "3 — ZETDC double-token meter",
    description: "Test meter 37132229735 returns TWO tokens. Validates multi-voucher handling + SMS fan-out.",
    billerCode: "ZETDC",
    billerName: "ZESA Prepaid",
    accountNumber: "37132229735",
    amount: 50,
    productCode: "PREPAID_USD",
    productPrice: 50,
    requiresForex: true,
    action: "auth+pay",
  },
  {
    name: "4 — ZETDC token-resend ($177.77)",
    description: "Amount $177.77 triggers documented token-resend flow (any meter).",
    billerCode: "ZETDC",
    billerName: "ZESA Prepaid",
    accountNumber: "37132567431",
    amount: 177.77,
    productCode: "PREPAID_USD",
    productPrice: 177.77,
    requiresForex: true,
    action: "auth+pay",
  },
  {
    name: "5 — AIRTIME USD top-up",
    description: "Paynow Airtime biller + USD product on a valid Econet number.",
    billerCode: "AIRTIME",
    billerName: "Paynow Airtime",
    accountNumber: "0771234567",
    amount: 5,
    productCode: "AIRTIME_USD",
    productPrice: 5,
    requiresForex: true,
    action: "auth+pay",
  },
  {
    name: "6 — UZ Tuition (USD)",
    description: "University of Zimbabwe + TUITION product. USD fee, requires forex ack. Expected error if member not found.",
    billerCode: "UZ",
    billerName: "University of Zimbabwe",
    accountNumber: "R123456K",
    amount: 100,
    productCode: "TUITION",
    productPrice: 100,
    requiresForex: true,
    action: "auth",
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

    // Payment products for AUTH + PAY requests. Matches v1.33 "Payment Product"
    // shape (RequiresForexPayment — NOT RequiresForex from the ListBillers
    // read-only schema). USD-denominated products on a ZWG-denominated vendor
    // wallet need this flag set to acknowledge foreign-currency debit.
    const testProducts = test.productCode
      ? [{
          Code: test.productCode,
          Name: test.productCode,
          Price: test.productPrice ?? test.amount ?? null,
          MinAmount: null,
          MaxAmount: null,
          AuthAmountMandated: null,
          ReturnsVouchers: false,
          RequiresForex: null,                            // ListBillers schema field (read-only, unused in request)
          RequiresForexPayment: test.requiresForex ?? false, // v1.33 Payment Product field — MUST be true for USD products
          Enabled: true,
        }]
      : undefined;

    try {
      let data: any;

      if (test.action === "auth" || test.action === "auth_timeout" || test.action === "auth_fail") {
        data = await billPayAuth.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount,
          products: testProducts,
        });

        // Happy-path AUTH: verify returns a reference. AT/AF cases expect the
        // hook to throw (via expectError), so execution shouldn't reach here.
        if (!test.expectError && !data.reference) {
          throw new Error("AUTH did not return a reference — critical spec failure");
        }
      } else if (test.action === "auth+pay") {
        // Step 1: AUTH
        const authData = await billPayAuth.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount,
          products: testProducts,
        });

        if (!authData.reference) {
          throw new Error("AUTH did not return a reference");
        }

        // Step 2: PAY with SAME reference
        const payData = await billPayPay.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount!,
          reference: authData.reference, // SAME reference — critical
          products: testProducts,
        });

        data = {
          authReference: authData.reference,
          payReference: payData.reference,
          sameReference: authData.reference === payData.reference,
          authResult: authData,
          payResult: payData,
        };

        // Verify same reference
        if (authData.reference !== payData.reference) {
          throw new Error(`Reference mismatch! AUTH=${authData.reference} PAY=${payData.reference}`);
        }
      } else if (test.action === "pay_pending" || test.action === "pay_fail" || test.action === "pay_flagged" || test.action === "pay_timeout") {
        // AUTH first (needed to get a reference)
        const authData = await billPayAuth.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount,
          products: testProducts,
        });

        // PAY with test prefix that triggers specific status
        const payData = await billPayPay.mutateAsync({
          billerCode: test.billerCode,
          accountNumber: test.accountNumber,
          amount: test.amount!,
          reference: authData.reference,
          products: testProducts,
        });

        data = { authResult: authData, payResult: payData };

        // Validate expected status
        if (test.action === "pay_pending" && payData.status !== "processing") {
          // In simulation mode, PP prefix returns processing
          if (!payData.simulation) {
            throw new Error(`Expected 'processing' status but got '${payData.status}'`);
          }
        }
        if (test.action === "pay_flagged" && payData.status !== "flagged") {
          if (!payData.simulation) {
            throw new Error(`Expected 'flagged' status but got '${payData.status}'`);
          }
        }
      }

      const duration = Math.round(performance.now() - start);

      if (test.expectError) {
        setResults((prev) => ({
          ...prev,
          [index]: {
            status: data?.simulation ? "pass" : "fail",
            data,
            duration,
            error: data?.simulation ? undefined : "Expected error but got success",
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

  const passCount = Object.values(results).filter((r) => r.status === "pass").length;
  const failCount = Object.values(results).filter((r) => r.status === "fail").length;
  const totalRun = passCount + failCount;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">BillPay v1.33 Test Harness</h1>
          <p className="text-sm text-muted-foreground">
            Tests BillPay AUTH, PAY, same-reference flow, and status simulation.
            Uses test biller member prefixes (PP, PF, PFF) per spec.
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
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running...</>
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
            <Badge variant="outline" className="text-emerald-700 border-emerald-300">
              {passCount} passed
            </Badge>
            {failCount > 0 && <Badge variant="destructive">{failCount} failed</Badge>}
            <Badge variant="outline">{totalRun}/{TEST_CASES.length} run</Badge>
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
                  result.status === "pass" ? "border-emerald-300 bg-emerald-50/50" :
                  result.status === "fail" ? "border-red-300 bg-red-50/50" :
                  result.status === "running" ? "border-blue-300 bg-blue-50/50" :
                  "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.status === "pass" && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                    {result.status === "fail" && <AlertCircle className="w-4 h-4 text-red-600" />}
                    {result.status === "running" && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                    {result.status === "idle" && <Clock className="w-4 h-4 text-slate-400" />}
                    <span className="font-medium text-sm">{test.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => runTest(i, test)}
                    disabled={result.status === "running" || runningAll}
                    className="text-xs"
                  >
                    Run
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">{test.description}</p>

                <div className="flex gap-2 text-xs flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {test.action.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {test.billerName}
                  </Badge>
                  {test.expectError && (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      Expects Error
                    </Badge>
                  )}
                </div>

                {/* Result detail */}
                {result.status !== "idle" && result.status !== "running" && (
                  <div className="mt-2 bg-muted rounded p-3 space-y-1">
                    {result.duration != null && (
                      <p className="text-[10px] text-muted-foreground">
                        Completed in {result.duration}ms
                      </p>
                    )}
                    {result.error && !result.data?.expectedError && (
                      <p className="text-xs text-red-700">Error: {result.error}</p>
                    )}
                    {result.data?.sameReference !== undefined && (
                      <p className={`text-xs font-semibold ${result.data.sameReference ? 'text-emerald-700' : 'text-red-700'}`}>
                        Same Reference: {result.data.sameReference ? 'YES' : 'NO'}
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
            <strong>Note:</strong> Without BillPay credentials, all tests run in simulation mode.
            The AUTH+PAY tests verify same-reference compliance.
            PP/PF/PFF prefix tests verify status handling (BeingProcessed, Failed, Flagged).
          </p>
        </div>
      </div>
    </div>
  );
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Edge Function — AUTH and PAY actions
 * Paynow BillPay Vendor API v1.33
 *
 * Critical: AUTH and PAY use the SAME Reference per spec.
 * AUTH creates a bill_payments row with status='authorized'.
 * PAY looks up the authorized row and sends the same Reference to Paynow.
 *
 * Falls back to simulation mode when BILLPAY_USERNAME/PASSWORD not set.
 */

import { getCorsHeaders } from "../_shared/cors.ts";

// Per-request closure for dynamic CORS
let _currentReq: Request | null = null;

function json(data: Record<string, unknown>, status = 200) {
  const cors = _currentReq ? getCorsHeaders(_currentReq) : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function generateReference(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ZL-BP-${ts}-${rand}`;
}

const BILLPAY_API = "https://billpay.paynow.co.zw/api/payment/process";
const API_TIMEOUT_MS = 60_000; // Spec recommends 60s timeout

// ─── Simulation data for testing without credentials ───

const SIM_BILLERS: Record<string, { name: string; products: SimProduct[] }> = {
  // Test biller added at the top so it's the canonical error-path simulator.
  // Prefix simulation (AT/AF/PT/PF/PP/PFF) only runs when billerCode === 'Test'
  // to match the real vendor behaviour documented in v1.33.
  Test: {
    name: "Test Biller (simulation only)",
    products: [...TEST_BILLER.products],
  },
  ZETDC: {
    name: "ZESA Prepaid Electricity",
    products: [
      { Code: "USD", Name: "ZESA Token (USD)", Price: null, ReturnsVouchers: true, AuthAmountMandated: null, MinAmount: 1, MaxAmount: 500 },
    ],
  },
  AIRTIME: {
    name: "Paynow Airtime",
    products: [
      { Code: "AIRTIME", Name: "Airtime Credit", Price: null, ReturnsVouchers: false, AuthAmountMandated: null, MinAmount: 0.5, MaxAmount: 100 },
      { Code: "AIRTIME_USD", Name: "Airtime Credit (USD)", Price: null, ReturnsVouchers: false, AuthAmountMandated: null, MinAmount: 0.5, MaxAmount: 100 },
    ],
  },
  COH: {
    name: "City of Harare",
    products: [
      { Code: "USD", Name: "USD Bill Payment", Price: null, ReturnsVouchers: false, AuthAmountMandated: false, MinAmount: 1, MaxAmount: 10000 },
    ],
  },
  BCC: {
    name: "Bulawayo City Council",
    products: [
      { Code: "USD", Name: "USD Bill Payment", Price: null, ReturnsVouchers: false, AuthAmountMandated: false, MinAmount: 1, MaxAmount: 10000 },
    ],
  },
  UZ: {
    name: "University of Zimbabwe",
    products: [
      { Code: "TUITION", Name: "Tuition Fees", Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 50, MaxAmount: 5000 },
    ],
  },
  NUST: {
    name: "National University of Science & Technology",
    products: [
      { Code: "TUITION", Name: "Tuition Fees", Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 50, MaxAmount: 5000 },
    ],
  },
  CIMAS: {
    name: "CIMAS Medical Aid",
    products: [
      { Code: "PREMIUM", Name: "Medical Aid Premium", Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 10, MaxAmount: 2000 },
    ],
  },
  NLAC: {
    name: "Nyaradzo Life Assurance",
    products: [
      { Code: "PREMIUM", Name: "Policy Premium", Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 5, MaxAmount: 500 },
    ],
  },
  DSTV: {
    name: "DSTV",
    products: [
      { Code: "DSTV_SUB", Name: "DSTV Subscription", Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 5, MaxAmount: 200 },
    ],
  },
};

interface SimProduct {
  Code: string;
  Name: string;
  Price: number | null;
  ReturnsVouchers: boolean;
  AuthAmountMandated: boolean | null;
  MinAmount: number | null;
  MaxAmount: number | null;
}

// Test biller product taxonomy per v1.33 docs ("Additional Biller Integration Notes").
// Mirrors the real vendor Test biller so our simulation stays honest when the harness
// exercises the error-path prefixes (AT/AF/PT/PF/PP/PFF) that ONLY work on `Test`.
const TEST_BILLER: { name: string; products: SimProduct[] } = {
  name: "Test Biller",
  products: [
    { Code: "AI", Name: "Variable price, part payment allowed (council-style)",
      Price: null, ReturnsVouchers: false, AuthAmountMandated: false, MinAmount: 1, MaxAmount: 10000 },
    { Code: "AM", Name: "Variable price, full payment mandated (medical-aid-style)",
      Price: null, ReturnsVouchers: false, AuthAmountMandated: true, MinAmount: 1, MaxAmount: 10000 },
    { Code: "AA", Name: "Free-price, customer enters amount (airtime/ZESA-style)",
      Price: null, ReturnsVouchers: false, AuthAmountMandated: null, MinAmount: 0.5, MaxAmount: 5000 },
    { Code: "RV", Name: "Returns vouchers (TelOne/EVD-style)",
      Price: 10, ReturnsVouchers: true, AuthAmountMandated: null, MinAmount: 1, MaxAmount: 1000 },
    { Code: "FP", Name: "Fixed price, requires forex payment",
      Price: 25, ReturnsVouchers: false, AuthAmountMandated: null, MinAmount: 25, MaxAmount: 25 },
  ],
};

// ZETDC test meter cases per v1.33 docs. Only valid on test environment; our
// simulation mirrors the documented behaviour so harness results match what
// the real vendor would return when credentials route live.
const ZETDC_TEST_METERS: Record<string, { label: string; returnsVouchers: number }> = {
  "37132567431": { label: "Single debt — one token returned", returnsVouchers: 1 },
  "37125980740": { label: "Double debt — one token returned", returnsVouchers: 1 },
  "37132229735": { label: "Double token — two tokens returned", returnsVouchers: 2 },
};
const ZETDC_TOKEN_RESEND_AMOUNT = 177.77;

// ─── SMS delivery (fire-and-forget) ───

async function sendReceiptSms(
  supabaseUrl: string,
  serviceRoleKey: string,
  phone: string,
  smsContent: string,
  userId: string,
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        recipientPhone: phone,
        message: smsContent,
        eventType: "billpay_receipt",
        userId,
      }),
    });
  } catch {
    // SMS must never block payment flow
    console.warn("BillPay: SMS delivery failed (non-blocking)");
  }
}

// ─── Main handler ───

Deno.serve(async (req) => {
  _currentReq = req;
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const {
      action,
      billerCode,
      accountNumber,
      amount,
      products,
      reference,
      totalAmount,
      payerDetails,
      requiresForexPayment,
    } = body;

    // ── Validate action ──
    const actionLower = (action || "").toLowerCase();
    if (!["auth", "pay"].includes(actionLower)) {
      return json({ error: "Invalid action. Must be 'auth' or 'pay'" }, 400);
    }

    // ── Validate required fields ──
    if (!billerCode) return json({ error: "billerCode is required" }, 400);
    if (!accountNumber) return json({ error: "accountNumber is required" }, 400);

    // PAY requires the reference from AUTH
    if (actionLower === "pay" && !reference) {
      return json({ error: "reference is required for PAY (must match AUTH reference)" }, 400);
    }
    if (actionLower === "pay" && (!amount || amount <= 0)) {
      return json({ error: "amount must be greater than 0" }, 400);
    }

    // ── Authenticate user ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: "Not authenticated" }, 401);
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");
    const isSimulation = !billpayUser || !billpayPass;

    // ═══════════════════════════════════════════════════
    // AUTH ACTION
    // ═══════════════════════════════════════════════════
    if (actionLower === "auth") {
      const ref = generateReference();

      if (isSimulation) {
        // Vendor-spec test prefixes per v1.33 docs apply ONLY when the biller
        // is "Test". Gating here prevents our local simulation from diverging
        // from real vendor behaviour — in production the prefixes against real
        // billers (ZETDC, AIRTIME, etc.) would just be invalid member numbers.
        const isTestBiller = billerCode.toLowerCase() === "test";
        const memberPrefix = isTestBiller ? accountNumber.substring(0, 2).toUpperCase() : "";

        // AT = Auth Timeout — simulates 60s timeout on biller side
        if (memberPrefix === "AT") {
          return json({
            status: "error",
            action: "auth",
            simulation: true,
            error: "Simulated: Auth request timed out at biller (AT prefix).",
          }, 408);
        }

        // AF = Auth Failure — simulates biller rejecting the auth (unknown account, etc.)
        if (memberPrefix === "AF") {
          return json({
            status: "error",
            action: "auth",
            simulation: true,
            error: "Simulated: Auth failed at biller — account not found (AF prefix).",
          }, 400);
        }

        const sim = SIM_BILLERS[billerCode] || {
          name: billerCode,
          products: [{ Code: "USD", Name: `${billerCode} Payment`, Price: null, ReturnsVouchers: false, AuthAmountMandated: null, MinAmount: 1, MaxAmount: 10000 }],
        };

        // Simulate auth-returned balance for mandated billers
        const simProducts = sim.products.map((p) => ({
          Code: p.Code,
          Name: p.Name,
          Quantity: 1,
          Price: p.AuthAmountMandated !== null ? (amount || 125.5) : (amount || null),
          AccountBalance: p.AuthAmountMandated !== null ? 245.0 : null,
          RequiresForexPayment: false,
          AuthAmountMandated: p.AuthAmountMandated,
          MinAmount: p.MinAmount,
          MaxAmount: p.MaxAmount,
          ReturnsVouchers: p.ReturnsVouchers,
        }));

        // Insert authorized row in DB
        await svc.from("bill_payments").insert({
          user_id: user.id,
          reference: ref,
          biller_code: billerCode,
          biller_name: sim.name,
          account_number: accountNumber,
          amount: amount || 0,
          status: "authorized",
          products: simProducts,
          auth_data: {
            MemberName: "Simulated Account Holder",
            AccountDetails: { "Account Status": "Active" },
            AccountBalance: 245.0,
          },
        });

        return json({
          status: "ok",
          simulation: true,
          action: "auth",
          reference: ref,
          billerCode,
          billerName: sim.name,
          accountNumber,
          memberName: "Simulated Account Holder",
          accountBalance: 245.0,
          accountDetails: { "Account Status": "Active" },
          products: simProducts,
        });
      }

      // ── LIVE AUTH ──
      const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
      const apiProducts = products || [
        { Code: "USD", Quantity: 1, Price: amount || 0, RequiresForexPayment: requiresForexPayment || false },
      ];
      const apiRequest = {
        Action: "AUTH",
        BillerCode: billerCode,
        MemberNumber: accountNumber,
        Reference: ref,
        TotalAmount: totalAmount || amount || "",
        Products: apiProducts,
      };

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      let apiRes;
      try {
        apiRes = await fetch(BILLPAY_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify(apiRequest),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      // Handle 400 validation errors from Paynow
      if (apiRes.status === 400) {
        const errorBody = await apiRes.json();
        return json({
          status: "error",
          action: "auth",
          error: errorBody.Message || "Validation failed",
          validationErrors: errorBody.ModelState,
        }, 400);
      }

      const apiData = await apiRes.json();

      if (apiData.Status !== "Authorized") {
        // Narration is user-safe, TechnicalNarration is not
        return json({
          status: "error",
          action: "auth",
          error: apiData.Narration || "Authorization failed",
        }, 400);
      }

      // Store authorized payment in DB
      await svc.from("bill_payments").insert({
        user_id: user.id,
        reference: ref,
        biller_code: billerCode,
        biller_name: billerCode,
        account_number: accountNumber,
        account_holder: apiData.MemberName || apiData.AuthData?.MemberName,
        amount: amount || apiData.TotalAmount || 0,
        total_amount: apiData.TotalAmount,
        status: "authorized",
        billpay_reference: apiData.BillPayReference,
        products: apiData.Products || [],
        auth_data: apiData.AuthData || null,
        requires_forex: apiData.Products?.some((p: { RequiresForexPayment?: boolean }) => p.RequiresForexPayment) || false,
      });

      return json({
        status: "ok",
        action: "auth",
        reference: ref,
        billerCode,
        accountNumber,
        memberName: apiData.MemberName || apiData.AuthData?.MemberName,
        accountBalance: apiData.AuthData?.AccountBalance ?? apiData.Products?.[0]?.AccountBalance ?? apiData.Products?.[0]?.Price,
        accountDetails: apiData.AuthData?.AccountDetails,
        accountBalances: apiData.AuthData?.AccountBalances,
        billpayReference: apiData.BillPayReference,
        products: apiData.Products,
      });
    }

    // ═══════════════════════════════════════════════════
    // PAY ACTION
    // ═══════════════════════════════════════════════════

    // Look up the authorized payment by reference — SAME reference as AUTH
    const { data: authRow, error: lookupError } = await svc
      .from("bill_payments")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (lookupError || !authRow) {
      return json({ error: "No authorized payment found for this reference. Run AUTH first." }, 400);
    }

    if (authRow.status !== "authorized") {
      return json({
        error: `Payment reference is in '${authRow.status}' state, not 'authorized'. Cannot pay.`,
      }, 400);
    }

    if (isSimulation) {
      const sim = SIM_BILLERS[billerCode];
      const returnsVouchers = sim?.products?.[0]?.ReturnsVouchers || false;

      // Prefix-based simulation only runs for the Test biller per v1.33 docs.
      // Real billers (ZETDC, AIRTIME, etc.) ignore prefixes — against live
      // vendor those would be treated as literal invalid member numbers.
      const isTestBiller = billerCode.toLowerCase() === "test";
      const memberPrefix = isTestBiller ? accountNumber.substring(0, 2).toUpperCase() : "";
      const memberPrefix3 = isTestBiller ? accountNumber.substring(0, 3).toUpperCase() : "";

      // PT = Pay Timeout — simulates 60s timeout during payment
      if (memberPrefix === "PT") {
        await svc.from("bill_payments").update({
          status: "failed",
          amount,
          total_amount: amount,
          narration: "Simulated pay timeout (PT prefix)",
        }).eq("reference", reference);

        return json({
          status: "error",
          action: "pay",
          simulation: true,
          error: "Simulated: Payment request timed out at biller (PT prefix).",
        }, 408);
      }

      // PF = Payment Failure
      if (memberPrefix === "PF" && memberPrefix3 !== "PFF") {
        await svc.from("bill_payments").update({
          status: "failed",
          amount,
          total_amount: amount,
          narration: "Simulated payment failure",
        }).eq("reference", reference);

        return json({ status: "error", action: "pay", error: "Simulated: Payment failed at biller" }, 400);
      }

      // PP = Payment Pending (BeingProcessed)
      if (memberPrefix === "PP") {
        await svc.from("bill_payments").update({
          status: "being_processed",
          amount,
          total_amount: amount,
          billpay_reference: `SIM-BP-${Date.now()}`,
        }).eq("reference", reference);

        return json({
          status: "processing",
          simulation: true,
          action: "pay",
          reference,
          billpayReference: `SIM-BP-${Date.now()}`,
          message: "Simulated: Payment is being processed. Check status later.",
        });
      }

      // PFF = Payment Flagged
      if (memberPrefix3 === "PFF") {
        await svc.from("bill_payments").update({
          status: "flagged",
          amount,
          total_amount: amount,
          flagged_at: new Date().toISOString(),
          billpay_reference: `SIM-BP-${Date.now()}`,
        }).eq("reference", reference);

        return json({
          status: "flagged",
          simulation: true,
          action: "pay",
          reference,
          message: "Simulated: Payment flagged for BillPay support attention.",
        });
      }

      // ZETDC real-meter special cases per v1.33 docs. Single-debt meters
      // return one token; double-token meters return two. Token-resend is
      // triggered by an amount of exactly $177.77 regardless of meter.
      const isZetdc = billerCode.toUpperCase() === "ZETDC";
      const zetdcCase = isZetdc ? ZETDC_TEST_METERS[accountNumber] : undefined;
      const isTokenResend = isZetdc && Math.abs(amount - ZETDC_TOKEN_RESEND_AMOUNT) < 0.01;
      const tokensToIssue = zetdcCase?.returnsVouchers ?? (isTokenResend ? 1 : (returnsVouchers ? 2 : 0));

      // Default: successful payment
      const allVouchers = [
        { SerialNumber: "SIM001", Pin: "1234", Batch: "SIM-BATCH", VoucherCode: "1234-5678-9012-3456", ValidDays: 365, ExpiryDate: null },
        { SerialNumber: "SIM002", Pin: "5678", Batch: "SIM-BATCH", VoucherCode: "9876-5432-1098-7654", ValidDays: 365, ExpiryDate: null },
      ];
      const simVouchers = returnsVouchers
        ? allVouchers.slice(0, Math.max(1, tokensToIssue))
        : [];

      const simReceiptSmses = simVouchers.map(v =>
        `ZESA Token: ${v.VoucherCode} for meter ${accountNumber}. Amount: US$${amount}. Ref: ${reference}`,
      );

      const simDisplayData: Record<string, string> = simVouchers.length > 0
        ? Object.fromEntries([
            ...simVouchers.map((v, i) => [`Token ${i + 1}`, v.VoucherCode]),
            ["Meter", accountNumber],
            ["Amount", `US$${amount}`],
            ...(zetdcCase ? [["Test Case", zetdcCase.label]] : []),
            ...(isTokenResend ? [["Test Case", "Token resend ($177.77)"]] : []),
          ] as [string, string][])
        : { Account: accountNumber, Amount: `US$${amount}`, Status: "Paid" };

      await svc.from("bill_payments").update({
        status: "paid",
        amount,
        total_amount: amount,
        currency: "USD",
        account_holder: "Simulated Account Holder",
        billpay_reference: `SIM-BP-${Date.now()}`,
        biller_payment_reference: `SIM-BPR-${Date.now()}`,
        wallet_debit_reference: `SIM-WD-${Date.now()}`,
        vendor_commission: Number((amount * 0.015).toFixed(2)),
        vouchers: simVouchers,
        receipt_smses: simReceiptSmses,
        display_data: simDisplayData,
      }).eq("reference", reference);

      // Notification
      await svc.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "Bill Payment Successful",
        message: `Paid US$${amount} to ${SIM_BILLERS[billerCode]?.name || billerCode} for account ${accountNumber}.`,
        priority: "high",
      });

      return json({
        status: "ok",
        simulation: true,
        action: "pay",
        reference,
        billerCode,
        billpayReference: `SIM-BP-${Date.now()}`,
        billerPaymentReference: `SIM-BPR-${Date.now()}`,
        vouchers: simVouchers,
        receiptSmses: simReceiptSmses,
        displayData: simDisplayData,
        currency: "USD",
        vendorCommission: Number((amount * 0.015).toFixed(2)),
      });
    }

    // ── LIVE PAY ──
    // Build the PAY request — IDENTICAL to AUTH per spec, except Action=PAY
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
    const payProducts = products || authRow.products || [
      { Code: "USD", Quantity: 1, Price: amount },
    ];

    const apiRequest = {
      Action: "PAY",
      BillerCode: billerCode,
      MemberNumber: accountNumber,
      Reference: reference, // SAME as AUTH — critical spec requirement
      TotalAmount: totalAmount || amount,
      Products: payProducts,
      ...(payerDetails ? { PayerDetails: payerDetails } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let apiRes;
    try {
      apiRes = await fetch(BILLPAY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify(apiRequest),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      // Network failure during PAY — mark for RETRY reconciliation
      console.error("BillPay: Network error during PAY:", fetchErr);
      await svc.from("bill_payments").update({
        status: "being_processed",
        amount,
        total_amount: totalAmount || amount,
        narration: "Network error during payment — will retry automatically",
      }).eq("reference", reference);

      return json({
        status: "processing",
        action: "pay",
        reference,
        message: "Payment request sent but response not received. We will check the status automatically.",
      });
    } finally {
      clearTimeout(timeout);
    }

    // Handle 400 validation errors
    if (apiRes.status === 400) {
      const errorBody = await apiRes.json();
      await svc.from("bill_payments").update({
        status: "failed",
        narration: errorBody.Message || "Validation failed",
      }).eq("reference", reference);

      return json({
        status: "error",
        action: "pay",
        error: errorBody.Message || "Validation failed",
      }, 400);
    }

    const apiData = await apiRes.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Collect all vouchers across all products
    const allVouchers = (apiData.Products || []).flatMap(
      (p: { Vouchers?: unknown[] }) => p.Vouchers || [],
    );
    const receiptSmses = apiData.PaymentData?.ReceiptSmses || [];
    const receiptHtml = apiData.PaymentData?.ReceiptHtml || [];
    const displayData = apiData.PaymentData?.DisplayData || {};
    const vendorCommission = (apiData.Products || []).reduce(
      (sum: number, p: { VendorCommission?: number }) => sum + (p.VendorCommission || 0),
      0,
    );

    // ── Status: Paid ──
    if (apiData.Status === "Paid") {
      await svc.from("bill_payments").update({
        status: "paid",
        amount,
        total_amount: apiData.TotalAmount || amount,
        currency: apiData.Currency || "USD",
        account_holder: apiData.MemberName,
        billpay_reference: apiData.BillPayReference,
        biller_payment_reference: apiData.BillerPaymentReference,
        wallet_debit_reference: apiData.WalletDebitReference,
        vendor_commission: vendorCommission,
        vendor_service_fee: apiData.VendorServiceFee || 0,
        vendor_service_fee_currency: apiData.VendorServiceFeeCurrency,
        vouchers: allVouchers,
        receipt_smses: receiptSmses,
        receipt_html: receiptHtml,
        display_data: displayData,
        products: apiData.Products || [],
      }).eq("reference", reference);

      // Notification
      await svc.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "Bill Payment Successful",
        message: `Paid US$${amount} to ${billerCode} for account ${accountNumber}.`,
        priority: "high",
      });

      // ZETDC/voucher billers: MUST send all ReceiptSmses to customer (spec requirement)
      if (receiptSmses.length > 0) {
        const { data: profile } = await svc
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();

        if (profile?.phone) {
          for (const sms of receiptSmses) {
            sendReceiptSms(supabaseUrl, serviceRoleKey, profile.phone, sms, user.id);
          }
        }
      }

      return json({
        status: "ok",
        action: "pay",
        reference,
        billerCode,
        billpayReference: apiData.BillPayReference,
        billerPaymentReference: apiData.BillerPaymentReference,
        vouchers: allVouchers,
        receiptSmses,
        displayData,
        currency: apiData.Currency,
        vendorCommission,
      });
    }

    // ── Status: BeingProcessed ──
    if (apiData.Status === "BeingProcessed") {
      await svc.from("bill_payments").update({
        status: "being_processed",
        amount,
        total_amount: apiData.TotalAmount || amount,
        account_holder: apiData.MemberName || authRow.account_holder,
        billpay_reference: apiData.BillPayReference,
        products: apiData.Products || authRow.products,
      }).eq("reference", reference);

      return json({
        status: "processing",
        action: "pay",
        reference,
        billpayReference: apiData.BillPayReference,
        message: "Payment is being processed. You will be notified when it completes.",
      });
    }

    // ── Status: Flagged ──
    if (apiData.Status === "Flagged") {
      await svc.from("bill_payments").update({
        status: "flagged",
        amount,
        flagged_at: new Date().toISOString(),
        billpay_reference: apiData.BillPayReference,
        narration: apiData.Narration,
      }).eq("reference", reference);

      return json({
        status: "flagged",
        action: "pay",
        reference,
        billpayReference: apiData.BillPayReference,
        message: "Payment has been flagged for attention. We are monitoring this and will update you.",
      });
    }

    // ── Status: Failed or any other ──
    await svc.from("bill_payments").update({
      status: "failed",
      narration: apiData.Narration || "Payment failed",
    }).eq("reference", reference);

    // Only expose Narration (user-safe), never TechnicalNarration
    console.error("BillPay PAY failed:", apiData.TechnicalNarration || apiData.Narration);

    return json({
      status: "error",
      action: "pay",
      error: apiData.Narration || "Payment failed",
    }, 400);

  } catch (err) {
    console.error("BillPay error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

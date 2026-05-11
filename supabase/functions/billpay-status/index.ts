import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Status & Retry Edge Function
 * Paynow BillPay Vendor API v1.33
 *
 * STATUS: Check payment status for BeingProcessed/Flagged payments
 * RETRY:  Retry a payment after network timeout during PAY
 *
 * Polling intervals per spec:
 *   First STATUS inquiry: 120 seconds after PAY
 *   Subsequent inquiries: 180 second intervals
 *   Flagged payments: 600 second intervals
 */

import { getCorsHeaders } from "../_shared/cors.ts";

let _currentReq: Request | null = null;

function json(data: Record<string, unknown>, status = 200) {
  const cors = _currentReq ? getCorsHeaders(_currentReq) : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const BILLPAY_API_BASE = (Deno.env.get("BILLPAY_API_BASE_URL") ?? "https://billpay.paynow.co.zw").replace(/\/$/, "");
const BILLPAY_API = `${BILLPAY_API_BASE}/api/payment/process`;
const API_TIMEOUT_MS = 60_000;

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
    const { reference, action } = body || {};
    const actionType = (action || "status").toLowerCase();

    if (!reference) return json({ error: "reference is required" }, 400);
    if (!["status", "retry"].includes(actionType)) {
      return json({ error: "action must be 'status' or 'retry'" }, 400);
    }

    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up payment
    const { data: payment, error: lookupError } = await svc
      .from("bill_payments")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (lookupError || !payment) {
      return json({ error: "Payment not found" }, 404);
    }

    // Only check status for non-terminal payments
    const terminalStatuses = ["paid", "failed", "reversed"];
    if (terminalStatuses.includes(payment.status)) {
      return json({
        status: payment.status,
        action: "status",
        reference,
        billerCode: payment.biller_code,
        accountNumber: payment.account_number,
        accountHolder: payment.account_holder,
        amount: payment.amount,
        vouchers: payment.vouchers,
        receiptSmses: payment.receipt_smses,
        displayData: payment.display_data,
        currency: payment.currency,
        message: `Payment is already in terminal state: ${payment.status}`,
      });
    }

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");

    // ── Simulation mode ──
    if (!billpayUser || !billpayPass) {
      // Simulate: after 3 status checks, transition to paid
      const checkCount = (payment.status_check_count || 0) + 1;

      if (checkCount >= 3) {
        const simVouchers = payment.biller_code === "ZETDC"
          ? [{ SerialNumber: "SIM001", Pin: "1234", Batch: "SIM", VoucherCode: "1234-5678-9012-3456", ValidDays: 365 }]
          : [];

        await svc.from("bill_payments").update({
          status: "paid",
          status_check_count: checkCount,
          last_status_check_at: new Date().toISOString(),
          vouchers: simVouchers,
          display_data: { Account: payment.account_number, Amount: `US$${payment.amount}`, Status: "Paid" },
          vendor_commission: Number((payment.amount * 0.015).toFixed(2)),
        }).eq("reference", reference);

        return json({
          status: "paid",
          simulation: true,
          action: "status",
          reference,
          message: "Simulated: Payment completed after status checks",
          vouchers: simVouchers,
        });
      }

      await svc.from("bill_payments").update({
        status_check_count: checkCount,
        last_status_check_at: new Date().toISOString(),
      }).eq("reference", reference);

      return json({
        status: payment.status,
        simulation: true,
        action: "status",
        reference,
        statusCheckCount: checkCount,
        message: `Simulated: Still processing (check ${checkCount}/3)`,
      });
    }

    // ── LIVE STATUS/RETRY ──
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
    const apiRequest = {
      Reference: reference,
      Action: actionType === "retry" ? "RETRY" : "STATUS",
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
    } catch {
      clearTimeout(timeout);
      await svc.from("bill_payments").update({
        status_check_count: (payment.status_check_count || 0) + 1,
        last_status_check_at: new Date().toISOString(),
      }).eq("reference", reference);

      return json({
        status: payment.status,
        action: actionType,
        reference,
        message: "Status check failed due to network error. Will retry.",
      });
    } finally {
      clearTimeout(timeout);
    }

    const apiData = await apiRes.json();
    const checkCount = (payment.status_check_count || 0) + 1;

    // Collect response data
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

    if (apiData.Status === "Paid") {
      await svc.from("bill_payments").update({
        status: "paid",
        status_check_count: checkCount,
        last_status_check_at: new Date().toISOString(),
        account_holder: apiData.MemberName || payment.account_holder,
        billpay_reference: apiData.BillPayReference,
        biller_payment_reference: apiData.BillerPaymentReference,
        wallet_debit_reference: apiData.WalletDebitReference,
        currency: apiData.Currency || "USD",
        vendor_commission: vendorCommission,
        vendor_service_fee: apiData.VendorServiceFee || 0,
        vouchers: allVouchers,
        receipt_smses: receiptSmses,
        receipt_html: receiptHtml,
        display_data: displayData,
        products: apiData.Products || payment.products,
      }).eq("reference", reference);

      // Notification
      await svc.from("notifications").insert({
        user_id: user.id,
        tenant_id: payment.tenant_id,
        type: "payment",
        title: "Bill Payment Successful",
        message: `Paid US$${payment.amount} to ${payment.biller_code} for account ${payment.account_number}.`,
        priority: "high",
      });

      // Send receipt SMS if available
      if (receiptSmses.length > 0) {
        const { data: profile } = await svc.from("profiles").select("phone").eq("id", user.id).single();
        if (profile?.phone) {
          const smsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`;
          for (const sms of receiptSmses) {
            fetch(smsUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
              body: JSON.stringify({ recipientPhone: profile.phone, message: sms, eventType: "billpay_receipt", userId: user.id }),
            }).catch(() => {});
          }
        }
      }

      return json({
        status: "paid",
        action: "status",
        reference,
        vouchers: allVouchers,
        receiptSmses,
        displayData,
        currency: apiData.Currency,
        vendorCommission,
      });
    }

    if (apiData.Status === "BeingProcessed") {
      await svc.from("bill_payments").update({
        status: "being_processed",
        status_check_count: checkCount,
        last_status_check_at: new Date().toISOString(),
      }).eq("reference", reference);

      return json({
        status: "being_processed",
        action: "status",
        reference,
        statusCheckCount: checkCount,
        message: "Payment is still being processed.",
      });
    }

    if (apiData.Status === "Flagged") {
      await svc.from("bill_payments").update({
        status: "flagged",
        status_check_count: checkCount,
        last_status_check_at: new Date().toISOString(),
        flagged_at: payment.flagged_at || new Date().toISOString(),
        narration: apiData.Narration,
      }).eq("reference", reference);

      return json({
        status: "flagged",
        action: "status",
        reference,
        message: "Payment is flagged for BillPay support attention.",
      });
    }

    if (apiData.Status === "Failed") {
      await svc.from("bill_payments").update({
        status: "failed",
        status_check_count: checkCount,
        last_status_check_at: new Date().toISOString(),
        narration: apiData.Narration,
      }).eq("reference", reference);

      return json({
        status: "failed",
        action: "status",
        reference,
        error: apiData.Narration || "Payment failed",
      });
    }

    // Unexpected status — log and return current state
    console.warn("BillPay: Unexpected status from API:", apiData.Status);
    await svc.from("bill_payments").update({
      status_check_count: checkCount,
      last_status_check_at: new Date().toISOString(),
    }).eq("reference", reference);

    return json({
      status: payment.status,
      action: "status",
      reference,
      message: `Unexpected status: ${apiData.Status}. Will continue monitoring.`,
    });

  } catch (err) {
    console.error("BillPay Status error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

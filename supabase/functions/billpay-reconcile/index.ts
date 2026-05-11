import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Reconcile Cron Function
 * Paynow BillPay Vendor API v1.33
 *
 * Polls BeingProcessed and Flagged payments at spec-defined intervals:
 *   - First STATUS check: 120s after PAY
 *   - Subsequent checks: every 180s
 *   - Flagged payments: every 600s
 *   - After 10+ checks with no resolution: mark as flagged
 *
 * Triggered by pg_cron every 2 minutes.
 * Auth: Bearer CRON_SECRET (same pattern as end-auctions)
 * Uses pg_try_advisory_xact_lock(43) to prevent concurrent execution.
 */

const BILLPAY_API_BASE = (Deno.env.get("BILLPAY_API_BASE_URL") ?? "https://billpay.paynow.co.zw").replace(/\/$/, "");
const BILLPAY_API = `${BILLPAY_API_BASE}/api/payment/process`;
const API_TIMEOUT_MS = 60_000;
const MAX_PER_RUN = 20; // Limit payments per cron run to stay within Edge Function timeout

// Spec intervals in seconds
const FIRST_CHECK_DELAY_S = 120;
const SUBSEQUENT_CHECK_INTERVAL_S = 180;
const FLAGGED_CHECK_INTERVAL_S = 600;
const MAX_CHECKS_BEFORE_FLAG = 10;

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Authenticate with CRON_SECRET
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Advisory lock to prevent concurrent runs (43 = billpay reconcile)
  const { data: lockData } = await svc.rpc("pg_try_advisory_xact_lock" as any, { key: 43 });
  if (!lockData) {
    return json({ message: "Another reconcile run in progress, skipping" });
  }

  const billpayUser = Deno.env.get("BILLPAY_USERNAME");
  const billpayPass = Deno.env.get("BILLPAY_PASSWORD");
  const isSimulation = !billpayUser || !billpayPass;

  const now = new Date();
  const results: { reference: string; oldStatus: string; newStatus: string; action: string }[] = [];

  try {
    // ── Fetch payments needing status checks ──
    const { data: pendingPayments, error: queryError } = await svc
      .from("bill_payments")
      .select("*")
      .in("status", ["being_processed", "flagged"])
      .order("created_at", { ascending: true })
      .limit(MAX_PER_RUN);

    if (queryError || !pendingPayments?.length) {
      return json({
        message: pendingPayments?.length === 0
          ? "No payments to reconcile"
          : "Query error",
        count: 0,
      });
    }

    for (const payment of pendingPayments) {
      const createdAt = new Date(payment.created_at);
      const lastCheck = payment.last_status_check_at ? new Date(payment.last_status_check_at) : null;
      const ageSeconds = (now.getTime() - createdAt.getTime()) / 1000;
      const sinceLastCheck = lastCheck ? (now.getTime() - lastCheck.getTime()) / 1000 : Infinity;
      const checkCount = payment.status_check_count || 0;

      // ── Determine if this payment is due for a check ──
      let shouldCheck = false;

      if (payment.status === "being_processed") {
        if (checkCount === 0 && ageSeconds >= FIRST_CHECK_DELAY_S) {
          shouldCheck = true; // First check at 120s
        } else if (checkCount > 0 && sinceLastCheck >= SUBSEQUENT_CHECK_INTERVAL_S) {
          shouldCheck = true; // Subsequent checks at 180s intervals
        }

        // Escalate to flagged after too many checks
        if (checkCount >= MAX_CHECKS_BEFORE_FLAG) {
          await svc.from("bill_payments").update({
            status: "flagged",
            flagged_at: now.toISOString(),
            narration: "Payment timed out after multiple status checks",
          }).eq("reference", payment.reference);

          results.push({
            reference: payment.reference,
            oldStatus: "being_processed",
            newStatus: "flagged",
            action: "escalated",
          });
          continue;
        }
      }

      if (payment.status === "flagged") {
        if (sinceLastCheck >= FLAGGED_CHECK_INTERVAL_S) {
          shouldCheck = true; // Flagged payments checked at 600s intervals
        }
      }

      if (!shouldCheck) continue;

      // ── Simulation mode ──
      if (isSimulation) {
        // Simulate: resolve after 3 checks
        if (checkCount >= 2) {
          await svc.from("bill_payments").update({
            status: "paid",
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
            display_data: { Account: payment.account_number, Amount: `US$${payment.amount}`, Status: "Paid" },
            vendor_commission: Number((payment.amount * 0.015).toFixed(2)),
          }).eq("reference", payment.reference);

          // Notification
          await svc.from("notifications").insert({
            user_id: payment.user_id,
            tenant_id: payment.tenant_id,
            type: "payment",
            title: "Bill Payment Successful",
            message: `Your US$${payment.amount} payment to ${payment.biller_code} has been confirmed.`,
            priority: "high",
          });

          results.push({
            reference: payment.reference,
            oldStatus: payment.status,
            newStatus: "paid",
            action: "simulated_resolve",
          });
        } else {
          await svc.from("bill_payments").update({
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
          }).eq("reference", payment.reference);

          results.push({
            reference: payment.reference,
            oldStatus: payment.status,
            newStatus: payment.status,
            action: "simulated_check",
          });
        }
        continue;
      }

      // ── LIVE STATUS CHECK ──
      const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const apiRes = await fetch(BILLPAY_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            Reference: payment.reference,
            Action: "STATUS",
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const apiData = await apiRes.json();

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
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
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
          }).eq("reference", payment.reference);

          await svc.from("notifications").insert({
            user_id: payment.user_id,
            tenant_id: payment.tenant_id,
            type: "payment",
            title: "Bill Payment Successful",
            message: `Your US$${payment.amount} payment to ${payment.biller_code} has been confirmed.`,
            priority: "high",
          });

          // Send receipt SMS
          if (receiptSmses.length > 0) {
            const { data: profile } = await svc.from("profiles").select("phone").eq("id", payment.user_id).single();
            if (profile?.phone) {
              const smsUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`;
              for (const sms of receiptSmses) {
                fetch(smsUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
                  body: JSON.stringify({ recipientPhone: profile.phone, message: sms, eventType: "billpay_receipt", userId: payment.user_id }),
                }).catch(() => {});
              }
            }
          }

          results.push({ reference: payment.reference, oldStatus: payment.status, newStatus: "paid", action: "status_check" });
        } else if (apiData.Status === "Failed") {
          await svc.from("bill_payments").update({
            status: "failed",
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
            narration: apiData.Narration,
          }).eq("reference", payment.reference);

          await svc.from("notifications").insert({
            user_id: payment.user_id,
            tenant_id: payment.tenant_id,
            type: "payment",
            title: "Bill Payment Failed",
            message: `Your US$${payment.amount} payment to ${payment.biller_code} has failed. ${apiData.Narration || ""}`,
            priority: "high",
          });

          results.push({ reference: payment.reference, oldStatus: payment.status, newStatus: "failed", action: "status_check" });
        } else if (apiData.Status === "Flagged") {
          await svc.from("bill_payments").update({
            status: "flagged",
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
            flagged_at: payment.flagged_at || now.toISOString(),
          }).eq("reference", payment.reference);

          results.push({ reference: payment.reference, oldStatus: payment.status, newStatus: "flagged", action: "status_check" });
        } else {
          // Still BeingProcessed or unknown — just increment counter
          await svc.from("bill_payments").update({
            status_check_count: checkCount + 1,
            last_status_check_at: now.toISOString(),
          }).eq("reference", payment.reference);

          results.push({ reference: payment.reference, oldStatus: payment.status, newStatus: payment.status, action: "status_check" });
        }
      } catch (fetchErr) {
        clearTimeout(timeout);
        console.warn(`BillPay reconcile: Failed to check ${payment.reference}:`, fetchErr);
        await svc.from("bill_payments").update({
          status_check_count: checkCount + 1,
          last_status_check_at: now.toISOString(),
        }).eq("reference", payment.reference);

        results.push({ reference: payment.reference, oldStatus: payment.status, newStatus: payment.status, action: "network_error" });
      }
    }

    console.log(`BillPay reconcile: Processed ${results.length} payments`, JSON.stringify(results));

    return json({
      message: `Reconciled ${results.length} payments`,
      count: results.length,
      results,
    });

  } catch (err) {
    console.error("BillPay Reconcile error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

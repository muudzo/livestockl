import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BILLPAY_BASE = "https://billpay.paynow.co.zw/api/payment";

/**
 * BillPay Edge Function — handles AUTH and PAY actions
 * Calls Paynow BillPay Vendor API with HTTP Basic Auth
 * Falls back to simulation mode when credentials aren't configured
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, billerCode, accountNumber, amount, products, reference } = await req.json();

    if (!action || !["auth", "pay"].includes(action.toLowerCase())) {
      return jsonResponse({ error: "Invalid action. Must be 'auth' or 'pay'" }, 400);
    }
    if (!billerCode) return jsonResponse({ error: "billerCode is required" }, 400);
    if (!accountNumber) return jsonResponse({ error: "accountNumber is required" }, 400);

    // Verify authenticated user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Not authenticated" }, 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");

    // ─── SIMULATION MODE (no BillPay credentials) ───
    if (!billpayUser || !billpayPass) {
      console.log("BillPay: simulation mode (no credentials configured)");

      if (action.toLowerCase() === "auth") {
        return jsonResponse({
          status: "ok",
          simulation: true,
          action: "auth",
          billerCode,
          accountNumber,
          memberName: "Simulated Account Holder",
          accountBalance: 125.50,
          products: [{ code: "USD", name: `${billerCode} Payment`, price: amount || null }],
        });
      }

      // Simulated PAY
      const ref = reference || `BP-SIM-${Date.now().toString(36).toUpperCase()}`;
      await serviceClient.from("bill_payments").insert({
        user_id: user.id,
        reference: ref,
        biller_code: billerCode,
        biller_name: billerCode,
        account_number: accountNumber,
        account_holder: "Simulated Account Holder",
        amount: amount || 10,
        status: "paid",
        billpay_reference: `SIM-${Date.now()}`,
      });

      return jsonResponse({
        status: "ok",
        simulation: true,
        action: "pay",
        billerCode,
        reference: ref,
        billpayReference: `SIM-${Date.now()}`,
        message: "Simulated payment successful",
      });
    }

    // ─── LIVE MODE ───
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);

    const billpayRequest: Record<string, unknown> = {
      Action: action.toUpperCase(),
      BillerCode: billerCode,
      MemberNumber: accountNumber,
      Reference: reference || `ZL-BP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      TotalAmount: amount || "",
      Products: products || [{ Code: "USD", Quantity: 1, Price: amount || 0 }],
    };

    const billpayRes = await fetch(`${BILLPAY_BASE}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify(billpayRequest),
    });

    const billpayData = await billpayRes.json();

    if (action.toLowerCase() === "auth") {
      if (billpayData.Status === "Authorized") {
        return jsonResponse({
          status: "ok",
          action: "auth",
          billerCode,
          accountNumber,
          memberName: billpayData.MemberName || billpayData.AuthData?.MemberName,
          accountBalance: billpayData.Products?.[0]?.AccountBalance ?? billpayData.Products?.[0]?.Price,
          accountDetails: billpayData.AuthData?.AccountDetails,
          billpayReference: billpayData.BillPayReference,
          products: billpayData.Products,
        });
      }

      return jsonResponse({
        status: "error",
        action: "auth",
        error: billpayData.Narration || billpayData.TechnicalNarration || "Authorization failed",
      }, 400);
    }

    // PAY action
    if (billpayData.Status === "Paid") {
      const ref = billpayRequest.Reference as string;

      await serviceClient.from("bill_payments").insert({
        user_id: user.id,
        reference: ref,
        biller_code: billerCode,
        biller_name: billerCode,
        account_number: accountNumber,
        account_holder: billpayData.MemberName,
        amount,
        status: "paid",
        billpay_reference: billpayData.BillPayReference,
      });

      // Notify user
      await serviceClient.from("notifications").insert({
        user_id: user.id,
        type: "payment",
        title: "Bill Payment Successful",
        message: `Paid US$${amount} to ${billerCode} for account ${accountNumber}.`,
        priority: "high",
      });

      return jsonResponse({
        status: "ok",
        action: "pay",
        billerCode,
        reference: ref,
        billpayReference: billpayData.BillPayReference,
        billerPaymentReference: billpayData.BillerPaymentReference,
        vouchers: billpayData.Products?.[0]?.Vouchers,
        receiptHtml: billpayData.PaymentData?.ReceiptHtml,
        displayData: billpayData.PaymentData?.DisplayData,
        currency: billpayData.Currency,
      });
    }

    if (billpayData.Status === "BeingProcessed") {
      return jsonResponse({
        status: "processing",
        action: "pay",
        message: "Payment is being processed. Check status in 3 minutes.",
        billpayReference: billpayData.BillPayReference,
      });
    }

    return jsonResponse({
      status: "error",
      action: "pay",
      error: billpayData.Narration || billpayData.TechnicalNarration || "Payment failed",
    }, 400);

  } catch (err) {
    console.error("BillPay error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

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

/**
 * Compute Paynow SHA-512 hash for form signing.
 * Concatenates all form values + integration key, then hashes.
 */
async function computePaynowHash(values: Record<string, string>, integrationKey: string): Promise<string> {
  const hashString = Object.values(values).join("") + integrationKey;
  const data = new TextEncoder().encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, amount, livestockTitle, method, phone } = await req.json();

    // Input validation
    if (!reference || typeof reference !== "string") {
      return jsonResponse({ error: "Invalid reference" }, 400);
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return jsonResponse({ error: "Invalid amount" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify payment record exists and amount matches
    const { data: paymentRecord } = await supabase
      .from("payments")
      .select("amount, user_id, livestock_id, method")
      .eq("reference", reference)
      .single();

    if (!paymentRecord || paymentRecord.amount !== amount) {
      return jsonResponse({ error: "Payment record not found or amount mismatch" }, 400);
    }

    // Verify the authenticated user owns this payment
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user: callerUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !callerUser || callerUser.id !== paymentRecord.user_id) {
      return jsonResponse({ error: "Forbidden: you do not own this payment" }, 403);
    }

    // Skip auction validation for test payments
    const isTestPayment = !paymentRecord.livestock_id;

    if (!isTestPayment) {
      // Verify auction win
      const { data: winningBid } = await supabase
        .from("bids")
        .select("amount, livestock_id")
        .eq("user_id", callerUser.id)
        .eq("is_winner", true)
        .eq("livestock_id", paymentRecord.livestock_id)
        .single();

      if (!winningBid) {
        return jsonResponse({ error: "You did not win this auction" }, 403);
      }

      // Verify listing status is 'ended'
      const { data: listing } = await supabase
        .from("livestock_items")
        .select("status")
        .eq("id", winningBid.livestock_id)
        .single();

      if (!listing || listing.status !== "ended") {
        return jsonResponse({ error: "Auction is not in a payable state" }, 400);
      }

      // Server-calculated amount (bid + 5% platform fee)
      const correctAmount = Math.round(winningBid.amount * 1.05);
      if (paymentRecord.amount !== correctAmount) {
        return jsonResponse({ error: "Payment amount mismatch" }, 400);
      }
    }

    const origin = req.headers.get("origin") || "https://zimlivestock.co.zw";
    const paymentMethod = method || paymentRecord.method || "Card";

    // ─── PAYNOW: EcoCash, OneMoney, or Web Checkout ───
    // Since Paynow API is behind Cloudflare (blocks server-to-server calls),
    // we compute the signed hash server-side and return form data for the
    // browser to submit directly to Paynow. This bypasses the blocker.

    if (paymentMethod === "EcoCash" || paymentMethod === "OneMoney" || paymentMethod === "Paynow") {
      const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
      const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
      const resultUrl = Deno.env.get("PAYNOW_RESULT_URL") ||
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;
      const returnUrl = `${origin}/payment-status/${reference}?method=${paymentMethod.toLowerCase()}&amount=${amount}`;

      if (!integrationId || !integrationKey) {
        return jsonResponse({ error: "Paynow credentials not configured" }, 503);
      }

      // Build form values in the exact order Paynow expects
      const formValues: Record<string, string> = {
        id: integrationId,
        reference,
        amount: amount.toFixed(2),
        additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
        returnurl: returnUrl,
        resulturl: resultUrl,
        authemail: callerUser.email || "",
        status: "Message",
      };

      // Add phone for mobile money express checkout
      if ((paymentMethod === "EcoCash" || paymentMethod === "OneMoney") && phone) {
        formValues.phone = phone;
        formValues.method = paymentMethod.toLowerCase() === "ecocash" ? "ecocash" : "onemoney";
      }

      formValues.hash = await computePaynowHash(formValues, integrationKey);

      // Update payment record with Paynow tracking
      await supabase
        .from("payments")
        .update({ status: "pending" })
        .eq("reference", reference);

      // Return signed form data — browser submits directly to Paynow
      return jsonResponse({
        status: "ok",
        provider: "paynow",
        paymentMethod,
        // For web checkout: browser submits this form
        formAction: "https://www.paynow.co.zw/interface/initiatetransaction",
        formFields: formValues,
        // For express checkout (EcoCash/OneMoney): browser POSTs to remotetransaction
        ...(phone && {
          expressAction: "https://www.paynow.co.zw/interface/remotetransaction",
        }),
        reference,
        returnUrl,
      });
    }

    // ─── STRIPE: Card payments (fallback / diaspora buyers) ───

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return jsonResponse({ error: "Card payment provider not configured" }, 503);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: livestockTitle || "Livestock Purchase",
              description: `Reference: ${reference}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        reference,
        livestock_id: paymentRecord.livestock_id,
        user_id: callerUser.id,
      },
      customer_email: callerUser.email,
      success_url: `${origin}/payment-status/${reference}?method=card&amount=${amount}&stripe_status=success`,
      cancel_url: `${origin}/payment-status/${reference}?method=card&amount=${amount}&stripe_status=cancelled`,
    });

    await supabase
      .from("payments")
      .update({ paynow_reference: session.id, status: "pending" })
      .eq("reference", reference);

    return jsonResponse({
      status: "ok",
      provider: "stripe",
      paymentMethod: "Card",
      redirectUrl: session.url,
      sessionId: session.id,
      reference,
    });
  } catch (err) {
    console.error("Payment initiation error:", err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});

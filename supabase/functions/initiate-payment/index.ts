import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";
import { createLogger } from "../_shared/logger.ts";
import { amountMatches, platformTotal } from "../_shared/money.ts";

// Paynow sits behind Cloudflare and is known to hang (not cleanly error) under
// some network conditions. Bound every call so a stalled upstream can't pin the
// synchronous checkout request to the edge wall-clock limit; the existing
// try/catch fallbacks treat the AbortError like any other Paynow failure.
const PAYNOW_TIMEOUT_MS = 12_000;
async function fetchWithTimeout(url: string, init: RequestInit, ms = PAYNOW_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ALLOWED_ORIGIN is a comma-separated list of allowed browser origins for
// CORS on this user-facing payment endpoint. Previous behaviour fell back to
// "*" if the env var was unset, which means a production misconfiguration
// silently opened the endpoint to any origin. That's now a hard failure.
const allowedOriginsEnv = Deno.env.get("ALLOWED_ORIGIN") || "";
const allowedOrigins = allowedOriginsEnv
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function pickAllowedOrigin(req: Request): string | null {
  // If nothing configured, refuse to answer CORS at all.
  if (allowedOrigins.length === 0) return null;
  const origin = req.headers.get("origin");
  if (!origin) {
    // Server-to-server / curl: reflect first allowed origin so CORS header
    // is present but real browsers won't spoof Origin header.
    return allowedOrigins[0];
  }
  return allowedOrigins.includes(origin) ? origin : null;
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = pickAllowedOrigin(req);
  return {
    "Access-Control-Allow-Origin": origin ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function isOriginAllowed(req: Request): boolean {
  return pickAllowedOrigin(req) !== null;
}

// jsonResponse requires the incoming request to derive the allowed Origin.
// Using a closure-captured req so we don't need to thread it through every call.
let _currentReq: Request | null = null;
function jsonResponse(data: Record<string, unknown>, status = 200) {
  const cors = _currentReq ? buildCorsHeaders(_currentReq) : { "Content-Type": "application/json" };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
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
  _currentReq = req;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: buildCorsHeaders(req) });
  }

  if (!isOriginAllowed(req)) {
    // Deliberate: no CORS headers on rejection. A misconfigured (missing env)
    // or hostile-origin request just gets a plain 403.
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const log = createLogger('initiate-payment', req);

  try {
    // Parse body with its own guard — malformed JSON should be a 400,
    // not the 500 the outer catch would return.
    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { reference, amount, livestockTitle, method, phone } = body || {};

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
      .select("amount, user_id, livestock_id, method, transport_request_id, transport_fee")
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

      // Amount-match guard — delegates to _shared/money.ts so the penny-bid
      // regression (c8b9a3a) can't sneak back in. Unit-tested at
      // _shared/money_test.ts. Transport fee is additive and validated here.
      const transportFee = Number(paymentRecord.transport_fee ?? 0);
      if (!amountMatches(paymentRecord.amount, winningBid.amount, transportFee)) {
        return jsonResponse({
          error: "Payment amount mismatch",
          expected: Number((platformTotal(winningBid.amount) + transportFee).toFixed(2)),
          bidAmount: winningBid.amount,
          transportFee,
          submitted: paymentRecord.amount,
        }, 400);
      }
    }

    const origin = req.headers.get("origin") || "https://zimlivestock.co.zw";
    const paymentMethod = method || paymentRecord.method || "Card";

    // ─── PAYNOW: EcoCash, OneMoney, or Web Checkout ───

    if (paymentMethod === "EcoCash" || paymentMethod === "OneMoney" || paymentMethod === "Paynow") {
      const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
      const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
      const resultUrl = Deno.env.get("PAYNOW_RESULT_URL") ||
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`;
      const returnUrl = `${origin}/payment-status/${reference}?method=${paymentMethod.toLowerCase()}&amount=${amount}`;

      if (!integrationId || !integrationKey) {
        return jsonResponse({ error: "Paynow credentials not configured" }, 503);
      }

      const isMobile = (paymentMethod === "EcoCash" || paymentMethod === "OneMoney") && phone;

      // ─── EXPRESS CHECKOUT: EcoCash/OneMoney with phone (USSD prompt) ───
      if (isMobile) {
        const mobileValues: Record<string, string> = {
          id: integrationId,
          reference,
          amount: amount.toFixed(2),
          additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
          authemail: Deno.env.get("PAYNOW_MERCHANT_EMAIL") || callerUser.email || "",
          phone: phone,
          method: paymentMethod.toLowerCase() === "ecocash" ? "ecocash" : "onemoney",
          resulturl: resultUrl,
          returnurl: returnUrl,
          status: "Message",
        };

        mobileValues.hash = await computePaynowHash(mobileValues, integrationKey);

        try {
          const formBody = Object.entries(mobileValues)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join("&");

          const paynowRes = await fetchWithTimeout("https://www.paynow.co.zw/interface/remotetransaction", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody,
          });

          const paynowBody = await paynowRes.text();
          const paynowParams: Record<string, string> = {};
          for (const pair of paynowBody.split("&")) {
            const [key, ...rest] = pair.split("=");
            paynowParams[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
          }

          log.info("Paynow express checkout response", { reference, paymentMethod, paynowStatus: paynowParams.status, pollUrl: paynowParams.pollurl });

          if (paynowParams.status?.toLowerCase() === "ok" || paynowParams.status?.toLowerCase() === "sent") {
            await supabase
              .from("payments")
              .update({
                status: "pending",
                paynow_reference: paynowParams.pollurl || "",
              })
              .eq("reference", reference);

            // Express checkout: no redirect needed — USSD sent to phone
            // Frontend should navigate to payment-status page and poll
            return jsonResponse({
              status: "ok",
              provider: "paynow",
              paymentMethod,
              instructions: paynowParams.instructions || `A USSD prompt has been sent to ${phone}. Approve the payment on your phone.`,
              pollUrl: paynowParams.pollurl,
              reference,
              // If Paynow returns a browserurl, provide it as fallback
              ...(paynowParams.browserurl && { redirectUrl: paynowParams.browserurl }),
            });
          }

          const mobileError = paynowParams.error || paynowBody;
          log.error("Paynow express checkout error", { reference, paymentMethod, error: mobileError });

          // Terminal user errors should NOT fall through to web checkout —
          // e.g. insufficient balance on the mobile wallet will just hit
          // the same error again and users see a confusing redirect.
          // Surface these directly with a clean message.
          const lowerErr = mobileError.toLowerCase();
          const isUserTerminal =
            lowerErr.includes("insufficient") ||
            lowerErr.includes("balance") ||
            lowerErr.includes("not enough") ||
            lowerErr.includes("subscriber") ||
            lowerErr.includes("invalid phone") ||
            lowerErr.includes("invalid number") ||
            lowerErr.includes("suspended") ||
            lowerErr.includes("blocked");

          if (isUserTerminal) {
            // Mark payment failed so the client can retry cleanly
            await supabase
              .from("payments")
              .update({ status: "failed" })
              .eq("reference", reference)
              .eq("status", "pending");

            const userMessage = lowerErr.includes("insufficient") || lowerErr.includes("balance") || lowerErr.includes("not enough")
              ? `Insufficient balance on your ${paymentMethod} wallet. Please top up and try again.`
              : lowerErr.includes("invalid phone") || lowerErr.includes("invalid number") || lowerErr.includes("subscriber")
              ? `This number isn't registered for ${paymentMethod}. Check the number or try card payment.`
              : lowerErr.includes("suspended") || lowerErr.includes("blocked")
              ? `Your ${paymentMethod} wallet appears suspended. Contact ${paymentMethod} support.`
              : `${paymentMethod} payment declined: ${mobileError}`;

            return jsonResponse({
              error: userMessage,
              code: "paynow_user_terminal",
              reference,
            }, 402);
          }
          // Non-terminal provider error — fall through to web checkout as a last resort
        } catch (fetchErr) {
          log.error("Paynow express checkout failed", { reference, paymentMethod, error: (fetchErr as Error).message });
          // Fall through to web checkout
        }
      }

      // ─── WEB CHECKOUT: Redirect to Paynow hosted page ───
      const formValues: Record<string, string> = {
        id: integrationId,
        reference,
        amount: amount.toFixed(2),
        additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
        returnurl: returnUrl,
        resulturl: resultUrl,
        authemail: Deno.env.get("PAYNOW_MERCHANT_EMAIL") || callerUser.email || "",
        status: "Message",
      };

      formValues.hash = await computePaynowHash(formValues, integrationKey);

      // Try calling Paynow web checkout directly
      try {
        const formBody = Object.entries(formValues)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join("&");

        const paynowRes = await fetchWithTimeout("https://www.paynow.co.zw/interface/initiatetransaction", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody,
        });

        const paynowBody = await paynowRes.text();
        const paynowParams: Record<string, string> = {};
        for (const pair of paynowBody.split("&")) {
          const [key, ...rest] = pair.split("=");
          paynowParams[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
        }

        if (paynowParams.status?.toLowerCase() === "ok" && paynowParams.browserurl) {
          await supabase
            .from("payments")
            .update({
              status: "pending",
              paynow_reference: paynowParams.pollurl || "",
            })
            .eq("reference", reference);

          return jsonResponse({
            status: "ok",
            provider: "paynow",
            paymentMethod,
            redirectUrl: paynowParams.browserurl,
            pollUrl: paynowParams.pollurl,
            reference,
          });
        }

        // Paynow returned an error
        const paynowError = paynowParams.error || paynowBody;
        log.error("Paynow web checkout API error", { reference, paymentMethod, error: paynowError });

        // Fall through to browser form submission as backup
      } catch (fetchErr) {
        // Cloudflare block or network error — fall back to browser form submission
        log.error("Paynow direct call failed (likely Cloudflare)", { reference, paymentMethod, error: (fetchErr as Error).message });
      }

      // FALLBACK: Return signed form data for browser to submit directly
      await supabase
        .from("payments")
        .update({ status: "pending" })
        .eq("reference", reference);

      // If mobile payment, return express checkout fields so browser calls remotetransaction
      if (isMobile) {
        const mobileValues: Record<string, string> = {
          id: integrationId,
          reference,
          amount: amount.toFixed(2),
          additionalinfo: `${livestockTitle || "Livestock Purchase"} — ${reference}`,
          authemail: Deno.env.get("PAYNOW_MERCHANT_EMAIL") || callerUser.email || "",
          phone: phone,
          method: paymentMethod.toLowerCase() === "ecocash" ? "ecocash" : "onemoney",
          resulturl: resultUrl,
          returnurl: returnUrl,
          status: "Message",
        };
        mobileValues.hash = await computePaynowHash(mobileValues, integrationKey);

        return jsonResponse({
          status: "ok",
          provider: "paynow",
          paymentMethod,
          formFields: mobileValues,
          reference,
          returnUrl,
        });
      }

      return jsonResponse({
        status: "ok",
        provider: "paynow",
        paymentMethod,
        formFields: formValues,
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

    const stripeTransportFee = Number(paymentRecord.transport_fee ?? 0);
    const stripeLineItems: Parameters<typeof stripe.checkout.sessions.create>[0]["line_items"] = [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round((amount - stripeTransportFee) * 100),
          product_data: {
            name: livestockTitle || "Livestock Purchase",
            description: `Reference: ${reference}`,
          },
        },
        quantity: 1,
      },
    ];
    if (stripeTransportFee > 0) {
      stripeLineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: Math.round(stripeTransportFee * 100),
          product_data: {
            name: "Transport / Delivery",
            description: `Reference: ${reference}`,
          },
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: stripeLineItems,
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
    log.error("Payment initiation error", { error: (err as Error).message, stack: (err as Error).stack });
    return jsonResponse({ error: "Payment initiation failed" }, 500);
  }
});

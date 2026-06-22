import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

import { getCorsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { amount, email, origin } = await req.json();

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reference = `ZL-TEST-${Date.now().toString(36)}`.toUpperCase();
    const returnOrigin = origin || req.headers.get("origin") || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: "Test Livestock Purchase",
              description: `Stripe DX Benchmark — Reference: ${reference}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { reference, test: "true" },
      customer_email: email || undefined,
      success_url: `${returnOrigin}/payment-status/${reference}?stripe_status=success&amount=${amount}`,
      cancel_url: `${returnOrigin}/payment-status/${reference}?stripe_status=cancelled&amount=${amount}`,
    });

    return new Response(
      JSON.stringify({
        status: "ok",
        redirectUrl: session.url,
        sessionId: session.id,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Test Stripe error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

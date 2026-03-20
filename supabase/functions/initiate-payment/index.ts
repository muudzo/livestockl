import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://zimlivestock.co.zw",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, amount, livestockTitle } = await req.json();

    // Input validation
    if (!reference || typeof reference !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the payment record exists and amount matches
    const verifyClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: paymentRecord } = await verifyClient
      .from("payments")
      .select("amount, user_id, livestock_id")
      .eq("reference", reference)
      .single();

    if (!paymentRecord || paymentRecord.amount !== amount) {
      return new Response(
        JSON.stringify({ error: "Payment record not found or amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user owns this payment
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user: callerUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !callerUser || callerUser.id !== paymentRecord.user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you do not own this payment" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip auction validation for test payments (no livestock_id)
    const isTestPayment = !paymentRecord.livestock_id;

    if (!isTestPayment) {
      // Verify auction win and calculate correct amount
      const { data: winningBid } = await verifyClient
        .from("bids")
        .select("amount, livestock_id")
        .eq("user_id", callerUser.id)
        .eq("is_winner", true)
        .eq("livestock_id", paymentRecord.livestock_id)
        .single();

      if (!winningBid) {
        return new Response(
          JSON.stringify({ error: "You did not win this auction" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify listing status is 'ended'
      const { data: listing } = await verifyClient
        .from("livestock_items")
        .select("status")
        .eq("id", winningBid.livestock_id)
        .single();

      if (!listing || listing.status !== "ended") {
        return new Response(
          JSON.stringify({ error: "Auction is not in a payable state" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Server-calculated amount (bid + 5% platform fee)
      const correctAmount = Math.round(winningBid.amount * 1.05);
      if (paymentRecord.amount !== correctAmount) {
        return new Response(
          JSON.stringify({ error: "Payment amount mismatch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const origin = req.headers.get("origin") || "https://zimlivestock.co.zw";

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount * 100, // Stripe uses cents
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

    // Update payment record with Stripe session ID
    await verifyClient
      .from("payments")
      .update({
        paynow_reference: session.id, // reuse column for stripe session ID
        status: "pending",
      })
      .eq("reference", reference);

    return new Response(
      JSON.stringify({
        status: "ok",
        redirectUrl: session.url,
        sessionId: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Stripe session error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

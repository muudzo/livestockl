import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://zimlivestock.co.zw",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

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

      const correctAmount = Math.round(winningBid.amount * 1.05);
      if (paymentRecord.amount !== correctAmount) {
        return new Response(
          JSON.stringify({ error: "Payment amount mismatch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const origin = req.headers.get("origin") || "https://zimlivestock.co.zw";

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: callerUser.email,
        amount: amount * 100, // Paystack uses kobo/cents
        reference,
        callback_url: `${origin}/payment-status/${reference}?method=card&amount=${amount}`,
        metadata: {
          livestock_title: livestockTitle || "Livestock Purchase",
          livestock_id: paymentRecord.livestock_id,
          user_id: callerUser.id,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      return new Response(
        JSON.stringify({ error: paystackData.message || "Paystack initialization failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update payment record with Paystack access code
    await verifyClient
      .from("payments")
      .update({
        paynow_reference: paystackData.data.access_code,
        status: "pending",
      })
      .eq("reference", reference);

    return new Response(
      JSON.stringify({
        status: "ok",
        redirectUrl: paystackData.data.authorization_url,
        accessCode: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Paystack error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

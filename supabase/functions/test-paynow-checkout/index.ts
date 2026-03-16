import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { amount, method, phone } = await req.json();

    if (!amount || !method) {
      return new Response(
        JSON.stringify({ error: "amount and method are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reference = `ZL-TEST-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

    // Create a test payment record in the DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        reference,
        amount: Number(amount),
        method,
        phone: phone || null,
        status: "pending",
        // Use a dummy user_id and livestock_id for testing
        user_id: "00000000-0000-0000-0000-000000000000",
        livestock_id: "00000000-0000-0000-0000-000000000000",
      });

    // If insert fails due to FK constraints, proceed without DB record
    if (insertError) {
      console.warn("Could not create test payment record:", insertError.message);
    }

    // Call the actual initiate-payment function
    const initiateUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/initiate-payment`;
    const res = await fetch(initiateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ reference, amount: Number(amount), method, phone }),
    });

    const result = await res.json();

    return new Response(
      JSON.stringify({ reference, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

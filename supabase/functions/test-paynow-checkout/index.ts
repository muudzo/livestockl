import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Client-side form submission approach:
 * Instead of the Edge Function calling Paynow (which fails due to
 * connection reset from cloud IPs), we compute the hash server-side
 * and return signed form data. The browser then submits a hidden form
 * directly to Paynow — bypassing the connectivity blocker entirely.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth gate: test endpoint requires CRON_SECRET — must not be public in production
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized — test endpoint" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { amount } = await req.json();

    if (!amount) {
      return new Response(
        JSON.stringify({ error: "amount is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const integrationId = Deno.env.get("PAYNOW_INTEGRATION_ID");
    const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
    const resultUrl = Deno.env.get("PAYNOW_RESULT_URL");
    const returnUrl = Deno.env.get("PAYNOW_RETURN_URL") || "http://localhost:5174/test-paynow?status=returned";

    if (!integrationId || !integrationKey) {
      return new Response(
        JSON.stringify({ error: "Paynow credentials not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const reference = `ZL-TEST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Build the form values in the exact order Paynow expects
    const values: Record<string, string> = {
      id: integrationId,
      reference: reference,
      amount: Number(amount).toFixed(2),
      additionalinfo: "Benchmark test payment",
      returnurl: returnUrl,
      resulturl: resultUrl || "https://hmeieslclzycyjjjflfh.supabase.co/functions/v1/payment-webhook",
      authemail: "test@benchmark.com",
      status: "Message",
    };

    // Compute SHA-512 hash: concatenate all values + integration key
    const hashString = Object.values(values).join("") + integrationKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    values.hash = hash.toUpperCase();

    // Return the signed form data — the browser will submit directly to Paynow
    return new Response(
      JSON.stringify({
        reference,
        formAction: "https://www.paynow.co.zw/interface/initiatetransaction",
        formFields: values,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

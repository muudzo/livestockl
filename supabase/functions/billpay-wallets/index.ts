import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Wallets Edge Function
 * Paynow BillPay Vendor API v1.33
 *
 * GET /api/wallets — returns vendor wallet balances.
 * Wallet statuses: Open (can transact), Suspended (temporary), Closed (permanent).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const WALLETS_URL = "https://billpay.paynow.co.zw/api/wallets";
const API_TIMEOUT_MS = 15_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");

    // ── Simulation mode ──
    if (!billpayUser || !billpayPass) {
      return json({
        simulation: true,
        wallets: [
          { Currency: "USD", Balance: 500.00, LowBalance: 50.00, MinimumBalance: 0.00, Status: "Open" },
          { Currency: "ZWL", Balance: 25000.00, LowBalance: 5000.00, MinimumBalance: 0.00, Status: "Open" },
        ],
      });
    }

    // ── LIVE ──
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let apiRes;
    try {
      apiRes = await fetch(WALLETS_URL, {
        headers: { Authorization: `Basic ${basicAuth}` },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      return json({ error: "BillPay API unreachable" }, 503);
    } finally {
      clearTimeout(timeout);
    }

    const wallets = await apiRes.json();

    return json({ wallets });

  } catch (err) {
    console.error("BillPay Wallets error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

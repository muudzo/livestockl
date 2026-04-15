import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Wallets Edge Function
 * Paynow BillPay Vendor API v1.33
 *
 * GET /api/wallets — returns vendor wallet balances.
 * Wallet statuses: Open (can transact), Suspended (temporary), Closed (permanent).
 */

import { getCorsHeaders } from "../_shared/cors.ts";

let _currentReq: Request | null = null;

function json(data: unknown, status = 200) {
  const cors = _currentReq ? getCorsHeaders(_currentReq) : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const BILLPAY_API_BASE = (Deno.env.get("BILLPAY_API_BASE_URL") ?? "https://billpay.paynow.co.zw").replace(/\/$/, "");
const WALLETS_URL = `${BILLPAY_API_BASE}/api/wallets`;
const API_TIMEOUT_MS = 15_000;

Deno.serve(async (req) => {
  _currentReq = req;
  const corsHeaders = getCorsHeaders(req);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * BillPay Billers Edge Function
 * Paynow BillPay Vendor API v1.33
 *
 * GET:  Returns cached billers from billers_cache table (refreshes from API if stale)
 * POST: Webhook handler for biller config updates from Paynow
 *
 * Caches ListBillers response in billers_cache table.
 * Returns cached data if fresher than 1 hour, otherwise refreshes.
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
const LIST_BILLERS_URL = `${BILLPAY_API_BASE}/api/payment/ListBillers`;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const API_TIMEOUT_MS = 30_000;

// ─── Curated farmer-relevant biller codes ───
// "Test" is included so the Demo UI can exercise the live AUTH→PAY path
// against the v1.33-documented prefix-based simulator (AT/AF/PT/PF/PP/PFF)
// — production BillPay test meters like 37132567431 only resolve on the
// BillPay test environment, not on prod creds. Test biller works on both.
const CURATED_CODES = [
  "TEST",
  "ZETDC", "AIRTIME", "COH", "BCC", "MAS", "GWE",
  "UZ", "NUST", "MSU", "GZU", "CIMAS", "FMH",
  "NLAC", "DOVES", "DSTV",
];

// ─── Simulation biller data (realistic configs for testing without credentials) ───
const SIM_BILLERS = [
  { biller_code: "ZETDC", biller_name: "ZESA Prepaid Electricity", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Meter Number", member_number_field_desc: "Enter your ZESA prepaid meter number", member_number_field_regex: "^\\d{11}$", products: [{ Code: "USD", Name: "ZESA Token (USD)", Price: null, MinAmount: 1, MaxAmount: 500, AuthAmountMandated: null, ReturnsVouchers: true, RequiresForex: false, Enabled: true }] },
  { biller_code: "AIRTIME", biller_name: "Paynow Airtime", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Phone Number", member_number_field_desc: "Enter mobile number (Econet, NetOne, Telecel)", member_number_field_regex: "^07[1-9]\\d{7}$", products: [{ Code: "AIRTIME", Name: "Airtime Credit", Price: null, MinAmount: 0.5, MaxAmount: 100, AuthAmountMandated: null, ReturnsVouchers: false, RequiresForex: false, Enabled: true }, { Code: "AIRTIME_USD", Name: "Airtime Credit (USD)", Price: null, MinAmount: 0.5, MaxAmount: 100, AuthAmountMandated: null, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "COH", biller_name: "City of Harare", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Account Number", member_number_field_desc: "Enter your City of Harare account number", member_number_field_regex: null, products: [{ Code: "USD", Name: "USD Bill Payment", Price: null, MinAmount: 1, MaxAmount: 10000, AuthAmountMandated: false, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "BCC", biller_name: "Bulawayo City Council", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Account Number", member_number_field_desc: "Enter your BCC account number", member_number_field_regex: null, products: [{ Code: "USD", Name: "USD Bill Payment", Price: null, MinAmount: 1, MaxAmount: 10000, AuthAmountMandated: false, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "MAS", biller_name: "City of Masvingo", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Account Number", member_number_field_desc: "Enter your council account number", member_number_field_regex: null, products: [{ Code: "USD", Name: "USD Bill Payment", Price: null, MinAmount: 1, MaxAmount: 10000, AuthAmountMandated: false, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "GWE", biller_name: "Gweru City Council", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Account Number", member_number_field_desc: "Enter your council account number", member_number_field_regex: null, products: [{ Code: "USD", Name: "USD Bill Payment", Price: null, MinAmount: 1, MaxAmount: 10000, AuthAmountMandated: false, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "UZ", biller_name: "University of Zimbabwe", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Student Registration Number", member_number_field_desc: "Enter your UZ student registration number", member_number_field_regex: "^R\\d+", products: [{ Code: "TUITION", Name: "Tuition Fees", Price: null, MinAmount: 50, MaxAmount: 5000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "NUST", biller_name: "National University of Science & Technology", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Student ID", member_number_field_desc: "Enter your NUST student number", member_number_field_regex: "^N\\d+", products: [{ Code: "TUITION", Name: "Tuition Fees", Price: null, MinAmount: 50, MaxAmount: 5000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "MSU", biller_name: "Midlands State University", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Student ID", member_number_field_desc: "Enter your MSU student number", member_number_field_regex: null, products: [{ Code: "TUITION", Name: "Tuition Fees", Price: null, MinAmount: 50, MaxAmount: 5000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "GZU", biller_name: "Great Zimbabwe University", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Student ID", member_number_field_desc: "Enter your GZU student number", member_number_field_regex: null, products: [{ Code: "TUITION", Name: "Tuition Fees", Price: null, MinAmount: 50, MaxAmount: 5000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "CIMAS", biller_name: "CIMAS Medical Aid", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Membership Number", member_number_field_desc: "Enter your CIMAS membership number", member_number_field_regex: null, products: [{ Code: "PREMIUM", Name: "Medical Aid Premium", Price: null, MinAmount: 10, MaxAmount: 2000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "FMH", biller_name: "First Mutual Health", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Policy Number", member_number_field_desc: "Enter your First Mutual policy number", member_number_field_regex: null, products: [{ Code: "PREMIUM", Name: "Health Insurance Premium", Price: null, MinAmount: 10, MaxAmount: 2000, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
  { biller_code: "NLAC", biller_name: "Nyaradzo Life Assurance", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Policy Number", member_number_field_desc: "Enter your Nyaradzo policy number", member_number_field_regex: null, products: [{ Code: "PREMIUM", Name: "Policy Premium", Price: null, MinAmount: 5, MaxAmount: 500, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: false, Enabled: true }] },
  { biller_code: "DOVES", biller_name: "Doves Funeral & Life Assurance", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Policy Number", member_number_field_desc: "Enter your Doves policy number", member_number_field_regex: null, products: [{ Code: "PREMIUM", Name: "Funeral Cover Premium", Price: null, MinAmount: 5, MaxAmount: 500, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: false, Enabled: true }] },
  { biller_code: "DSTV", biller_name: "DSTV", icon_url: null, logo_url: null, enabled: true, member_number_field_label: "Smartcard Number", member_number_field_desc: "Enter your DSTV smartcard number", member_number_field_regex: "^\\d{10}$", products: [{ Code: "DSTV_SUB", Name: "DSTV Subscription", Price: null, MinAmount: 5, MaxAmount: 200, AuthAmountMandated: true, ReturnsVouchers: false, RequiresForex: true, Enabled: true }] },
];

Deno.serve(async (req) => {
  _currentReq = req;
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── POST: Webhook from Paynow for biller config updates ──
  if (req.method === "POST") {
    try {
      let billerCodes: string[];
      try {
        billerCodes = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }
      if (!Array.isArray(billerCodes) || billerCodes.length === 0) {
        return json({ error: "Expected array of biller codes" }, 400);
      }

      // Invalidate cache for updated billers
      for (const code of billerCodes) {
        await svc.from("billers_cache").delete().eq("biller_code", code);
      }

      console.log(`BillPay billers webhook: Invalidated cache for ${billerCodes.join(", ")}`);
      return json({ message: `Cache invalidated for ${billerCodes.length} billers` });
    } catch (err) {
      console.error("BillPay billers webhook error:", err);
      return json({ error: "Invalid request" }, 400);
    }
  }

  // ── GET: Return billers (from cache or API) ──
  try {
    // Authenticate user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Not authenticated" }, 401);

    const billpayUser = Deno.env.get("BILLPAY_USERNAME");
    const billpayPass = Deno.env.get("BILLPAY_PASSWORD");

    // ── Simulation mode ──
    if (!billpayUser || !billpayPass) {
      // Seed cache with simulation data if empty
      const { count } = await svc.from("billers_cache").select("*", { count: "exact", head: true });
      if (!count || count === 0) {
        for (const biller of SIM_BILLERS) {
          await svc.from("billers_cache").upsert(biller, { onConflict: "biller_code" });
        }
      }

      return json({
        simulation: true,
        billers: SIM_BILLERS,
        count: SIM_BILLERS.length,
      });
    }

    // ── Check cache freshness ──
    const { data: cached } = await svc
      .from("billers_cache")
      .select("*")
      .in("biller_code", CURATED_CODES)
      .eq("enabled", true)
      .order("biller_name");

    const cacheAge = cached?.length
      ? Date.now() - new Date(cached[0].updated_at).getTime()
      : Infinity;

    if (cached?.length && cacheAge < CACHE_TTL_MS) {
      return json({
        billers: cached,
        count: cached.length,
        cached: true,
        cacheAgeMinutes: Math.round(cacheAge / 60000),
      });
    }

    // ── Refresh from API ──
    const basicAuth = btoa(`${billpayUser}:${billpayPass}`);
    const billerCodesParam = CURATED_CODES.join(",");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    let apiRes;
    try {
      apiRes = await fetch(`${LIST_BILLERS_URL}?billerCodes=${billerCodesParam}`, {
        headers: { Authorization: `Basic ${basicAuth}` },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeout);
      // Fall back to stale cache if API unreachable
      if (cached?.length) {
        return json({ billers: cached, count: cached.length, cached: true, stale: true });
      }
      return json({ error: "BillPay API unreachable and no cache available" }, 503);
    } finally {
      clearTimeout(timeout);
    }

    const billers = await apiRes.json();
    if (!Array.isArray(billers)) {
      if (cached?.length) {
        return json({ billers: cached, count: cached.length, cached: true, stale: true });
      }
      return json({ error: "Unexpected response from BillPay API" }, 502);
    }

    // Upsert into cache
    const now = new Date().toISOString();
    for (const b of billers) {
      // Vendor v1.33 returns MemberNumberFieldRegex either as a string or
      // an object {Pattern, Options}. Normalize to string-or-null at cache
      // write time so every downstream consumer (frontend validation etc.)
      // gets the same shape.
      const rawRegex = b.MemberNumberFieldRegex;
      const normalizedRegex: string | null =
        typeof rawRegex === "string"
          ? rawRegex
          : rawRegex && typeof rawRegex === "object" && "Pattern" in rawRegex
            ? String((rawRegex as { Pattern: unknown }).Pattern)
            : null;

      await svc.from("billers_cache").upsert({
        biller_code: b.Code,
        biller_name: b.Name,
        description: b.Description,
        icon_url: b.IconUrl,
        logo_url: b.LogoUrl,
        enabled: b.Enabled,
        member_number_field_label: b.MemberNumberFieldLabel,
        member_number_field_desc: b.MemberNumberFieldDesc,
        member_number_field_regex: normalizedRegex,
        allow_multiple_products: b.AllowMultipleProductsPerPayment,
        vendor_must_invoice: b.VendorMustInvoicePayments,
        products: b.Products || [],
        raw_config: b,
        updated_at: now,
      }, { onConflict: "biller_code" });
    }

    // Return freshly cached data
    const { data: fresh } = await svc
      .from("billers_cache")
      .select("*")
      .in("biller_code", CURATED_CODES)
      .eq("enabled", true)
      .order("biller_name");

    return json({
      billers: fresh || [],
      count: fresh?.length || 0,
      cached: false,
      refreshed: true,
    });

  } catch (err) {
    console.error("BillPay Billers error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

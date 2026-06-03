import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

/**
 * SMS sender via txt.co.zw REST API (usd.txt.co.zw host, USD billing)
 * Auth: HTTP Basic Auth with REMOTE user credentials
 * Docs: https://www.postman.com/paynow/paynow-txt
 *
 * Internal-only: callers must present service role key or CRON_SECRET.
 * Never throws — SMS failure must not block callers.
 */

const TXT_HOST = "https://usd.txt.co.zw";
const MAX_SMS_PER_USER_PER_HOUR = 10;
const SMS_MAX_LENGTH = 160;
const COST_PER_SMS_USD = 0.03;

/**
 * Normalize phone to local 07XXXXXXXX format.
 * txt.co.zw replaces leading 0 with +263 automatically —
 * we should NOT send +263 prefix ourselves.
 */
function normalizePhone(phone: string): string {
  const p = phone.replace(/[\s\-()]/g, "");
  if (p.startsWith("+263")) return "0" + p.slice(4);
  if (p.startsWith("263")) return "0" + p.slice(3);
  if (p.startsWith("0")) return p;
  return "0" + p;
}

/** Validate Zim mobile number: 07X XXXX XXX */
function isValidZimPhone(phone: string): boolean {
  return /^07[1-9]\d{7}$/.test(phone);
}

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const log = createLogger("send-sms", req);
  try {
    // Auth gate. Service-role / CRON for SMS sends; the read-only health
    // probe is open to any caller the Supabase gateway already authenticated
    // (logged-in user or anon) — it sends no SMS and reveals only whether the
    // txt.co.zw REMOTE credentials are provisioned.
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isServiceRole =
      serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;
    const isPrivileged = isCron || isServiceRole;

    const payload = await req.json();
    const { action } = payload;

    if (!isPrivileged && action !== "health") {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    // ── Health check action — verifies txt.co.zw REMOTE creds without sending SMS ──
    if (action === "health") {
      const relayUrl = Deno.env.get("TXT_RELAY_URL");
      const relaySecret = Deno.env.get("TXT_RELAY_SECRET");

      // Path 1: route through static-IP relay (production path; whitelisted IP)
      if (relayUrl && relaySecret) {
        try {
          const res = await fetch(`${relayUrl.replace(/\/$/, "")}/balance`, {
            method: "GET",
            headers: { "x-relay-secret": relaySecret, "ngrok-skip-browser-warning": "1" },
          });
          const data = await res.json();
          return json({ ...data, via: "relay", relayUrl });
        } catch (fetchErr) {
          return json({
            ok: false,
            status: "relay_unreachable",
            error: (fetchErr as Error).message,
            via: "relay",
            relayUrl,
          });
        }
      }

      // Path 2: direct call (works only if Supabase Edge IP is whitelisted)
      const txtUsername = Deno.env.get("TXT_USERNAME");
      const txtPassword = Deno.env.get("TXT_PASSWORD");

      if (!txtUsername || !txtPassword) {
        return json({
          ok: false,
          status: "credentials_missing",
          error: "Neither TXT_RELAY_URL nor TXT_USERNAME/TXT_PASSWORD set",
        });
      }

      const basicAuth = btoa(`${txtUsername}:${txtPassword}`);
      try {
        const res = await fetch(`${TXT_HOST}/Remote/AccountBalance`, {
          method: "GET",
          headers: { Authorization: `Basic ${basicAuth}` },
          redirect: "manual",
        });

        // 302 → /user/logon means REMOTE/Basic Auth not provisioned
        if (res.status === 302 || res.status === 301) {
          return json({
            ok: false,
            status: "auth_not_provisioned",
            httpStatus: res.status,
            error: "Auth path inactive — REMOTE role not enabled for Basic Auth on this account",
            host: TXT_HOST,
            via: "direct",
          });
        }

        if (!res.ok) {
          const body = (await res.text()).slice(0, 300);
          return json({
            ok: false,
            status: "http_error",
            httpStatus: res.status,
            error: body,
            host: TXT_HOST,
            via: "direct",
          });
        }

        const balance = (await res.text()).trim();
        return json({
          ok: true,
          status: "live",
          balance,
          host: TXT_HOST,
          via: "direct",
        });
      } catch (fetchErr) {
        return json({
          ok: false,
          status: "unreachable",
          error: (fetchErr as Error).message,
          host: TXT_HOST,
          via: "direct",
        });
      }
    }

    // ── Parse & validate input ──
    const { recipientPhone, message, eventType, userId } = payload;

    if (!recipientPhone || !message) {
      return json(
        { success: false, error: "recipientPhone and message required" },
        400
      );
    }

    const phone = normalizePhone(recipientPhone);
    if (!isValidZimPhone(phone)) {
      return json(
        { success: false, error: `Invalid Zim mobile number: ${phone}` },
        400
      );
    }

    const body = message.slice(0, SMS_MAX_LENGTH);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Rate limit: max N SMS per user per hour ──
    if (userId) {
      const oneHourAgo = new Date(
        Date.now() - 60 * 60 * 1000
      ).toISOString();
      const { count } = await supabase
        .from("sms_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", oneHourAgo);

      if ((count || 0) >= MAX_SMS_PER_USER_PER_HOUR) {
        log.warn("rate limited", { userId });
        return json({ success: false, error: "Rate limited" }, 429);
      }
    }

    // Send via static-IP relay (preferred), direct (only works if Supabase
    // Edge IP is whitelisted), or simulate (no creds at all).
    const relayUrl = Deno.env.get("TXT_RELAY_URL");
    const relaySecret = Deno.env.get("TXT_RELAY_SECRET");
    const txtUsername = Deno.env.get("TXT_USERNAME");
    const txtPassword = Deno.env.get("TXT_PASSWORD");

    let providerRef = "";
    let status = "sent";

    if (relayUrl && relaySecret) {
      try {
        const res = await fetch(`${relayUrl.replace(/\/$/, "")}/sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-relay-secret": relaySecret,
            "ngrok-skip-browser-warning": "1",
          },
          body: JSON.stringify({ recipientPhone: phone, message: body }),
        });
        const data = await res.json();
        if (data?.success && data?.status === "sent") {
          status = "sent";
          providerRef = data.reference;
        } else {
          status = "failed";
          providerRef = data?.error || data?.status || `HTTP-${res.status}`;
          log.error("relay rejected", { status: data?.status, error: data?.error, httpStatus: res.status });
        }
      } catch (fetchErr) {
        log.error("relay unreachable", { error: (fetchErr as Error).message });
        status = "failed";
        providerRef = "relay_unreachable";
      }
    } else if (txtUsername && txtPassword) {
      try {
        const basicAuth = btoa(`${txtUsername}:${txtPassword}`);
        const params = new URLSearchParams({
          Recipients: phone,
          Body: body,
        });

        const res = await fetch(`${TXT_HOST}/Remote/SendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
          },
          body: params.toString(),
        });

        if (!res.ok) {
          log.error("txt.co.zw http error", { httpStatus: res.status, statusText: res.statusText });
          status = "failed";
          providerRef = `HTTP-${res.status}`;
        } else {
          const responseText = await res.text();

          if (responseText.startsWith("SUCCESS:")) {
            providerRef = responseText.substring(9).trim();
            status = "sent";
          } else if (responseText.startsWith("ERROR:")) {
            const errorDesc = responseText.substring(7).trim();
            log.error("txt.co.zw error", { errorDesc });
            status = "failed";
            providerRef = errorDesc;
          } else {
            log.error("txt.co.zw unexpected response", { response: responseText.slice(0, 100) });
            status = "failed";
            providerRef = responseText.slice(0, 100);
          }
        }
      } catch (fetchErr) {
        log.error("txt.co.zw unreachable", { error: (fetchErr as Error).message });
        status = "failed";
      }
    } else {
      // SIM path only — no relay/direct creds configured (never in prod).
      log.info("sms simulated", { phone, eventType });
      status = "simulated";
      providerRef = `SIM-${Date.now()}`;
    }

    // ── Log to sms_log (fire-and-forget) ──
    await supabase
      .from("sms_log")
      .insert({
        user_id: userId || null,
        phone,
        message: body,
        event_type: eventType || "unknown",
        status,
        provider_reference: providerRef,
        cost_usd: status === "sent" ? COST_PER_SMS_USD : 0,
      })
      .then(({ error }) => {
        if (error) log.error("sms_log insert failed", { error: error.message });
      });

    return json({ success: status !== "failed", status, reference: providerRef });
  } catch (err) {
    log.error("unhandled error", { error: (err as Error).message });
    return json(
      { success: false, error: "SMS send failed" },
      500
    );
  }
});

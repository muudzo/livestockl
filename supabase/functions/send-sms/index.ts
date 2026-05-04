import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

  try {
    // ── Auth: require service role key or CRON_SECRET ──
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecret = Deno.env.get("CRON_SECRET");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isServiceRole =
      serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`;

    if (!isCron && !isServiceRole) {
      return json({ success: false, error: "Unauthorized" }, 401);
    }

    // ── Parse & validate input ──
    const { recipientPhone, message, eventType, userId } = await req.json();

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
        console.warn(`[SMS] Rate limited user ${userId}`);
        return json({ success: false, error: "Rate limited" }, 429);
      }
    }

    // ── Send via txt.co.zw or simulate ──
    const txtUsername = Deno.env.get("TXT_USERNAME");
    const txtPassword = Deno.env.get("TXT_PASSWORD");

    let providerRef = "";
    let status = "sent";

    if (!txtUsername || !txtPassword) {
      // Simulation mode — no credentials configured
      console.log(`[SMS SIM] To: ${phone} | ${body}`);
      status = "simulated";
      providerRef = `SIM-${Date.now()}`;
    } else {
      try {
        // HTTP Basic Auth per txt.co.zw docs (v1.12)
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
          console.error(
            `[SMS] txt.co.zw HTTP ${res.status}: ${res.statusText}`
          );
          status = "failed";
          providerRef = `HTTP-${res.status}`;
        } else {
          const responseText = await res.text();

          if (responseText.startsWith("SUCCESS:")) {
            // Response format: "SUCCESS: {message id}"
            providerRef = responseText.substring(9).trim();
            status = "sent";
          } else if (responseText.startsWith("ERROR:")) {
            // Response format: "ERROR: {error description}"
            const errorDesc = responseText.substring(7).trim();
            console.error(`[SMS] txt.co.zw error: ${errorDesc}`);
            status = "failed";
            providerRef = errorDesc;
          } else {
            console.error(`[SMS] Unexpected response: ${responseText}`);
            status = "failed";
            providerRef = responseText.slice(0, 100);
          }
        }
      } catch (fetchErr) {
        console.error(
          `[SMS] txt.co.zw unreachable: ${(fetchErr as Error).message}`
        );
        status = "failed";
      }
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
        if (error) console.error("[SMS] sms_log insert failed:", error.message);
      });

    return json({ success: status !== "failed", status, reference: providerRef });
  } catch (err) {
    console.error("[SMS] Unhandled error:", err);
    return json(
      { success: false, error: (err as Error).message },
      500
    );
  }
});

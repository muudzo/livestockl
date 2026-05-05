/**
 * txt.co.zw static-IP relay
 *
 * Runs on a machine with a stable IP that has been whitelisted by Paynow
 * for the `remote_tatenda` REMOTE-API user. Receives requests from the
 * Supabase send-sms Edge Function via an ngrok tunnel and forwards them
 * to txt.co.zw with HTTP Basic Auth.
 *
 * Why this exists: txt.co.zw enforces IP whitelist on REMOTE-API users
 * even when Basic Auth is also configured. Supabase Edge Functions egress
 * from rotating datacenter IPs that cannot be whitelisted. This relay's
 * single static residential IP is the only IP Paynow needs to whitelist.
 *
 * Env vars (read from process env on startup):
 *   TXT_USERNAME    — REMOTE-API username (e.g. remote_tatenda)
 *   TXT_PASSWORD    — REMOTE-API password (16+ chars per v1.12 spec)
 *   RELAY_SECRET    — shared secret; callers must present in x-relay-secret
 *   PORT            — listen port (default 8787)
 *
 * Endpoints:
 *   GET  /                   — relay self-health (no upstream call)
 *   POST /sms                — forwards to /Remote/SendMessage
 *   GET  /balance            — forwards to /Remote/AccountBalance
 *
 * Security: txt.co.zw credentials NEVER leave this machine.
 * Callers can only reach this relay via the shared RELAY_SECRET.
 */

const TXT_HOST = "https://usd.txt.co.zw";

const txtUsername = Deno.env.get("TXT_USERNAME");
const txtPassword = Deno.env.get("TXT_PASSWORD");
const relaySecret = Deno.env.get("RELAY_SECRET");
const port = parseInt(Deno.env.get("PORT") ?? "8787", 10);

if (!txtUsername || !txtPassword) {
  console.error("FATAL: TXT_USERNAME and TXT_PASSWORD must be set");
  Deno.exit(1);
}
if (!relaySecret || relaySecret.length < 32) {
  console.error("FATAL: RELAY_SECRET must be set and at least 32 chars");
  Deno.exit(1);
}

const basicAuth = "Basic " + btoa(`${txtUsername}:${txtPassword}`);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function authorized(req: Request): boolean {
  return req.headers.get("x-relay-secret") === relaySecret;
}

async function handleBalance(): Promise<Response> {
  try {
    const res = await fetch(`${TXT_HOST}/Remote/AccountBalance`, {
      headers: { Authorization: basicAuth },
      redirect: "manual",
    });

    if (res.status === 302 || res.status === 301) {
      return json({
        ok: false,
        status: "auth_not_provisioned",
        httpStatus: res.status,
      });
    }
    if (!res.ok) {
      return json({
        ok: false,
        status: "http_error",
        httpStatus: res.status,
        error: (await res.text()).slice(0, 300),
      });
    }
    return json({
      ok: true,
      status: "live",
      balance: (await res.text()).trim(),
    });
  } catch (err) {
    return json({
      ok: false,
      status: "unreachable",
      error: (err as Error).message,
    });
  }
}

async function handleSms(req: Request): Promise<Response> {
  let payload: { recipientPhone?: string; message?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  if (!payload.recipientPhone || !payload.message) {
    return json(
      { success: false, error: "recipientPhone and message required" },
      400,
    );
  }

  const body = new URLSearchParams({
    Recipients: payload.recipientPhone,
    Body: payload.message.slice(0, 160),
  }).toString();

  try {
    const res = await fetch(`${TXT_HOST}/Remote/SendMessage`, {
      method: "POST",
      headers: {
        Authorization: basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      redirect: "manual",
    });

    if (res.status === 302 || res.status === 301) {
      return json({
        success: false,
        status: "auth_not_provisioned",
        httpStatus: res.status,
      });
    }
    if (!res.ok) {
      return json({
        success: false,
        status: "http_error",
        httpStatus: res.status,
        error: (await res.text()).slice(0, 300),
      });
    }

    const text = (await res.text()).trim();

    if (text.startsWith("SUCCESS:")) {
      return json({
        success: true,
        status: "sent",
        reference: text.substring(8).trim(),
      });
    }
    if (text.startsWith("ERROR:")) {
      return json({
        success: false,
        status: "rejected",
        error: text.substring(6).trim(),
      });
    }
    return json({
      success: false,
      status: "unexpected",
      raw: text.slice(0, 300),
    });
  } catch (err) {
    return json({
      success: false,
      status: "unreachable",
      error: (err as Error).message,
    });
  }
}

console.log(`txt.co.zw relay listening on :${port}`);
console.log(`  ↳ forwarding to ${TXT_HOST}`);
console.log(`  ↳ user: ${txtUsername}`);

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/" || url.pathname === "/health") {
    return json({ ok: true, relay: "txt.co.zw", host: TXT_HOST });
  }

  if (!authorized(req)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (req.method === "GET" && url.pathname === "/balance") {
    return await handleBalance();
  }
  if (req.method === "POST" && url.pathname === "/sms") {
    return await handleSms(req);
  }

  return json({ error: "Not found" }, 404);
});

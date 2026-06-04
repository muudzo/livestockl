/**
 * Paynow Relay — Cloudflare Worker
 *
 * Proxies Paynow Core API calls from Supabase Edge Functions (which are
 * blocked at the TCP layer by Cloudflare when hitting www.paynow.co.zw
 * directly) through a CF Worker, whose egress IPs are trusted by CF's
 * own edge.
 *
 * Only two Paynow endpoints are forwarded — remotetransaction (EcoCash/
 * OneMoney Express Checkout) and initiatetransaction (Web Checkout).
 * Poll URLs Paynow returns are already CF-fronted too but the caller
 * can poll them directly if they share the egress pattern with the push.
 *
 * Auth: `x-relay-secret` header must match RELAY_SECRET env var.
 */

const TARGETS = {
  remotetransaction: "interface/remotetransaction",
  initiatetransaction: "interface/initiatetransaction",
  poll: null, // pollurl is dynamic — set via ?url= query param below
};

export default {
  async fetch(req, env) {
    if (req.method === "GET" && new URL(req.url).pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, relay: "paynow" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.headers.get("x-relay-secret") !== env.RELAY_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST required" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const target = url.searchParams.get("target") || "remotetransaction";
    const explicitUrl = url.searchParams.get("url");

    let targetUrl;
    if (target === "poll" && explicitUrl) {
      // Allow callers to poll any pollurl Paynow handed them — must be a
      // paynow.co.zw host over https so we don't become an open proxy.
      // endsWith("paynow.co.zw") alone also matches evilpaynow.co.zw — anchor
      // on a leading dot (plus the apex/www) and require https.
      const parsed = new URL(explicitUrl);
      const host = parsed.hostname.toLowerCase();
      const allowed =
        host === "paynow.co.zw" || host === "www.paynow.co.zw" || host.endsWith(".paynow.co.zw");
      if (parsed.protocol !== "https:" || !allowed) {
        return new Response(JSON.stringify({ error: "poll url host not allowed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      targetUrl = parsed.toString();
    } else if (TARGETS[target]) {
      targetUrl = `https://www.paynow.co.zw/${TARGETS[target]}`;
    } else {
      return new Response(JSON.stringify({ error: "unknown target" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-relay-target": targetUrl,
      },
    });
  },
};

// Shared per-request CORS header builder.
//
// ALLOWED_ORIGIN env var is a comma-separated list of origins (e.g.
// "https://app.example.com,http://localhost:5173"). The Access-Control-
// Allow-Origin response header must be EITHER a single origin value that
// matches the request's Origin header, OR "*" (which we don't use on
// user-facing endpoints), OR "null" for disallowed origins.
//
// Setting ACAO to the full comma-separated env var value is invalid CORS —
// browsers won't match it against their Origin and will reject the response.
//
// Usage:
//   import { getCorsHeaders } from "../_shared/cors.ts";
//
//   Deno.serve(async (req) => {
//     const cors = getCorsHeaders(req);
//     if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
//     // ... return new Response(body, { headers: { ...cors, "Content-Type": "application/json" } });
//   });

export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedEnv = Deno.env.get("ALLOWED_ORIGIN") ?? "";
  const allowed = allowedEnv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const reqOrigin = req.headers.get("origin");

  let acao: string;
  if (allowed.length === 0) {
    // Nothing configured — refuse to set any ACAO at all.
    acao = "";
  } else if (!reqOrigin) {
    // Server-to-server / curl / same-origin. Reflect the first configured
    // allowlist entry so CORS headers are valid; browsers won't spoof this.
    acao = allowed[0];
  } else if (allowed.includes(reqOrigin)) {
    acao = reqOrigin;
  } else {
    // Disallowed origin — the literal string "null" is a valid CORS value
    // that signals "not allowed"; browsers will reject matching.
    acao = "null";
  }

  return {
    "Access-Control-Allow-Origin": acao,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

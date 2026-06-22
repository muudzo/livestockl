import { getCorsHeaders } from "../_shared/cors.ts";

const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");

// Pesepay encryption: AES-256-CBC
// Key = SHA-256 of encryption key, IV = first 16 bytes of that hash
async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(payload);

  // Derive 32-byte key via SHA-256
  const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, ["encrypt"]);
  // IV = first 16 bytes of the key hash
  const iv = new Uint8Array(keyHash.slice(0, 16));

  // Web Crypto handles PKCS7 padding automatically
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encoder.encode(plaintext)
  );

  // Convert to base64
  const bytes = new Uint8Array(encrypted);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decryptPayload(encryptedBase64: string, encryptionKey: string): Promise<any> {
  const encoder = new TextEncoder();

  const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyHash, { name: "AES-CBC" }, false, ["decrypt"]);
  const iv = new Uint8Array(keyHash.slice(0, 16));

  // Decode base64
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  // Web Crypto handles PKCS7 unpadding automatically
  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { amount, email, origin } = await req.json();

    if (!PESEPAY_API_KEY || !PESEPAY_ENCRYPTION_KEY) {
      return new Response(
        JSON.stringify({ error: "Pesepay not configured. Set PESEPAY_API_KEY and PESEPAY_ENCRYPTION_KEY." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testRef = `ZL-TEST-${Date.now().toString(36).toUpperCase()}`;

    const paymentPayload = {
      amountDetails: {
        amount: amount || 10,
        currencyCode: "USD",
      },
      reasonForPayment: "Test Payment - ZimLivestock",
      resultUrl: `${origin || "http://localhost:5173"}/api/webhook-placeholder`,
      returnUrl: `${origin || "http://localhost:5173"}/payment-status/${testRef}?method=card&amount=${amount || 10}`,
      merchantReference: testRef,
    };

    let encryptedPayload: string;
    try {
      encryptedPayload = await encryptPayload(paymentPayload, PESEPAY_ENCRYPTION_KEY);
    } catch (encErr) {
      return new Response(
        JSON.stringify({ error: "Encryption failed: " + (encErr as Error).message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let responseText: string;
    let pesepayStatus: number;
    try {
      const pesepayResponse = await fetch(
        "https://api.pesepay.com/api/payments-engine/v1/payments/initiate",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${PESEPAY_API_KEY.trim()}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ payload: encryptedPayload }),
        }
      );
      pesepayStatus = pesepayResponse.status;
      responseText = await pesepayResponse.text();
    } catch (fetchErr) {
      return new Response(
        JSON.stringify({
          error: "Failed to reach Pesepay API: " + (fetchErr as Error).message,
          apiKey: PESEPAY_API_KEY.slice(0, 8) + "...",
          payloadLength: encryptedPayload.length,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to parse as JSON
    let pesepayData: any;
    try {
      pesepayData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({
          error: "Pesepay returned non-JSON response",
          status: pesepayStatus,
          body: responseText.slice(0, 500),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If response has encrypted payload, decrypt it
    if (pesepayData.payload) {
      let decryptedResponse: any;
      try {
        decryptedResponse = await decryptPayload(pesepayData.payload, PESEPAY_ENCRYPTION_KEY);
      } catch (decErr) {
        return new Response(
          JSON.stringify({
            error: "Decryption failed: " + (decErr as Error).message,
            rawPayload: pesepayData.payload.slice(0, 100) + "...",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (decryptedResponse.redirectUrl) {
        return new Response(
          JSON.stringify({
            status: "ok",
            redirectUrl: decryptedResponse.redirectUrl,
            reference: testRef,
            pesepayReference: decryptedResponse.referenceNumber,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "No redirect URL in decrypted response",
          decrypted: decryptedResponse,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Non-encrypted response (likely an error)
    return new Response(
      JSON.stringify({
        error: pesepayData.message || pesepayData.error || "Pesepay request failed",
        httpStatus: pesepayStatus,
        raw: pesepayData,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Intentionally NOT returning stack to the client — stack traces leak
    // file paths, function names, and internal structure. Log for ops,
    // return a generic message to the caller.
    console.error("test-pesepay-checkout error:", (err as Error).message, (err as Error).stack);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

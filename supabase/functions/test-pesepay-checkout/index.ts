const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");

async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(payload);

  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));

  const data = encoder.encode(plaintext);
  const padLength = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, padded);
  const bytes = new Uint8Array(encrypted);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decryptPayload(encryptedBase64: string, encryptionKey: string): Promise<any> {
  const encoder = new TextEncoder();

  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["decrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));

  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
  const decoded = new TextDecoder().decode(decrypted);

  const padLen = decoded.charCodeAt(decoded.length - 1);
  const unpadded = decoded.slice(0, decoded.length - padLen);
  return JSON.parse(unpadded);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const encryptedPayload = await encryptPayload(paymentPayload, PESEPAY_ENCRYPTION_KEY);

    const pesepayResponse = await fetch(
      "https://api.pesepay.com/api/payments-engine/v1/payments/initiate",
      {
        method: "POST",
        headers: {
          Authorization: PESEPAY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: encryptedPayload }),
      }
    );

    const pesepayData = await pesepayResponse.json();

    if (pesepayData.payload) {
      const decryptedResponse = await decryptPayload(pesepayData.payload, PESEPAY_ENCRYPTION_KEY);

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
        JSON.stringify({ error: decryptedResponse.message || "No redirect URL in response", raw: decryptedResponse }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: pesepayData.message || pesepayData.error || "Pesepay request failed", raw: pesepayData }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

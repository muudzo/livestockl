import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://zimlivestock.co.zw",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");

// Pesepay requires AES-256-CBC encryption of all payloads
async function encryptPayload(payload: object, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const plaintext = JSON.stringify(payload);

  // Derive a 32-byte key from the encryption key using SHA-256
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["encrypt"]);

  // Use first 16 bytes of the key hash as IV
  const iv = new Uint8Array(keyData.slice(0, 16));

  // Pad plaintext to AES block size (PKCS7)
  const data = encoder.encode(plaintext);
  const padLength = 16 - (data.length % 16);
  const padded = new Uint8Array(data.length + padLength);
  padded.set(data);
  padded.fill(padLength, data.length);

  const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, padded);
  // Return as base64
  const bytes = new Uint8Array(encrypted);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decryptPayload(encryptedBase64: string, encryptionKey: string): Promise<any> {
  const encoder = new TextEncoder();

  // Derive key and IV same way
  const keyData = await crypto.subtle.digest("SHA-256", encoder.encode(encryptionKey));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-CBC" }, false, ["decrypt"]);
  const iv = new Uint8Array(keyData.slice(0, 16));

  // Decode base64
  const binary = atob(encryptedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
  const decoded = new TextDecoder().decode(decrypted);

  // Remove PKCS7 padding
  const padLen = decoded.charCodeAt(decoded.length - 1);
  const unpadded = decoded.slice(0, decoded.length - padLen);
  return JSON.parse(unpadded);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference, amount, livestockTitle } = await req.json();
    const origin = req.headers.get("origin") || "https://zimlivestock.co.zw";

    // Input validation
    if (!reference || typeof reference !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PESEPAY_API_KEY || !PESEPAY_ENCRYPTION_KEY) {
      return new Response(
        JSON.stringify({ error: "Pesepay not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the payment record exists and amount matches
    const verifyClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: paymentRecord } = await verifyClient
      .from("payments")
      .select("amount, user_id, livestock_id")
      .eq("reference", reference)
      .single();

    if (!paymentRecord || paymentRecord.amount !== amount) {
      return new Response(
        JSON.stringify({ error: "Payment record not found or amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the authenticated user owns this payment
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    const { data: { user: callerUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !callerUser || callerUser.id !== paymentRecord.user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you do not own this payment" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify auction win
    const { data: winningBid } = await verifyClient
      .from("bids")
      .select("amount, livestock_id")
      .eq("user_id", callerUser.id)
      .eq("is_winner", true)
      .eq("livestock_id", paymentRecord.livestock_id)
      .single();

    if (!winningBid) {
      return new Response(
        JSON.stringify({ error: "You did not win this auction" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify listing status
    const { data: listing } = await verifyClient
      .from("livestock_items")
      .select("status")
      .eq("id", winningBid.livestock_id)
      .single();

    if (!listing || listing.status !== "ended") {
      return new Response(
        JSON.stringify({ error: "Auction is not in a payable state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-calculated amount (bid + 5% platform fee)
    const correctAmount = Math.round(winningBid.amount * 1.05);
    if (paymentRecord.amount !== correctAmount) {
      return new Response(
        JSON.stringify({ error: "Payment amount mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pesepay: Encrypt the payment payload
    const paymentPayload = {
      amountDetails: {
        amount,
        currencyCode: "USD",
      },
      reasonForPayment: livestockTitle || "Livestock Purchase",
      resultUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/payment-webhook`,
      returnUrl: `${origin}/payment-status/${reference}?method=card&amount=${amount}`,
      merchantReference: reference,
    };

    const encryptedPayload = await encryptPayload(paymentPayload, PESEPAY_ENCRYPTION_KEY);

    // POST to Pesepay initiate endpoint
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
      // Decrypt the response
      const decryptedResponse = await decryptPayload(pesepayData.payload, PESEPAY_ENCRYPTION_KEY);

      if (decryptedResponse.redirectUrl) {
        // Update payment record
        await verifyClient
          .from("payments")
          .update({
            status: "pending",
            paynow_reference: decryptedResponse.referenceNumber || null,
          })
          .eq("reference", reference);

        return new Response(
          JSON.stringify({
            status: "ok",
            redirectUrl: decryptedResponse.redirectUrl,
            pesepayReference: decryptedResponse.referenceNumber,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle non-encrypted error responses
    return new Response(
      JSON.stringify({
        error: pesepayData.message || pesepayData.error || "Pesepay request failed",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Pesepay initiation error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

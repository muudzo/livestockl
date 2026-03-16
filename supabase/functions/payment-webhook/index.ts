import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PESEPAY_API_KEY = Deno.env.get("PESEPAY_API_KEY");
const PESEPAY_ENCRYPTION_KEY = Deno.env.get("PESEPAY_ENCRYPTION_KEY");

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
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (!PESEPAY_ENCRYPTION_KEY || !PESEPAY_API_KEY) {
      return new Response("Not configured", { status: 500 });
    }

    const body = await req.json();

    // Pesepay sends encrypted webhook payloads
    let webhookData: any;
    if (body.payload) {
      webhookData = await decryptPayload(body.payload, PESEPAY_ENCRYPTION_KEY);
    } else {
      // Some Pesepay webhook formats send plaintext
      webhookData = body;
    }

    const reference = webhookData.merchantReference || webhookData.referenceNumber;
    const pesepayStatus = (webhookData.transactionStatus || webhookData.status || "").toUpperCase();

    if (!reference) {
      console.error("No reference in webhook payload:", webhookData);
      return new Response("Missing reference", { status: 400 });
    }

    // Defense in depth: verify transaction via Pesepay API
    const checkResponse = await fetch(
      `https://api.pesepay.com/api/payments-engine/v1/payments/check-payment?referenceNumber=${encodeURIComponent(webhookData.referenceNumber || reference)}`,
      {
        headers: { Authorization: PESEPAY_API_KEY },
      }
    );
    const checkData = await checkResponse.json();

    let verifiedStatus = "PENDING";
    if (checkData.payload) {
      const decryptedCheck = await decryptPayload(checkData.payload, PESEPAY_ENCRYPTION_KEY);
      verifiedStatus = (decryptedCheck.transactionStatus || "").toUpperCase();
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map Pesepay status to our status
    let dbStatus: "pending" | "paid" | "failed" = "pending";
    if (verifiedStatus === "SUCCESS" || verifiedStatus === "PAID") {
      dbStatus = "paid";
    } else if (verifiedStatus === "FAILED" || verifiedStatus === "CANCELLED") {
      dbStatus = "failed";
    }

    // Atomic: only update if still pending
    const { data: updated, error } = await supabase
      .from("payments")
      .update({
        status: dbStatus,
        paynow_reference: webhookData.referenceNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference)
      .eq("status", "pending")
      .select("livestock_id, user_id, amount")
      .maybeSingle();

    if (error) {
      console.error("Failed to update payment:", error);
      return new Response("DB error", { status: 500 });
    }

    if (!updated) {
      return new Response("Already processed", { status: 200 });
    }

    // If payment succeeded, mark the livestock item as sold and send notifications
    if (dbStatus === "paid" && updated) {
      await supabase
        .from("livestock_items")
        .update({ status: "sold" })
        .eq("id", updated.livestock_id);

      await supabase.from("notifications").insert({
        user_id: updated.user_id,
        type: "payment",
        title: "Payment Confirmed",
        message: `Your payment of US$${updated.amount} has been confirmed.`,
        priority: "high",
      });

      const { data: item } = await supabase
        .from("livestock_items")
        .select("seller_id, title")
        .eq("id", updated.livestock_id)
        .single();

      if (item) {
        await supabase.from("notifications").insert({
          user_id: item.seller_id,
          type: "payment",
          title: "Payment Received",
          message: `Payment of US$${updated.amount} received for ${item.title}.`,
          priority: "high",
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

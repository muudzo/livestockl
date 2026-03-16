import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    // Verify webhook signature using HMAC SHA512
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== signature) {
      console.error("Webhook signature verification failed");
      return new Response("Invalid signature", { status: 403 });
    }

    const event = JSON.parse(body);

    if (event.event !== "charge.success") {
      // Only handle successful charges
      return new Response("OK", { status: 200 });
    }

    const data = event.data;
    const reference = data.reference;

    if (!reference) {
      console.error("No reference in webhook payload");
      return new Response("OK", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the transaction with Paystack API (defense in depth)
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      }
    );
    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      console.error("Paystack verification failed:", verifyData.message);
      return new Response("Verification failed", { status: 400 });
    }

    // Atomic: only update if still pending
    const { data: updated, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paynow_reference: data.id?.toString() || null,
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

    // Mark item as sold
    if (updated.livestock_id) {
      await supabase
        .from("livestock_items")
        .update({ status: "sold" })
        .eq("id", updated.livestock_id);
    }

    // Notify buyer
    await supabase.from("notifications").insert({
      user_id: updated.user_id,
      type: "payment",
      title: "Payment Confirmed",
      message: `Your payment of US$${updated.amount} has been confirmed.`,
      priority: "high",
    });

    // Notify seller
    if (updated.livestock_id) {
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

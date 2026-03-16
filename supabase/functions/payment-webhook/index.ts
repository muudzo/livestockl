import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLUTTERWAVE_SECRET_HASH = Deno.env.get("FLUTTERWAVE_SECRET_HASH");
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY");

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Flutterwave webhook verification via secret hash header
    const secretHash = req.headers.get("verif-hash");
    if (!FLUTTERWAVE_SECRET_HASH || secretHash !== FLUTTERWAVE_SECRET_HASH) {
      console.error("Invalid webhook secret hash");
      return new Response("Invalid hash", { status: 403 });
    }

    const body = await req.json();
    const event = body;

    // Only handle successful charges
    if (event.event !== "charge.completed" || event.data?.status !== "successful") {
      return new Response("OK", { status: 200 });
    }

    const txRef = event.data.tx_ref;
    const flwRef = event.data.flw_ref;
    const transactionId = event.data.id;

    if (!txRef) {
      console.error("No tx_ref in webhook payload");
      return new Response("Missing tx_ref", { status: 400 });
    }

    // Defense in depth: verify the transaction with Flutterwave API
    const verifyResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` },
      }
    );
    const verifyData = await verifyResponse.json();

    if (
      verifyData.status !== "success" ||
      verifyData.data?.status !== "successful" ||
      verifyData.data?.tx_ref !== txRef
    ) {
      console.error("Transaction verification failed:", verifyData);
      return new Response("Verification failed", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Atomic: only update if still pending
    const { data: updated, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paynow_reference: flwRef || String(transactionId),
        updated_at: new Date().toISOString(),
      })
      .eq("reference", txRef)
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

    // Mark livestock as sold and send notifications
    if (updated) {
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

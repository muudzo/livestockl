import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", (err as Error).message);
      return new Response("Invalid signature", { status: 403 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reference = session.metadata?.reference;

      if (!reference) {
        console.error("No reference in session metadata");
        return new Response("OK", { status: 200 });
      }

      // Atomic: only update if still pending
      const { data: updated, error } = await supabase
        .from("payments")
        .update({
          status: "paid",
          paynow_reference: session.id,
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
      await supabase
        .from("livestock_items")
        .update({ status: "sold" })
        .eq("id", updated.livestock_id);

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: updated.user_id,
        type: "payment",
        title: "Payment Confirmed",
        message: `Your payment of US$${updated.amount} has been confirmed.`,
        priority: "high",
      });

      // Notify seller
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

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reference = session.metadata?.reference;

      if (reference) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("reference", reference)
          .eq("status", "pending");
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

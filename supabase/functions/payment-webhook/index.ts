import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Marks a payment as paid, updates listing to sold, and notifies both parties.
 */
async function completePayment(reference: string, providerRef: string) {
  const { data: updated, error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paynow_reference: providerRef,
      updated_at: new Date().toISOString(),
    })
    .eq("reference", reference)
    .eq("status", "pending")
    .select("livestock_id, user_id, amount")
    .maybeSingle();

  if (error) {
    console.error("Failed to update payment:", error);
    return;
  }
  if (!updated) return; // Already processed (idempotent)

  // Mark item as sold + notify buyer + get seller info — all in parallel
  const [, , sellerResult] = await Promise.all([
    updated.livestock_id
      ? supabase.from("livestock_items").update({ status: "sold" }).eq("id", updated.livestock_id)
      : Promise.resolve(),
    supabase.from("notifications").insert({
      user_id: updated.user_id,
      type: "payment",
      title: "Payment Confirmed",
      message: `Your payment of US$${updated.amount} has been confirmed.`,
      priority: "high",
    }),
    updated.livestock_id
      ? supabase.from("livestock_items").select("seller_id, title").eq("id", updated.livestock_id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Notify seller
  const item = sellerResult?.data;
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

/**
 * Marks a payment as failed.
 */
async function failPayment(reference: string) {
  await supabase
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .eq("status", "pending");
}

/**
 * Parse Paynow URL-encoded callback body.
 * Paynow sends: reference=ZL-xxx&paynowreference=12345&amount=1200.00&status=Paid&...&hash=ABC123
 */
function parsePaynowBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [key, ...rest] = pair.split("=");
    params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
  }
  return params;
}

/**
 * Verify Paynow hash: concatenate all values except hash + integration key → SHA-512.
 */
async function verifyPaynowHash(params: Record<string, string>, integrationKey: string): Promise<boolean> {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  // Build hash string from all values except 'hash' in received order
  const values = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== "hash")
    .map(([, val]) => val);
  const hashString = values.join("") + integrationKey;

  const data = new TextEncoder().encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const computed = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  return computed === receivedHash.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const body = await req.text();

    // ─── PAYNOW CALLBACK ───
    // Paynow sends application/x-www-form-urlencoded with status updates
    if (contentType.includes("x-www-form-urlencoded") || (!contentType.includes("json") && body.includes("paynowreference"))) {
      const params = parsePaynowBody(body);
      console.log("Paynow callback received:", params.reference, params.status);

      const integrationKey = Deno.env.get("PAYNOW_INTEGRATION_KEY");
      if (!integrationKey) {
        console.error("PAYNOW_INTEGRATION_KEY not configured — refusing to process unverified webhook");
        return new Response("Webhook verification not configured", { status: 500 });
      }

      const valid = await verifyPaynowHash(params, integrationKey);
      if (!valid) {
        console.error("Paynow hash verification failed for:", params.reference);
        return new Response("Invalid hash", { status: 403 });
      }

      const reference = params.reference;
      const paynowRef = params.paynowreference || "";
      const status = (params.status || "").toLowerCase();

      if (!reference) {
        return new Response("Missing reference", { status: 400 });
      }

      if (status === "paid" || status === "delivered") {
        await completePayment(reference, paynowRef);
      } else if (status === "cancelled" || status === "failed" || status === "disputed") {
        await failPayment(reference);
      }
      // "awaiting delivery", "sent", "created" — no action, still pending

      return new Response("OK", { status: 200 });
    }

    // ─── STRIPE WEBHOOK ───
    // Stripe sends application/json with signature header
    const signature = req.headers.get("stripe-signature");
    if (signature) {
      const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
      if (!endpointSecret) {
        console.error("STRIPE_WEBHOOK_SECRET not configured");
        return new Response("Webhook secret not configured", { status: 500 });
      }

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
        apiVersion: "2024-12-18.acacia",
      });

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      } catch (err) {
        console.error("Stripe signature verification failed:", (err as Error).message);
        return new Response("Invalid signature", { status: 403 });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const reference = session.metadata?.reference;
        if (reference) {
          await completePayment(reference, session.id);
        }
      }

      if (event.type === "checkout.session.expired") {
        const session = event.data.object as Stripe.Checkout.Session;
        const reference = session.metadata?.reference;
        if (reference) {
          await failPayment(reference);
        }
      }

      return new Response("OK", { status: 200 });
    }

    // Unknown callback format
    console.error("Unknown webhook format. Content-Type:", contentType);
    return new Response("Unknown webhook format", { status: 400 });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});

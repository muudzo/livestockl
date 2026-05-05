import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "https://zimlivestock.co.zw",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Fire-and-forget SMS via send-sms edge function. Never throws — SMS failure
// must not block auction settlement. Logs errors but returns.
async function trySendSms(args: {
  phone: string;
  message: string;
  eventType: string;
  userId: string;
}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientPhone: args.phone,
        message: args.message,
        eventType: args.eventType,
        userId: args.userId,
      }),
    });
    if (!res.ok) {
      console.error(`[end-auctions] SMS HTTP ${res.status} for user ${args.userId}`);
    }
  } catch (err) {
    console.error(`[end-auctions] SMS dispatch failed for user ${args.userId}:`, (err as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Authenticate cron caller. CRON_SECRET should be set as a Supabase secret
  // via: supabase secrets set CRON_SECRET=<your-secret>
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Capture the set of auctions about to be ended. The RPC is void-returning
    // and uses skip-locked + advisory lock, so this is the cleanest way to
    // identify which items just transitioned without a schema change.
    const { data: aboutToEnd } = await supabase
      .from("livestock_items")
      .select("id")
      .eq("status", "active")
      .lte("end_time", new Date().toISOString())
      .limit(50);

    const candidateIds = (aboutToEnd ?? []).map((r) => r.id);

    const { error } = await supabase.rpc("end_expired_auctions");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let smsSentCount = 0;

    if (candidateIds.length > 0) {
      // Fetch settled auctions with seller phone + winning bid + winner phone.
      const { data: settled } = await supabase
        .from("livestock_items")
        .select(`
          id,
          title,
          status,
          seller:seller_id ( id, first_name, phone ),
          bids!inner ( amount, user_id, is_winner, bidder:user_id ( first_name, phone ) )
        `)
        .in("id", candidateIds)
        .eq("status", "ended")
        .eq("bids.is_winner", true);

      // One batched idempotency lookup over the past 5 min — avoids N round-trips.
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentSms } = await supabase
        .from("sms_log")
        .select("event_type, message")
        .gte("created_at", fiveMinAgo)
        .in("event_type", ["auction_won", "auction_sold"]);

      const recentTitles = new Set(
        (recentSms ?? []).map((r) => `${r.event_type}::${r.message?.slice(0, 80) ?? ""}`),
      );

      // Build all dispatch promises, then fire in parallel — sequential await
      // hits Edge Function CPU budget at ~8 items.
      const dispatches: Promise<void>[] = [];

      for (const item of settled ?? []) {
        const seller = (item as any).seller;
        const winningBid = ((item as any).bids ?? [])[0];
        const winner = winningBid?.bidder;
        const amount = winningBid?.amount;
        const title = (item as any).title;

        if (winner?.phone && amount) {
          const msg = `You won "${title}" for US$${amount}! Pay now at zimlivestock.co.zw to complete your purchase.`.slice(0, 160);
          if (!recentTitles.has(`auction_won::${msg.slice(0, 80)}`)) {
            dispatches.push(
              trySendSms({ phone: winner.phone, message: msg, eventType: "auction_won", userId: winningBid.user_id }),
            );
            smsSentCount++;
          }
        }

        if (seller?.phone && amount) {
          const msg = `Your auction for "${title}" ended. Sold for US$${amount}. Buyer will be prompted to pay.`.slice(0, 160);
          if (!recentTitles.has(`auction_sold::${msg.slice(0, 80)}`)) {
            dispatches.push(
              trySendSms({ phone: seller.phone, message: msg, eventType: "auction_sold", userId: seller.id }),
            );
            smsSentCount++;
          }
        }
      }

      // Fire-and-forget pattern; trySendSms swallows errors internally so we
      // never throw out of here. allSettled keeps the function alive long
      // enough for fetches to flush even if some upstream calls error.
      await Promise.allSettled(dispatches);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        candidatesProcessed: candidateIds.length,
        smsSent: smsSentCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

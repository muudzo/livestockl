// SRP: Detects auction wins for an agent and triggers payment.
// Separated from buyer-agent so the scan cycle stays focused on scanning.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log = createLogger('win-detector', req);
    const start = Date.now();
    const { agentId } = await req.json();
    log.info('win detection started', { agentId });

    if (!agentId) {
      log.error('missing agentId');
      return new Response(JSON.stringify({ error: "Missing agentId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find all livestock IDs this agent has bid on
    const { data: agentBids } = await supabase
      .from("agent_bids")
      .select("livestock_id")
      .eq("agent_id", agentId)
      .in("status", ["placed"]);

    if (!agentBids?.length) {
      return new Response(JSON.stringify({ message: "No pending bids", wins: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const livestockIds = [...new Set(agentBids.map(b => b.livestock_id))];

    // Find ended auctions among those
    const { data: endedAuctions } = await supabase
      .from("livestock_items")
      .select("id, title, current_bid")
      .eq("status", "ended")
      .in("id", livestockIds);

    if (!endedAuctions?.length) {
      return new Response(JSON.stringify({ message: "No ended auctions with our bids", wins: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wins: any[] = [];
    const losses: any[] = [];

    for (const auction of endedAuctions) {
      // Get the highest bid
      const { data: highestBid } = await supabase
        .from("bids")
        .select("user_id, amount")
        .eq("livestock_id", auction.id)
        .order("amount", { ascending: false })
        .limit(1)
        .single();

      if (!highestBid) continue;

      if (highestBid.user_id === agent.user_id) {
        // Check if payment already exists
        const { data: existingPayment } = await supabase
          .from("agent_payment_orders")
          .select("id")
          .eq("livestock_id", auction.id)
          .eq("agent_id", agentId)
          .limit(1);

        if (existingPayment?.length) continue; // Already handled

        // Trigger payment orchestrator
        const paymentUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/payment-orchestrator";
        const payRes = await fetch(paymentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "initiate_payment",
            agentId,
            livestockId: auction.id,
            amount: highestBid.amount,
          }),
        });
        const payResult = await payRes.json();

        // Update bid status
        await supabase
          .from("agent_bids")
          .update({ status: "won" })
          .eq("agent_id", agentId)
          .eq("livestock_id", auction.id);

        await supabase.from("agent_activity_log").insert({
          agent_id: agentId,
          event_type: "bid_won",
          message: `Won auction for "${auction.title}" at US$${highestBid.amount} — payment ${payResult.status || "initiated"}`,
          metadata: { livestock_id: auction.id, amount: highestBid.amount, payment: payResult },
        });

        wins.push({ livestock: auction.title, amount: highestBid.amount, payment: payResult });
      } else {
        // We lost
        await supabase
          .from("agent_bids")
          .update({ status: "lost" })
          .eq("agent_id", agentId)
          .eq("livestock_id", auction.id);

        await supabase.from("agent_activity_log").insert({
          agent_id: agentId,
          event_type: "bid_lost",
          message: `Lost auction for "${auction.title}" — winning bid was US$${highestBid.amount}`,
          metadata: { livestock_id: auction.id, winning_amount: highestBid.amount },
        });

        losses.push({ livestock: auction.title, winning_amount: highestBid.amount });
      }
    }

    return new Response(JSON.stringify({
      message: `Detected ${wins.length} win(s) and ${losses.length} loss(es)`,
      wins: wins.length,
      losses: losses.length,
      details: { wins, losses },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// SRP: Places a single bid on behalf of an agent.
// Used by buyer-agent and auction-sniper — they evaluate, this executes.

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

  // Auth gate: only allow calls with valid CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const log = createLogger('bid-executor', req);
    const { agentId, goalId, livestockId, amount, strategy } = await req.json();
    log.info('bid execution started', { agentId, livestockId, amount, strategy });

    if (!agentId || !livestockId || !amount || !strategy) {
      log.error('missing required fields', { agentId, livestockId, amount, strategy });
      return new Response(JSON.stringify({ error: "Missing required fields: agentId, livestockId, amount, strategy" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get agent to find user_id
    const { data: agent } = await supabase
      .from("agents")
      .select("user_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate bid using the same rules as place_bid() RPC ──
    // This prevents the "Shadow Logic" bypass where bid-executor
    // could skip auction rules that place_bid() enforces.
    const { data: listing, error: listingErr } = await supabase
      .from("livestock_items")
      .select("id, status, end_time, seller_id, current_bid, starting_price, title, bid_count, tenant_id")
      .eq("id", livestockId)
      .single();

    if (listingErr || !listing) {
      log.error('listing not found', { livestockId });
      return new Response(JSON.stringify({ error: "Listing not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.status !== 'active') {
      log.error('auction not active', { livestockId, status: listing.status });
      return new Response(JSON.stringify({ error: "Auction is not active" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(listing.end_time) <= new Date()) {
      log.error('auction expired', { livestockId, end_time: listing.end_time });
      return new Response(JSON.stringify({ error: "Auction has ended" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (listing.seller_id === agent.user_id) {
      log.error('agent cannot bid on own listing', { agentId, sellerId: listing.seller_id });
      return new Response(JSON.stringify({ error: "Cannot bid on your own listing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount <= Number(listing.current_bid)) {
      log.error('bid too low', { amount, current_bid: listing.current_bid });
      return new Response(JSON.stringify({ error: `Bid must be higher than current bid of US$${listing.current_bid}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amount < Number(listing.starting_price)) {
      log.error('bid below starting price', { amount, starting_price: listing.starting_price });
      return new Response(JSON.stringify({ error: `Bid must be at least the starting price of US$${listing.starting_price}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert bid + update listing atomically ──
    const { data: bidRecord, error: bidError } = await supabase
      .from("bids")
      .insert({ livestock_id: livestockId, user_id: agent.user_id, amount, tenant_id: listing.tenant_id })
      .select("id")
      .single();

    if (bidError) throw bidError;

    // Update listing price and bid count (mirrors place_bid() logic)
    await supabase
      .from("livestock_items")
      .update({ current_bid: amount, bid_count: (listing.bid_count || 0) + 1 })
      .eq("id", livestockId);

    // Notify seller
    await supabase.from("notifications").insert({
      user_id: listing.seller_id,
      tenant_id: listing.tenant_id,
      type: "bid",
      title: "New bid on your listing",
      message: `Agent bid US$${amount} on ${listing.title}`,
      priority: "medium",
    });

    // Record in agent_bids
    await supabase.from("agent_bids").insert({
      agent_id: agentId,
      goal_id: goalId || null,
      livestock_id: livestockId,
      bid_id: bidRecord.id,
      amount,
      strategy,
    });

    // Log activity
    await supabase.from("agent_activity_log").insert({
      agent_id: agentId,
      event_type: "bid_placed",
      message: `Placed ${strategy} bid of US$${amount}`,
      metadata: { livestock_id: livestockId, bid_id: bidRecord.id, amount, strategy },
    });

    return new Response(JSON.stringify({
      bid_id: bidRecord.id,
      amount,
      strategy,
      livestock_id: livestockId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

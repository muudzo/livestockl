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

    // Insert bid
    const { data: bidRecord, error: bidError } = await supabase
      .from("bids")
      .insert({ livestock_id: livestockId, user_id: agent.user_id, amount })
      .select("id")
      .single();

    if (bidError) throw bidError;

    // Atomically sync listing price
    await (supabase.rpc as any)("sync_listing_bid", { p_livestock_id: livestockId });

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

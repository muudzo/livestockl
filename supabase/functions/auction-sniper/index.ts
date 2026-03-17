import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { action, agentId } = await req.json();

    const { data: agent } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("agent_type", "sniper")
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Sniper agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scan_ending_soon") {
      // Get goals for this sniper
      const { data: goals } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("agent_id", agentId)
        .eq("status", "active");

      if (!goals?.length) {
        return new Response(JSON.stringify({ message: "No active snipe goals", snipes: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const snipeWindow = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const snipeResults: any[] = [];

      for (const goal of goals) {
        // Find auctions ending within the snipe window
        const cutoff = new Date(now + snipeWindow).toISOString();
        const { data: endingSoon } = await supabase
          .from("livestock_items")
          .select("*")
          .eq("status", "active")
          .eq("category", goal.category)
          .lte("end_time", cutoff)
          .gt("end_time", new Date().toISOString())
          .order("end_time", { ascending: true });

        if (!endingSoon?.length) continue;

        for (const listing of endingSoon) {
          const currentPrice = listing.current_bid || listing.starting_price;
          const timeLeft = new Date(listing.end_time).getTime() - now;
          const secondsLeft = Math.round(timeLeft / 1000);

          // Skip if price exceeds budget
          if (currentPrice >= goal.max_price) {
            await supabase.from("agent_decisions").insert({
              agent_id: agentId,
              goal_id: goal.id,
              livestock_id: listing.id,
              decision: "ignore",
              reasoning: `Price US$${currentPrice} exceeds max US$${goal.max_price}. Skipping snipe.`,
              confidence: 90,
            });
            continue;
          }

          // Skip if already bid on this listing
          const { data: existingBid } = await supabase
            .from("agent_bids")
            .select("id")
            .eq("agent_id", agentId)
            .eq("livestock_id", listing.id)
            .limit(1);

          if (existingBid?.length) continue;

          // Snipe bid: bid just enough to win, but within budget
          const increment = Math.max(5, currentPrice * 0.03); // 3% or US$5 minimum
          const snipeAmount = Math.min(
            Math.round((currentPrice + increment) * 100) / 100,
            goal.max_price
          );

          // Check location/breed preferences
          if (goal.preferred_location && listing.location !== goal.preferred_location) continue;
          if (goal.preferred_breed && !listing.breed.toLowerCase().includes(goal.preferred_breed.toLowerCase())) continue;

          // Execute the snipe
          try {
            // Insert bid directly (service role bypasses RLS)
            const { data: bidRecord, error: bidError } = await supabase
              .from("bids")
              .insert({
                livestock_id: listing.id,
                user_id: agent.user_id,
                amount: snipeAmount,
              })
              .select("id")
              .single();

            if (bidError) throw bidError;

            // Atomically sync listing with actual highest bid (prevents race conditions)
            await (supabase.rpc as any)("sync_listing_bid", { p_livestock_id: listing.id });

            // Record in agent_bids
            await supabase.from("agent_bids").insert({
              agent_id: agentId,
              goal_id: goal.id,
              livestock_id: listing.id,
              bid_id: bidRecord.id,
              amount: snipeAmount,
              strategy: "snipe",
            });

            await supabase.from("agent_decisions").insert({
              agent_id: agentId,
              goal_id: goal.id,
              livestock_id: listing.id,
              decision: "snipe",
              reasoning: `Sniped "${listing.title}" with ${secondsLeft}s left. Bid US$${snipeAmount} (current: US$${currentPrice}, budget: US$${goal.max_price})`,
              confidence: 85,
              metadata: {
                seconds_left: secondsLeft,
                previous_price: currentPrice,
                snipe_amount: snipeAmount,
                bid_count: listing.bid_count,
              },
            });

            await supabase.from("agent_activity_log").insert({
              agent_id: agentId,
              event_type: "snipe_executed",
              message: `Sniped "${listing.title}" at US$${snipeAmount} with ${secondsLeft}s remaining`,
              metadata: {
                livestock_id: listing.id,
                amount: snipeAmount,
                seconds_left: secondsLeft,
                goal_id: goal.id,
                bid_id: bidRecord.id,
              },
            });

            snipeResults.push({
              listing_id: listing.id,
              title: listing.title,
              amount: snipeAmount,
              seconds_left: secondsLeft,
              bid_id: bidRecord.id,
            });
          } catch (err: any) {
            await supabase.from("agent_activity_log").insert({
              agent_id: agentId,
              event_type: "snipe_missed",
              message: `Failed to snipe "${listing.title}": ${err.message}`,
              metadata: { livestock_id: listing.id, error: err.message },
            });
          }
        }
      }

      await supabase.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);

      return new Response(JSON.stringify({
        message: `Sniper scan complete: ${snipeResults.length} snipe(s) executed`,
        snipes: snipeResults,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

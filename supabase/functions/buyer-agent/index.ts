// SRP: Scans marketplace and evaluates listings against agent goals.
// Delegates bid execution to bid-executor and win detection to win-detector.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentGoal {
  id: string;
  category: string;
  preferred_breed: string | null;
  preferred_location: string | null;
  min_health: string;
  max_price: number;
  quantity: number;
  quantity_fulfilled: number;
}

interface Listing {
  id: string;
  title: string;
  category: string;
  breed: string;
  location: string;
  health: string;
  starting_price: number;
  current_bid: number;
  bid_count: number;
  end_time: string;
  seller_id: string;
}

function evaluateListing(listing: Listing, goal: AgentGoal): {
  decision: string;
  reasoning: string;
  confidence: number;
  bidAmount: number | null;
} {
  const currentPrice = listing.current_bid || listing.starting_price;
  const priceRatio = currentPrice / goal.max_price;
  const timeLeft = new Date(listing.end_time).getTime() - Date.now();
  const hoursLeft = timeLeft / (1000 * 60 * 60);
  const minutesLeft = timeLeft / (1000 * 60);

  let score = 50;
  const reasons: string[] = [];

  if (priceRatio <= 0.5) { score += 30; reasons.push(`Price US$${currentPrice} is ${Math.round((1 - priceRatio) * 100)}% below budget`); }
  else if (priceRatio <= 0.75) { score += 20; reasons.push(`Price US$${currentPrice} is within comfortable range`); }
  else if (priceRatio <= 0.9) { score += 10; reasons.push(`Price US$${currentPrice} is approaching budget limit`); }
  else { score -= 10; reasons.push(`Price US$${currentPrice} is near max budget US$${goal.max_price}`); }

  if (!goal.preferred_location) { score += 10; reasons.push("No location preference"); }
  else if (listing.location === goal.preferred_location) { score += 15; reasons.push(`Location ${listing.location} matches`); }
  else { score -= 5; reasons.push(`Location ${listing.location} doesn't match ${goal.preferred_location}`); }

  if (!goal.preferred_breed) { score += 5; }
  else if (listing.breed.toLowerCase().includes(goal.preferred_breed.toLowerCase())) { score += 10; reasons.push(`Breed "${listing.breed}" matches`); }
  else { reasons.push(`Breed "${listing.breed}" doesn't match "${goal.preferred_breed}"`); }

  const healthScores: Record<string, number> = { Excellent: 10, Good: 7, Fair: 4 };
  score += healthScores[listing.health] || 0;
  reasons.push(`Health: ${listing.health}`);

  if (listing.bid_count === 0) { score += 10; reasons.push("No competing bids"); }
  else if (listing.bid_count <= 3) { score += 5; reasons.push(`Low competition (${listing.bid_count} bids)`); }
  else { score -= 5; reasons.push(`High competition (${listing.bid_count} bids)`); }

  if (minutesLeft < 30) { score += 5; reasons.push("Ending very soon"); }
  else if (hoursLeft < 2) { score += 3; reasons.push("Ending within 2 hours"); }

  score = Math.max(0, Math.min(100, score));

  let decision: string;
  let bidAmount: number | null = null;

  if (currentPrice > goal.max_price) {
    decision = "ignore";
    reasons.unshift("IGNORE: Price exceeds budget");
  } else if (score >= 75) {
    decision = "bid";
    bidAmount = listing.bid_count === 0
      ? Math.max(listing.starting_price, currentPrice)
      : Math.min(currentPrice + Math.max(5, currentPrice * 0.05), goal.max_price);
    bidAmount = Math.round(bidAmount * 100) / 100;
    reasons.unshift(`BID: Score ${score}/100 — placing bid of US$${bidAmount}`);
  } else if (score >= 50) {
    decision = "monitor";
    reasons.unshift(`MONITOR: Score ${score}/100`);
  } else {
    decision = "ignore";
    reasons.unshift(`IGNORE: Score ${score}/100`);
  }

  return { decision, reasoning: reasons.join(". "), confidence: score, bidAmount };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const log = createLogger('buyer-agent', req);
    const start = Date.now();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const baseUrl = Deno.env.get("SUPABASE_URL")!;

    const { action, agentId } = await req.json();
    log.info('cycle started', { agentId, action });

    const { data: agent, error: agentError } = await supabase
      .from("agents").select("*").eq("id", agentId).eq("agent_type", "buyer").single();

    if (agentError || !agent) {
      log.error('agent not found', { agentId, error: agentError?.message });
      return new Response(JSON.stringify({ error: "Buyer agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "run_cycle") {
      const { data: goals } = await supabase
        .from("agent_goals").select("*").eq("agent_id", agentId).eq("status", "active");

      if (!goals?.length) {
        log.info('no active goals', { agentId });
        return new Response(JSON.stringify({ message: "No active goals", decisions: 0, bids: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      log.info('processing goals', { agentId, goalCount: goals.length });

      await supabase.from("agent_activity_log").insert({
        agent_id: agentId, event_type: "scan_started",
        message: `Scanning marketplace for ${goals.length} active goal(s)`,
      });

      const allDecisions: any[] = [];
      const allBids: any[] = [];

      for (const goal of goals as AgentGoal[]) {
        if (goal.quantity_fulfilled >= goal.quantity) continue;

        // RESPONSIBILITY 1: Scan for matching listings
        let query = supabase
          .from("livestock_items").select("*")
          .eq("status", "active").gt("end_time", new Date().toISOString())
          .eq("category", goal.category).lte("starting_price", goal.max_price)
          .neq("seller_id", agent.user_id)
          .order("end_time", { ascending: true }).limit(20);

        if (goal.preferred_location) query = query.eq("location", goal.preferred_location);
        if (goal.preferred_breed) query = query.ilike("breed", `%${goal.preferred_breed}%`);
        if (goal.min_health === "Excellent") query = query.eq("health", "Excellent");
        else if (goal.min_health === "Good") query = query.in("health", ["Good", "Excellent"]);

        const { data: listings } = await query;
        if (!listings?.length) continue;

        await supabase.from("agent_activity_log").insert({
          agent_id: agentId, event_type: "listing_found",
          message: `Found ${listings.length} matching listing(s) for ${goal.category}`,
        });

        // RESPONSIBILITY 2: Evaluate each listing
        for (const listing of listings as Listing[]) {
          const evaluation = evaluateListing(listing, goal);

          const { data: decision } = await supabase
            .from("agent_decisions").insert({
              agent_id: agentId, goal_id: goal.id, livestock_id: listing.id,
              decision: evaluation.decision, reasoning: evaluation.reasoning,
              confidence: evaluation.confidence,
              metadata: { listing_title: listing.title, current_price: listing.current_bid || listing.starting_price, bid_amount: evaluation.bidAmount },
            }).select().single();

          allDecisions.push(decision);

          // DELEGATE: Bid execution to bid-executor
          if (evaluation.decision === "bid" && evaluation.bidAmount) {
            try {
              const strategy = listing.bid_count === 0 ? "opening" : "competitive";
              const bidRes = await fetch(`${baseUrl}/functions/v1/bid-executor`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agentId, goalId: goal.id, livestockId: listing.id,
                  amount: evaluation.bidAmount, strategy,
                }),
              });
              const bidResult = await bidRes.json();
              if (bidResult.bid_id) {
                allBids.push(bidResult);
              }
            } catch (err: any) {
              await supabase.from("agent_activity_log").insert({
                agent_id: agentId, event_type: "error",
                message: `Bid executor failed for "${listing.title}": ${err.message}`,
              });
            }
          }
        }
      }

      // DELEGATE: Win detection to win-detector
      let winsDetected = 0;
      try {
        const winRes = await fetch(`${baseUrl}/functions/v1/win-detector`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
        const winResult = await winRes.json();
        winsDetected = winResult.wins || 0;
      } catch (_) { /* win detection is best-effort */ }

      await supabase.from("agent_activity_log").insert({
        agent_id: agentId, event_type: "scan_completed",
        message: `Cycle: ${allDecisions.length} evaluated, ${allBids.length} bid(s), ${winsDetected} win(s) detected`,
      });

      await supabase.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);

      return new Response(JSON.stringify({
        message: "Buyer agent cycle complete",
        decisions: allDecisions.length, bids: allBids.length, wins: winsDetected,
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

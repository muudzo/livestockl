import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Decision engine: evaluate a listing against a goal
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

  // Score components
  let score = 50; // base
  const reasons: string[] = [];

  // Price scoring (0-30 points)
  if (priceRatio <= 0.5) {
    score += 30;
    reasons.push(`Price US$${currentPrice} is ${Math.round((1 - priceRatio) * 100)}% below budget`);
  } else if (priceRatio <= 0.75) {
    score += 20;
    reasons.push(`Price US$${currentPrice} is within comfortable range`);
  } else if (priceRatio <= 0.9) {
    score += 10;
    reasons.push(`Price US$${currentPrice} is approaching budget limit`);
  } else {
    score -= 10;
    reasons.push(`Price US$${currentPrice} is near max budget US$${goal.max_price}`);
  }

  // Location match (0-15 points)
  if (!goal.preferred_location) {
    score += 10;
    reasons.push("No location preference — any location accepted");
  } else if (listing.location === goal.preferred_location) {
    score += 15;
    reasons.push(`Location ${listing.location} matches preference`);
  } else {
    score -= 5;
    reasons.push(`Location ${listing.location} doesn't match preferred ${goal.preferred_location}`);
  }

  // Breed match (0-10 points)
  if (!goal.preferred_breed) {
    score += 5;
  } else if (listing.breed.toLowerCase().includes(goal.preferred_breed.toLowerCase())) {
    score += 10;
    reasons.push(`Breed "${listing.breed}" matches preference`);
  } else {
    reasons.push(`Breed "${listing.breed}" doesn't match preferred "${goal.preferred_breed}"`);
  }

  // Health scoring (0-10 points)
  const healthScores: Record<string, number> = { Excellent: 10, Good: 7, Fair: 4 };
  score += healthScores[listing.health] || 0;
  reasons.push(`Health: ${listing.health}`);

  // Competition scoring
  if (listing.bid_count === 0) {
    score += 10;
    reasons.push("No competing bids — good opportunity");
  } else if (listing.bid_count <= 3) {
    score += 5;
    reasons.push(`Low competition (${listing.bid_count} bids)`);
  } else {
    score -= 5;
    reasons.push(`High competition (${listing.bid_count} bids)`);
  }

  // Time urgency
  if (minutesLeft < 30) {
    score += 5;
    reasons.push("Ending very soon — needs quick decision");
  } else if (hoursLeft < 2) {
    score += 3;
    reasons.push("Ending within 2 hours");
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Decision logic
  let decision: string;
  let bidAmount: number | null = null;

  if (currentPrice > goal.max_price) {
    decision = "ignore";
    reasons.unshift("IGNORE: Price exceeds budget");
  } else if (score >= 75) {
    decision = "bid";
    // Bid strategy: start low, go higher if competition is fierce
    if (listing.bid_count === 0) {
      bidAmount = Math.max(listing.starting_price, currentPrice);
    } else {
      const increment = Math.max(5, currentPrice * 0.05);
      bidAmount = Math.min(currentPrice + increment, goal.max_price);
    }
    bidAmount = Math.round(bidAmount * 100) / 100;
    reasons.unshift(`BID: Score ${score}/100 — placing bid of US$${bidAmount}`);
  } else if (score >= 50) {
    decision = "monitor";
    reasons.unshift(`MONITOR: Score ${score}/100 — watching for price changes`);
  } else {
    decision = "ignore";
    reasons.unshift(`IGNORE: Score ${score}/100 — doesn't meet criteria`);
  }

  return {
    decision,
    reasoning: reasons.join(". "),
    confidence: score,
    bidAmount,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, agentId } = body;

    // Get the agent (service role bypasses RLS, no user_id filter needed)
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("agent_type", "buyer")
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Buyer agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "run_cycle") {
      // Get active goals
      const { data: goals } = await supabase
        .from("agent_goals")
        .select("*")
        .eq("agent_id", agentId)
        .eq("status", "active");

      if (!goals?.length) {
        return new Response(JSON.stringify({ message: "No active goals", decisions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log scan start
      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "scan_started",
        message: `Scanning marketplace for ${goals.length} active goal(s)`,
        metadata: { goal_count: goals.length },
      });

      const allDecisions: any[] = [];
      const allBids: any[] = [];

      for (const goal of goals as AgentGoal[]) {
        if (goal.quantity_fulfilled >= goal.quantity) continue;

        // Scan for matching listings (direct query, service role bypasses RLS)
        let query = supabase
          .from("livestock_items")
          .select("*")
          .eq("status", "active")
          .gt("end_time", new Date().toISOString())
          .eq("category", goal.category)
          .lte("starting_price", goal.max_price)
          .neq("seller_id", agent.user_id)
          .order("end_time", { ascending: true })
          .limit(20);

        if (goal.preferred_location) {
          query = query.eq("location", goal.preferred_location);
        }
        if (goal.preferred_breed) {
          query = query.ilike("breed", `%${goal.preferred_breed}%`);
        }
        if (goal.min_health === "Excellent") {
          query = query.eq("health", "Excellent");
        } else if (goal.min_health === "Good") {
          query = query.in("health", ["Good", "Excellent"]);
        }

        const { data: listings } = await query;
        if (!listings?.length) continue;

        // Log findings
        await supabase.from("agent_activity_log").insert({
          agent_id: agentId,
          event_type: "listing_found",
          message: `Found ${listings.length} matching listing(s) for ${goal.category}`,
          metadata: { goal_id: goal.id, count: listings.length },
        });

        // Evaluate each listing
        for (const listing of listings as Listing[]) {
          const evaluation = evaluateListing(listing, goal);

          // Record decision
          const { data: decision } = await supabase
            .from("agent_decisions")
            .insert({
              agent_id: agentId,
              goal_id: goal.id,
              livestock_id: listing.id,
              decision: evaluation.decision,
              reasoning: evaluation.reasoning,
              confidence: evaluation.confidence,
              metadata: {
                listing_title: listing.title,
                current_price: listing.current_bid || listing.starting_price,
                bid_amount: evaluation.bidAmount,
              },
            })
            .select()
            .single();

          allDecisions.push(decision);

          // Execute bid if decided
          if (evaluation.decision === "bid" && evaluation.bidAmount) {
            try {
              const strategy = listing.bid_count === 0 ? "opening" : "competitive";

              // Insert bid directly (service role bypasses RLS)
              const { data: bidRecord, error: bidError } = await supabase
                .from("bids")
                .insert({
                  livestock_id: listing.id,
                  user_id: agent.user_id,
                  amount: evaluation.bidAmount,
                })
                .select("id")
                .single();

              if (bidError) throw bidError;

              // Update livestock item
              await supabase
                .from("livestock_items")
                .update({
                  current_bid: evaluation.bidAmount,
                  bid_count: (listing.bid_count || 0) + 1,
                })
                .eq("id", listing.id);

              // Record in agent_bids
              await supabase.from("agent_bids").insert({
                agent_id: agentId,
                goal_id: goal.id,
                livestock_id: listing.id,
                bid_id: bidRecord.id,
                amount: evaluation.bidAmount,
                strategy,
              });

              // Log the bid
              await supabase.from("agent_activity_log").insert({
                agent_id: agentId,
                event_type: "bid_placed",
                message: `Placed ${strategy} bid of US$${evaluation.bidAmount} on "${listing.title}"`,
                metadata: {
                  livestock_id: listing.id,
                  bid_id: bidRecord.id,
                  amount: evaluation.bidAmount,
                  strategy,
                },
              });

              allBids.push({ listing_id: listing.id, amount: evaluation.bidAmount, strategy, bid_id: bidRecord.id });
            } catch (bidError: any) {
              await supabase.from("agent_activity_log").insert({
                agent_id: agentId,
                event_type: "error",
                message: `Failed to bid on "${listing.title}": ${bidError.message}`,
                metadata: { livestock_id: listing.id, error: bidError.message },
              });
            }
          }
        }
      }

      // Check for auction wins — ended auctions where agent has highest bid
      const { data: wonAuctions } = await supabase
        .from("livestock_items")
        .select("id, title, current_bid")
        .eq("status", "ended")
        .in("id", [
          ...allBids.map((b: any) => b.listing_id),
          // Also check previously bid items
          ...(await supabase
            .from("agent_bids")
            .select("livestock_id")
            .eq("agent_id", agentId)
            .eq("status", "placed")
            .then((r: any) => r.data?.map((b: any) => b.livestock_id) || []))
        ]);

      const paymentsInitiated: any[] = [];
      if (wonAuctions?.length) {
        for (const won of wonAuctions) {
          // Check if we have the highest bid
          const { data: highestBid } = await supabase
            .from("bids")
            .select("user_id, amount")
            .eq("livestock_id", won.id)
            .order("amount", { ascending: false })
            .limit(1)
            .single();

          if (highestBid && highestBid.user_id === agent.user_id) {
            // Check if payment already exists
            const { data: existingPayment } = await supabase
              .from("agent_payment_orders")
              .select("id")
              .eq("livestock_id", won.id)
              .eq("agent_id", agentId)
              .limit(1);

            if (!existingPayment?.length) {
              // Trigger payment orchestrator
              const paymentUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/payment-orchestrator";
              const payRes = await fetch(paymentUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "initiate_payment",
                  agentId,
                  livestockId: won.id,
                  amount: highestBid.amount,
                }),
              });
              const payResult = await payRes.json();
              paymentsInitiated.push({ livestock: won.title, amount: highestBid.amount, result: payResult });

              // Update agent bid status
              await supabase
                .from("agent_bids")
                .update({ status: "won" })
                .eq("agent_id", agentId)
                .eq("livestock_id", won.id);

              await supabase.from("agent_activity_log").insert({
                agent_id: agentId,
                event_type: "bid_won",
                message: `Won auction for "${won.title}" at US$${highestBid.amount} — payment ${payResult.status || "initiated"}`,
                metadata: { livestock_id: won.id, amount: highestBid.amount, payment: payResult },
              });
            }
          }
        }
      }

      // Log scan complete
      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "scan_completed",
        message: `Cycle complete: ${allDecisions.length} evaluated, ${allBids.length} bid(s) placed, ${paymentsInitiated.length} payment(s) initiated`,
        metadata: { decisions: allDecisions.length, bids: allBids.length, payments: paymentsInitiated.length },
      });

      // Update last_run_at
      await supabase.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);

      return new Response(JSON.stringify({
        message: "Buyer agent cycle complete",
        decisions: allDecisions.length,
        bids: allBids.length,
        payments: paymentsInitiated.length,
        details: { decisions: allDecisions, bids: allBids, payments: paymentsInitiated },
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

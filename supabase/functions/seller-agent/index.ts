import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SellerConfig {
  auto_reprice: boolean;
  min_price_floor: number; // never go below this percentage of starting price
  reprice_strategy: "aggressive" | "moderate" | "conservative";
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

    const log = createLogger('seller-agent', req);
    const { action, agentId } = await req.json();
    log.info('seller analysis started', { agentId, action });

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .eq("agent_type", "seller")
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ error: "Seller agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config: SellerConfig = {
      auto_reprice: true,
      min_price_floor: 0.7,
      reprice_strategy: "moderate",
      ...agent.config,
    };

    if (action === "analyze_listings") {
      // Get seller's active listings (use agent's user_id)
      const { data: myListings } = await supabase
        .from("livestock_items")
        .select("*")
        .eq("seller_id", agent.user_id)
        .eq("status", "active")
        .order("end_time", { ascending: true });

      if (!myListings?.length) {
        return new Response(JSON.stringify({ message: "No active listings", suggestions: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "scan_started",
        message: `Analyzing ${myListings.length} active listing(s)`,
      });

      const suggestions: any[] = [];

      for (const listing of myListings) {
        const timeLeft = new Date(listing.end_time).getTime() - Date.now();
        const hoursLeft = timeLeft / (1000 * 60 * 60);
        const reasons: string[] = [];
        let suggestion: string | null = null;
        let suggestedPrice: number | null = null;

        // Get market data for this category/location
        const { data: intel } = await supabase
          .from("market_intel")
          .select("*")
          .eq("category", listing.category)
          .eq("location", listing.location)
          .order("period_end", { ascending: false })
          .limit(1)
          .single();

        const marketAvg = intel?.avg_price;

        // No bids and ending soon
        if (listing.bid_count === 0 && hoursLeft < 24) {
          suggestion = "reprice";
          const reduction = config.reprice_strategy === "aggressive" ? 0.15
            : config.reprice_strategy === "moderate" ? 0.10 : 0.05;
          suggestedPrice = Math.max(
            listing.starting_price * config.min_price_floor,
            listing.starting_price * (1 - reduction)
          );
          reasons.push(`No bids with ${Math.round(hoursLeft)}h left`);
          reasons.push(`Suggest reducing from US$${listing.starting_price} to US$${Math.round(suggestedPrice)}`);
        }
        // Price significantly above market
        else if (marketAvg && listing.starting_price > marketAvg * 1.3 && listing.bid_count === 0) {
          suggestion = "reprice";
          suggestedPrice = Math.round(marketAvg * 1.05);
          reasons.push(`Starting price US$${listing.starting_price} is ${Math.round((listing.starting_price / marketAvg - 1) * 100)}% above market avg US$${Math.round(marketAvg)}`);
        }
        // Good traction
        else if (listing.bid_count >= 5) {
          suggestion = "promote";
          reasons.push(`Strong interest with ${listing.bid_count} bids — consider promoting to reach more buyers`);
        }
        // Ending soon with bids
        else if (hoursLeft < 6 && listing.bid_count > 0) {
          suggestion = "alert";
          reasons.push(`Ending in ${Math.round(hoursLeft)}h with ${listing.bid_count} bid(s) at US$${listing.current_bid}`);
        }

        if (suggestion) {
          const decisionRecord = {
            agent_id: agentId,
            livestock_id: listing.id,
            decision: suggestion,
            reasoning: reasons.join(". "),
            confidence: suggestion === "reprice" ? 80 : 60,
            metadata: {
              listing_title: listing.title,
              current_price: listing.starting_price,
              current_bid: listing.current_bid,
              suggested_price: suggestedPrice,
              hours_left: Math.round(hoursLeft),
              bid_count: listing.bid_count,
              market_avg: marketAvg ? Math.round(marketAvg) : null,
            },
          };

          await supabase.from("agent_decisions").insert(decisionRecord);
          suggestions.push(decisionRecord);

          await supabase.from("agent_activity_log").insert({
            agent_id: agentId,
            event_type: suggestion === "reprice" ? "reprice_suggested" : "price_alert",
            message: `${listing.title}: ${reasons[0]}`,
            metadata: decisionRecord.metadata,
          });
        }
      }

      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "scan_completed",
        message: `Analysis complete: ${suggestions.length} suggestion(s) for ${myListings.length} listing(s)`,
      });

      await supabase.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);

      return new Response(JSON.stringify({
        message: "Seller analysis complete",
        listings_analyzed: myListings.length,
        suggestions,
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

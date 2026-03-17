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
      .eq("agent_type", "market_intel")
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Market intel agent not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_report") {
      // Generate fresh market intelligence
      await (supabase.rpc as any)("generate_market_intel");

      // Get the latest intel
      const { data: intel } = await supabase
        .from("market_intel")
        .select("*")
        .gte("period_end", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("avg_price", { ascending: false });

      // Get active listing stats
      const { data: activeListings } = await supabase
        .from("livestock_items")
        .select("category, location, starting_price, current_bid, bid_count, status")
        .eq("status", "active");

      // Compute market summary
      const categoryStats: Record<string, {
        count: number;
        avgPrice: number;
        totalBids: number;
        hottest: string;
      }> = {};

      if (activeListings) {
        for (const item of activeListings) {
          if (!categoryStats[item.category]) {
            categoryStats[item.category] = { count: 0, avgPrice: 0, totalBids: 0, hottest: "" };
          }
          const s = categoryStats[item.category];
          s.count++;
          s.avgPrice += item.current_bid || item.starting_price;
          s.totalBids += item.bid_count;
          if (item.bid_count > (categoryStats[item.category].totalBids / Math.max(s.count - 1, 1))) {
            s.hottest = item.location;
          }
        }
        for (const cat of Object.keys(categoryStats)) {
          categoryStats[cat].avgPrice = Math.round(categoryStats[cat].avgPrice / categoryStats[cat].count);
        }
      }

      // Detect anomalies (prices significantly above/below average)
      const anomalies: any[] = [];
      if (activeListings && intel) {
        for (const item of activeListings) {
          const matchingIntel = intel.find(
            (i: any) => i.category === item.category && i.location === item.location
          );
          if (matchingIntel) {
            const price = item.current_bid || item.starting_price;
            if (price > matchingIntel.avg_price * 1.5) {
              anomalies.push({
                type: "overpriced",
                category: item.category,
                price,
                market_avg: Math.round(matchingIntel.avg_price),
                deviation: `${Math.round((price / matchingIntel.avg_price - 1) * 100)}% above average`,
              });
            } else if (price < matchingIntel.avg_price * 0.5) {
              anomalies.push({
                type: "underpriced",
                category: item.category,
                price,
                market_avg: Math.round(matchingIntel.avg_price),
                deviation: `${Math.round((1 - price / matchingIntel.avg_price) * 100)}% below average`,
              });
            }
          }
        }
      }

      // Log the report
      await supabase.from("agent_activity_log").insert({
        agent_id: agentId,
        event_type: "market_report",
        message: `Market report: ${Object.keys(categoryStats).length} categories, ${anomalies.length} anomalies detected`,
        metadata: { categories: Object.keys(categoryStats).length, anomalies: anomalies.length },
      });

      if (anomalies.length > 0) {
        await supabase.from("agent_activity_log").insert({
          agent_id: agentId,
          event_type: "anomaly_detected",
          message: `Found ${anomalies.length} pricing anomaly/anomalies`,
          metadata: { anomalies },
        });
      }

      await supabase.from("agents").update({ last_run_at: new Date().toISOString() }).eq("id", agentId);

      return new Response(JSON.stringify({
        message: "Market intelligence report generated",
        summary: categoryStats,
        historical: intel,
        anomalies,
        active_listings: activeListings?.length || 0,
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

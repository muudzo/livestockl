import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getUserPrimaryTenant } from "../_shared/tenant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  test: string;
  status: "pass" | "fail" | "warn";
  message: string;
  duration_ms: number;
  details?: any;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const { scenario } = await req.json();
    const results: TestResult[] = [];

    // =========================================
    // SCENARIO: concurrent_bids
    // Tests race conditions in bid placement
    // =========================================
    if (scenario === "concurrent_bids" || scenario === "all") {
      const start = Date.now();
      let testListingId: string | null = null;
      let testBidIds: string[] = [];

      try {
        // Get 3 users to act as seller + bidders
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .limit(3);

        if (!users || users.length < 2) {
          results.push({ test: "concurrent_bids", status: "warn", message: "Need at least 2 users in profiles table", duration_ms: Date.now() - start });
        } else {
          const sellerId = users[0].id;
          const bidderIds = users.slice(1);

          const testTenantId = await getUserPrimaryTenant(supabase, sellerId);
          if (!testTenantId) {
            results.push({ test: "concurrent_bids", status: "warn", message: "Seller has no tenant membership", duration_ms: Date.now() - start });
            // fall through to the next scenario; remaining setup below is skipped via the listing-null guard
          }

          // Create a temporary test listing (expires in 1 hour)
          const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const { data: listing, error: listingErr } = await supabase
            .from("livestock_items")
            .insert({
              title: "__CHAOS_TEST_LISTING__",
              category: "Cattle",
              breed: "Test Breed",
              age: "2 years",
              weight: "400kg",
              description: "Temporary listing for chaos test — will be cleaned up",
              location: "Harare",
              health: "Excellent",
              starting_price: 100,
              current_bid: 0,
              bid_count: 0,
              view_count: 0,
              image_urls: [],
              seller_id: sellerId,
              tenant_id: testTenantId,
              status: "active",
              duration_days: 1,
              end_time: endTime,
            })
            .select("id, current_bid, starting_price, seller_id, tenant_id")
            .single();

          if (listingErr || !listing) {
            results.push({ test: "concurrent_bids", status: "fail", message: `Failed to create test listing: ${listingErr?.message}`, duration_ms: Date.now() - start });
          } else {
            testListingId = listing.id;
            const baseBid = listing.starting_price + 10;

            // Fire 5 concurrent bids at the same listing
            const bidPromises = Array.from({ length: 5 }, (_, i) =>
              supabase.from("bids").insert({
                livestock_id: listing.id,
                user_id: bidderIds[i % bidderIds.length].id,
                tenant_id: listing.tenant_id,
                amount: baseBid + i * 5,
              }).select("id").single()
            );

            const bidResults = await Promise.allSettled(bidPromises);
            const successes = bidResults.filter(r => r.status === "fulfilled" && !(r.value as any).error).length;
            const failures = bidResults.filter(r => r.status === "rejected" || (r.status === "fulfilled" && (r.value as any).error)).length;

            // Collect bid IDs for cleanup
            for (const r of bidResults) {
              if (r.status === "fulfilled" && (r.value as any).data?.id) {
                testBidIds.push((r.value as any).data.id);
              }
            }

            // Sync the listing to reflect actual highest bid
            await (supabase.rpc as any)("sync_listing_bid", { p_livestock_id: listing.id });

            // Check: current_bid should be the highest bid
            const { data: updated } = await supabase
              .from("livestock_items")
              .select("current_bid, bid_count")
              .eq("id", listing.id)
              .single();

            const { data: highestBid } = await supabase
              .from("bids")
              .select("amount")
              .eq("livestock_id", listing.id)
              .order("amount", { ascending: false })
              .limit(1)
              .single();

            const consistent = updated && highestBid &&
              Math.abs(Number(updated.current_bid) - Number(highestBid.amount)) < 0.01;

            results.push({
              test: "concurrent_bids",
              status: consistent ? "pass" : "fail",
              message: consistent
                ? `${successes} concurrent bids placed. DB consistent (highest bid: US$${highestBid?.amount})`
                : `DB inconsistency! current_bid=${updated?.current_bid} but highest bid=${highestBid?.amount}`,
              duration_ms: Date.now() - start,
              details: { successes, failures, current_bid: updated?.current_bid, highest_bid: highestBid?.amount },
            });
          }
        }
      } finally {
        // Cleanup: delete test bids then test listing
        if (testBidIds.length > 0) {
          await supabase.from("bids").delete().in("id", testBidIds);
        }
        if (testListingId) {
          await supabase.from("livestock_items").delete().eq("id", testListingId);
        }
      }
    }

    // =========================================
    // SCENARIO: payment_chaos
    // Triggers multiple payments and checks retry/fallback behavior
    // =========================================
    if (scenario === "payment_chaos" || scenario === "all") {
      const start = Date.now();
      const paymentUrl = Deno.env.get("SUPABASE_URL") + "/functions/v1/payment-orchestrator";

      // Get an agent
      const { data: agent } = await supabase
        .from("agents")
        .select("id, user_id")
        .eq("agent_type", "buyer")
        .limit(1)
        .single();

      if (!agent) {
        results.push({ test: "payment_chaos", status: "warn", message: "No buyer agent found", duration_ms: Date.now() - start });
      } else {
        // Find listings to simulate payments for
        const { data: listings } = await supabase
          .from("livestock_items")
          .select("id, title, starting_price")
          .eq("status", "active")
          .limit(5);

        if (!listings?.length) {
          results.push({ test: "payment_chaos", status: "warn", message: "No listings for payment test", duration_ms: Date.now() - start });
        } else {
          // Fire 5 concurrent payment requests
          const payPromises = listings.map(l =>
            fetch(paymentUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "initiate_payment",
                agentId: agent.id,
                livestockId: l.id,
                amount: l.starting_price,
              }),
            }).then(r => r.json())
          );

          const payResults = await Promise.allSettled(payPromises);
          const paid = payResults.filter(r =>
            r.status === "fulfilled" && (r.value as any).status === "paid"
          ).length;
          const failed = payResults.filter(r =>
            r.status === "fulfilled" && (r.value as any).status === "failed"
          ).length;
          const errors = payResults.filter(r => r.status === "rejected").length;

          // Check for duplicate payment orders
          const { data: orders } = await supabase
            .from("agent_payment_orders")
            .select("livestock_id, count")
            .eq("agent_id", agent.id);

          const dupes = orders ? Object.values(
            orders.reduce((acc: any, o: any) => {
              acc[o.livestock_id] = (acc[o.livestock_id] || 0) + 1;
              return acc;
            }, {})
          ).filter((c: any) => c > 1).length : 0;

          // Check settlement ledger completeness
          const { data: ledgerCount } = await supabase
            .from("settlement_ledger")
            .select("id", { count: "exact", head: true });

          results.push({
            test: "payment_chaos",
            status: dupes === 0 ? "pass" : "fail",
            message: `${paid} paid, ${failed} failed, ${errors} errors. ${dupes} duplicate payment orders detected.`,
            duration_ms: Date.now() - start,
            details: { paid, failed, errors, duplicate_orders: dupes, total_ledger_entries: ledgerCount },
          });
        }
      }
    }

    // =========================================
    // SCENARIO: edge_cases
    // Tests boundary conditions
    // =========================================
    if (scenario === "edge_cases" || scenario === "all") {
      const start = Date.now();
      const edgeResults: any[] = [];

      // Test 1: Zero-amount bid (should fail)
      const { error: zeroBid } = await supabase
        .from("bids")
        .insert({ livestock_id: "00000000-0000-0000-0000-000000000000", user_id: "00000000-0000-0000-0000-000000000000", amount: 0 });
      edgeResults.push({ test: "zero_amount_bid", blocked: !!zeroBid, error: zeroBid?.message });

      // Test 2: Negative amount bid (should fail)
      const { error: negBid } = await supabase
        .from("bids")
        .insert({ livestock_id: "00000000-0000-0000-0000-000000000000", user_id: "00000000-0000-0000-0000-000000000000", amount: -100 });
      edgeResults.push({ test: "negative_amount_bid", blocked: !!negBid, error: negBid?.message });

      // Test 3: Agent goal with zero max_price (should fail)
      const { error: zeroGoal } = await supabase
        .from("agent_goals")
        .insert({ agent_id: "00000000-0000-0000-0000-000000000000", category: "Cattle", max_price: 0, quantity: 1 });
      edgeResults.push({ test: "zero_max_price_goal", blocked: !!zeroGoal, error: zeroGoal?.message });

      // Test 4: Invalid category (should fail check constraint)
      const { error: badCat } = await supabase
        .from("agent_goals")
        .insert({ agent_id: "00000000-0000-0000-0000-000000000000", category: "Dragons", max_price: 100, quantity: 1 });
      edgeResults.push({ test: "invalid_category", blocked: !!badCat, error: badCat?.message });

      // Test 5: Invalid agent_type (should fail check constraint)
      const { error: badType } = await supabase
        .from("agents")
        .insert({ user_id: "00000000-0000-0000-0000-000000000000", agent_type: "hacker", name: "Bad Agent" });
      edgeResults.push({ test: "invalid_agent_type", blocked: !!badType, error: badType?.message });

      const allBlocked = edgeResults.every(e => e.blocked);
      results.push({
        test: "edge_cases",
        status: allBlocked ? "pass" : "fail",
        message: allBlocked
          ? `All ${edgeResults.length} edge cases properly rejected by DB constraints`
          : `${edgeResults.filter(e => !e.blocked).length} edge cases NOT blocked!`,
        duration_ms: Date.now() - start,
        details: edgeResults,
      });
    }

    // Summary
    const passed = results.filter(r => r.status === "pass").length;
    const failed = results.filter(r => r.status === "fail").length;
    const warned = results.filter(r => r.status === "warn").length;

    return new Response(JSON.stringify({
      summary: { total: results.length, passed, failed, warnings: warned },
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

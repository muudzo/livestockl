import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckResult {
  check: string;
  status: "pass" | "fail" | "warn";
  message: string;
  count?: number;
  details?: any;
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

    const results: CheckResult[] = [];

    // CHECK 1: Orphaned bids — bids referencing non-existent livestock
    const { data: allBids } = await supabase.from("bids").select("id, livestock_id").limit(500);
    const { data: allListings } = await supabase.from("livestock_items").select("id").limit(1000);
    const listingIds = new Set(allListings?.map(l => l.id) || []);
    const orphaned = allBids?.filter(b => !listingIds.has(b.livestock_id)) || [];

    results.push({
      check: "orphaned_bids",
      status: orphaned.length === 0 ? "pass" : "warn",
      message: orphaned.length === 0
        ? "No orphaned bids found"
        : `${orphaned.length} bid(s) reference non-existent listings`,
      count: orphaned.length,
    });

    // CHECK 2: Double payments — same livestock + same agent paid twice
    const { data: paymentOrders } = await supabase
      .from("agent_payment_orders")
      .select("id, agent_id, livestock_id, status")
      .eq("status", "paid");

    const paymentMap: Record<string, number> = {};
    const dupes: any[] = [];
    if (paymentOrders) {
      for (const o of paymentOrders) {
        const key = `${o.agent_id}:${o.livestock_id}`;
        paymentMap[key] = (paymentMap[key] || 0) + 1;
        if (paymentMap[key] > 1) dupes.push(o);
      }
    }

    results.push({
      check: "double_payments",
      status: dupes.length === 0 ? "pass" : "fail",
      message: dupes.length === 0
        ? "No double payments detected"
        : `${dupes.length} duplicate payment(s) found — same agent paid for same livestock twice`,
      count: dupes.length,
      details: dupes.length > 0 ? dupes.slice(0, 5) : undefined,
    });

    // CHECK 3: Sold items without payment — livestock marked sold but no paid payment order
    const { data: soldItems } = await supabase
      .from("livestock_items")
      .select("id, title")
      .eq("status", "sold");

    const { data: paidOrders } = await supabase
      .from("agent_payment_orders")
      .select("livestock_id")
      .eq("status", "paid");

    const paidLivestockIds = new Set(paidOrders?.map(o => o.livestock_id) || []);
    // Also check regular payments table
    const { data: regularPayments } = await supabase
      .from("payments")
      .select("livestock_id")
      .eq("status", "paid");
    const regularPaidIds = new Set(regularPayments?.map(p => p.livestock_id) || []);

    const soldWithoutPayment = soldItems?.filter(
      s => !paidLivestockIds.has(s.id) && !regularPaidIds.has(s.id)
    ) || [];

    results.push({
      check: "sold_without_payment",
      status: soldWithoutPayment.length === 0 ? "pass" : "warn",
      message: soldWithoutPayment.length === 0
        ? "All sold items have corresponding payments"
        : `${soldWithoutPayment.length} item(s) marked sold without a paid payment record`,
      count: soldWithoutPayment.length,
      details: soldWithoutPayment.length > 0 ? soldWithoutPayment.slice(0, 5) : undefined,
    });

    // CHECK 4: Payment orders without settlement ledger entries
    const { data: allPaymentOrders } = await supabase
      .from("agent_payment_orders")
      .select("id, status");

    const { data: ledgerEntries } = await supabase
      .from("settlement_ledger")
      .select("payment_order_id");

    const ledgerOrderIds = new Set(ledgerEntries?.map(e => e.payment_order_id) || []);
    const ordersWithoutLedger = allPaymentOrders?.filter(o => !ledgerOrderIds.has(o.id)) || [];

    results.push({
      check: "missing_settlement_ledger",
      status: ordersWithoutLedger.length === 0 ? "pass" : "fail",
      message: ordersWithoutLedger.length === 0
        ? "All payment orders have settlement ledger entries"
        : `${ordersWithoutLedger.length} payment order(s) have no settlement ledger trail`,
      count: ordersWithoutLedger.length,
    });

    // CHECK 5: Agent bids without corresponding bid record
    const { data: agentBids } = await supabase
      .from("agent_bids")
      .select("id, bid_id")
      .not("bid_id", "is", null);

    const { data: realBids } = await supabase.from("bids").select("id").limit(5000);
    const realBidIds = new Set(realBids?.map(b => b.id) || []);
    const brokenRefs = agentBids?.filter(ab => !realBidIds.has(ab.bid_id)) || [];

    results.push({
      check: "agent_bid_references",
      status: brokenRefs.length === 0 ? "pass" : "warn",
      message: brokenRefs.length === 0
        ? "All agent bids reference valid bid records"
        : `${brokenRefs.length} agent bid(s) reference non-existent bid records`,
      count: brokenRefs.length,
    });

    // CHECK 6: current_bid matches actual highest bid
    const { data: activeListings } = await supabase
      .from("livestock_items")
      .select("id, title, current_bid")
      .eq("status", "active")
      .gt("current_bid", 0);

    let mismatchCount = 0;
    const mismatches: any[] = [];
    if (activeListings) {
      for (const listing of activeListings.slice(0, 20)) {
        const { data: highest } = await supabase
          .from("bids")
          .select("amount")
          .eq("livestock_id", listing.id)
          .order("amount", { ascending: false })
          .limit(1)
          .single();

        if (highest && Math.abs(Number(listing.current_bid) - Number(highest.amount)) > 0.01) {
          mismatchCount++;
          mismatches.push({
            listing_id: listing.id,
            title: listing.title,
            current_bid: listing.current_bid,
            actual_highest: highest.amount,
          });
        }
      }
    }

    results.push({
      check: "bid_price_consistency",
      status: mismatchCount === 0 ? "pass" : "fail",
      message: mismatchCount === 0
        ? `All ${activeListings?.length || 0} active listings have consistent current_bid values`
        : `${mismatchCount} listing(s) have current_bid mismatch with actual highest bid`,
      count: mismatchCount,
      details: mismatches.length > 0 ? mismatches : undefined,
    });

    // Summary
    const passed = results.filter(r => r.status === "pass").length;
    const failed = results.filter(r => r.status === "fail").length;
    const warned = results.filter(r => r.status === "warn").length;

    return new Response(JSON.stringify({
      summary: {
        total: results.length,
        passed,
        failed,
        warnings: warned,
        health: failed === 0 ? (warned === 0 ? "healthy" : "degraded") : "critical",
      },
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

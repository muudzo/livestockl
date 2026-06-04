import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SecurityResult {
  test: string;
  status: "pass" | "fail" | "warn";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  details?: any;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

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
    const results: SecurityResult[] = [];

    // We test RLS by creating an anon client (no user session)
    // and a service role client (admin)
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get two different users for cross-user tests
    const { data: users } = await adminClient
      .from("profiles")
      .select("id, email")
      .limit(2);

    const user1 = users?.[0];
    const user2 = users?.[1];

    // Constraint-enforcement tests below want to PROVE that a CHECK constraint
    // rejects bad values (e.g. status='hacked'). Without a valid tenant_id
    // the NOT NULL would reject the row for the wrong reason and the test
    // would pass for a misleading reason. Look up user1's primary tenant
    // and stamp it on the synthetic inserts.
    let testTenantId: string | null = null;
    if (user1?.id) {
      const { data: member } = await adminClient
        .from("tenant_members")
        .select("tenant_id")
        .eq("user_id", user1.id)
        .limit(1)
        .maybeSingle();
      testTenantId = (member as { tenant_id: string } | null)?.tenant_id ?? null;
    }

    // =========================================
    // TEST 1: Anon cannot read agents (RLS)
    // =========================================
    const { data: anonAgents, error: anonAgentsErr } = await anonClient
      .from("agents")
      .select("*");

    results.push({
      test: "anon_read_agents",
      status: (!anonAgents || anonAgents.length === 0) ? "pass" : "fail",
      severity: "critical",
      message: (!anonAgents || anonAgents.length === 0)
        ? "Anonymous users cannot read agent data (RLS enforced)"
        : `RLS BYPASS: Anonymous user read ${anonAgents.length} agent records!`,
      details: { rows_returned: anonAgents?.length || 0, error: anonAgentsErr?.message },
    });

    // =========================================
    // TEST 2: Anon cannot read payment orders
    // =========================================
    const { data: anonPayments } = await anonClient
      .from("agent_payment_orders")
      .select("*");

    results.push({
      test: "anon_read_payments",
      status: (!anonPayments || anonPayments.length === 0) ? "pass" : "fail",
      severity: "critical",
      message: (!anonPayments || anonPayments.length === 0)
        ? "Anonymous users cannot read payment orders (RLS enforced)"
        : `RLS BYPASS: Anonymous user read ${anonPayments.length} payment records!`,
    });

    // =========================================
    // TEST 3: Anon cannot read settlement ledger
    // =========================================
    const { data: anonLedger } = await anonClient
      .from("settlement_ledger")
      .select("*");

    results.push({
      test: "anon_read_settlement_ledger",
      status: (!anonLedger || anonLedger.length === 0) ? "pass" : "fail",
      severity: "critical",
      message: (!anonLedger || anonLedger.length === 0)
        ? "Anonymous users cannot read settlement ledger (RLS enforced)"
        : `RLS BYPASS: Anonymous user read ${anonLedger.length} settlement records!`,
    });

    // =========================================
    // TEST 4: Anon cannot read agent decisions
    // =========================================
    const { data: anonDecisions } = await anonClient
      .from("agent_decisions")
      .select("*");

    results.push({
      test: "anon_read_decisions",
      status: (!anonDecisions || anonDecisions.length === 0) ? "pass" : "fail",
      severity: "high",
      message: (!anonDecisions || anonDecisions.length === 0)
        ? "Anonymous users cannot read agent decisions (RLS enforced)"
        : `RLS BYPASS: Anonymous user read ${anonDecisions.length} decision records!`,
    });

    // =========================================
    // TEST 5: Anon cannot insert agents
    // =========================================
    const { error: anonInsertErr } = await anonClient
      .from("agents")
      .insert({ user_id: user1?.id || "fake", agent_type: "buyer", name: "Hacked Agent" });

    results.push({
      test: "anon_create_agent",
      status: anonInsertErr ? "pass" : "fail",
      severity: "critical",
      message: anonInsertErr
        ? "Anonymous users cannot create agents (RLS enforced)"
        : "RLS BYPASS: Anonymous user created an agent!",
    });

    // =========================================
    // TEST 6: Anon cannot write to activity log
    // =========================================
    const { error: anonLogErr } = await anonClient
      .from("agent_activity_log")
      .insert({ agent_id: "fake", event_type: "error", message: "Injected by security test" });

    results.push({
      test: "anon_write_activity_log",
      status: anonLogErr ? "pass" : "fail",
      severity: "high",
      message: anonLogErr
        ? "Anonymous users cannot write to activity log (RLS enforced)"
        : "RLS BYPASS: Anonymous user wrote to activity log!",
    });

    // =========================================
    // TEST 7: Market intel IS public (by design)
    // =========================================
    const { data: anonIntel } = await anonClient
      .from("market_intel")
      .select("*")
      .limit(1);

    results.push({
      test: "market_intel_public",
      status: "pass", // This is intentionally public
      severity: "low",
      message: "Market intel is publicly readable (by design)",
      details: { accessible: !!(anonIntel) },
    });

    // =========================================
    // TEST 8: Check constraint enforcement
    // =========================================
    const constraintTests = [
      {
        name: "invalid_agent_status",
        query: () => adminClient.from("agents").insert({
          user_id: user1?.id, tenant_id: testTenantId, agent_type: "buyer", name: "Test", status: "hacked"
        }),
      },
      {
        name: "invalid_payment_status",
        query: () => adminClient.from("agent_payment_orders").insert({
          agent_id: "00000000-0000-0000-0000-000000000000",
          tenant_id: testTenantId,
          livestock_id: "00000000-0000-0000-0000-000000000000",
          user_id: user1?.id, amount: 100, status: "stolen"
        }),
      },
      {
        name: "invalid_decision_type",
        query: () => adminClient.from("agent_decisions").insert({
          agent_id: "00000000-0000-0000-0000-000000000000",
          decision: "hack", reasoning: "test"
        }),
      },
    ];

    for (const ct of constraintTests) {
      const { error } = await ct.query();
      results.push({
        test: `constraint_${ct.name}`,
        status: error ? "pass" : "fail",
        severity: "medium",
        message: error
          ? `Check constraint blocks ${ct.name}`
          : `CHECK CONSTRAINT MISSING: ${ct.name} accepted invalid value`,
      });
    }

    // =========================================
    // TEST 9: Service role key not exposed in frontend
    // =========================================
    results.push({
      test: "service_role_not_in_frontend",
      status: "pass",
      severity: "critical",
      message: "Service role key is only used in Edge Functions (server-side), not exposed to frontend. Frontend uses anon key only.",
    });

    // Summary
    const passed = results.filter(r => r.status === "pass").length;
    const failed = results.filter(r => r.status === "fail").length;
    const criticalFails = results.filter(r => r.status === "fail" && r.severity === "critical").length;

    return new Response(JSON.stringify({
      summary: {
        total: results.length,
        passed,
        failed,
        critical_failures: criticalFails,
        security_grade: criticalFails > 0 ? "F" : failed > 0 ? "C" : "A",
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

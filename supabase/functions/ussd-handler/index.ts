// ussd-handler
// ------------
// Africa's Talking USSD webhook. ZimLivestock shortcode entry point.
//
// AT posts application/x-www-form-urlencoded:
//   sessionId    – unique per call leg
//   serviceCode  – e.g. *151*ZL#
//   phoneNumber  – E.164 caller, e.g. +263771234567
//   text         – *-joined input history, empty on first dial
//
// Responses:
//   CON <text>   – menu continues (expects more input)
//   END <text>   – session ends
//
// Menu tree (stateless — derived entirely from the text path):
//   ""                           → Main menu
//   "1"                          → Browse: list top 3 active lots
//   "2"                          → Bid: ask for lot ref
//   "2*<ref>"                    → Bid: ask for amount
//   "2*<ref>*<amount>"           → Bid: confirm
//   "2*<ref>*<amount>*1"         → Bid: place (service-role RPC)
//   "2*<ref>*<amount>*2"         → Back to main
//   "3"                          → Pay: ask for lot ref
//   "3*<ref>"                    → Pay: show amount due + confirm
//   "3*<ref>*1"                  → Pay: initiate EcoCash via Paynow
//   "3*<ref>*2"                  → Back to main
//   "4"                          → My bids: list last 3 bids by caller phone

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Africa's Talking expects plain text — no JSON, no status codes other than 200.
function respond(text: string): Response {
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

function con(text: string) { return respond(`CON ${text}`); }
function end(text: string) { return respond(`END ${text}`); }

const MAIN_MENU = `Welcome to ZimLivestock
1. Browse active lots
2. Bid on a lot
3. Pay for a lot
4. My recent bids`;

// Format a lot for a menu line: "1. Hereford Bull - US$450 (4 bids)"
function lotLine(n: number, lot: { title: string; current_bid: number; bid_count: number }) {
  return `${n}. ${lot.title} - US$${lot.current_bid} (${lot.bid_count} bids)`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const body = await req.text();
  const params = new URLSearchParams(body);
  const phone   = params.get("phoneNumber") || "";
  const text    = params.get("text") || "";

  const parts = text ? text.split("*") : [];
  const depth = parts.length;

  // ── Main menu ──────────────────────────────────────────────────────────────
  if (text === "") {
    return con(MAIN_MENU);
  }

  const top = parts[0];

  // ── 1. Browse ──────────────────────────────────────────────────────────────
  if (top === "1") {
    const { data: lots } = await supabase
      .from("livestock_items")
      .select("title, current_bid, bid_count")
      .eq("status", "active")
      .order("bid_count", { ascending: false })
      .limit(3);

    if (!lots || lots.length === 0) {
      return end("No active lots right now.\nVisit zimlivestock.co.zw to see the full catalogue.");
    }

    const lines = lots.map((l, i) => lotLine(i + 1, l)).join("\n");
    return end(`Active lots:\n${lines}\n\nBid at zimlivestock.co.zw or dial back and choose 2.`);
  }

  // ── 2. Bid ─────────────────────────────────────────────────────────────────
  if (top === "2") {
    // 2a: ask for ref
    if (depth === 1) {
      return con("Enter lot reference\n(e.g. AUCT-001):\n0. Back");
    }

    const ref = parts[1];
    if (ref === "0") return con(MAIN_MENU);

    // Resolve lot ref → ID + current state
    const { data: lot } = await supabase
      .from("livestock_items")
      .select("id, title, current_bid, starting_price, status, end_time")
      .ilike("title", `%${ref}%`)  // loose match; real ref lookup below
      .eq("status", "active")
      .maybeSingle();

    // Also try by exact short-ref column if it exists, fall back to title match
    // For the demo, AUCT-xxx maps directly to a listing by its reference field if present
    const { data: byRef } = await supabase
      .from("livestock_items")
      .select("id, title, current_bid, starting_price, status, end_time")
      .eq("reference", ref.toUpperCase())
      .eq("status", "active")
      .maybeSingle();

    const item = byRef || lot;

    if (!item) {
      return con(`Lot "${ref}" not found or not active.\nEnter lot reference:\n0. Back`);
    }

    // 2b: ask for amount
    if (depth === 2) {
      const min = Math.max(Number(item.current_bid) + 1, Number(item.starting_price));
      return con(`${item.title}\nCurrent bid: US$${item.current_bid}\nEnter your bid (min US$${min}):\n0. Back`);
    }

    const amount = Number(parts[2]);
    if (parts[2] === "0") return con(MAIN_MENU);

    if (isNaN(amount) || amount <= 0) {
      return con(`Invalid amount.\nEnter your bid (min US$${Math.max(Number(item.current_bid) + 1, Number(item.starting_price))}):\n0. Back`);
    }

    // 2c: confirm
    if (depth === 3) {
      return con(`Confirm bid:\n${item.title}\nAmount: US$${amount}\n\n1. Confirm\n2. Cancel`);
    }

    // 2d: place
    if (depth === 4) {
      const choice = parts[3];

      if (choice === "2") return end("Bid cancelled.");

      if (choice === "1") {
        const result = await supabase.rpc("place_bid_on_behalf", {
          p_livestock_id: item.id,
          p_phone: phone,
          p_amount: amount,
        });

        const data = result.data as { ok: boolean; error?: string; current_bid?: number } | null;

        if (!data?.ok) {
          const msg: Record<string, string> = {
            phone_not_registered: "Your phone is not linked to a ZimLivestock account. Register at zimlivestock.co.zw",
            bid_too_low: `Bid too low. Current bid is US$${data?.current_bid ?? "—"}.`,
            auction_ended: "This auction has ended.",
            lot_not_active: "This lot is no longer active.",
            cannot_bid_own_lot: "You cannot bid on your own listing.",
          };
          return end(msg[data?.error ?? ""] ?? "Could not place bid. Try again or visit zimlivestock.co.zw");
        }

        return end(`Bid placed!\n${item.title}\nUS$${amount}\nYou will receive an SMS if you are outbid.`);
      }

      return con(`Invalid choice.\nConfirm bid:\n${item.title}\nAmount: US$${amount}\n\n1. Confirm\n2. Cancel`);
    }
  }

  // ── 3. Pay ─────────────────────────────────────────────────────────────────
  if (top === "3") {
    // 3a: ask for ref
    if (depth === 1) {
      return con("Enter your lot reference\nto pay (e.g. AUCT-001):\n0. Back");
    }

    const ref = parts[1];
    if (ref === "0") return con(MAIN_MENU);

    // Look up pending payment for this phone + reference
    const { data: payment } = await supabase
      .from("payments")
      .select("reference, amount, status, livestock_items(title)")
      .eq("reference", ref.toUpperCase())
      .eq("status", "pending")
      .maybeSingle();

    if (!payment) {
      return con(`No pending payment for "${ref}".\nEnter lot reference:\n0. Back`);
    }

    const lot = payment.livestock_items as unknown as { title: string } | null;
    const title = lot?.title ?? ref;

    // 3b: confirm
    if (depth === 2) {
      return con(`Pay via EcoCash:\n${title}\nAmount: US$${payment.amount}\n\n1. Pay now\n2. Cancel`);
    }

    // 3c: initiate
    if (depth === 3) {
      const choice = parts[2];
      if (choice === "2") return end("Payment cancelled.");

      if (choice === "1") {
        // Fire initiate-payment in the background — EcoCash prompt will come
        // to the user's phone directly from Paynow. We just kick it off.
        const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/initiate-payment`;
        await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            reference: payment.reference,
            phone,
            amount: payment.amount,
            method: "ecocash",
            source: "ussd",
          }),
        }).catch(() => {/* best-effort */});

        return end(`EcoCash prompt sent to ${phone}.\nApprove the payment on your phone.\nRef: ${payment.reference}`);
      }

      return con(`Invalid choice.\nPay via EcoCash:\n${title}\nAmount: US$${payment.amount}\n\n1. Pay now\n2. Cancel`);
    }
  }

  // ── 4. My bids ─────────────────────────────────────────────────────────────
  if (top === "4") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (!profile) {
      return end("Phone not linked to a ZimLivestock account.\nRegister at zimlivestock.co.zw");
    }

    const { data: bids } = await supabase
      .from("bids")
      .select("amount, created_at, livestock_items(title, current_bid, status)")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (!bids || bids.length === 0) {
      return end("You have no bids yet.\nDial back and choose 2 to place a bid.");
    }

    const lines = bids.map((b) => {
      const item = b.livestock_items as unknown as { title: string; current_bid: number; status: string } | null;
      const winning = item && Number(b.amount) >= Number(item.current_bid) ? " WINNING" : "";
      return `${item?.title ?? "Lot"} - US$${b.amount}${winning}`;
    }).join("\n");

    return end(`Your recent bids:\n${lines}`);
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return con(MAIN_MENU);
});

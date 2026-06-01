import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ZimLivestock WhatsApp bot — official Meta Cloud API, seller-side lifecycle.
 *
 * Replaces the whatsapp-web.js demo bot. Because this runs on the Cloud API we
 * can send interactive *list messages* and *image-header button cards*, so the
 * seller taps rows and buttons instead of typing option numbers.
 *
 * Seller lifecycle:
 *   list an animal -> in-chat push when a bid lands -> accept the top bid
 *   (closes the auction to the buyer) -> in-chat push when the buyer pays ->
 *   trigger delivery.
 *
 * Two entry points on one function:
 *   - Webhook  (Meta -> us):     GET verify + POST messages, x-hub-signature-256.
 *   - /notify  (internal -> us): bid/payment/delivery pushes from a pg_net
 *                                trigger and payment-webhook. Bearer = CRON_SECRET
 *                                or service-role. Sends interactive WhatsApp if
 *                                the seller is inside the 24h window, else SMS.
 *
 * Required env:
 *   WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN,
 *   WHATSAPP_APP_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional env:
 *   APP_URL, CRON_SECRET, LISTING_DURATION_DAYS
 *
 * With no WHATSAPP_ACCESS_TOKEN the send layer runs in SIM mode (logs payloads),
 * so the whole flow is testable locally with simulated webhook bodies.
 */

const GRAPH_API = "https://graph.facebook.com/v21.0";
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://zimlivestock.co.zw").replace(/\/$/, "");
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const LISTING_DURATION_DAYS = Number(Deno.env.get("LISTING_DURATION_DAYS") ?? 7);

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CATEGORIES = ["Cattle", "Goats", "Sheep", "Pigs", "Chickens", "Other"];
// Same 8 cities (and coords) as get-transport-quote, so pickup geocoding lines up.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Harare:   { lat: -17.8292, lng: 31.0522 },
  Bulawayo: { lat: -20.1325, lng: 28.6264 },
  Mutare:   { lat: -18.9707, lng: 32.6709 },
  Masvingo: { lat: -20.0696, lng: 30.8277 },
  Gweru:    { lat: -19.4500, lng: 29.8167 },
  Chinhoyi: { lat: -17.3617, lng: 30.2000 },
  Kadoma:   { lat: -18.3419, lng: 29.9103 },
  Kwekwe:   { lat: -18.9281, lng: 29.8131 },
};
const LOCATIONS = Object.keys(CITY_COORDS);
const WINDOW_MS = 24 * 60 * 60 * 1000; // WhatsApp customer-service window

type Seller = { id: string; first_name: string; phone: string; tenant_id: string | null };

// ── WhatsApp Cloud API send layer ─────────────────────────────────────────────

async function send(to: string, message: Record<string, unknown>): Promise<void> {
  const payload = { messaging_product: "whatsapp", recipient_type: "individual", to, ...message };
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log(`[WA-CLOUD SIM] To:${to}`, JSON.stringify(payload));
    return;
  }
  const res = await fetch(`${GRAPH_API}/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error("[WA-CLOUD] Graph API error", res.status, await res.text());
}

const sendText = (to: string, body: string) => send(to, { type: "text", text: { body } });

type Btn = { id: string; title: string };

// Interactive reply buttons (max 3, titles <= 20 chars). Optional image header
// turns this into a card — a row of these is our in-session "carousel".
export function sendButtons(to: string, body: string, buttons: Btn[], imageUrl?: string) {
  const interactive: Record<string, unknown> = {
    type: "button",
    body: { text: body.slice(0, 1024) },
    action: {
      buttons: buttons.slice(0, 3).map((b) => ({
        type: "reply",
        reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
      })),
    },
  };
  if (imageUrl) interactive.header = { type: "image", image: { link: imageUrl } };
  return send(to, { type: "interactive", interactive });
}

type Row = { id: string; title: string; description?: string };

// Interactive list message (max 10 rows total). This is the "list" primitive
// that replaces typed/numbered menus.
export function sendList(to: string, body: string, buttonLabel: string, rows: Row[]) {
  return send(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{
          rows: rows.slice(0, 10).map((r) => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        }],
      },
    },
  });
}

// ── Signature verification (x-hub-signature-256) ──────────────────────────────

async function verifySignature(rawBody: string, sig: string | null): Promise<boolean> {
  if (!APP_SECRET) return true; // dev mode
  if (!sig?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === sig.slice(7);
}

// ── Phone + seller resolution ─────────────────────────────────────────────────

// wa_id arrives as international digits (263771234567). profiles.phone is stored
// in mixed formats, so match against every plausible variant.
export function phoneVariants(waId: string): string[] {
  const digits = waId.replace(/\D/g, "");
  const set = new Set<string>([waId, digits, `+${digits}`]);
  let local = digits;
  if (local.startsWith("263")) local = "0" + local.slice(3);
  else if (!local.startsWith("0")) local = "0" + local;
  set.add(local);
  set.add(`263${local.slice(1)}`);
  set.add(`+263${local.slice(1)}`);
  return [...set];
}

async function resolveSeller(waId: string): Promise<Seller | null> {
  const { data } = await sb
    .from("profiles").select("id, first_name, phone")
    .in("phone", phoneVariants(waId)).limit(1);
  const p = data?.[0];
  if (!p) return null;

  const { data: tm } = await sb
    .from("tenant_members").select("tenant_id")
    .eq("user_id", p.id).order("joined_at", { ascending: true }).limit(1);
  let tenant_id = (tm?.[0]?.tenant_id as string | undefined) ?? null;
  if (!tenant_id) {
    const { data: t } = await sb.from("tenants").select("id").eq("slug", "zimlivestock-demo").maybeSingle();
    tenant_id = (t?.id as string | undefined) ?? null;
  }
  return { id: p.id as string, first_name: (p.first_name as string) || "there", phone: p.phone as string, tenant_id };
}

// ── Session + logging ─────────────────────────────────────────────────────────

type Session = { wa_id: string; state: string; draft: Record<string, unknown> };

async function getSession(waId: string, seller: Seller | null): Promise<Session> {
  const { data } = await sb.from("wa_cloud_sessions").select("*").eq("wa_id", waId).maybeSingle();
  if (!data) {
    await sb.from("wa_cloud_sessions").insert({
      wa_id: waId, state: "MENU", draft: {}, user_id: seller?.id ?? null, tenant_id: seller?.tenant_id ?? null,
    });
    return { wa_id: waId, state: "MENU", draft: {} };
  }
  // Keep the linked account current.
  await sb.from("wa_cloud_sessions").update({
    last_inbound_at: new Date().toISOString(), user_id: seller?.id ?? data.user_id, tenant_id: seller?.tenant_id ?? data.tenant_id,
  }).eq("wa_id", waId);
  return { wa_id: waId, state: (data.state as string) ?? "MENU", draft: (data.draft as Record<string, unknown>) ?? {} };
}

async function setState(waId: string, state: string, draft: Record<string, unknown>) {
  await sb.from("wa_cloud_sessions").update({ state, draft, updated_at: new Date().toISOString() }).eq("wa_id", waId);
}

function logMsg(waId: string, direction: "inbound" | "outbound", msgType: string, body?: string, payload?: string, stateBefore?: string) {
  return sb.from("wa_cloud_message_log").insert({ wa_id: waId, direction, msg_type: msgType, body, payload, state_before: stateBefore }).then(() => {});
}

// ── Menu + help ───────────────────────────────────────────────────────────────

async function showMenu(waId: string, seller: Seller) {
  await setState(waId, "MENU", {});
  await sendButtons(waId,
    `Hi ${seller.first_name}! This is ZimLivestock. Sell an animal and manage your sales right here in WhatsApp.`,
    [
      { id: "MENU_SELL", title: "List an animal" },
      { id: "MENU_LISTINGS", title: "My listings" },
      { id: "MENU_HELP", title: "Help" },
    ]);
}

const HELP =
  "ZimLivestock seller bot:\n\n" +
  "• *List an animal* — post a new lot for auction\n" +
  "• *My listings* — see your active lots, accept the top bid\n" +
  "• When a bid lands I'll message you here\n" +
  "• When the buyer pays I'll help you arrange delivery\n\n" +
  "Send *menu* anytime to start over.";

// ── Sell flow (list / button driven) ──────────────────────────────────────────

async function startSell(waId: string) {
  await setState(waId, "SELL_CATEGORY", {});
  await sendList(waId, "Let's list your animal for auction. What are you selling?", "Choose type",
    CATEGORIES.map((c) => ({ id: `CAT:${c}`, title: c })));
}

async function handleCategory(waId: string, payload: string, text: string, draft: Record<string, unknown>) {
  const category = payload.startsWith("CAT:") ? payload.slice(4)
    : CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? "";
  if (!category) {
    await sendList(waId, "Please pick a type from the list:", "Choose type",
      CATEGORIES.map((c) => ({ id: `CAT:${c}`, title: c })));
    return;
  }
  await setState(waId, "SELL_BREED", { ...draft, category });
  await sendText(waId, `What breed is your ${category.toLowerCase()}? (e.g. "Brahman", "Nguni", "Local")`);
}

async function handleBreed(waId: string, text: string, draft: Record<string, unknown>) {
  const breed = text.trim();
  if (breed.length < 2 || breed.length > 40) {
    await sendText(waId, "Please type the breed name (2–40 characters).");
    return;
  }
  await setState(waId, "SELL_LOCATION", { ...draft, breed });
  await sendList(waId, "Where is the animal located?", "Choose city",
    LOCATIONS.map((l) => ({ id: `LOC:${l}`, title: l })));
}

async function handleLocation(waId: string, payload: string, text: string, draft: Record<string, unknown>) {
  const location = payload.startsWith("LOC:") ? payload.slice(4)
    : LOCATIONS.find((l) => l.toLowerCase() === text.toLowerCase()) ?? "";
  if (!location) {
    await sendList(waId, "Please pick a city from the list:", "Choose city",
      LOCATIONS.map((l) => ({ id: `LOC:${l}`, title: l })));
    return;
  }
  await setState(waId, "SELL_WEIGHT", { ...draft, location });
  await sendText(waId, "Roughly how much does it weigh, in kg? (numbers only — e.g. 320)");
}

async function handleWeight(waId: string, text: string, draft: Record<string, unknown>) {
  const kg = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (isNaN(kg) || kg <= 0 || kg > 5000) {
    await sendText(waId, "Please enter a valid weight in kg (e.g. 320).");
    return;
  }
  await setState(waId, "SELL_PRICE", { ...draft, weight_kg: kg });
  await sendText(waId, "What starting price? (US$, numbers only — e.g. 450)");
}

async function handlePrice(waId: string, text: string, draft: Record<string, unknown>) {
  const price = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (isNaN(price) || price <= 0 || price > 1_000_000) {
    await sendText(waId, "Please enter a valid starting price (e.g. 450 or 1200).");
    return;
  }
  await setState(waId, "SELL_DELIVERY", { ...draft, starting_price: price });
  await sendButtons(waId, "Do you offer delivery to the buyer? (We'll quote distance-based transport.)",
    [{ id: "DELIV_YES", title: "Yes, I deliver" }, { id: "DELIV_NO", title: "No" }]);
}

async function handleDelivery(waId: string, payload: string, draft: Record<string, unknown>) {
  const transport = payload === "DELIV_YES";
  const next: Record<string, unknown> = { ...draft, transport_available: transport };
  await setState(waId, "SELL_CONFIRM", next);
  const summary = [
    "Here's your listing:",
    "",
    `Type: ${next.category}`,
    `Breed: ${next.breed}`,
    `Location: ${next.location}`,
    `Weight: ${next.weight_kg} kg`,
    `Starting price: US$${next.starting_price}`,
    `Delivery: ${transport ? "Yes" : "No"}`,
    `Runs for: ${LISTING_DURATION_DAYS} days`,
    "",
    "Post it?",
  ].join("\n");
  await sendButtons(waId, summary, [{ id: "CONFIRM_SELL", title: "Post it" }, { id: "CANCEL", title: "Cancel" }]);
}

async function handleConfirm(waId: string, seller: Seller, draft: Record<string, unknown>) {
  const transport = draft.transport_available === true;
  const coords = CITY_COORDS[String(draft.location)];
  const endTime = new Date(Date.now() + LISTING_DURATION_DAYS * 86_400_000).toISOString();

  const { data: listing, error } = await sb
    .from("livestock_items")
    .insert({
      title: `${draft.breed} ${draft.category}`,
      category: draft.category,
      breed: draft.breed,
      age: "Not specified",
      weight: `${draft.weight_kg} kg`,
      description: `${draft.breed} ${draft.category} listed via WhatsApp. Message the seller for more details.`,
      location: draft.location,
      health: "Good",
      starting_price: draft.starting_price,
      seller_id: seller.id,
      tenant_id: seller.tenant_id,
      duration_days: LISTING_DURATION_DAYS,
      end_time: endTime,
      transport_available: transport,
      pickup_lat: transport ? coords?.lat ?? null : null,
      pickup_lng: transport ? coords?.lng ?? null : null,
    })
    .select("id, reference")
    .single();

  await setState(waId, "MENU", {});

  if (error || !listing) {
    console.error("[WA-CLOUD] listing insert error", error?.message);
    await sendText(waId, "Something went wrong creating your listing. Please try again, or post on the website.");
    return;
  }
  await sendButtons(waId,
    `Done — ${listing.reference} is live for ${LISTING_DURATION_DAYS} days! I'll message you here the moment a bid lands. Add photos on the website.`,
    [{ id: `EDIT:${listing.id}`, title: "Add photos" }, { id: "MENU_LISTINGS", title: "My listings" }]);
}

// ── My listings (image-card carousel) + bids ──────────────────────────────────

function priceLine(l: Record<string, unknown>): string {
  const bid = Number(l.current_bid ?? 0), bids = Number(l.bid_count ?? 0);
  return bid > 0 ? `US$${bid} top bid (${bids} bid${bids === 1 ? "" : "s"})` : `Starting US$${Number(l.starting_price ?? 0)}`;
}

function timeLeft(endTime: string): string {
  const h = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 3_600_000));
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h`;
}

async function showMyListings(waId: string, seller: Seller) {
  await setState(waId, "MENU", {});
  const { data: listings } = await sb
    .from("livestock_items")
    .select("id, title, location, starting_price, current_bid, bid_count, image_urls, end_time, reference")
    .eq("seller_id", seller.id).eq("status", "active")
    .order("created_at", { ascending: false }).limit(5);

  if (!listings?.length) {
    await sendButtons(waId, "You have no active listings right now.", [{ id: "MENU_SELL", title: "List an animal" }]);
    return;
  }
  await sendText(waId, `You have ${listings.length} active listing${listings.length === 1 ? "" : "s"}. Tap a button on each to manage it:`);
  // One image-header button card per listing — a swipe-free carousel that, unlike
  // a WhatsApp carousel *template*, needs no Meta pre-approval and carries per-card actions.
  for (const l of listings) {
    const img = (l.image_urls as string[] | null)?.[0];
    const body = `${l.reference} • ${l.title}\n${priceLine(l)} • ${l.location}\nEnds in ${timeLeft(l.end_time as string)}`;
    await sendButtons(waId, body,
      [{ id: `ACCEPT:${l.id}`, title: "Accept top bid" }, { id: `VIEWBIDS:${l.id}`, title: "View bids" }], img || undefined);
  }
}

async function viewBids(waId: string, listingId: string, seller: Seller) {
  const { data: l } = await sb
    .from("livestock_items")
    .select("id, title, current_bid, bid_count, starting_price, end_time, seller_id, status")
    .eq("id", listingId).maybeSingle();
  if (!l || l.seller_id !== seller.id) {
    await sendText(waId, "That listing isn't one of yours.");
    return;
  }
  if (Number(l.bid_count ?? 0) === 0) {
    await sendButtons(waId, `No bids yet on ${l.title}. It runs for ${timeLeft(l.end_time as string)} more.`,
      [{ id: "MENU_LISTINGS", title: "My listings" }]);
    return;
  }
  await sendButtons(waId,
    `${l.title}\nTop bid: US$${l.current_bid} (${l.bid_count} bids)\nEnds in ${timeLeft(l.end_time as string)}\n\nAccept now to sell to the top bidder and ask them to pay.`,
    [{ id: `ACCEPT:${l.id}`, title: "Accept top bid" }, { id: "MENU_LISTINGS", title: "Back" }]);
}

async function acceptTopBid(waId: string, listingId: string, seller: Seller) {
  const { data, error } = await (sb.rpc as any)("accept_top_bid", { p_listing_id: listingId, p_seller_phone: seller.phone });
  const r = data as Record<string, unknown> | null;
  if (error || !r?.ok) {
    const code = (r?.error as string) ?? "error";
    const msg: Record<string, string> = {
      no_bids: "There are no bids to accept yet.",
      lot_not_active: "That auction is already closed.",
      not_seller: "That listing isn't one of yours.",
      lot_not_found: "I couldn't find that listing.",
    };
    await sendButtons(waId, msg[code] ?? "Couldn't accept that bid — please try again.", [{ id: "MENU_LISTINGS", title: "My listings" }]);
    return;
  }
  await sendButtons(waId,
    `Sold! ${r.title} goes to the top bidder for US$${r.amount}. I've asked them to pay — you'll get a message here the moment the money lands.`,
    [{ id: "MENU_LISTINGS", title: "My listings" }, { id: "MENU_SELL", title: "List another" }]);
}

// ── Delivery decision (after payment) ─────────────────────────────────────────

async function handleDeliveryDecision(waId: string, trId: string, accept: boolean, seller: Seller) {
  const { data: tr } = await sb
    .from("transport_requests")
    .select("id, status, dropoff_label, quote_usd, item_id, livestock_items!inner(seller_id, title)")
    .eq("id", trId).maybeSingle();
  const item = (tr?.livestock_items as unknown as { seller_id: string; title: string } | null);
  if (!tr || !item || item.seller_id !== seller.id) {
    await sendText(waId, "I couldn't find that delivery request.");
    return;
  }
  await sb.from("transport_requests").update({ status: accept ? "accepted" : "rejected" }).eq("id", trId);
  await sendButtons(waId,
    accept
      ? `Delivery confirmed for ${item.title} to ${tr.dropoff_label} (US$${tr.quote_usd}). Our transport partner will be in touch to arrange pickup.`
      : `No problem — delivery declined for ${item.title}. Please arrange handover with the buyer directly.`,
    [{ id: "MENU_LISTINGS", title: "My listings" }]);
}

// ── Inbound router ─────────────────────────────────────────────────────────────

async function handleInbound(message: Record<string, any>, value: Record<string, any>) {
  const waId: string = message.from;
  if (!waId) return;

  let text = "", payload = "", msgType = message.type ?? "text";
  if (message.type === "text") {
    text = (message.text?.body ?? "").trim();
  } else if (message.type === "interactive") {
    const i = message.interactive ?? {};
    if (i.type === "button_reply") { payload = i.button_reply?.id ?? ""; text = i.button_reply?.title ?? ""; }
    else if (i.type === "list_reply") { payload = i.list_reply?.id ?? ""; text = i.list_reply?.title ?? ""; }
  }

  const seller = await resolveSeller(waId);
  const session = await getSession(waId, seller);
  const { state, draft } = session;
  await logMsg(waId, "inbound", msgType, text || undefined, payload || undefined, state);

  // No linked account → can't act as a seller. Offer to register.
  if (!seller) {
    await sendButtons(waId,
      "This number isn't linked to a ZimLivestock account yet. Sign up (free) and your listings will sync here.",
      [{ id: "HELP", title: "Help" }]);
    if (payload === "HELP" || text.toLowerCase() === "help") await sendText(waId, `Register at ${APP_URL}/register`);
    return;
  }

  const lower = text.toLowerCase();
  // ── Global commands / payload routing ────────────────────────────────────
  if (["menu", "hi", "hello", "start", "hey"].includes(lower) || payload === "MENU") return showMenu(waId, seller);
  if (lower === "cancel" || payload === "CANCEL") { await setState(waId, "MENU", {}); return sendText(waId, "Cancelled. Send *menu* anytime."); }
  if (lower === "help" || payload === "MENU_HELP") return sendText(waId, HELP);
  if (payload === "MENU_SELL") return startSell(waId);
  if (payload === "MENU_LISTINGS") return showMyListings(waId, seller);
  if (payload.startsWith("CAT:")) return handleCategory(waId, payload, text, draft);
  if (payload.startsWith("LOC:")) return handleLocation(waId, payload, text, draft);
  if (payload === "DELIV_YES" || payload === "DELIV_NO") return handleDelivery(waId, payload, draft);
  if (payload === "CONFIRM_SELL") return handleConfirm(waId, seller, draft);
  if (payload.startsWith("ACCEPT:")) return acceptTopBid(waId, payload.slice(7), seller);
  if (payload.startsWith("VIEWBIDS:")) return viewBids(waId, payload.slice(9), seller);
  if (payload.startsWith("DELIV_ACCEPT:")) return handleDeliveryDecision(waId, payload.slice(13), true, seller);
  if (payload.startsWith("DELIV_DECLINE:")) return handleDeliveryDecision(waId, payload.slice(14), false, seller);
  if (payload.startsWith("EDIT:")) return sendText(waId, `Add photos & details here: ${APP_URL}/listing/${payload.slice(5)}`);

  // ── Free-text steps dispatched by state ──────────────────────────────────
  switch (state) {
    case "SELL_CATEGORY": return handleCategory(waId, payload, text, draft);
    case "SELL_BREED":    return handleBreed(waId, text, draft);
    case "SELL_LOCATION": return handleLocation(waId, payload, text, draft);
    case "SELL_WEIGHT":   return handleWeight(waId, text, draft);
    case "SELL_PRICE":    return handlePrice(waId, text, draft);
    default:              return showMenu(waId, seller);
  }
}

// ── Proactive notify endpoint (pg_net bid trigger + payment-webhook) ───────────

async function findSellerSession(sellerPhone: string): Promise<{ wa_id: string; user_id: string | null; inWindow: boolean } | null> {
  const { data: p } = await sb.from("profiles").select("id").in("phone", phoneVariants(sellerPhone)).limit(1);
  const sellerId = p?.[0]?.id as string | undefined;
  if (!sellerId) return null;
  const { data: s } = await sb
    .from("wa_cloud_sessions").select("wa_id, last_inbound_at, user_id")
    .eq("user_id", sellerId).order("last_inbound_at", { ascending: false }).limit(1).maybeSingle();
  if (!s) return null;
  const inWindow = Date.now() - new Date(s.last_inbound_at as string).getTime() < WINDOW_MS;
  return { wa_id: s.wa_id as string, user_id: sellerId, inWindow };
}

async function smsFallback(phone: string, message: string, eventType: string, userId?: string | null) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ recipientPhone: phone, message: message.slice(0, 160), eventType, userId }),
    });
  } catch (e) {
    console.error("[WA-CLOUD] SMS fallback failed", (e as Error).message);
  }
}

async function handleNotify(body: Record<string, any>): Promise<Response> {
  const event = body.event as string;
  const sellerPhone = body.seller_phone as string;
  if (!event || !sellerPhone) return new Response("bad request", { status: 400 });

  const sess = await findSellerSession(sellerPhone);
  const inWindow = sess?.inWindow ?? false;

  if (event === "new_bid") {
    const amount = body.amount, ref = body.reference ?? "your lot", title = body.listing_title ?? "your listing";
    if (inWindow && sess) {
      await sendButtons(sess.wa_id,
        `🔔 New bid: US$${amount} on ${ref} (${title}). Accept now to sell to the top bidder?`,
        [{ id: `ACCEPT:${body.listing_id}`, title: "Accept top bid" }, { id: `VIEWBIDS:${body.listing_id}`, title: "View bids" }]);
    } else {
      await smsFallback(sellerPhone, `ZimLivestock: new bid US$${amount} on ${ref}. Open WhatsApp and message us to accept, or manage at ${APP_URL}`, "wa_new_bid", sess?.user_id);
    }
    return new Response("ok", { status: 200 });
  }

  if (event === "payment_received") {
    const amount = body.amount, title = body.title ?? "your listing";
    const trId = body.transport_request_id as string | undefined;
    if (inWindow && sess) {
      if (trId) {
        await sendButtons(sess.wa_id,
          `💰 Payment received: US$${amount} for ${title}.\n\nThe buyer wants delivery to ${body.dropoff_label} (${body.distance_km} km) — quote US$${body.quote_usd}. Accept the delivery?`,
          [{ id: `DELIV_ACCEPT:${trId}`, title: "Accept delivery" }, { id: `DELIV_DECLINE:${trId}`, title: "Decline" }]);
      } else {
        await sendButtons(sess.wa_id,
          `💰 Payment received: US$${amount} for ${title}. Arrange handover with the buyer.`,
          [{ id: "MENU_LISTINGS", title: "My listings" }]);
      }
    } else {
      await smsFallback(sellerPhone, `ZimLivestock: payment of US$${amount} received for ${title}. Manage delivery at ${APP_URL}`, "wa_payment", sess?.user_id);
    }
    return new Response("ok", { status: 200 });
  }

  return new Response("ignored", { status: 200 });
}

// ── Entry point ─────────────────────────────────────────────────────────────

export const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const isNotify = url.pathname.endsWith("/notify");

  // Internal notify endpoint (pg_net trigger + payment-webhook).
  if (isNotify) {
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    const auth = req.headers.get("Authorization") ?? "";
    const ok = (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) || auth === `Bearer ${SERVICE_ROLE_KEY}`;
    if (!ok) return new Response("unauthorized", { status: 401 });
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return new Response("bad request", { status: 400 }); }
    try { return await handleNotify(body); }
    catch (e) { console.error("[WA-CLOUD] notify error", (e as Error).message); return new Response("error", { status: 500 }); }
  }

  // Webhook verification (Meta GET).
  if (req.method === "GET") {
    if (url.searchParams.get("hub.mode") === "subscribe"
      && url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
      && url.searchParams.get("hub.challenge")) {
      return new Response(url.searchParams.get("hub.challenge")!, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const rawBody = await req.text();
  if (!(await verifySignature(rawBody, req.headers.get("x-hub-signature-256")))) {
    return new Response("invalid signature", { status: 401 });
  }

  let body: Record<string, any>;
  try { body = JSON.parse(rawBody); } catch { return new Response("bad request", { status: 400 }); }
  if (body.object !== "whatsapp_business_account") return new Response("ok", { status: 200 });

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const message of value.messages ?? []) {
        await handleInbound(message, value).catch((e) => console.error("[WA-CLOUD] handleInbound error", e));
      }
    }
  }
  // Meta requires a prompt 200 regardless of processing outcome.
  return new Response("ok", { status: 200 });
};

if (import.meta.main) Deno.serve(handler);

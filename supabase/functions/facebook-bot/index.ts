import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_API = "https://graph.facebook.com/v21.0";
const PAGE_ACCESS_TOKEN = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") ?? "";
const VERIFY_TOKEN = Deno.env.get("FACEBOOK_VERIFY_TOKEN") ?? "";
const APP_SECRET = Deno.env.get("FACEBOOK_APP_SECRET") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://zimlivestock.co.zw").replace(/\/$/, "");

type BotState =
  | "MENU"
  | "BROWSE_TYPE"
  | "BROWSE_RESULTS"
  | "DETAIL"
  | "SELL_CATEGORY"
  | "SELL_BREED"
  | "SELL_LOCATION"
  | "SELL_PRICE"
  | "SELL_PHONE"
  | "SELL_CONFIRM";

const CATEGORIES = ["Cattle", "Goats", "Sheep", "Pigs", "Chickens", "Other"];
const LOCATIONS = ["Harare", "Bulawayo", "Mutare", "Masvingo", "Gweru", "Chinhoyi", "Kadoma", "Kwekwe"];

// ── Graph API helpers ────────────────────────────────────────────────────────

async function send(psid: string, message: object): Promise<void> {
  if (!PAGE_ACCESS_TOKEN) {
    console.log(`[FB-BOT SIM] To:${psid}`, JSON.stringify(message));
    return;
  }
  const res = await fetch(`${GRAPH_API}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, message }),
  });
  if (!res.ok) {
    console.error("[FB-BOT] Graph API error", res.status, await res.text());
  }
}

function sendText(psid: string, text: string) {
  return send(psid, { text });
}

// ── Signature verification ───────────────────────────────────────────────────

async function verifySignature(rawBody: string, sig: string | null): Promise<boolean> {
  if (!APP_SECRET) return true; // skip if no secret configured (dev mode)
  if (!sig?.startsWith("sha256=")) return false;
  const expected = sig.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === expected;
}

// ── Session helpers ──────────────────────────────────────────────────────────

async function getSession(psid: string, supabase: any) {
  const { data } = await supabase.from("fb_sessions").select("*").eq("psid", psid).single();
  if (!data) {
    await supabase.from("fb_sessions").insert({ psid, state: "MENU", draft: {} });
    return { psid, state: "MENU" as BotState, draft: {} };
  }
  return { ...data, state: data.state as BotState };
}

async function setState(
  psid: string,
  state: BotState,
  draft: object,
  supabase: any,
) {
  await supabase
    .from("fb_sessions")
    .update({ state, draft, last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("psid", psid);
}

// ── UI builders ──────────────────────────────────────────────────────────────

async function showMenu(psid: string, supabase: any) {
  await setState(psid, "MENU", {}, supabase);
  await send(psid, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: "Welcome to ZimLivestock! Buy and sell cattle, goats, sheep and more. What would you like to do?",
        buttons: [
          { type: "postback", title: "Browse Listings", payload: "BROWSE" },
          { type: "postback", title: "Sell an Animal", payload: "SELL" },
          { type: "web_url", title: "Open Website", url: APP_URL },
        ],
      },
    },
  });
}

async function browseLivestock(
  psid: string,
  category: string,
  supabase: any,
) {
  let query = supabase
    .from("livestock_items")
    .select("id, title, category, location, starting_price, current_bid, bid_count, image_urls, breed")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  if (category !== "All") query = query.eq("category", category);

  const { data: listings } = await query;

  if (!listings?.length) {
    await sendText(
      psid,
      category !== "All"
        ? `No active ${category} listings right now. Check back soon!`
        : "No active listings right now. Check back soon!",
    );
    await showMenu(psid, supabase);
    return;
  }

  const elements = listings.map((l: Record<string, unknown>) => {
    const currentBid = Number(l.current_bid ?? 0);
    const startingPrice = Number(l.starting_price ?? 0);
    const bidCount = Number(l.bid_count ?? 0);
    const priceStr = currentBid > 0
      ? `US$${currentBid} current bid (${bidCount} bids)`
      : `Starting US$${startingPrice}`;
    const el: Record<string, unknown> = {
      title: String(l.title),
      subtitle: `${priceStr} • ${l.location}`,
      buttons: [
        { type: "postback", title: "View Details", payload: `DETAIL:${l.id}` },
        { type: "web_url", title: "Bid / Buy", url: `${APP_URL}/listing/${l.id}` },
      ],
    };
    const imgs = l.image_urls as string[] | null;
    if (imgs?.[0]) el.image_url = imgs[0];
    return el;
  });

  await send(psid, {
    attachment: {
      type: "template",
      payload: { template_type: "generic", elements },
    },
  });

  await setState(psid, "BROWSE_RESULTS", { category }, supabase);

  await send(psid, {
    text: "Tap a listing to view details or go to the website to bid.",
    quick_replies: [
      { content_type: "text", title: "Search Again", payload: "BROWSE" },
      { content_type: "text", title: "Main Menu", payload: "MENU" },
    ],
  });
}

async function showDetail(
  psid: string,
  listingId: string,
  supabase: any,
) {
  const { data: l } = await supabase
    .from("livestock_items")
    .select("*")
    .eq("id", listingId)
    .single();

  if (!l) {
    await sendText(psid, "That listing is no longer available.");
    await showMenu(psid, supabase);
    return;
  }

  const now = Date.now();
  const hoursLeft = Math.max(0, Math.floor((new Date(l.end_time).getTime() - now) / 3_600_000));
  const timeLeft = hoursLeft >= 24 ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h` : `${hoursLeft}h`;
  const priceStr = l.current_bid > 0
    ? `Current bid: US$${l.current_bid} (${l.bid_count} bids)`
    : `Starting: US$${l.starting_price}`;

  // Meta button template text limit is 640 chars
  const body = [
    l.title,
    "",
    `Breed: ${l.breed}`,
    `Age: ${l.age}  Weight: ${l.weight}`,
    `Health: ${l.health}  Location: ${l.location}`,
    "",
    priceStr,
    `Ends in: ${timeLeft}`,
    "",
    l.description,
  ].join("\n").slice(0, 640);

  await send(psid, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: body,
        buttons: [
          { type: "web_url", title: "Bid / Buy Now", url: `${APP_URL}/listing/${l.id}` },
          { type: "postback", title: "Browse More", payload: "BROWSE" },
          { type: "postback", title: "Main Menu", payload: "MENU" },
        ],
      },
    },
  });

  await setState(psid, "DETAIL", { listingId }, supabase);
}

// ── Sell flow ────────────────────────────────────────────────────────────────

async function startSell(psid: string, supabase: any) {
  await setState(psid, "SELL_CATEGORY", {}, supabase);
  await send(psid, {
    text: "Let's list your animal for auction. What type of animal are you selling?",
    quick_replies: CATEGORIES.map((c) => ({
      content_type: "text",
      title: c,
      payload: `CAT:${c}`,
    })),
  });
}

async function handleSellCategory(
  psid: string,
  text: string,
  payload: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  const category = payload.startsWith("CAT:")
    ? payload.slice(4)
    : CATEGORIES.find((c) => c.toLowerCase() === text.toLowerCase()) ?? "";

  if (!category) {
    await send(psid, {
      text: "Please select a category:",
      quick_replies: CATEGORIES.map((c) => ({ content_type: "text", title: c, payload: `CAT:${c}` })),
    });
    return;
  }

  await setState(psid, "SELL_BREED", { ...draft, category }, supabase);
  await sendText(psid, `What breed is your ${category.toLowerCase()}? (e.g. "Hereford", "Nguni", "Local breed")`);
}

async function handleSellBreed(
  psid: string,
  text: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  if (!text.trim()) {
    await sendText(psid, "Please type the breed name.");
    return;
  }
  await setState(psid, "SELL_LOCATION", { ...draft, breed: text.trim() }, supabase);
  await send(psid, {
    text: "Where is the animal located?",
    quick_replies: LOCATIONS.map((l) => ({ content_type: "text", title: l, payload: `LOC:${l}` })),
  });
}

async function handleSellLocation(
  psid: string,
  text: string,
  payload: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  const location = payload.startsWith("LOC:")
    ? payload.slice(4)
    : LOCATIONS.find((l) => l.toLowerCase() === text.toLowerCase()) ?? "";

  if (!location) {
    await send(psid, {
      text: "Please select a location:",
      quick_replies: LOCATIONS.map((l) => ({ content_type: "text", title: l, payload: `LOC:${l}` })),
    });
    return;
  }

  await setState(psid, "SELL_PRICE", { ...draft, location }, supabase);
  await sendText(psid, "What starting bid price? (US$, numbers only — e.g. 450)");
}

async function handleSellPrice(
  psid: string,
  text: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  const price = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (isNaN(price) || price <= 0) {
    await sendText(psid, "Please enter a valid price (e.g. 450 or 1200).");
    return;
  }

  await setState(psid, "SELL_PHONE", { ...draft, starting_price: price }, supabase);
  await sendText(
    psid,
    "What's your ZimLivestock registered phone number? (e.g. 0771234567)\n\nWe'll link the listing to your account.",
  );
}

async function handleSellPhone(
  psid: string,
  text: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  let phone = text.replace(/[\s\-()+]/g, "");
  if (phone.startsWith("263")) phone = "0" + phone.slice(3);
  if (!phone.startsWith("0")) phone = "0" + phone;

  if (!/^07[1-9]\d{7}$/.test(phone)) {
    await sendText(psid, "That doesn't look like a valid Zimbabwean mobile number. Try again (e.g. 0771234567).");
    return;
  }

  const newDraft = { ...draft, phone };
  await setState(psid, "SELL_CONFIRM", newDraft, supabase);

  const summary = [
    "Here's your listing summary:",
    "",
    `Type: ${draft.category}`,
    `Breed: ${draft.breed}`,
    `Location: ${draft.location}`,
    `Starting price: US$${draft.starting_price}`,
    `Contact phone: ${phone}`,
    "",
    "Confirm posting this listing?",
  ].join("\n");

  await send(psid, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: summary,
        buttons: [
          { type: "postback", title: "Yes, Post It", payload: "CONFIRM_SELL" },
          { type: "postback", title: "Cancel", payload: "CANCEL" },
        ],
      },
    },
  });
}

async function handleSellConfirm(
  psid: string,
  text: string,
  payload: string,
  draft: Record<string, unknown>,
  supabase: any,
) {
  const confirmed = payload === "CONFIRM_SELL" || ["yes", "confirm", "post", "y"].includes(text.toLowerCase());

  if (!confirmed) {
    await send(psid, {
      text: "Post this listing?",
      quick_replies: [
        { content_type: "text", title: "Yes, Post It", payload: "CONFIRM_SELL" },
        { content_type: "text", title: "Cancel", payload: "CANCEL" },
      ],
    });
    return;
  }

  // Look up profile by phone
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name")
    .eq("phone", String(draft.phone))
    .single();

  if (!profile) {
    const params = new URLSearchParams({
      from: "fb",
      category: String(draft.category),
      breed: String(draft.breed),
      location: String(draft.location),
      price: String(draft.starting_price),
    });
    await send(psid, {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "No ZimLivestock account found for that number. Sign up on the website — your listing details will be pre-filled!",
          buttons: [{ type: "web_url", title: "Sign Up & List", url: `${APP_URL}/register?${params}` }],
        },
      },
    });
    await setState(psid, "MENU", {}, supabase);
    return;
  }

  const { data: listing, error } = await supabase
    .from("livestock_items")
    .insert({
      title: `${draft.breed} ${draft.category}`,
      category: draft.category,
      breed: draft.breed,
      age: "Unknown",
      weight: "Unknown",
      description: `${draft.breed} ${draft.category} listed via Facebook Messenger. Contact seller for more details.`,
      location: draft.location,
      health: "Good",
      starting_price: draft.starting_price,
      seller_id: profile.id,
      duration_days: 7,
    })
    .select("id")
    .single();

  if (error || !listing) {
    console.error("[FB-BOT] listing insert error", error?.message);
    await sendText(psid, "Something went wrong creating your listing. Please try again or post directly on the website.");
    await setState(psid, "MENU", {}, supabase);
    return;
  }

  await send(psid, {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: `Your listing is live for 7 days! Add photos and extra details on the website.`,
        buttons: [
          { type: "web_url", title: "Edit Listing", url: `${APP_URL}/listing/${listing.id}` },
          { type: "postback", title: "Main Menu", payload: "MENU" },
        ],
      },
    },
  });

  await setState(psid, "MENU", {}, supabase);
}

// ── Main event handler ───────────────────────────────────────────────────────

async function handleEvent(event: Record<string, unknown>, supabase: any) {
  const psid = (event.sender as Record<string, string>)?.id;
  if (!psid) return;

  const session = await getSession(psid, supabase);
  const state = session.state;
  const draft = (session.draft ?? {}) as Record<string, unknown>;

  // Extract input
  const msg = event.message as Record<string, unknown> | undefined;
  const pb = event.postback as Record<string, unknown> | undefined;

  let text = (msg?.text as string | undefined)?.trim() ?? "";
  let payload = (pb?.payload as string | undefined) ?? (msg?.quick_reply as Record<string, string> | undefined)?.payload ?? "";

  // Log inbound
  await supabase.from("fb_message_log").insert({
    psid,
    direction: "inbound",
    message_type: pb ? "postback" : payload ? "quick_reply" : "text",
    body: text || undefined,
    payload: payload || undefined,
    state_before: state,
  }).then(() => {});

  // Global resets
  const lower = text.toLowerCase();
  if (["menu", "hi", "hello", "start", "hey"].includes(lower) || payload === "MENU") {
    await showMenu(psid, supabase);
    return;
  }
  if (lower === "cancel" || payload === "CANCEL") {
    await setState(psid, "MENU", {}, supabase);
    await sendText(psid, "Cancelled. Type 'menu' anytime to start over.");
    return;
  }
  if (payload === "BROWSE") {
    await setState(psid, "BROWSE_TYPE", {}, supabase);
    await send(psid, {
      text: "What type of animal?",
      quick_replies: [
        ...CATEGORIES.map((c) => ({ content_type: "text", title: c, payload: `FILTER:${c}` })),
        { content_type: "text", title: "All", payload: "FILTER:All" },
      ],
    });
    return;
  }
  if (payload === "SELL") {
    await startSell(psid, supabase);
    return;
  }
  if (payload.startsWith("DETAIL:")) {
    await showDetail(psid, payload.slice(7), supabase);
    return;
  }
  if (payload.startsWith("FILTER:")) {
    await browseLivestock(psid, payload.slice(7), supabase);
    return;
  }

  // State dispatch
  switch (state) {
    case "MENU":
      await showMenu(psid, supabase);
      break;
    case "BROWSE_TYPE": {
      const cat = CATEGORIES.find((c) => c.toLowerCase() === lower) ?? (lower === "all" ? "All" : "");
      if (cat) {
        await browseLivestock(psid, cat, supabase);
      } else {
        await send(psid, {
          text: "Please select a type:",
          quick_replies: [
            ...CATEGORIES.map((c) => ({ content_type: "text", title: c, payload: `FILTER:${c}` })),
            { content_type: "text", title: "All", payload: "FILTER:All" },
          ],
        });
      }
      break;
    }
    case "BROWSE_RESULTS":
      await showMenu(psid, supabase);
      break;
    case "DETAIL":
      await showMenu(psid, supabase);
      break;
    case "SELL_CATEGORY":
      await handleSellCategory(psid, text, payload, draft, supabase);
      break;
    case "SELL_BREED":
      await handleSellBreed(psid, text, draft, supabase);
      break;
    case "SELL_LOCATION":
      await handleSellLocation(psid, text, payload, draft, supabase);
      break;
    case "SELL_PRICE":
      await handleSellPrice(psid, text, draft, supabase);
      break;
    case "SELL_PHONE":
      await handleSellPhone(psid, text, draft, supabase);
      break;
    case "SELL_CONFIRM":
      await handleSellConfirm(psid, text, payload, draft, supabase);
      break;
    default:
      await showMenu(psid, supabase);
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Webhook verification (Meta sends a GET to confirm the endpoint)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify signature before reading body
  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!(await verifySignature(rawBody, sig))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (body.object !== "page") {
    return new Response("ok", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const entries = (body.entry as Record<string, unknown>[] | undefined) ?? [];
  for (const entry of entries) {
    const messaging = (entry.messaging as Record<string, unknown>[] | undefined) ?? [];
    for (const event of messaging) {
      // Skip delivery/read receipts
      if (!event.message && !event.postback) continue;
      await handleEvent(event, supabase).catch((err) => {
        console.error("[FB-BOT] handleEvent error", err);
      });
    }
  }

  // Meta requires a 200 within 20s regardless of processing outcome
  return new Response("ok", { status: 200 });
});

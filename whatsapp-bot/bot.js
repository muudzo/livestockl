/**
 * ZimLivestock WhatsApp bot — list-my-animal flow
 *
 * Runs on the Mac mini, binds to a single sacrificial WhatsApp number
 * (currently 0773819300). On first start, prints a QR code in the terminal
 * — scan with WhatsApp on the bot phone to log in. Session persists in
 * .wwebjs_auth/ so subsequent restarts skip the QR.
 *
 * State machine per phone:
 *   idle → awaiting_photo → awaiting_breed → awaiting_weight
 *        → awaiting_price → awaiting_confirm → idle
 *
 * The bot writes directly to Supabase using the service-role key (no Edge
 * Function in the middle for v1 — simpler, fewer moving parts for a demo).
 *
 * Required env vars:
 *   SUPABASE_URL                    — project URL (e.g. https://...supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY       — service role key (NOT anon key)
 *   ZIMLIVESTOCK_PUBLIC_URL         — e.g. https://app.zimlivestock.com (for the "live!" link)
 *   DEFAULT_TENANT_SLUG             — e.g. zimlivestock-demo
 *
 * Optional env vars:
 *   STORAGE_BUCKET                  — defaults to "livestock-images"
 *   LISTING_DURATION_DAYS           — defaults to 7
 */

const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { createClient } = require("@supabase/supabase-js");

// ───────────────────────────────────────────────────────────────────────────
// Configuration
// ───────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = required("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
const ZIMLIVESTOCK_PUBLIC_URL = required("ZIMLIVESTOCK_PUBLIC_URL");
const DEFAULT_TENANT_SLUG = required("DEFAULT_TENANT_SLUG");
const STORAGE_BUCKET = process.env.STORAGE_BUCKET || "livestock-images";
const LISTING_DURATION_DAYS = Number(process.env.LISTING_DURATION_DAYS || 7);

function required(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`✗ missing required env var: ${key}`);
    process.exit(1);
  }
  return v;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ───────────────────────────────────────────────────────────────────────────
// WhatsApp client setup
// ───────────────────────────────────────────────────────────────────────────

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("\n→ scan this QR with the bot phone (0773819300) in WhatsApp → Linked Devices:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✓ bot ready — listening for messages");
});

client.on("authenticated", () => {
  console.log("✓ authenticated — session persisted to ./.wwebjs_auth/");
});

client.on("auth_failure", (msg) => {
  console.error("✗ auth failure:", msg);
});

client.on("disconnected", (reason) => {
  console.log("→ disconnected:", reason);
  process.exit(1); // let a supervisor (pm2, launchd) restart us
});

// ───────────────────────────────────────────────────────────────────────────
// Message router
// ───────────────────────────────────────────────────────────────────────────

client.on("message", async (msg) => {
  if (msg.from.endsWith("@g.us")) return; // ignore group messages
  if (msg.from === "status@broadcast") return; // ignore status updates
  if (msg.fromMe) return;

  const phone = normalizePhone(msg.from);
  const body = (msg.body || "").trim();

  try {
    await logInbound(phone, msg.hasMedia ? "image" : "text", body, msg.hasMedia);
    await route(msg, phone, body);
  } catch (err) {
    console.error(`✗ error handling ${phone}:`, err.message);
    await safeReply(msg, "Something went wrong on our side. Please try again, or send 'cancel' to start over.");
    await logSystem(phone, `error: ${err.message}`);
  }
});

// ───────────────────────────────────────────────────────────────────────────
// State machine — each handler returns nothing; replies + state writes happen inside
// ───────────────────────────────────────────────────────────────────────────

async function route(msg, phone, body) {
  // Global commands first
  const lower = body.toLowerCase();
  if (lower === "cancel" || lower === "stop" || lower === "reset") {
    await setState(phone, "idle", {});
    await reply(msg, phone, "Cancelled. Send 'list' to start over.");
    return;
  }
  if (lower === "help" || lower === "?") {
    await reply(msg, phone,
      "ZimLivestock WhatsApp bot.\n\n" +
      "Send 'list' to sell an animal — I'll walk you through a photo, breed, weight, and price.\n" +
      "Send 'cancel' at any time to start over."
    );
    return;
  }

  // Check seller registration before anything else
  const seller = await findSellerByPhone(phone);
  if (!seller) {
    await reply(msg, phone,
      `I don't have a ZimLivestock account for this number yet. Please sign up first at ${ZIMLIVESTOCK_PUBLIC_URL}, then come back and send 'list'.`
    );
    return;
  }

  const session = await getOrCreateSession(phone, seller);
  const state = session.state;

  switch (state) {
    case "idle":
      return handleIdle(msg, phone, body, seller);
    case "awaiting_photo":
      return handleAwaitingPhoto(msg, phone, body, session);
    case "awaiting_breed":
      return handleAwaitingBreed(msg, phone, body, session);
    case "awaiting_weight":
      return handleAwaitingWeight(msg, phone, body, session);
    case "awaiting_price":
      return handleAwaitingPrice(msg, phone, body, session);
    case "awaiting_confirm":
      return handleAwaitingConfirm(msg, phone, body, session, seller);
    default:
      // Shouldn't happen but reset just in case
      await setState(phone, "idle", {});
      return reply(msg, phone, "Let's start over. Send 'list' to sell an animal.");
  }
}

async function handleIdle(msg, phone, body, seller) {
  const lower = body.toLowerCase();
  if (lower === "list" || lower === "sell" || lower === "list animal") {
    await setState(phone, "awaiting_photo", { started_at: new Date().toISOString() });
    return reply(msg, phone,
      `Welcome, ${seller.first_name || "there"}. Let's list your animal.\n\n` +
      `Step 1 of 5 — send me a clear photo of the animal.`
    );
  }
  return reply(msg, phone,
    "Hi! I'm the ZimLivestock listing bot.\n\n" +
    "Send 'list' to sell an animal. I'll walk you through it."
  );
}

async function handleAwaitingPhoto(msg, phone, body, session) {
  if (!msg.hasMedia) {
    return reply(msg, phone, "I need a photo first. Take or attach a clear photo of the animal.");
  }
  const media = await msg.downloadMedia();
  if (!media || !media.data) {
    return reply(msg, phone, "Couldn't download that photo — please send it again.");
  }
  const url = await uploadPhoto(phone, media);
  if (!url) {
    return reply(msg, phone, "Couldn't save that photo. Try sending it again.");
  }
  const draft = { ...session.draft, photo_url: url };
  await setState(phone, "awaiting_breed", draft);
  return reply(msg, phone, `Step 2 of 5 — what breed is it? (e.g. Brahman, Hereford, Boer, Dorper)`);
}

async function handleAwaitingBreed(msg, phone, body, session) {
  if (msg.hasMedia) {
    return reply(msg, phone, "Send the breed as a text message, please.");
  }
  if (!body || body.length < 2 || body.length > 40) {
    return reply(msg, phone, "Type the breed name (between 2 and 40 characters).");
  }
  const draft = { ...session.draft, breed: body };
  await setState(phone, "awaiting_weight", draft);
  return reply(msg, phone, "Step 3 of 5 — weight in kg? (just the number, e.g. 480)");
}

async function handleAwaitingWeight(msg, phone, body, session) {
  const kg = parseNumber(body);
  if (!kg || kg < 1 || kg > 5000) {
    return reply(msg, phone, "I didn't catch a weight. Send a number in kg, e.g. 480.");
  }
  const draft = { ...session.draft, weight_kg: kg };
  await setState(phone, "awaiting_price", draft);
  return reply(msg, phone, "Step 4 of 5 — starting price in USD? (just the number, e.g. 250)");
}

async function handleAwaitingPrice(msg, phone, body, session) {
  const price = parseNumber(body);
  if (!price || price <= 0 || price > 100000) {
    return reply(msg, phone, "I didn't catch a price. Send a number in USD, e.g. 250.");
  }
  const draft = { ...session.draft, starting_price: price };
  await setState(phone, "awaiting_confirm", draft);

  const summary =
    `Step 5 of 5 — here's your draft listing:\n\n` +
    `• Breed: ${draft.breed}\n` +
    `• Weight: ${draft.weight_kg} kg\n` +
    `• Starting price: US$${price}\n` +
    `• Listing length: ${LISTING_DURATION_DAYS} days\n\n` +
    `Reply YES to publish it, or NO to cancel.`;
  return reply(msg, phone, summary);
}

async function handleAwaitingConfirm(msg, phone, body, session, seller) {
  const lower = body.toLowerCase();
  if (lower === "yes" || lower === "y" || lower === "publish") {
    const itemId = await createListing(session.draft, seller, session.tenant_id);
    await setState(phone, "idle", {});
    const url = `${ZIMLIVESTOCK_PUBLIC_URL.replace(/\/$/, "")}/item/${itemId}`;
    return reply(msg, phone,
      `✓ Live!\n\n` +
      `Your listing is up at ${url}.\n\n` +
      `You'll get an SMS when someone bids. Send 'list' to add another animal.`
    );
  }
  if (lower === "no" || lower === "n" || lower === "cancel") {
    await setState(phone, "idle", {});
    return reply(msg, phone, "Cancelled. Nothing was saved. Send 'list' to start over.");
  }
  return reply(msg, phone, "Please reply YES to publish or NO to cancel.");
}

// ───────────────────────────────────────────────────────────────────────────
// Supabase helpers
// ───────────────────────────────────────────────────────────────────────────

async function findSellerByPhone(phone) {
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, city")
    .eq("phone", phone)
    .maybeSingle();
  return data || null;
}

async function getOrCreateSession(phone, seller) {
  const { data: existing } = await supabase
    .from("wa_sessions")
    .select("phone, state, draft, tenant_id, user_id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) return existing;

  // Resolve the default tenant once
  const tenantId = await resolveDefaultTenantId();
  const { data: inserted } = await supabase
    .from("wa_sessions")
    .insert({ phone, state: "idle", draft: {}, tenant_id: tenantId, user_id: seller.id })
    .select()
    .single();
  return inserted;
}

let cachedDefaultTenantId = null;
async function resolveDefaultTenantId() {
  if (cachedDefaultTenantId) return cachedDefaultTenantId;
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .maybeSingle();
  if (!data) {
    throw new Error(`default tenant '${DEFAULT_TENANT_SLUG}' not found — set DEFAULT_TENANT_SLUG`);
  }
  cachedDefaultTenantId = data.id;
  return cachedDefaultTenantId;
}

async function setState(phone, state, draft) {
  const { error } = await supabase
    .from("wa_sessions")
    .update({
      state,
      draft,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", phone);
  if (error) throw new Error(`setState failed: ${error.message}`);
}

async function uploadPhoto(phone, media) {
  const ext = media.mimetype.split("/")[1] || "jpg";
  const path = `wa/${phone}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(media.data, "base64");
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, {
      contentType: media.mimetype,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    console.error(`✗ storage upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function createListing(draft, seller, tenantId) {
  const endTime = new Date(Date.now() + LISTING_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const title = `${draft.breed}${guessCategorySuffix(draft.breed)}`;
  const location = seller.city || "Zimbabwe";

  const { data, error } = await supabase
    .from("livestock_items")
    .insert({
      tenant_id: tenantId,
      seller_id: seller.id,
      title,
      category: guessCategory(draft.breed),
      breed: draft.breed,
      age: "Unspecified",
      weight: `${draft.weight_kg}kg`,
      description: `Listed via WhatsApp by ${seller.first_name || "seller"}.`,
      location,
      health: "Good",
      starting_price: draft.starting_price,
      current_bid: 0,
      bid_count: 0,
      image_urls: [draft.photo_url],
      status: "active",
      duration_days: LISTING_DURATION_DAYS,
      end_time: endTime,
    })
    .select("id")
    .single();
  if (error) throw new Error(`createListing failed: ${error.message}`);
  return data.id;
}

// ───────────────────────────────────────────────────────────────────────────
// Small helpers
// ───────────────────────────────────────────────────────────────────────────

// WhatsApp ids look like `2637712345678@c.us` (no leading +). Strip suffix
// and normalize to the local 0XX format the rest of our stack uses.
function normalizePhone(waId) {
  const stripped = waId.replace(/@c\.us$/, "").replace(/^\+/, "");
  // 263 = Zimbabwe country code. Convert 263 7XX… → 07XX…
  if (stripped.startsWith("263")) return "0" + stripped.slice(3);
  return stripped;
}

function parseNumber(text) {
  const m = String(text).replace(/[, ]/g, "").match(/^\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function guessCategory(breed) {
  const b = breed.toLowerCase();
  if (/boer|nubian|kalahari/.test(b)) return "Goats";
  if (/merino|dorper|damara/.test(b)) return "Sheep";
  if (/hampshire|landrace|large white|duroc/.test(b)) return "Pigs";
  return "Cattle";
}

function guessCategorySuffix(breed) {
  const cat = guessCategory(breed);
  if (cat === "Cattle") return " bull/cow"; // user can fix in app
  if (cat === "Goats") return " goat";
  if (cat === "Sheep") return " sheep";
  if (cat === "Pigs") return " pig";
  return "";
}

async function reply(msg, phone, text) {
  const stateAfter = await currentState(phone);
  await msg.reply(text);
  await logOutbound(phone, text, stateAfter);
}

async function safeReply(msg, text) {
  try { await msg.reply(text); } catch (e) { console.error("send failed:", e.message); }
}

async function currentState(phone) {
  const { data } = await supabase
    .from("wa_sessions").select("state").eq("phone", phone).maybeSingle();
  return data?.state || "idle";
}

async function logInbound(phone, type, body, hasMedia) {
  await supabase.from("wa_message_log").insert({
    phone,
    direction: "inbound",
    message_type: type,
    body: hasMedia ? null : body,
    media_url: hasMedia ? "(downloaded)" : null,
    state_before: await currentState(phone),
  });
}

async function logOutbound(phone, body, stateAfter) {
  await supabase.from("wa_message_log").insert({
    phone,
    direction: "outbound",
    message_type: "text",
    body,
    state_after: stateAfter,
  });
}

async function logSystem(phone, msg) {
  await supabase.from("wa_message_log").insert({
    phone, direction: "outbound", message_type: "system", body: msg,
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Start
// ───────────────────────────────────────────────────────────────────────────

console.log("→ starting WhatsApp bot…");
client.initialize();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n→ shutting down…");
  try { await client.destroy(); } catch {}
  process.exit(0);
});

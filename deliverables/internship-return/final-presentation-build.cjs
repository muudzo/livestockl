// ZimLivestock — Final Internship Presentation
// One deck that stitches the whole story together:
//   I.   Product research (the field)        II.  The product + live demo
//   III. The national cattle-digitization gateway (the unique angle)
//   IV.  Go-to-market / market entry         V.   Financial predictions
//
// Recolored to the Paynow Zimbabwe corporate palette (royal blue #175FF8,
// deep navy, cyan + teal accents on a light-blue paper) — sourced from
// paynow.co.zw brand assets. Canonical v3.0 numbers retained.
// Build:  cd deliverables/internship-return && NODE_PATH=$(npm root -g) node final-presentation-build.cjs

const pptxgen = require("pptxgenjs");

// Key names are kept from the prior terracotta system so every call site
// carries over unchanged; only the *values* move to Paynow brand colors.
const COLOR = {
  terracotta: "175FF8", // Paynow royal blue — primary accent (was terracotta)
  cream: "EEF3FF",      // light blue-tint paper (was cream)
  dark: "0A2540",       // deep navy — dark sections (was near-black brown)
  gold: "4CC3FF",       // Paynow cyan — bright accent on dark (was gold)
  body: "13233F",       // navy ink
  muted: "5B6B86",      // slate blue-grey
  mutedDark: "AEC2E0",  // light slate on navy
  cardBg: "FFFFFF",
  green: "13BFA3",      // Paynow teal — positive / surplus (was olive green)
  deepBlue: "0C40BE",   // strong fills / depth
  warn: "E5484D",       // functional red — Critical severity only
};
const FONT = { header: "Georgia", body: "Calibri" };

// ---- canonical v3.0 model --------------------------------------------------
const MODEL = {
  years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
  houses: [5, 8, 12, 16, 20],
  onboarding: [14500, 7500, 10000, 10000, 10000],
  subscription: [39600, 100800, 151200, 208800, 266400],
  tx: [6710, 18474, 27625, 39831, 53618],
  transport: [826, 4093, 9521, 18628, 31677],
  revenue: [61636, 130867, 198346, 277259, 361695],
  cost: [48841, 84274, 132810, 181365, 235930],
  surplus: [12795, 46593, 65536, 95894, 125765],
  cumSurplus: [12795, 59388, 124924, 220818, 346583],
  gmvPaynow: [894600, 2463200, 3683300, 5310800, 7149100],
  fiveYr: { rev: 1029803, cost: 683220, surplus: 346583, gmv: 19501000 },
};
const usd = (n) => (n < 0 ? "−US$" : "US$") + Math.abs(n).toLocaleString("en-US");
const usdK = (n) => (n < 0 ? "−US$" : "US$") + Math.round(Math.abs(n) / 1000).toLocaleString("en-US") + "k";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "ZimLivestock — Final Internship Presentation";
const TOTAL = 31;

// ---- helpers ---------------------------------------------------------------
function accentBar(s, color = COLOR.gold) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color }, line: { type: "none" } });
}
function footer(s, n, dark = false) {
  s.addText("ZIMLIVESTOCK  ·  PAYNOW INTERNSHIP  ·  FINAL PRESENTATION  ·  JUNE 2026", {
    x: 0.5, y: 5.28, w: 8.2, h: 0.22, fontFace: FONT.body, fontSize: 8, charSpacing: 2,
    color: dark ? COLOR.mutedDark : COLOR.muted });
  s.addText(`${n} / ${TOTAL}`, { x: 9.0, y: 5.28, w: 0.6, h: 0.22, fontFace: FONT.body, fontSize: 8, align: "right",
    color: dark ? COLOR.mutedDark : COLOR.muted });
}
function eyebrow(s, t) {
  s.addText(t, { x: 0.7, y: 0.5, w: 8.3, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.terracotta });
}
function title(s, t, o = {}) {
  s.addText(t, { x: 0.7, y: 0.92, w: 8.7, h: o.h || 0.85, fontFace: FONT.header, fontSize: o.size || 31, bold: true, color: COLOR.body, margin: 0 });
}
function subhead(s, t, y = 1.78) {
  s.addText(t, { x: 0.7, y, w: 8.7, h: 0.6, fontFace: FONT.body, fontSize: 13, color: COLOR.muted });
}
// Dark section divider with a roman numeral + section title
function divider(s, numeral, kicker, big, sub) {
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText(numeral, { x: 0.7, y: 1.0, w: 4.4, h: 2.6, fontFace: FONT.header, fontSize: 150, bold: true, color: COLOR.gold, valign: "top", margin: 0 });
  s.addText(kicker, { x: 4.3, y: 1.75, w: 5.2, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold, margin: 0 });
  s.addText(big, { x: 4.3, y: 2.1, w: 5.2, h: 1.4, fontFace: FONT.header, fontSize: 30, bold: true, color: COLOR.cream, margin: 0 });
  s.addText(sub, { x: 4.3, y: 3.55, w: 5.2, h: 1.0, fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.mutedDark, margin: 0 });
}

// ============================================================================
// 1 — TITLE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("ZIMLIVESTOCK  ·  PAYNOW INTERNSHIP  ·  JUNE 2026", { x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true, color: COLOR.gold });
  s.addText("The money layer for", { x: 0.7, y: 1.35, w: 8.6, h: 0.9, fontFace: FONT.header, fontSize: 50, bold: true, color: COLOR.cream, margin: 0 });
  s.addText("Zimbabwe's cattle economy.", { x: 0.7, y: 2.25, w: 8.6, h: 0.9, fontFace: FONT.header, fontSize: 50, italic: true, color: COLOR.gold, margin: 0 });
  s.addText("A scaling B2B-SaaS platform that digitizes livestock auction houses, settles every sale on Paynow rails, and becomes the missing settlement layer for Zimbabwe's national cattle-digitization initiatives.", { x: 0.7, y: 3.5, w: 8.6, h: 1.0, fontFace: FONT.body, fontSize: 15, color: COLOR.mutedDark });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw    ·    Field research → product → GTM → numbers", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.9, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 12 });
}

// ============================================================================
// 2 — EXECUTIVE SUMMARY (the whole story on one slide)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE WHOLE ARGUMENT, IN ONE SLIDE");
  title(s, "Field-validated problem. Shipped product. A national gap to fill.");
  subhead(s, "I sat through a real sale day, built a digital floor on Paynow rails, and found it slots exactly into the money-shaped hole in Zimbabwe's livestock-digitization stack.");

  const cards = [
    { n: "4", label: "field findings", body: "From a full sale day at a working cattle auction — the problems that shaped every product decision." },
    { n: "5", label: "live channels, shipped", body: "Web/PWA, WhatsApp, USSD, BillPay-as-biller, Messenger — running in production on Paynow." },
    { n: "3 of 4", label: "national schemes lack a money layer", body: "Identity, title and asset layers exist. The settlement + payout engine does not. We are it." },
    { n: "$19.5M", label: "GMV onto Paynow rails (5yr)", body: "20 houses, US$1.03M revenue, US$346,583 cumulative surplus — self-funded." },
  ];
  const w = 2.05, x0 = 0.7, gap = 0.15;
  cards.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w, h: 2.5, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 0.06, h: 2.5, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(p.n, { x: x + 0.2, y: 2.62, w: w - 0.25, h: 0.6, fontFace: FONT.header, fontSize: 30, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText(p.label, { x: x + 0.2, y: 3.22, w: w - 0.25, h: 0.55, fontFace: FONT.body, fontSize: 10, bold: true, color: COLOR.body, margin: 0 });
    s.addText(p.body, { x: x + 0.2, y: 3.8, w: w - 0.25, h: 1.15, fontFace: FONT.body, fontSize: 10, color: COLOR.muted, margin: 0 });
  });
  footer(s, 2);
}

// ============================================================================
// 3 — DIVIDER I: PRODUCT RESEARCH
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "I", "PRODUCT RESEARCH", "I started in the field, not the codebase.", "Two visits to a working Zimbabwean cattle auction in March 2026. Before a line of code, I learned what the auction house actually sells — and who it leaves out.");
}

// ============================================================================
// 4 — THE OPPORTUNITY (4 field findings)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE OPPORTUNITY");
  title(s, "The floor leaves money on the table every Saturday.");
  subhead(s, "Four findings from the field, ranked by what they cost the auction-house owner.");

  const pains = [
    { n: "US$1k", label: "deposit gate", body: "Every bidder fronts US$1,000 cash. Filters serious buyers — but locks out the salaried buyer who'd take a single goat." },
    { n: "12%", label: "house fees", body: "5% seller + 7% buyer. High enough that sub-US$500 trades route around the floor to WhatsApp groups." },
    { n: "1", label: "constable bottleneck", body: "Police clearance is paper, in-person, one officer. Physically caps how many animals clear per sale day." },
    { n: "0", label: "remarketing list", body: "90%+ of attendees are dealers, not end buyers. Every Saturday's crowd walks out with no digital footprint." },
  ];
  const w = 2.05, x0 = 0.7, gap = 0.15;
  pains.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w, h: 2.45, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 0.06, h: 2.45, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(p.n, { x: x + 0.2, y: 2.65, w: w - 0.25, h: 0.7, fontFace: FONT.header, fontSize: 34, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText(p.label, { x: x + 0.2, y: 3.38, w: w - 0.25, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 1, color: COLOR.body, margin: 0 });
    s.addText(p.body, { x: x + 0.2, y: 3.72, w: w - 0.25, h: 1.2, fontFace: FONT.body, fontSize: 10.5, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "The opportunity:  ", options: { bold: true, color: COLOR.body } },
    { text: "the auction house already owns the trust — deposit, inspection, police clearance. It just has no digital surface for it.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 4);
}

// ============================================================================
// 5 — MARKET STRUCTURE (3 channels + trust-compression insight)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "MARKET STRUCTURE");
  title(s, "Trust-compression has willingness-to-pay.");
  subhead(s, "Zimbabwe's livestock trade runs through three disconnected channels. The auction floor charges 12% — and still wins higher prices, because trust is the product.");

  const rows = [
    { ch: "Physical auction pen", trust: "Deposit + police clearance + inspection", fee: "12%", foot: "Near-zero" },
    { ch: "WhatsApp / Facebook", trust: "Social reputation in closed groups", fee: "0–3%", foot: "Photos only, no settlement" },
    { ch: "Village / informal", trust: "Kinship + repeat interaction", fee: "None", foot: "N/A" },
  ];
  const headers = ["CHANNEL", "TRUST MECHANISM", "FEE", "DIGITAL FOOTPRINT"];
  const colWs = [2.4, 3.5, 1.0, 1.7];
  const tableX = 0.7, tableY = 2.5, rowH = 0.62;
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: 0.32, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 2, color: COLOR.terracotta, align: i === 2 ? "center" : "left", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + 0.36, w: 8.6, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + 0.5 + idx * rowH; cx = tableX;
    [r.ch, r.trust, r.fee, r.foot].forEach((c, i) => {
      s.addText(c, { x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.header : FONT.body, fontSize: i === 0 ? 14 : 12, bold: i === 0, color: i === 0 ? COLOR.body : COLOR.muted, align: i === 2 ? "center" : "left", valign: "middle", margin: 0 });
      cx += colWs[i];
    });
    if (idx < rows.length - 1) s.addShape(pres.shapes.LINE, { x: tableX, y: y + rowH, w: 8.6, h: 0, line: { color: COLOR.muted, width: 0.3 } });
  });
  s.addText([
    { text: "The pricing logic for the platform:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "replicate the trust guarantees digitally at a lower fee. It's a wedge, not a race to zero — there is real headroom under 12%.", options: { color: COLOR.body } },
  ], { x: 0.7, y: 4.75, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 12, italic: true, margin: 0 });
  footer(s, 5);
}

// ============================================================================
// 6 — THE WEDGE (excluded buyers + ~45 bidders)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE WEDGE");
  title(s, "Our market is the buyers who can't attend.");
  subhead(s, "The floor serves dealers in one room on one weekday. The untapped demand is everyone the deposit, the schedule, and the geography exclude.");

  const segs = [
    "Salaried urban buyers — can't tie up US$1,000 or take a Wednesday off",
    "Diaspora Zimbabweans — buying cattle for family back home",
    "Women & smallholder farmers — outside the geographic catchment",
    "Small butcheries — too small to send a dealer to the pen",
  ];
  segs.forEach((it, i) => {
    const y = 2.5 + i * 0.46;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.1, w: 0.16, h: 0.16, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(it, { x: 1.0, y, w: 5.0, h: 0.46, fontFace: FONT.body, fontSize: 12.5, color: COLOR.body, valign: "top", margin: 0 });
  });

  // Right: the ~45 insight card
  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 2.45, w: 3.15, h: 2.55, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 6.2, y: 2.45, w: 0.08, h: 2.55, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("THE LIQUIDITY BAR IS LOWER THAN IT LOOKS", { x: 6.45, y: 2.6, w: 2.8, h: 0.5, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 2, color: COLOR.gold, margin: 0 });
  s.addText("~45", { x: 6.45, y: 3.15, w: 2.8, h: 0.8, fontFace: FONT.header, fontSize: 48, bold: true, color: COLOR.cream, margin: 0 });
  s.addText("active bidders per auction — the highest bid-card observed. We don't need to fill a room of 200; we need ~45 serious bidders. That's reachable.", { x: 6.45, y: 4.0, w: 2.8, h: 1.0, fontFace: FONT.body, fontSize: 11, color: COLOR.mutedDark, margin: 0 });
  footer(s, 6);
}

// ============================================================================
// 7 — DIVIDER II: THE PRODUCT + DEMO
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "II", "THE PRODUCT · LIVE DEMO", "What I built — and it's already running.", "A digital floor under the auction house's own brand, on every Paynow product, reachable on every surface a Zimbabwean buyer actually uses. Not a prototype to fund — a deployment to scale.");
}

// ============================================================================
// 8 — THE PRODUCT
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE PRODUCT");
  title(s, "A digital floor under the house's own brand —");
  s.addText("each house onboarded as its own isolated tenant, in minutes.", { x: 0.7, y: 1.65, w: 8.6, h: 0.6, fontFace: FONT.header, fontSize: 22, italic: true, color: COLOR.terracotta, margin: 0 });

  const items = [
    "Self-serve onboarding wizard: /operators → admin approval → an RLS-isolated tenant in ~6 minutes, no SQL, no engineer on the floor.",
    "Five live channels: web/PWA, WhatsApp, USSD, BillPay-as-biller, Facebook Messenger — buyers meet us where they already transact.",
    "Paynow settlement, BillPay biller-inbound, EcoCash USSD, SMS notifications — every product in the ecosystem, on real rails.",
    "Bisafe escrow replaces the US$1,000 cash deposit with a small refundable hold — remote bidders become real bidders.",
    "Constable workflow tool turns paper police clearance into a first-class chain-of-custody state, not metadata.",
    "Every buyer's phone number stays with the auction house — a remarketing list for next Saturday's sale.",
  ];
  items.forEach((it, i) => {
    const y = 2.45 + i * 0.45;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.11, w: 0.16, h: 0.16, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(it, { x: 1.0, y, w: 8.3, h: 0.45, fontFace: FONT.body, fontSize: 12.5, color: COLOR.body, valign: "top", margin: 0 });
  });
  footer(s, 8);
}

// ============================================================================
// 9 — WHAT'S SHIPPED (proof checklist)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "WHAT'S ALREADY BUILT");
  title(s, "Not “fund the build.” “Deploy what's running.”");
  subhead(s, "The product Mr. Mawere would log into next Saturday already exists in production.");

  const proof = [
    { check: true,  label: "Live React + Supabase PWA",        sub: "production, mobile-first, USSD-friendly" },
    { check: true,  label: "Paynow Core Express Checkout",     sub: "demoed end-to-end with real EcoCash USSD" },
    { check: true,  label: "TXT.co.zw SMS notifications",      sub: "live in production" },
    { check: true,  label: "Atomic auction-close + winner RPC",sub: "place_bid / end_expired_auctions, live" },
    { check: true,  label: "Agentic auto-buy demo",            sub: "demoed to Paynow leadership 2026-05-08" },
    { check: true,  label: "BillPay biller-inbound API",       sub: "AUTH live; PAY round-trip awaiting creds" },
    { check: false, label: "Bisafe escrow integration",       sub: "designed, awaiting Paynow Bisafe spec" },
  ];
  proof.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.7 + col * 4.5, y = 2.45 + row * 0.62;
    s.addShape(pres.shapes.OVAL, { x, y: y + 0.04, w: 0.24, h: 0.24, fill: { color: it.check ? COLOR.gold : COLOR.cardBg }, line: { color: it.check ? COLOR.gold : COLOR.muted, width: 1.5 } });
    if (it.check) s.addText("✓", { x, y: y + 0.01, w: 0.24, h: 0.24, fontFace: FONT.body, fontSize: 12, bold: true, color: COLOR.dark, align: "center", valign: "middle", margin: 0 });
    s.addText([
      { text: it.label, options: { bold: true, color: COLOR.body, breakLine: true } },
      { text: it.sub, options: { color: COLOR.muted, italic: true, fontSize: 10 } },
    ], { x: x + 0.4, y, w: 3.95, h: 0.6, fontFace: FONT.body, fontSize: 12.5, margin: 0, valign: "middle" });
  });
  footer(s, 9);
}

// ============================================================================
// 10 — THE LIVE DEMO (the "it's real" moment) — dark
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE LIVE DEMO", { x: 0.7, y: 0.5, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText("Browse → bid → real EcoCash USSD → Paid → winner SMS.", { x: 0.7, y: 0.95, w: 8.6, h: 0.7, fontFace: FONT.header, fontSize: 27, bold: true, color: COLOR.cream, margin: 0 });
  s.addText("One unbroken loop, on real rails, in under 90 seconds — the proof that everything before this slide is real.", { x: 0.7, y: 1.62, w: 8.6, h: 0.5, fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.gold });

  const steps = [
    ["1", "Tap a live auction", "Home feed → a DEMO lot ending in minutes."],
    ["2", "Bid US$0.06", "The penny ceiling — proves the no-minimum, sub-deposit path."],
    ["3", "Approve on the phone", "USSD prompt lands in 8–15s. Approve *151#."],
    ["4", "Web flips to Paid", "In <20s — poll-sync beats the webhook."],
  ];
  const w = 2.05, x0 = 0.7, gap = 0.15;
  steps.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.35, w, h: 1.55, fill: { color: COLOR.cream, transparency: 88 }, line: { color: COLOR.gold, width: 1 } });
    s.addText(p[0], { x: x + 0.18, y: 2.45, w: 0.6, h: 0.5, fontFace: FONT.header, fontSize: 26, bold: true, color: COLOR.gold, margin: 0 });
    s.addText(p[1], { x: x + 0.18, y: 2.95, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 12, bold: true, color: COLOR.cream, margin: 0 });
    s.addText(p[2], { x: x + 0.18, y: 3.27, w: w - 0.3, h: 0.6, fontFace: FONT.body, fontSize: 10, color: COLOR.mutedDark, margin: 0 });
  });
  s.addText([
    { text: "Why it never breaks:  ", options: { bold: true, color: COLOR.gold } },
    { text: "three independent paths must all fail before a user sees an error — the webhook, a 20-second poll-sync, and a Cloudflare relay for when Paynow's bot wall blocks Supabase directly. Resilience is the demo.", options: { color: COLOR.cream } },
  ], { x: 0.7, y: 4.15, w: 8.6, h: 0.9, fontFace: FONT.body, fontSize: 12.5, margin: 0, lineSpacingMultiple: 1.1 });
  footer(s, 10, true);
}

// ============================================================================
// 11 — DIVIDER III: THE NATIONAL GATEWAY
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "III", "THE NATIONAL GATEWAY", "Zimbabwe is digitizing its cattle. Nobody is moving the money.", "Four national initiatives are building identity, title and asset layers for livestock. None of them owns verified payment, settlement, payout, or title-transfer-on-payment. That is exactly what we built — on Paynow.");
}

// ============================================================================
// 12 — THE FOUR NATIONAL INITIATIVES (table)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE NATIONAL LANDSCAPE");
  title(s, "Four initiatives. All identity, title or asset. None money.");
  subhead(s, "Zimbabwe's livestock-digitization stack — who's building what, and what each layer actually provides.");

  const rows = [
    { ini: "E-Livestock Global", who: "Mastercard (blockchain)", prov: "UHF RFID ear tags — animal identity, origin, health", layer: "IDENTITY" },
    { ini: "Digital Stock Card", who: "Ministry of Lands & Agric.", prov: "Digitized record of ownership, health, movement", layer: "TITLE" },
    { ini: "Online auction networks", who: "Private auctioneers (CC Sales)", prov: "The transaction venue — bidding per-kilogram", layer: "VENUE" },
    { ini: "Asset tokenization", who: "TN Livestock Trust → VFEX", prov: "Financialization — 1 token per kg, listed on VFEX", layer: "ASSET" },
  ];
  const headers = ["INITIATIVE", "OWNER / BACKER", "WHAT IT PROVIDES", "LAYER"];
  const colWs = [2.2, 2.3, 3.0, 1.1];
  const tableX = 0.7, tableY = 2.45, rowH = 0.6;
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: 0.32, fontFace: FONT.body, fontSize: 9.5, bold: true, charSpacing: 1, color: COLOR.terracotta, align: i === 3 ? "center" : "left", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + 0.36, w: 8.6, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + 0.46 + idx * rowH; cx = tableX;
    [r.ini, r.who, r.prov, r.layer].forEach((c, i) => {
      if (i === 3) {
        s.addShape(pres.shapes.RECTANGLE, { x: cx + 0.05, y: y + 0.08, w: colWs[3] - 0.1, h: 0.34, fill: { color: COLOR.terracotta }, line: { type: "none" } });
        s.addText(c, { x: cx + 0.05, y: y + 0.08, w: colWs[3] - 0.1, h: 0.34, fontFace: FONT.body, fontSize: 8.5, bold: true, charSpacing: 1, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
      } else {
        s.addText(c, { x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.header : FONT.body, fontSize: i === 0 ? 13 : 11, bold: i === 0, color: i === 0 ? COLOR.body : COLOR.muted, valign: "middle", margin: 0 });
      }
      cx += colWs[i];
    });
    if (idx < rows.length - 1) s.addShape(pres.shapes.LINE, { x: tableX, y: y + rowH, w: 8.6, h: 0, line: { color: COLOR.muted, width: 0.3 } });
  });
  s.addText([
    { text: "The structural insight:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "three of four are identity / title / asset layers with no payment + settlement + payout + title-transfer engine underneath. They are the missing half of each other.", options: { color: COLOR.body } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 12);
}

// ============================================================================
// 13 — THE MISSING LAYER (gateway diagram) — the centerpiece
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE GATEWAY");
  title(s, "We are the rail the whole stack plugs into.");
  s.addText("They built “which animal is this and who owns it.” We built “transact, settle, pay out, and transfer title — with money attached.”", { x: 0.7, y: 1.72, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.muted });

  // LEFT: identity/title/asset layers (the inputs)
  const inputs = ["E-Livestock RFID", "Digital Stock Card", "Per-kg auctions", "VFEX tokenization"];
  s.addText("IDENTITY · TITLE · ASSET", { x: 0.7, y: 2.45, w: 2.5, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 1, color: COLOR.muted, align: "center", margin: 0 });
  inputs.forEach((t, i) => {
    const y = 2.78 + i * 0.56;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y, w: 2.5, h: 0.46, fill: { color: COLOR.cardBg }, line: { color: COLOR.muted, width: 0.75 } });
    s.addText(t, { x: 0.7, y, w: 2.5, h: 0.46, fontFace: FONT.body, fontSize: 11.5, color: COLOR.body, align: "center", valign: "middle", margin: 0 });
  });

  // Arrow 1
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 3.32, y: 3.35, w: 0.7, h: 0.5, fill: { color: COLOR.gold }, line: { type: "none" } });

  // CENTER: ZimLivestock settlement engine
  s.addShape(pres.shapes.RECTANGLE, { x: 4.15, y: 2.6, w: 2.6, h: 2.0, fill: { color: COLOR.dark }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 10, offset: 3, angle: 90, opacity: 0.18 } });
  s.addShape(pres.shapes.RECTANGLE, { x: 4.15, y: 2.6, w: 2.6, h: 0.1, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("ZIMLIVESTOCK", { x: 4.25, y: 2.78, w: 2.4, h: 0.3, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.cream, align: "center", margin: 0 });
  s.addText("settlement & payout engine", { x: 4.25, y: 3.08, w: 2.4, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, color: COLOR.gold, align: "center", margin: 0 });
  ["Verified payment", "Escrow + clearance", "Seller payout", "Title transfer on settle"].forEach((t, i) => {
    s.addText("•  " + t, { x: 4.35, y: 3.45 + i * 0.27, w: 2.3, h: 0.25, fontFace: FONT.body, fontSize: 9.5, color: COLOR.mutedDark, margin: 0 });
  });

  // Arrow 2
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 6.85, y: 3.35, w: 0.7, h: 0.5, fill: { color: COLOR.gold }, line: { type: "none" } });

  // RIGHT: Paynow rails
  s.addShape(pres.shapes.RECTANGLE, { x: 7.65, y: 2.95, w: 1.7, h: 1.3, fill: { color: COLOR.terracotta }, line: { type: "none" } });
  s.addText("PAYNOW", { x: 7.65, y: 3.2, w: 1.7, h: 0.4, fontFace: FONT.header, fontSize: 17, bold: true, color: COLOR.cream, align: "center", margin: 0 });
  s.addText("the rails", { x: 7.65, y: 3.6, w: 1.7, h: 0.3, fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.cream, align: "center", margin: 0 });

  s.addText([
    { text: "Bridge, not pivot.  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "The identity layers become inputs we consume, not things we rebuild — every listing carries a nationally-recognized animal ID; every settled sale can write a title-transfer event back to the registry.", options: { color: COLOR.body } },
  ], { x: 0.7, y: 4.85, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11, italic: true, margin: 0 });
  footer(s, 13);
}

// ============================================================================
// 14 — HOW WE PLUG IN (bridge build items)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "MAKING ALIGNMENT TRUE");
  title(s, "Three small, additive moves — not a new company.");
  subhead(s, "Ranked by leverage ÷ effort. The work that makes “we align with the national initiatives” true and demonstrable is small and builds on the live schema.");

  const moves = [
    { tag: "BUILD 1 · schema + 1 edge fn", t: "Anchor every listing on the animal-ID layer", b: "Promote the free-text reference to a structured animal_id / rfid_tag, validated against the E-Livestock / stock-card format. Each listing now carries a nationally-recognized ID." },
    { tag: "BUILD 2 · shape an existing table", t: "Write title-transfer back on settlement", b: "On payment + clearance, emit an ownership-transfer event keyed to the animal ID — exactly the event the Digital Stock Card needs. Money + clearance are what actually change title." },
    { tag: "BUILD 3 · small UX / RPC change", t: "Per-kg auction mode", b: "Add weight-based bidding and A/B/C grade — the CC Sales convention. Closes the credibility gap with real auctioneers and matches how the market already prices cattle." },
  ];
  const w = 2.85, x0 = 0.7;
  moves.forEach((m, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w, h: 2.4, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w, h: 0.08, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(m.tag, { x: x + 0.2, y: 2.72, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 1, color: COLOR.terracotta, margin: 0 });
    s.addText(m.t, { x: x + 0.2, y: 3.02, w: w - 0.3, h: 0.7, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.body, margin: 0 });
    s.addText(m.b, { x: x + 0.2, y: 3.72, w: w - 0.3, h: 1.15, fontFace: FONT.body, fontSize: 10.5, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "Honest caveat:  ", options: { bold: true, color: COLOR.body } },
    { text: "Builds 1–2 assume a data-sharing arrangement with the Ministry / E-Livestock that doesn't exist yet — a partnership ask, not a sprint. Tokenization/VFEX stays narrative color: regulated, 2–3 yr horizon.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, margin: 0 });
  footer(s, 14);
}

// ============================================================================
// 15 — DIVIDER IV: GO-TO-MARKET
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "IV", "GO-TO-MARKET", "How we enter — anchors first, then fill.", "Sign the scarce Tier-A houses early for GMV and credibility, then ride a self-serve wizard to ~20 houses (about a third of the market) over five years — largely self-funded.");
}

// ============================================================================
// 16 — MARKET SIZING + PRICING TIERS (combined table)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "MARKET & PRICING");
  title(s, "~40–60 houses, three tiers, priced to USD willingness-to-pay.");
  subhead(s, "The market segments cleanly by sale-day GMV and cadence. Each tier has a one-off onboarding fee and a monthly subscription — plus a thin 0.75% take on settled GMV across all tiers.");

  const rows = [
    { tier: "A — Anchor", gmv: "US$80–120k", cad: "Weekly", cnt: "~8", onb: "US$3,500", sub: "US$1,500/mo" },
    { tier: "B — Mid-market", gmv: "US$40–80k", cad: "Wk–fortnight", cnt: "~20", onb: "US$2,500", sub: "US$1,200/mo" },
    { tier: "C — Small/regional", gmv: "US$10–30k", cad: "Fortnightly", cnt: "~20", onb: "US$1,500", sub: "US$900/mo" },
    { tier: "Pilot (any tier)", gmv: "varies", cad: "90 days", cnt: "—", onb: "US$1,000*", sub: "US$1,000/mo" },
  ];
  const headers = ["TIER", "SALE-DAY GMV", "CADENCE", "IN MKT", "ONBOARDING", "SUBSCRIPTION"];
  const colWs = [2.15, 1.5, 1.35, 0.95, 1.35, 1.3];
  const tableX = 0.7, tableY = 2.55, rowH = 0.52;
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: 0.32, fontFace: FONT.body, fontSize: 9.5, bold: true, charSpacing: 1, color: COLOR.terracotta, align: i === 0 ? "left" : "right", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + 0.36, w: 8.6, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + 0.46 + idx * rowH; cx = tableX;
    const isPilot = idx === 3;
    [r.tier, r.gmv, r.cad, r.cnt, r.onb, r.sub].forEach((c, i) => {
      const emph = i >= 4;
      s.addText(c, { x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.header : FONT.body, fontSize: i === 0 ? 13 : (emph ? 13 : 11.5), bold: i === 0 || emph, italic: isPilot && i === 0, color: emph ? COLOR.terracotta : (i === 0 ? COLOR.body : COLOR.muted), align: i === 0 ? "left" : "right", valign: "middle", margin: 0 });
      cx += colWs[i];
    });
    if (idx < rows.length - 1) s.addShape(pres.shapes.LINE, { x: tableX, y: y + rowH, w: 8.6, h: 0, line: { color: COLOR.muted, width: 0.3 } });
  });
  s.addText("*Pilot deposit credited toward the full tier onboarding fee on conversion — a converting house never pays twice.  All tiers + 0.75% take on settled GMV.", { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, color: COLOR.muted, margin: 0 });
  footer(s, 16);
}

// ============================================================================
// 17 — THE FLYWHEEL
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE GROWTH THESIS");
  title(s, "The order is the strategy.");
  subhead(s, "You cannot monetize consumers before the houses bring them. Every consumer line sits strictly downstream of B2B onboarding — which is why the model leans on subscriptions early.");

  const steps = [
    { n: "1", t: "Houses onboard", b: "as paying, RLS-isolated tenants" },
    { n: "2", t: "Buyers & sellers transact digitally", b: "settling on rails, not cash + WhatsApp" },
    { n: "3", t: "Delivery demand accumulates", b: "one house is negligible; twelve is a logistics book" },
    { n: "4", t: "Transport revenue + stickiness grow", b: "a house whose buyers get reliable delivery won't leave" },
  ];
  const w = 2.05, x0 = 0.7, gap = 0.15;
  steps.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w, h: 2.0, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 2.72, w: 0.5, h: 0.5, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(p.n, { x: x + 0.2, y: 2.72, w: 0.5, h: 0.5, fontFace: FONT.header, fontSize: 22, bold: true, color: COLOR.dark, align: "center", valign: "middle", margin: 0 });
    s.addText(p.t, { x: x + 0.18, y: 3.32, w: w - 0.32, h: 0.7, fontFace: FONT.header, fontSize: 14, bold: true, color: COLOR.body, margin: 0 });
    s.addText(p.b, { x: x + 0.18, y: 4.02, w: w - 0.32, h: 0.5, fontFace: FONT.body, fontSize: 10, color: COLOR.muted, margin: 0 });
    if (i < steps.length - 1) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + w + 0.0, y: 3.45, w: 0.16, h: 0.28, fill: { color: COLOR.terracotta }, line: { type: "none" } });
  });
  s.addText([
    { text: "Why transport, and only transport:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "already shipped (buyer checkout quote: US$15 base + US$0.35/km, capped US$250), it solves the #1 post-sale friction, and the buyer already expects to pay for delivery. We coordinate — we don't haul.", options: { color: COLOR.body } },
  ], { x: 0.7, y: 4.75, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11, italic: true, margin: 0 });
  footer(s, 17);
}

// ============================================================================
// 18 — THE RAMP (3 phases) + Paynow channel
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE RAMP");
  title(s, "5 → 8 → 12 → 16 → 20 houses, anchors-first.");
  subhead(s, "The self-serve wizard turns each new house into a ~6-minute, admin-approved tenant — so growth rides on house count + transport, not bespoke labor. Adding the tenth house costs roughly what the second did.");

  const phases = [
    { tag: "YEAR 1", title: "Anchors signed", body: "5 houses live — incl. 3 of ~8 Tier A anchors (the load-bearing bet). Wizard live: /operators → admin approval → RLS tenant." },
    { tag: "YEARS 2–3", title: "The category", body: "8 → 12 houses live. Case studies compound. Paynow's contacts become the channel that sources new houses." },
    { tag: "YEARS 4–5", title: "20 houses + transport", body: "16 → 20 live (~1/3 of the market). Consumer-transport line ramps the B2B2C upside from 1.3% to 8.8% of revenue." },
  ];
  const w = 2.85, x0 = 0.7;
  phases.forEach((p, i) => {
    const x = x0 + i * (w + 0.15);
    s.addText(p.tag, { x, y: 2.6, w, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
    s.addText(p.title, { x, y: 2.9, w, h: 0.6, fontFace: FONT.header, fontSize: 19, bold: true, color: COLOR.body, margin: 0 });
    s.addText(p.body, { x, y: 3.6, w, h: 1.4, fontFace: FONT.body, fontSize: 11.5, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "“", options: { color: COLOR.terracotta, fontSize: 20, bold: true } },
    { text: "Paynow's growing contacts are the channel for selling this engine — and every house it sources routes its GMV onto Paynow's rails.", options: { color: COLOR.body, italic: true } },
    { text: "”", options: { color: COLOR.terracotta, fontSize: 20, bold: true } },
  ], { x: 0.7, y: 4.9, w: 8.6, h: 0.3, fontFace: FONT.header, fontSize: 12, margin: 0, valign: "middle" });
  footer(s, 18);
}

// ============================================================================
// 19 — DIVIDER V: THE FINANCIALS
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "V", "FINANCIAL PREDICTIONS", "The honest numbers.", "A five-year model for a scaling B2B-SaaS platform prying open a legacy, manual, cash-based market. Surplus-positive every year. No raise — because there is nowhere in Zimbabwe to raise one.");
}

// ============================================================================
// 20 — SURPLUS FROM YEAR ONE (5-year P&L chart)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE BASE CASE");
  title(s, "Surplus-positive from the first year.");
  subhead(s, "Twenty houses live (5 → 8 → 12 → 16 → 20) over five years; the founder draws a salary inside payroll. Self-funded with a 2–3 month working-capital buffer — not a raise.");

  const data = [
    { name: "Revenue", labels: MODEL.years, values: MODEL.revenue },
    { name: "Operating cost", labels: MODEL.years, values: MODEL.cost },
    { name: "Operating surplus", labels: MODEL.years, values: MODEL.surplus },
  ];
  s.addChart(pres.charts.BAR, data, {
    x: 0.7, y: 2.5, w: 5.7, h: 2.55, barDir: "col", barGrouping: "clustered",
    chartColors: [COLOR.gold, COLOR.muted, COLOR.green],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body, showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 9,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  [0, 2, 4].forEach((i, k) => {
    const y = 2.55 + k * 0.82;
    s.addText(MODEL.years[i].toUpperCase(), { x: 6.7, y, w: 2.7, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 2, color: COLOR.muted, margin: 0 });
    s.addText([
      { text: "+" + usd(MODEL.surplus[i]), options: { bold: true, color: COLOR.green, fontFace: FONT.header, fontSize: 20 } },
      { text: "  surplus", options: { color: COLOR.muted, fontSize: 11 } },
    ], { x: 6.7, y: y + 0.22, w: 2.7, h: 0.4, margin: 0 });
    s.addText(`${MODEL.houses[i]} houses live · rev ${usd(MODEL.revenue[i])}`, { x: 6.7, y: y + 0.58, w: 2.7, h: 0.22, fontFace: FONT.body, fontSize: 9.5, italic: true, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "External equity required: US$0.  ", options: { bold: true, color: COLOR.terracotta } },
    { text: `Cumulative surplus reaches ${usd(MODEL.fiveYr.surplus)} over 5 years; the Year-1 cushion is thin (~3.5 weeks of opex), which is exactly why the buffer is non-negotiable.`, options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 20);
}

// ============================================================================
// 21 — REVENUE BY LINE (table)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "REVENUE BY LINE");
  title(s, "US$1.03M over five years — subscription is the spine.");
  subhead(s, "Four revenue lines: three B2B today, plus a consumer-transport line that grows the upside. All figures US$.");

  const rows = [
    { label: "Houses live",  y1: "5",       y3: "12",       y5: "20",       total: "20" },
    { label: "Onboarding",   y1: "$14,500", y3: "$10,000",  y5: "$10,000",  total: "$52,000" },
    { label: "Subscription", y1: "$39,600", y3: "$151,200", y5: "$266,400", total: "$766,800" },
    { label: "Tx take (0.75%)", y1: "$6,710", y3: "$27,625", y5: "$53,618", total: "$146,258" },
    { label: "Transport",    y1: "$826",    y3: "$9,521",   y5: "$31,677",  total: "$64,745" },
    { label: "Revenue",      y1: "$61,636", y3: "$198,346", y5: "$361,695", total: "$1,029,803" },
  ];
  const headers = ["", "Year 1", "Year 3", "Year 5", "5-yr total"];
  const tableY = 2.45, rowH = 0.36, tableX = 0.7, tableW = 8.6;
  const colWs = [1.8, 1.7, 1.7, 1.7, 1.7];
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: rowH, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 2, color: COLOR.terracotta, align: i === 0 ? "left" : "right", valign: "middle", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + rowH, w: tableW, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + rowH + 0.1 + idx * rowH; cx = tableX;
    const cells = [r.label, r.y1, r.y3, r.y5, r.total];
    const isRevenue = r.label === "Revenue";
    cells.forEach((c, i) => {
      const isTotalCol = i === cells.length - 1;
      const emphasize = isRevenue || isTotalCol;
      s.addText(c, { x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.body : FONT.header, fontSize: i === 0 ? 12 : 14, bold: i === 0 || emphasize, color: emphasize ? COLOR.terracotta : COLOR.body, align: i === 0 ? "left" : "right", valign: "middle", margin: 0 });
      cx += colWs[i];
    });
    if (isRevenue) s.addShape(pres.shapes.LINE, { x: tableX, y, w: tableW, h: 0, line: { color: COLOR.terracotta, width: 1 } });
  });
  s.addText([
    { text: "Revenue mix shifts B2B → B2B2C:  ", options: { bold: true, color: COLOR.body } },
    { text: "98.7% auction-house / 1.3% transport in Y1 → 91.2% / 8.8% in Y5. Subscription stays ~74% of Y5 revenue — a consumer line on a B2B spine, not yet a co-equal pillar.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.95, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 21);
}

// ============================================================================
// 22 — WHAT PAYNOW GETS (GMV onto rails)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE PAYNOW UPSIDE");
  title(s, "Every dollar we move, moves on Paynow rails.");
  subhead(s, "Our take revenue is thin by design. The GMV we route onto Paynow — and the products it activates — is the number that matters to you, and it grows fastest.");

  const n = MODEL.years.length, x0 = 0.7, span = 8.65, gap = 0.13;
  const w = (span - gap * (n - 1)) / n;
  MODEL.years.forEach((yr, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w, h: 1.5, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 0.06, h: 1.5, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(yr.toUpperCase().replace("YEAR ", "Y"), { x: x + 0.14, y: 2.62, w: w - 0.18, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 1, color: COLOR.muted, margin: 0 });
    s.addText(usdK(MODEL.gmvPaynow[i]), { x: x + 0.14, y: 2.98, w: w - 0.18, h: 0.55, fontFace: FONT.header, fontSize: 20, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText("on Paynow", { x: x + 0.14, y: 3.55, w: w - 0.18, h: 0.3, fontFace: FONT.body, fontSize: 9, italic: true, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "5-year GMV onto Paynow rails:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: usd(MODEL.fiveYr.gmv) + " (over US$19.5M).", options: { color: COLOR.body } },
  ], { x: 0.7, y: 4.12, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 11.5, italic: true, margin: 0 });
  s.addText("PRODUCTS THIS PUTS TO WORK", { x: 0.7, y: 4.5, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.terracotta, margin: 0 });
  s.addText([
    { text: "Core Express Checkout  ·  Bisafe escrow  ·  BillPay-as-biller  ·  EcoCash USSD  ·  merchant transfers  ·  SMS notifications", options: { color: COLOR.body } },
  ], { x: 0.7, y: 4.8, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11.5, margin: 0 });
  footer(s, 22);
}

// ============================================================================
// 23 — RISKS (Zimbabwe-specific)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "WHAT COULD KILL THIS");
  title(s, "Four real risks, each with a mitigation we've chosen.");
  subhead(s, "Honest about the things that don't show up in a first-world model.");

  const risks = [
    { n: "1", t: "Landing 3 of ~8 Tier A anchors in Y1", b: "The most aggressive assumption. Anchors-first GTM + a thin Y1 surplus and a 2–3 month buffer absorb a slow start; a gentler anchor cohort cascades cleanly through the model." },
    { n: "2", t: "USD scarcity & cash habits", b: "Buyers transact in cash; USD is tight. Mitigation: meet them on five rails so digital is easier than cash, and recapture the sub-deposit slice the manual floor excludes." },
    { n: "3", t: "Currency volatility (ZWL/ZiG swings)", b: "Local-currency margins evaporate. Mitigation: all pricing and contracts in USD; the take invoiced on USD-equivalent settled GMV." },
    { n: "4", t: "Paynow dependency", b: "The settlement spine runs on Paynow; an outage stalls the core value. Mitigation: poll-URL fallback live, browser-relay bypasses the Cloudflare bot wall. Deep alignment is the mitigation and the point." },
  ];
  const w = 4.25, gx = 0.7, gy = 2.5, gap = 0.2;
  risks.forEach((l, i) => {
    const x = gx + (i % 2) * (w + gap);
    const y = gy + Math.floor(i / 2) * 1.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.2, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(l.n, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(l.t, { x: x + 0.75, y: y + 0.12, w: w - 0.9, h: 0.34, fontFace: FONT.header, fontSize: 13.5, bold: true, color: COLOR.body, margin: 0 });
    s.addText(l.b, { x: x + 0.75, y: y + 0.45, w: w - 0.9, h: 0.72, fontFace: FONT.body, fontSize: 9, color: COLOR.muted, margin: 0 });
  });
  footer(s, 23);
}

// ============================================================================
// 24 — DIVIDER VI: THE PAYNOW RETURN
// ============================================================================
{
  const s = pres.addSlide();
  divider(s, "VI", "THE PAYNOW RETURN", "What this internship is worth to Paynow.", "Beyond a product built on your rails: a flagship vertical, ~US$19.5M of GMV onto Paynow, and a developer-experience audit that makes the gateway easier for the next builder to adopt.");
}

// ============================================================================
// 25 — THE MARKET (how big the prize is) — grounded TAM
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE MARKET · HOW BIG IS THE PRIZE");
  title(s, "A ~US$220M cattle trade. Almost none of it on a rail.", { size: 26 });
  subhead(s, "Zimbabwe runs one of Africa's larger cattle economies — and at the point of sale it is still overwhelmingly cash. Digitizing even a sliver routes serious GMV onto Paynow.", 1.78);

  const tiers = [
    { n: "~US$220M", label: "cattle traded nationally / year",
      body: "5.7M-head national herd × 6% off-take ≈ 342,000 cattle sold a year, at a conservative US$650 each. Most changes hands farm-gate or on WhatsApp — in cash, off any rail.", dark: false },
    { n: "~US$90M", label: "the formal auction floor / year",
      body: "~50 auction houses (8 anchor · 20 mid · 20 regional), by sale-day GMV × cadence. This is the slice we can actually reach, settle and route onto Paynow.", dark: false },
    { n: "~US$9M", label: "if we digitize just 10%",
      body: "10% of the formal floor — onto Paynow rails, from a market that is ~100% cash today. Our 5-yr plan lands here: a US$7.1M Year-5 run-rate, ~8% of the floor.", dark: true },
  ];
  const w = 2.73, x0 = 0.7, gap = 0.22;
  tiers.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    const bg = p.dark ? COLOR.dark : COLOR.cardBg;
    const accent = p.dark ? COLOR.gold : COLOR.terracotta;
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.46, w, h: 2.06, fill: { color: bg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.46, w: 0.06, h: 2.06, fill: { color: accent }, line: { type: "none" } });
    s.addText(p.n, { x: x + 0.2, y: 2.58, w: w - 0.3, h: 0.58, fontFace: FONT.header, fontSize: 24, bold: true, color: accent, margin: 0 });
    s.addText(p.label, { x: x + 0.2, y: 3.16, w: w - 0.3, h: 0.42, fontFace: FONT.body, fontSize: 10, bold: true, color: p.dark ? COLOR.cream : COLOR.body, margin: 0 });
    s.addText(p.body, { x: x + 0.2, y: 3.62, w: w - 0.36, h: 0.85, fontFace: FONT.body, fontSize: 8.7, color: p.dark ? COLOR.mutedDark : COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "Grounded in:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "national herd 5.7M (Parliament / Newsday, Sept 2025) · 6% off-take (FAO) · live cattle US$2.84–3.93/kg (Selina Wamucii, 2025). Government targets a US$25bn livestock sector by 2030.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.74, w: 8.7, h: 0.4, fontFace: FONT.body, fontSize: 8.3, italic: true, margin: 0 });
  footer(s, 25);
}

// ============================================================================
// 26 — HOW THE NUMBERS ARE BUILT (bottom-up, no black box)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "HOW THE NUMBERS ARE BUILT · NO BLACK BOX");
  title(s, "Every dollar traces to a driver.", { size: 28 });
  subhead(s, "The US$19.5M is built bottom-up from auction-floor reality — not a top-down guess. Here is the chain, and Year 1 worked end-to-end.", 1.78);

  // LEFT — the driver chain
  s.addText("THE DRIVER CHAIN", { x: 0.7, y: 2.32, w: 4.2, h: 0.25, fontFace: FONT.body, fontSize: 9.5, bold: true, charSpacing: 1, color: COLOR.terracotta, margin: 0 });
  const steps = [
    "Houses live, by tier — 5 → 8 → 12 → 16 → 20 (anchors first)",
    "× sale-day GMV × cadence  =  each house's annual floor",
    "× digital adoption 10.5% → 13.7% — only the remote / sub-deposit slice",
    "× half-year go-live on every new cohort",
    "=  GMV settled onto Paynow rails",
  ];
  steps.forEach((t, i) => {
    const y = 2.64 + i * 0.44;
    const last = i === steps.length - 1;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.03, w: 0.26, h: 0.26, fill: { color: last ? COLOR.green : COLOR.terracotta }, line: { type: "none" } });
    s.addText(`${i + 1}`, { x: 0.7, y: y + 0.03, w: 0.26, h: 0.26, fontFace: FONT.body, fontSize: 10, bold: true, color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: 1.08, y, w: 3.75, h: 0.42, fontFace: FONT.body, fontSize: 10, bold: last, color: last ? COLOR.body : COLOR.muted, valign: "middle", margin: 0 });
  });

  // RIGHT — Year 1 worked end-to-end (dark card)
  const cx = 5.25, cw = 4.1;
  s.addShape(pres.shapes.RECTANGLE, { x: cx, y: 2.3, w: cw, h: 2.5, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: cx, y: 2.3, w: 0.08, h: 2.5, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("YEAR 1, WORKED END-TO-END", { x: cx + 0.25, y: 2.4, w: cw - 0.4, h: 0.25, fontFace: FONT.body, fontSize: 9.5, bold: true, charSpacing: 1, color: COLOR.gold, margin: 0 });
  s.addText("3 anchor + 1 mid + 1 regional house (all new)", { x: cx + 0.25, y: 2.65, w: cw - 0.4, h: 0.24, fontFace: FONT.body, fontSize: 9, italic: true, color: COLOR.mutedDark, margin: 0 });
  const rows = [
    ["Full-year floor (3×$4.8M+$2.16M+$0.48M)", "$17.04M", false],
    ["Half-year (all new cohort)  ÷ 2", "$8.52M", false],
    ["× digital adoption  10.5%", "$894,600", true],
    ["Cross-check:  ÷ $650 ticket", "1,376 tx ✓", false],
  ];
  rows.forEach((r, i) => {
    const y = 3.0 + i * 0.41;
    s.addText(r[0], { x: cx + 0.25, y, w: 2.55, h: 0.36, fontFace: FONT.body, fontSize: 8.7, color: r[2] ? COLOR.gold : COLOR.mutedDark, bold: r[2], valign: "middle", margin: 0 });
    s.addText(r[1], { x: cx + 2.62, y, w: cw - 2.87, h: 0.36, fontFace: FONT.header, fontSize: r[2] ? 13 : 11, bold: true, color: r[2] ? COLOR.gold : COLOR.cream, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("Same drivers × 5 years  →  US$19.5M cumulative onto Paynow.", { x: cx + 0.25, y: 4.46, w: cw - 0.4, h: 0.26, fontFace: FONT.body, fontSize: 8.7, italic: true, color: COLOR.mutedDark, margin: 0 });

  // BOTTOM — conservatism stack
  s.addText([
    { text: "Conservative by construction:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "1/3 of the market · adoption held <14% · US$650 ticket skewed low · we model only the sub-deposit slice cash excludes. The one stretch — landing 3 of ~8 anchors in Year 1.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.98, w: 8.7, h: 0.28, fontFace: FONT.body, fontSize: 9, italic: true, margin: 0 });
  footer(s, 26);
}

// ============================================================================
// 27 — THE VALUE PROPOSITION FOR PAYNOW (why this is a win for Paynow)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE VALUE PROPOSITION FOR PAYNOW");
  title(s, "Why ZimLivestock is a win for Paynow.", { size: 28 });
  subhead(s, "Our take is thin by design. The value to Paynow is the GMV, the vertical and the network it activates — not the 0.75% we charge the house.", 1.95);

  const cards = [
    { n: "$19.5M", label: "GMV onto your rails (5yr)", body: "Livestock settlement routed through Core Express Checkout, BillPay, EcoCash USSD & merchant transfers — volume that is cash today." },
    { n: "6", label: "products live in production", body: "A flagship reference deployment proving the Paynow ecosystem composes into a real, paying business — not a demo." },
    { n: "40–60", label: "a new merchant category", body: "Auction houses are a class Paynow doesn't serve today. Each house onboarded is a new recurring biller + settlement account." },
    { n: "9", label: "DX fixes delivered as feedback", body: "A full developer-experience benchmark vs Stripe, Paystack, Flutterwave & Pesepay — the next integrator's path made shorter." },
  ];
  const w = 2.05, x0 = 0.7, gap = 0.15;
  cards.forEach((p, i) => {
    const x = x0 + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w, h: 2.2, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 0.06, h: 2.2, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(p.n, { x: x + 0.2, y: 2.62, w: w - 0.25, h: 0.62, fontFace: FONT.header, fontSize: 26, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText(p.label, { x: x + 0.2, y: 3.26, w: w - 0.25, h: 0.48, fontFace: FONT.body, fontSize: 10, bold: true, color: COLOR.body, margin: 0 });
    s.addText(p.body, { x: x + 0.2, y: 3.78, w: w - 0.25, h: 0.95, fontFace: FONT.body, fontSize: 9.5, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "The strategic fit:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "Paynow's growing contacts open the doors; ZimLivestock does the on-the-ground operating — and every dollar it settles flows onto Paynow rails.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.9, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, margin: 0 });
  footer(s, 27);
}

// ============================================================================
// 28 — DX BENCHMARK FINDINGS (the honest scorecard + what Paynow wins)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "DEVELOPER EXPERIENCE BENCHMARK · FINDINGS");
  title(s, "I also stress-tested your front door.", { size: 28 });
  subhead(s, "Four weeks integrating Paynow with no SDK, benchmarked against four global gateways — the honest scorecard, and what Paynow already does better than anyone in this market.", 1.78);
  s.addText([
    { text: "Overall DX: 3.0 / 5", options: { bold: true, color: COLOR.terracotta } },
    { text: "    — Stripe 4.8 · Paystack 4.2 · Flutterwave 3.5 (same framework)", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 2.28, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 12, margin: 0 });

  // LEFT — 7-dimension scorecard with mini bars (averages to 3.0)
  const dims = [
    { d: "Documentation", v: 3.0 },
    { d: "Integration simplicity", v: 2.5 },
    { d: "Error messages", v: 2.5 },
    { d: "API accessibility", v: 2.0 },
    { d: "SDK quality", v: 3.0 },
    { d: "Sandbox / testing", v: 4.0 },
    { d: "Onboarding speed", v: 4.0 },
  ];
  const barX = 2.55, barW = 1.95, rowH = 0.34, top = 2.72;
  dims.forEach((r, i) => {
    const y = top + i * rowH;
    s.addText(r.d, { x: 0.7, y, w: 1.8, h: 0.28, fontFace: FONT.body, fontSize: 9.5, color: COLOR.body, valign: "middle", margin: 0 });
    s.addShape(pres.shapes.RECTANGLE, { x: barX, y: y + 0.05, w: barW, h: 0.16, fill: { color: "D6E0F2" }, line: { type: "none" } });
    const fillColor = r.v < 2 ? COLOR.warn : (r.v < 3 ? COLOR.terracotta : COLOR.green);
    s.addShape(pres.shapes.RECTANGLE, { x: barX, y: y + 0.05, w: barW * (r.v / 5), h: 0.16, fill: { color: fillColor }, line: { type: "none" } });
    s.addText(r.v.toFixed(1), { x: barX + barW + 0.1, y, w: 0.5, h: 0.28, fontFace: FONT.body, fontSize: 9.5, bold: true, color: COLOR.body, valign: "middle", margin: 0 });
  });

  // RIGHT — what Paynow already wins (dark card)
  s.addShape(pres.shapes.RECTANGLE, { x: 5.55, y: 2.62, w: 3.8, h: 2.42, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.55, y: 2.62, w: 0.08, h: 2.42, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("WHAT PAYNOW ALREADY WINS", { x: 5.78, y: 2.74, w: 3.4, h: 0.25, fontFace: FONT.body, fontSize: 9.5, bold: true, charSpacing: 1, color: COLOR.gold, margin: 0 });
  const wins = [
    "Widest local coverage — EcoCash, OneMoney, InnBucks, O'mari, Zimswitch, Visa/MC",
    "BuySafe escrow built in — Stripe charges extra; Paystack has none",
    "Realistic test mode — success / delayed / cancelled / insufficient",
    "BillPay Vendor API is genuinely well-designed (AUTH→PAY, JSON)",
    "No minimum fees — works for micro-transactions",
  ];
  wins.forEach((t, i) => {
    const y = 3.06 + i * 0.39;
    s.addShape(pres.shapes.OVAL, { x: 5.8, y: y + 0.06, w: 0.1, h: 0.1, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(t, { x: 6.0, y, w: 3.2, h: 0.38, fontFace: FONT.body, fontSize: 8.7, color: COLOR.mutedDark, valign: "top", margin: 0 });
  });
  footer(s, 28);
}

// ============================================================================
// 29 — DX SOLUTIONS (the 9 recommendations, ranked by severity)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "DEVELOPER EXPERIENCE BENCHMARK · SOLUTIONS");
  title(s, "Nine recommendations, ranked by severity.");
  subhead(s, "Every issue I hit became a concrete, defensible fix. The report is a gift to whoever builds on Paynow next.");

  const groups = [
    { sev: "CRITICAL · 1", chip: COLOR.warn, chipText: "FFFFFF",
      body: [{ text: "Move the API off the bot-walled www domain — host it on api.paynow.co.zw with no Cloudflare challenge. ", options: { color: COLOR.body, bold: true } }, { text: "This is exactly why the live demo routes through a browser-relay.", options: { color: COLOR.muted } }] },
    { sev: "HIGH · 3", chip: COLOR.terracotta, chipText: "FFFFFF",
      body: [{ text: "Accept JSON alongside form-encoding · Document the hash field-order explicitly · Return structured error codes — today one “Invalid Hash” hides five different root causes.", options: { color: COLOR.body } }] },
    { sev: "MEDIUM · 4", chip: COLOR.gold, chipText: "0A2540",
      body: [{ text: "Add express-checkout examples · A status page + webhook delivery logs · Publish an OpenAPI spec · Make the Node & Java SDKs behave identically.", options: { color: COLOR.body } }] },
    { sev: "LOW · 1", chip: COLOR.muted, chipText: "FFFFFF",
      body: [{ text: "Expand test-mode docs — team testing, webhook testing and a go-live checklist.", options: { color: COLOR.body } }] },
  ];
  const gx = 0.7, gy = 2.38, step = 0.64, cardH = 0.56;
  groups.forEach((g, i) => {
    const y = gy + i * step;
    s.addShape(pres.shapes.RECTANGLE, { x: gx, y, w: 8.6, h: cardH, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 5, offset: 1, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.RECTANGLE, { x: gx + 0.15, y: y + 0.12, w: 1.2, h: 0.36, fill: { color: g.chip }, line: { type: "none" } });
    s.addText(g.sev, { x: gx + 0.15, y: y + 0.12, w: 1.2, h: 0.36, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 1, color: g.chipText, align: "center", valign: "middle", margin: 0 });
    s.addText(g.body, { x: gx + 1.55, y, w: 6.9, h: cardH, fontFace: FONT.body, fontSize: 10, valign: "middle", margin: 0 });
  });
  s.addText([
    { text: "Result:  ", options: { bold: true, color: COLOR.terracotta } },
    { text: "Paynow DX scored 3.0/5 — solid, and every gap is fixable; most are documentation, not architecture. Full report: paynow-dx-recommendations.md.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.96, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 9.5, italic: true, margin: 0 });
  footer(s, 29);
}

// ============================================================================
// 30 — THE ASK (doors and rails) — dark
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ASK", { x: 0.7, y: 0.55, w: 6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText("Not money. Doors and rails.", { x: 0.7, y: 1.05, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 40, bold: true, color: COLOR.cream, margin: 0 });
  s.addText("Two things, neither of them a cheque.", { x: 0.7, y: 1.95, w: 8.6, h: 0.5, fontFace: FONT.header, fontSize: 19, italic: true, color: COLOR.gold, margin: 0 });

  const asks = [
    { t: "Access to your growing contacts", b: "Paynow's expanding network of merchants, billers and industry relationships — as the starting point for selling this settlement engine into the livestock market. Your contacts are the doors; I do the on-the-ground operating you don't want to." },
    { t: "Continued access to the rails & core infrastructure", b: "Keep me on the Paynow stack I've built ZimLivestock on — Core Express Checkout, BillPay-as-biller, EcoCash USSD, merchant transfers, SMS. The engine runs on your rails; staying plugged in is what keeps every dollar of GMV flowing onto them." },
  ];
  asks.forEach((a, i) => {
    const y = 2.75 + i * 1.2;
    s.addText(`${i + 1}`, { x: 0.7, y, w: 0.5, h: 0.7, fontFace: FONT.header, fontSize: 30, bold: true, color: COLOR.gold, margin: 0 });
    s.addText([
      { text: a.t + "   ", options: { bold: true, color: COLOR.cream, fontSize: 17, breakLine: true } },
      { text: a.b, options: { color: COLOR.mutedDark, fontSize: 12.5 } },
    ], { x: 1.3, y: y + 0.02, w: 8.0, h: 1.1, fontFace: FONT.body, valign: "top", margin: 0 });
  });
  footer(s, 30, true);
}

// ============================================================================
// 31 — CLOSE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ONE-PARAGRAPH VERSION", { x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText([
    { text: "I sat through a real sale day, found four problems the auction floor can't solve, and built a digital floor on Paynow rails that already runs in production.  ", options: { color: COLOR.cream } },
    { text: "It turns out to be the money layer that three of four national cattle-digitization initiatives lack — the settlement, payout and title-transfer engine the identity layers plug into.  ", options: { color: COLOR.gold, bold: true } },
    { text: "The five-year plan reaches 20 houses — about a third of the market — for US$1.03M revenue and a US$346,583 cumulative surplus, self-funded, routing over US$19.5M onto Paynow rails.  ", options: { color: COLOR.cream } },
    { text: "The ask is one 90-day paid pilot to land the first anchor and prove the playbook.", options: { color: COLOR.gold, bold: true } },
  ], { x: 0.7, y: 1.15, w: 8.6, h: 2.5, fontFace: FONT.header, fontSize: 16, margin: 0, paraSpaceAfter: 4, lineSpacingMultiple: 1.12 });
  s.addText("Build software you can sell — and a business this market can actually carry.", { x: 0.7, y: 4.0, w: 8.6, h: 0.5, fontFace: FONT.header, fontSize: 20, italic: true, bold: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw    ·    companions: gtm-strategy.md · financial-model.xlsx · national-initiative-alignment.md · paynow-dx-recommendations.md", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.95, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11 });
}

pres.writeFile({ fileName: "zimlivestock-final-presentation.pptx" }).then((f) => console.log("Wrote:", f));

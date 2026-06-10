// Mimoo — 8-slide auction-house sales pitch
// Built on Andy Raskin's strategic-narrative arc (name the change → winners &
// losers → promised land → capabilities as "magic gifts" → evidence), layered
// with StoryBrand (the auctioneer is the hero, we're the guide), Challenger
// loss-aversion (frame inaction as the loss), Loom's contrast slide, and a
// reversible founding-partner pilot. Dark→light→dark pacing: dark for the
// emotional/stakes beats (1,2,3,8), light for the rational beats (4,5,6,7).
// Opens on the founder's father — an RBZ finance director who loves cattle but
// can't get to a sale-day auction: Exhibit A of the shift in who buys cattle.
//
// Palette: terracotta/cream/gold + Georgia/Calibri (house style, financial-deck).
// Build: cd deliverables/business && NODE_PATH=$(npm root -g) node mimoo-pitch-build.cjs

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042", cream: "F5E6D3", dark: "2D1B1A", gold: "D4A843",
  body: "2D1B1A", muted: "7A4F47", mutedDark: "BFAA98", lightCream: "EADBC6",
  fadedCard: "E7D7C1", cardBg: "FFFFFF", green: "5A7D5A",
};
const FONT = { header: "Georgia", body: "Calibri" };

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "Mimoo — Sales Pitch to Auction Houses";
const TOTAL = 8;

function accentBar(s, color = COLOR.gold) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color }, line: { type: "none" } });
}
function footer(s, n, dark = false) {
  s.addText("MIMOO  ·  FOR ZIMBABWE'S AUCTION HOUSES", {
    x: 0.5, y: 5.3, w: 8, h: 0.22, fontFace: FONT.body, fontSize: 8, charSpacing: 3,
    color: dark ? COLOR.mutedDark : COLOR.muted });
  s.addText(`${n} / ${TOTAL}`, { x: 9.0, y: 5.3, w: 0.6, h: 0.22, fontFace: FONT.body, fontSize: 8, align: "right",
    color: dark ? COLOR.mutedDark : COLOR.muted });
}
function eyebrow(s, t, color = COLOR.terracotta) {
  s.addText(t, { x: 0.7, y: 0.52, w: 8.5, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color });
}
function title(s, t, o = {}) {
  s.addText(t, { x: 0.7, y: o.y || 0.95, w: o.w || 8.7, h: o.h || 0.85, fontFace: FONT.header, fontSize: o.size || 26, bold: true, color: o.color || COLOR.body, margin: 0, lineSpacingMultiple: o.ls || 1.02 });
}

// ============================================================================
// 1 — COLD OPEN: the father  (dark)  · Raskin step 0→1: emotion, then zoom out
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("MIMOO  ·  LIVESTOCK AUCTIONS, SETTLED", {
    x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true, color: COLOR.gold });
  s.addText("My father loves cattle.\nHe just can't get to the auction.", {
    x: 0.7, y: 1.18, w: 8.6, h: 1.4, fontFace: FONT.header, fontSize: 37, bold: true, color: COLOR.cream, lineSpacingMultiple: 1.02, margin: 0 });
  s.addText("He's a Director of Finance at the Reserve Bank. His heart is in the herd — but he's never free on a sale-day Tuesday. So he buys blind on WhatsApp, and overpays.", {
    x: 0.7, y: 2.92, w: 8.5, h: 0.75, fontFace: FONT.body, fontSize: 15, color: COLOR.cream, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("There are thousands like him — doctors, engineers, civil servants, the diaspora. People with the money and the love for cattle, kept out by one thing: they can't be in the room.", {
    x: 0.7, y: 3.74, w: 8.5, h: 0.7, fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.lightCream, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("He isn't the exception. He's where your buyers are going.", {
    x: 0.7, y: 4.7, w: 8.6, h: 0.4, fontFace: FONT.header, fontSize: 16, bold: true, italic: true, color: COLOR.gold, margin: 0 });
}

// ============================================================================
// 2 — THE CHANGE  (dark)  · Raskin step 1: name the shift, not the product
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  eyebrow(s, "WHAT'S CHANGING", COLOR.gold);
  title(s, "The people who want your cattle\naren't standing in the pen anymore.", { color: COLOR.cream, size: 29, y: 1.05, h: 1.3 });
  s.addText("They're in Harare offices. In Bulawayo. In Joburg and London. They have the money and the appetite — and a phone. The next generation of buyers grew up on EcoCash.", {
    x: 0.7, y: 2.75, w: 8.5, h: 0.85, fontFace: FONT.body, fontSize: 15.5, color: COLOR.lightCream, margin: 0, lineSpacingMultiple: 1.1 });
  s.addText("Zimbabwe already moved its money onto the phone. The auction floor is one of the last rooms that still runs on cash and presence — and the trade is quietly leaving it.", {
    x: 0.7, y: 3.85, w: 8.5, h: 0.85, fontFace: FONT.header, fontSize: 16, italic: true, bold: true, color: COLOR.gold, margin: 0, lineSpacingMultiple: 1.08 });
  footer(s, 2, true);
}

// ============================================================================
// 3 — WINNERS & LOSERS + cost of standing still  (dark)  · Challenger loss-aversion
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  eyebrow(s, "WINNERS & LOSERS", COLOR.gold);
  title(s, "The trade doesn't wait. It routes around you.", { color: COLOR.cream, size: 26, y: 0.95 });
  // Big full-bleed loss number
  s.addText("US$480,000", { x: 0.7, y: 1.75, w: 8.6, h: 0.95, fontFace: FONT.header, fontSize: 60, bold: true, color: COLOR.gold, margin: 0 });
  s.addText("a year already leaving an anchor floor for WhatsApp groups — unsettled, unverified, at lower prices. That demand doesn't disappear. It just stops being yours.", {
    x: 0.72, y: 2.78, w: 8.4, h: 0.6, fontFace: FONT.body, fontSize: 14, color: COLOR.lightCream, margin: 0, lineSpacingMultiple: 1.05 });
  // The fork (win / lose)
  const fork = [
    { mark: COLOR.gold, k: "Open your floor", v: "deeper bidder pool, higher hammer prices, money the same day. You become the regional hub." },
    { mark: COLOR.terracotta, k: "Stay cash-only", v: "the buyers who moved on don't come back. The crowd thins, the prices soften, the trade goes elsewhere." },
  ];
  fork.forEach((f, i) => {
    const y = 3.65 + i * 0.72;
    s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: y + 0.05, w: 0.1, h: 0.5, fill: { color: f.mark }, line: { type: "none" } });
    s.addText([
      { text: f.k + ".  ", options: { bold: true, color: COLOR.cream } },
      { text: f.v, options: { color: COLOR.mutedDark } },
    ], { x: 0.95, y, w: 8.3, h: 0.6, fontFace: FONT.body, fontSize: 13.5, margin: 0, valign: "middle", lineSpacingMultiple: 1.03 });
  });
  footer(s, 3, true);
}

// ============================================================================
// 4 — THE PROMISED LAND  (light)  · Raskin step 3: the future, before features
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "WHERE THIS GOES");
  title(s, "Your auction — with the whole country in the room.", { size: 26 });
  s.addText("Picture your next sale day. The pen is full — and so is the line of bidders you can't see: the doctor in Harare, the son in Joburg, the farmer two provinces over, all raising their hands in real time.", {
    x: 0.7, y: 2.0, w: 8.5, h: 1.1, fontFace: FONT.body, fontSize: 17, color: COLOR.body, margin: 0, lineSpacingMultiple: 1.18 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 3.45, w: 0.1, h: 1.25, fill: { color: COLOR.terracotta }, line: { type: "none" } });
  s.addText("The hammer falls higher. The money lands before the truck leaves the gate. And it is still your floor, your auctioneer, your name on the sale.", {
    x: 0.98, y: 3.5, w: 8.2, h: 1.2, fontFace: FONT.header, fontSize: 20, italic: true, bold: true, color: COLOR.terracotta, margin: 0, lineSpacingMultiple: 1.12 });
  footer(s, 4);
}

// ============================================================================
// 5 — CONTRAST / MAGIC GIFTS  (light)  · Loom side-by-side + Raskin step 4
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "TODAY   vs.   WITH MIMOO");
  title(s, "Same auction. Bigger room.", { size: 26 });
  // Left: today (faded)
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 1.95, w: 4.05, h: 3.05, fill: { color: COLOR.fadedCard }, line: { type: "none" } });
  s.addText("TODAY", { x: 0.95, y: 2.15, w: 3.6, h: 0.35, fontFace: FONT.body, fontSize: 13, bold: true, charSpacing: 3, color: COLOR.muted, margin: 0 });
  s.addText([
    { text: "Only the buyers in the pen", options: { bullet: { code: "2014", indent: 16 } } },
    { text: "Cash, IOUs, no-shows", options: { bullet: { code: "2014", indent: 16 } } },
    { text: "Sellers paid days later", options: { bullet: { code: "2014", indent: 16 } } },
    { text: "Buyers you'll never reach", options: { bullet: { code: "2014", indent: 16 } } },
  ], { x: 0.95, y: 2.6, w: 3.6, h: 2.2, fontFace: FONT.body, fontSize: 14, color: COLOR.muted, margin: 0, lineSpacingMultiple: 1.35, paraSpaceAfter: 6 });
  // Right: with Mimoo (vivid, dark)
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.95, w: 4.4, h: 3.05, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.0, y: 1.95, w: 0.09, h: 3.05, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("WITH MIMOO", { x: 5.3, y: 2.15, w: 3.9, h: 0.35, fontFace: FONT.body, fontSize: 13, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Bidders on five channels — web, WhatsApp, USSD, any phone", options: { bullet: { code: "2713", indent: 18 } } },
    { text: "Settled on Paynow before the truck leaves", options: { bullet: { code: "2713", indent: 18 } } },
    { text: "Remote & diaspora buyers in the room", options: { bullet: { code: "2713", indent: 18 } } },
    { text: "Verified buyers, escrow, digital clearance", options: { bullet: { code: "2713", indent: 18 } } },
  ], { x: 5.3, y: 2.6, w: 3.85, h: 2.2, fontFace: FONT.body, fontSize: 14, color: COLOR.cream, margin: 0, lineSpacingMultiple: 1.3, paraSpaceAfter: 6 });
  footer(s, 5);
}

// ============================================================================
// 6 — EVIDENCE / TRUST  (light)  · Raskin step 5 + name the objection (Front)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "WHY YOU CAN TRUST IT");
  title(s, "Built on the rails your buyers already trust.", { size: 26 });
  s.addText([
    { text: "You're thinking: ", options: { bold: true, color: COLOR.body } },
    { text: "my buyers don't trust apps — and I'm not handing my floor to a stranger.", options: { italic: true, color: COLOR.muted } },
  ], { x: 0.7, y: 1.9, w: 8.6, h: 0.4, fontFace: FONT.body, fontSize: 14, margin: 0 });
  const rows = [
    { k: "It settles on Paynow", v: "Every cent clears on Paynow — the name Zimbabwe already pays with. We never hold your money or your buyers' details." },
    { k: "It's real, not a slide", v: "A working platform, built and tested on real auction floors — five live channels, settlement running today." },
    { k: "You're a founder, not a guinea pig", v: "I'm building this with a handful of respected houses. Yours is the kind of name the rest of the market follows." },
  ];
  rows.forEach((r, i) => {
    const y = 2.5 + i * 0.84;
    s.addShape(pres.shapes.OVAL, { x: 0.7, y: y + 0.04, w: 0.2, h: 0.2, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(r.k, { x: 1.05, y, w: 3.2, h: 0.7, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.body, margin: 0, valign: "top", lineSpacingMultiple: 1.0 });
    s.addText(r.v, { x: 4.35, y, w: 4.95, h: 0.78, fontFace: FONT.body, fontSize: 12.5, color: COLOR.muted, margin: 0, valign: "top", lineSpacingMultiple: 1.05 });
  });
  footer(s, 6);
}

// ============================================================================
// 7 — THE DE-RISKED OFFER  (light)  · reversible founding-partner pilot
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE OFFER");
  title(s, "Run one sale day on it. Keep only what works.", { size: 26 });
  const steps = [
    { n: "1", k: "Set up", body: "Your branded floor, live in a week. No engineering, no disruption to how you run the room." },
    { n: "2", k: "Run one sale", body: "We stand beside you for a single sale day and switch the digital bidders on — side by side." },
    { n: "3", k: "Decide", body: "You see the bidders you were missing, then choose. Walk away any time — no lock-in." },
  ];
  const w = 2.85, x0 = 0.7;
  steps.forEach((st, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.OVAL, { x, y: 2.0, w: 0.55, h: 0.55, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(st.n, { x, y: 2.0, w: 0.55, h: 0.55, fontFace: FONT.header, fontSize: 22, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(st.k, { x: x + 0.7, y: 2.03, w: w - 0.7, h: 0.5, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(st.body, { x, y: 2.75, w: w - 0.1, h: 1.25, fontFace: FONT.body, fontSize: 12.5, color: COLOR.muted, margin: 0, lineSpacingMultiple: 1.08 });
  });
  // Terms strip
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 4.3, w: 8.7, h: 0.72, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addText([
    { text: "THE TERMS   ", options: { bold: true, color: COLOR.gold, charSpacing: 2 } },
    { text: "US$1,000 to start, credited on sign-on  ·  90 days  ·  no lock-in  ·  founding houses only", options: { color: COLOR.cream } },
  ], { x: 0.95, y: 4.3, w: 8.25, h: 0.72, fontFace: FONT.body, fontSize: 12, valign: "middle", margin: 0 });
  footer(s, 7);
}

// ============================================================================
// 8 — THE ASK / CTA  (dark, bookend)  · StoryBrand CTA + close where we opened
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ASK", { x: 0.7, y: 0.62, w: 5.6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText("Let me show you —\nat your next sale.", {
    x: 0.7, y: 1.2, w: 5.6, h: 1.5, fontFace: FONT.header, fontSize: 37, bold: true, color: COLOR.cream, lineSpacingMultiple: 1.02, margin: 0 });
  s.addText("Start the founding pilot. Or just let me stand at your next auction and show you the hands going up from three provinces away — no commitment.", {
    x: 0.7, y: 3.15, w: 5.45, h: 1.0, fontFace: FONT.body, fontSize: 14.5, color: COLOR.lightCream, margin: 0, lineSpacingMultiple: 1.12 });
  s.addText("My father would be one of them.", {
    x: 0.7, y: 4.32, w: 5.5, h: 0.4, fontFace: FONT.header, fontSize: 16, bold: true, italic: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw", options: { color: COLOR.gold } },
  ], { x: 0.7, y: 5.0, w: 5.6, h: 0.3, fontFace: FONT.body, fontSize: 12.5, margin: 0 });
  // Right: pilot card (echo of the offer)
  s.addShape(pres.shapes.RECTANGLE, { x: 6.35, y: 1.4, w: 3.05, h: 3.05, fill: { type: "none" }, line: { color: COLOR.gold, width: 1.5 } });
  s.addText("THE FOUNDING PILOT", { x: 6.35, y: 1.66, w: 3.05, h: 0.3, fontFace: FONT.body, fontSize: 10.5, bold: true, charSpacing: 2, color: COLOR.gold, align: "center", margin: 0 });
  s.addText("US$1,000", { x: 6.35, y: 2.08, w: 3.05, h: 0.7, fontFace: FONT.header, fontSize: 38, bold: true, color: COLOR.cream, align: "center", margin: 0 });
  s.addText("to start", { x: 6.35, y: 2.8, w: 3.05, h: 0.3, fontFace: FONT.header, fontSize: 14, italic: true, color: COLOR.gold, align: "center", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 3.3, w: 0.75, h: 0.02, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("One sale day. 90 days. No lock-in. Credited when you sign on.", {
    x: 6.6, y: 3.5, w: 2.55, h: 0.85, fontFace: FONT.body, fontSize: 11.5, color: COLOR.lightCream, align: "center", margin: 0, lineSpacingMultiple: 1.08 });
}

pres.writeFile({ fileName: "mimoo-pitch.pptx" }).then((f) => console.log("wrote", f));

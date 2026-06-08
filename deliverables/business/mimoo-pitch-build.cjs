// Mimoo — 6-slide auction-house pitch deck
// Audience: auction-house owners/managers. Job: problem (their floor) → the
// money on the table → the solution (Mimoo = you become the digital floor) →
// how it works + trust → the ask (one-sale-day pilot). Opens on the founder's
// real story (his father, a busy RBZ finance director who loves cattle but
// can't get to the auction — the archetype of the locked-out professional buyer).
//
// Reuses the terracotta/cream/gold house palette from financial-deck-build.cjs.
// Build:  cd deliverables/business && NODE_PATH=$(npm root -g) node mimoo-pitch-build.cjs

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042", cream: "F5E6D3", dark: "2D1B1A", gold: "D4A843",
  body: "2D1B1A", muted: "7A4F47", mutedDark: "BFAA98", lightCream: "EADBC6",
  cardBg: "FFFFFF", green: "5A7D5A",
};
const FONT = { header: "Georgia", body: "Calibri" };

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "Mimoo — Pitch to Auction Houses";
const TOTAL = 6;

function accentBar(s, color = COLOR.gold) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color }, line: { type: "none" } });
}
function footer(s, n, dark = false) {
  s.addText("MIMOO  ·  FOR ZIMBABWE'S AUCTION HOUSES  ·  2026", {
    x: 0.5, y: 5.3, w: 8, h: 0.22, fontFace: FONT.body, fontSize: 8, charSpacing: 3,
    color: dark ? COLOR.mutedDark : COLOR.muted });
  s.addText(`${n} / ${TOTAL}`, { x: 9.0, y: 5.3, w: 0.6, h: 0.22, fontFace: FONT.body, fontSize: 8, align: "right",
    color: dark ? COLOR.mutedDark : COLOR.muted });
}
function eyebrow(s, t, color = COLOR.terracotta) {
  s.addText(t, { x: 0.7, y: 0.5, w: 8.5, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color });
}
function title(s, t, o = {}) {
  s.addText(t, { x: 0.7, y: o.y || 0.95, w: o.w || 8.7, h: o.h || 0.85, fontFace: FONT.header, fontSize: o.size || 26, bold: true, color: o.color || COLOR.body, margin: 0, lineSpacingMultiple: 1.0 });
}
function subhead(s, t, y = 1.9, w = 8.7) {
  s.addText(t, { x: 0.7, y, w, h: 0.55, fontFace: FONT.body, fontSize: 13, color: COLOR.muted, margin: 0, lineSpacingMultiple: 1.0 });
}

// ============================================================================
// 1 — STORY / HOOK  (dark)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("MIMOO  ·  LIVESTOCK AUCTIONS, SETTLED", {
    x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true, color: COLOR.gold });
  s.addText("My father loves cattle.\nHe just can't get to the auction.", {
    x: 0.7, y: 1.2, w: 8.6, h: 1.4, fontFace: FONT.header, fontSize: 37, bold: true, color: COLOR.cream, lineSpacingMultiple: 1.02, margin: 0 });
  s.addText("He's a Director of Finance at the Reserve Bank. His heart is in the herd — but he's never free on a sale-day Tuesday. So he buys blind on WhatsApp, and overpays.", {
    x: 0.7, y: 2.95, w: 8.5, h: 0.75, fontFace: FONT.body, fontSize: 15, color: COLOR.cream, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("There are thousands like him — doctors, engineers, civil servants, the diaspora. People with the money and the love for cattle, locked out by one thing: they can't be in the room.", {
    x: 0.7, y: 3.78, w: 8.5, h: 0.7, fontFace: FONT.body, fontSize: 13, italic: true, color: COLOR.lightCream, margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("That missing buyer is the demand leaking off your floor.", {
    x: 0.7, y: 4.72, w: 8.6, h: 0.4, fontFace: FONT.header, fontSize: 15, bold: true, italic: true, color: COLOR.gold, margin: 0 });
}

// ============================================================================
// 2 — THE PROBLEM  (light)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE PROBLEM");
  title(s, "Your room is only as strong as who's in it.");
  subhead(s, "Every sale day, the buyers who can't make the deposit or the drive don't disappear — they go to a group chat that can't even guarantee payment.", 1.9, 8.5);
  const cards = [
    { tag: "THE BUYERS YOU CAN'T REACH", body: "Professionals, the diaspora, remote farmers — real money, kept out by distance and a US$1,000 deposit they'll never post for one beast." },
    { tag: "THE LEAK TO WHATSAPP", body: "Unsettled, unverified, lower prices. Trades that should clear on your floor happen in a group chat — and your commission never sees them." },
    { tag: "THE CASH & NO-SHOW DRAG", body: "Cash handling, no-shows, slow payouts. Friction that eats your sale day and chips at the trust your floor is built on." },
  ];
  const w = 2.85, x0 = 0.7;
  cards.forEach((c, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w, h: 2.35, fill: { color: COLOR.dark }, line: { type: "none" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.55, w: 0.08, h: 2.35, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(c.tag, { x: x + 0.25, y: 2.74, w: w - 0.45, h: 0.58, fontFace: FONT.body, fontSize: 12, bold: true, charSpacing: 1, color: COLOR.gold, margin: 0, valign: "top", lineSpacingMultiple: 1.0 });
    s.addText(c.body, { x: x + 0.25, y: 3.38, w: w - 0.45, h: 1.42, fontFace: FONT.body, fontSize: 12, color: COLOR.cream, margin: 0, lineSpacingMultiple: 1.05 });
  });
  footer(s, 2);
}

// ============================================================================
// 3 — THE MONEY ON THE TABLE  (light, big stat)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE MONEY ON THE TABLE");
  title(s, "US$480,000 a year never reaches your room.");
  subhead(s, "An anchor house clears ~US$4.8M across the floor a year. The locked-out buyers are demand worth roughly a tenth of it — that never settles with you.", 1.9, 8.6);
  // Big stat (left)
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.65, w: 3.5, h: 1.9, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addText("US$480K", { x: 0.8, y: 2.85, w: 3.3, h: 0.82, fontFace: FONT.header, fontSize: 42, bold: true, color: COLOR.gold, align: "center", margin: 0 });
  s.addText("demand leaking off an anchor floor every year — gone to WhatsApp, or never traded at all.", {
    x: 0.95, y: 3.72, w: 3.0, h: 0.75, fontFace: FONT.body, fontSize: 11, color: COLOR.cream, align: "center", margin: 0, lineSpacingMultiple: 1.03 });
  // The math (right)
  const steps = [
    { k: "US$4.8M", v: "your floor's GMV a year (≈US$100k × 48 sale-days)" },
    { k: "~10%", v: "locked-out demand that never reaches you" },
    { k: "Recapture ½", v: "≈ US$29K more commission a year, at 12%" },
  ];
  steps.forEach((st, i) => {
    const y = 2.7 + i * 0.6;
    s.addText(st.k, { x: 4.55, y, w: 1.75, h: 0.5, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.terracotta, valign: "middle", margin: 0 });
    s.addText(st.v, { x: 6.35, y, w: 3.05, h: 0.5, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0, lineSpacingMultiple: 1.0 });
  });
  s.addText([
    { text: "Mimoo costs US$18K a year. ", options: { bold: true, color: COLOR.body } },
    { text: "The math isn't close — and a fuller room lifts prices on everything else you sell.", options: { color: COLOR.muted, italic: true } },
  ], { x: 4.55, y: 4.5, w: 4.85, h: 0.45, fontFace: FONT.body, fontSize: 12, margin: 0, lineSpacingMultiple: 1.0 });
  s.addText("Illustrative for a US$80–120k sale-day house. We'll run your real numbers on the pilot.", {
    x: 0.7, y: 4.72, w: 3.55, h: 0.42, fontFace: FONT.body, fontSize: 9, italic: true, color: COLOR.muted, margin: 0, lineSpacingMultiple: 1.0 });
  footer(s, 3);
}

// ============================================================================
// 4 — THE SOLUTION  (light)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE SOLUTION");
  title(s, "You don't get disrupted by digital.\nYou become the digital floor.", { y: 0.95, h: 1.0 });
  subhead(s, "Mimoo adds remote and diaspora bidders to your live sale — your brand, your auctioneer, your fees — and settles every win instantly on Paynow.", 2.0, 8.6);
  const points = [
    { tag: "YOUR BRAND", body: "White-label. The floor stays yours; Mimoo is the rails behind it. Your book, your buyers, your data — yours alone." },
    { tag: "YOUR FLOOR, FULLER", body: "Hybrid: the auctioneer still runs the room; remote bids stream in alongside. More demand, same urgency." },
    { tag: "PAID INSTANTLY", body: "Wins settle on Paynow; sellers paid to a Paynow ID. No bank details to hold, no custody risk on you." },
  ];
  const w = 2.85, x0 = 0.7;
  points.forEach((p, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.9, w, h: 1.7, fill: { color: COLOR.cardBg }, line: { color: COLOR.gold, width: 1 },
      shadow: { type: "outer", color: "000000", blur: 7, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 3.13, w: 0.2, h: 0.2, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(p.tag, { x: x + 0.56, y: 3.06, w: w - 0.78, h: 0.32, fontFace: FONT.body, fontSize: 12, bold: true, charSpacing: 1, color: COLOR.terracotta, margin: 0, valign: "middle" });
    s.addText(p.body, { x: x + 0.25, y: 3.5, w: w - 0.5, h: 1.0, fontFace: FONT.body, fontSize: 11.5, color: COLOR.body, margin: 0, lineSpacingMultiple: 1.05 });
  });
  footer(s, 4);
}

// ============================================================================
// 5 — HOW IT WORKS + TRUST  (light)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "HOW IT WORKS");
  title(s, "Live in one sale day. Trusted from the first.");
  subhead(s, "A self-serve wizard sets you up in minutes. Then the platform does the work across every channel your buyers already use.", 1.9, 8.6);
  const steps = [
    { n: "1", k: "List", body: "Your sale catalogue goes digital. The onboarding wizard provisions your branded floor — no engineering, no SQL." },
    { n: "2", k: "Reach", body: "Buyers bid across five channels — web, WhatsApp, USSD, BillPay, Messenger — on any phone, anywhere." },
    { n: "3", k: "Settle", body: "Winning bids clear on Paynow. Sellers are paid; you keep your commission. Cash and no-shows, gone." },
  ];
  const w = 2.85, x0 = 0.7;
  steps.forEach((st, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.OVAL, { x, y: 2.6, w: 0.55, h: 0.55, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(st.n, { x, y: 2.6, w: 0.55, h: 0.55, fontFace: FONT.header, fontSize: 22, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(st.k, { x: x + 0.7, y: 2.63, w: w - 0.7, h: 0.5, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(st.body, { x, y: 3.35, w: w - 0.15, h: 1.1, fontFace: FONT.body, fontSize: 12, color: COLOR.muted, margin: 0, lineSpacingMultiple: 1.05 });
  });
  // Trust strip (one line)
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 4.58, w: 8.7, h: 0.6, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addText([
    { text: "BUILT-IN TRUST    ", options: { bold: true, color: COLOR.gold, charSpacing: 2 } },
    { text: "Digital police clearance   ·   Escrow until delivery   ·   Paynow-ID payouts", options: { color: COLOR.cream } },
  ], { x: 0.95, y: 4.58, w: 8.2, h: 0.6, fontFace: FONT.body, fontSize: 11.5, valign: "middle", margin: 0 });
  footer(s, 5);
}

// ============================================================================
// 6 — THE ASK  (dark, close)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ASK", { x: 0.7, y: 0.62, w: 5.6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText("One sale day.\nNinety days.\nNo risk.", {
    x: 0.7, y: 1.25, w: 5.5, h: 2.0, fontFace: FONT.header, fontSize: 38, bold: true, color: COLOR.cream, lineSpacingMultiple: 1.02, margin: 0 });
  s.addText([
    { text: "Run a single sale with Mimoo. ", options: { color: COLOR.cream, bold: true } },
    { text: "Let me show you the bidders you're missing — on your own floor, with your own cattle.", options: { color: COLOR.lightCream } },
  ], { x: 0.7, y: 3.55, w: 5.4, h: 0.9, fontFace: FONT.body, fontSize: 14, margin: 0, lineSpacingMultiple: 1.1 });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 4.62, w: 2.6, h: 0.02, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw", options: { color: COLOR.gold } },
  ], { x: 0.7, y: 4.78, w: 5.5, h: 0.3, fontFace: FONT.body, fontSize: 13, margin: 0 });
  // Right: pilot stat card
  s.addShape(pres.shapes.RECTANGLE, { x: 6.35, y: 1.4, w: 3.05, h: 3.05, fill: { type: "none" }, line: { color: COLOR.gold, width: 1.5 } });
  s.addText("THE PILOT", { x: 6.35, y: 1.68, w: 3.05, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 3, color: COLOR.gold, align: "center", margin: 0 });
  s.addText("US$1,000", { x: 6.35, y: 2.1, w: 3.05, h: 0.7, fontFace: FONT.header, fontSize: 38, bold: true, color: COLOR.cream, align: "center", margin: 0 });
  s.addText("to start", { x: 6.35, y: 2.82, w: 3.05, h: 0.3, fontFace: FONT.header, fontSize: 14, italic: true, color: COLOR.gold, align: "center", margin: 0 });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.5, y: 3.32, w: 0.75, h: 0.02, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("Credited to your contract the day you sign on — a converting house never pays twice.", {
    x: 6.6, y: 3.5, w: 2.55, h: 0.85, fontFace: FONT.body, fontSize: 11, color: COLOR.lightCream, align: "center", margin: 0, lineSpacingMultiple: 1.05 });
  s.addText("MIMOO  ·  LIVESTOCK AUCTIONS, SETTLED ON PAYNOW", {
    x: 0.7, y: 5.05, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 10, charSpacing: 3, color: COLOR.gold, margin: 0 });
}

pres.writeFile({ fileName: "mimoo-pitch.pptx" }).then((f) => console.log("wrote", f));

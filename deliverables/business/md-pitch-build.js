// ZimLivestock — MD Pitch Deck
// A scaling B2B SaaS platform for Zimbabwean livestock auction houses, diversifying into consumer transport.
// Reuses the terracotta/cream/gold palette from the return-day deck.

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042",
  cream: "F5E6D3",
  dark: "2D1B1A",
  gold: "D4A843",
  body: "2D1B1A",
  bodyDark: "F5E6D3",
  muted: "7A4F47",
  mutedDark: "BFAA98",
  cardBg: "FFFFFF",
};

const FONT = { header: "Georgia", body: "Calibri" };
const TOTAL = 12;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "ZimLivestock — Pitch to Paynow MD";

function addAccentBar(slide, color = COLOR.gold) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color }, line: { type: "none" },
  });
}

function addFooter(slide, n, dark = false) {
  slide.addText("ZIMLIVESTOCK  ·  PITCH TO PAYNOW MD  ·  MAY 2026", {
    x: 0.5, y: 5.27, w: 8, h: 0.22,
    fontFace: FONT.body, fontSize: 8, charSpacing: 3,
    color: dark ? COLOR.mutedDark : COLOR.muted,
  });
  slide.addText(`${n} / ${TOTAL}`, {
    x: 9.0, y: 5.27, w: 0.6, h: 0.22,
    fontFace: FONT.body, fontSize: 8, align: "right",
    color: dark ? COLOR.mutedDark : COLOR.muted,
  });
}

function addEyebrow(slide, text) {
  slide.addText(text, {
    x: 0.7, y: 0.5, w: 6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });
}

function addTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: 0.7, y: 0.95, w: 8.6, h: opts.h || 0.85,
    fontFace: FONT.header, fontSize: opts.size || 32, bold: true,
    color: COLOR.body, margin: 0,
  });
}

// ============================================================================
// 1 — TITLE (dark)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: COLOR.gold }, line: { type: "none" } });

  s.addText("ZIMLIVESTOCK  ·  MAY 2026", {
    x: 0.7, y: 0.5, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true,
    color: COLOR.gold,
  });

  s.addText("Software you can sell.", {
    x: 0.7, y: 1.5, w: 8.6, h: 1.0,
    fontFace: FONT.header, fontSize: 56, bold: true,
    color: COLOR.cream, margin: 0,
  });

  s.addText("A scaling B2B SaaS platform for Zimbabwean livestock auction houses, built on the Paynow ecosystem — B2B today, consumer transport tomorrow.", {
    x: 0.7, y: 2.7, w: 8.6, h: 1.0,
    fontFace: FONT.header, fontSize: 22, italic: true,
    color: COLOR.gold, margin: 0,
  });

  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "   ·   Paynow internship  ·   May 2026", options: { color: COLOR.mutedDark } },
  ], {
    x: 0.7, y: 4.85, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 12,
  });
}

// ============================================================================
// 2 — THE OPPORTUNITY
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE OPPORTUNITY");

  addTitle(s, "Zimbabwean auction houses leave money on the floor every Saturday.");

  s.addText("Four findings from a real field visit in March 2026, ranked by what they cost the auction house owner.", {
    x: 0.7, y: 1.85, w: 8.6, h: 0.5,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted,
  });

  const pains = [
    { n: "US$1k", label: "deposit gate", body: "Filters serious buyers — but locks out the marginal bidder who'd push the price up by 5%." },
    { n: "12%", label: "house fees", body: "High enough that sub-$500 trades route around the auction via WhatsApp groups." },
    { n: "1", label: "constable bottleneck", body: "Police clearance is paper-based and in-person. Physically caps every sale day." },
    { n: "0", label: "remarketing list", body: "Every Saturday's buyers walk out the door. No digital footprint, no next-week SMS." },
  ];

  const w = 2.05, startX = 0.7, gap = 0.15;
  pains.forEach((p, i) => {
    const x = startX + i * (w + gap);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.55, w, h: 2.4,
      fill: { color: COLOR.cardBg }, line: { type: "none" },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.55, w: 0.06, h: 2.4,
      fill: { color: COLOR.terracotta }, line: { type: "none" },
    });
    s.addText(p.n, {
      x: x + 0.2, y: 2.7, w: w - 0.25, h: 0.7,
      fontFace: FONT.header, fontSize: 36, bold: true,
      color: COLOR.terracotta, margin: 0,
    });
    s.addText(p.label, {
      x: x + 0.2, y: 3.4, w: w - 0.25, h: 0.3,
      fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 2,
      color: COLOR.body, margin: 0,
    });
    s.addText(p.body, {
      x: x + 0.2, y: 3.75, w: w - 0.25, h: 1.15,
      fontFace: FONT.body, fontSize: 11, color: COLOR.muted, margin: 0,
    });
  });

  addFooter(s, 2);
}

// ============================================================================
// 3 — THE PRODUCT
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE PRODUCT");

  addTitle(s, "A digital floor running under the auction house's own brand —");
  s.addText("each house onboarded as its own isolated tenant, in minutes.", {
    x: 0.7, y: 1.65, w: 8.6, h: 0.6,
    fontFace: FONT.header, fontSize: 24, italic: true,
    color: COLOR.terracotta, margin: 0,
  });

  const items = [
    "Self-serve onboarding wizard: /operators → admin approval → an RLS-isolated tenant in ~6 minutes, no SQL.",
    "Five live channels: web/PWA, WhatsApp, USSD, BillPay-as-biller, Facebook Messenger — buyers meet us where they already transact.",
    "Paynow settlement, BillPay biller-inbound, EcoCash USSD, SMS notifications — every product in the ecosystem.",
    "Bisafe escrow replaces the US$1,000 cash deposit. Remote bidders become real bidders.",
    "Constable workflow tool turns paper clearance into a chain-of-custody record.",
    "Every buyer's phone number stays with the auction house — a remarketing list for next Saturday's sale.",
  ];

  items.forEach((it, i) => {
    const y = 2.5 + i * 0.44;
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y + 0.11, w: 0.16, h: 0.16,
      fill: { color: COLOR.gold }, line: { type: "none" },
    });
    s.addText(it, {
      x: 1.0, y, w: 8.3, h: 0.44,
      fontFace: FONT.body, fontSize: 12.5, color: COLOR.body, margin: 0,
      valign: "top",
    });
  });

  addFooter(s, 3);
}

// ============================================================================
// 4 — THE MODEL (B2B SaaS platform)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE BUSINESS MODEL");

  addTitle(s, "We sell a subscription, not a licence.");

  s.addText("Four revenue lines: three B2B today, plus a consumer-transport line that grows the upside.", {
    x: 0.7, y: 1.85, w: 8.6, h: 0.4,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted,
  });

  const streams = [
    { tag: "ONBOARDING", title: "$1,500 – $3,500", sub: "one-off", body: "Tier A $3,500 · B $2,500 · C $1,500. Branded tenant, data migration, Paynow integration, training day. Pilot $1,000, credited on conversion." },
    { tag: "SUBSCRIPTION", title: "$900 – $1,500", sub: "/ month", body: "Tier A $1,500 · B $1,200 · C $900. Platform access, monitoring, support, reconciliation, monthly reports." },
    { tag: "TX TAKE",     title: "0.75%", sub: "of settled GMV", body: "On top of Paynow's fee. Aligns long-term incentives — the subscription carries the load. Transport adds a 4th, consumer line over time." },
  ];

  const w = 2.85, startX = 0.7;
  streams.forEach((st, i) => {
    const x = startX + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.5, w, h: 2.45,
      fill: { color: COLOR.dark }, line: { type: "none" },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.5, w: 0.08, h: 2.45,
      fill: { color: COLOR.gold }, line: { type: "none" },
    });
    s.addText(st.tag, {
      x: x + 0.25, y: 2.65, w: w - 0.3, h: 0.3,
      fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
      color: COLOR.gold, margin: 0,
    });
    s.addText(st.title, {
      x: x + 0.25, y: 3.0, w: w - 0.3, h: 0.55,
      fontFace: FONT.header, fontSize: 26, bold: true,
      color: COLOR.cream, margin: 0,
    });
    s.addText(st.sub, {
      x: x + 0.25, y: 3.6, w: w - 0.3, h: 0.3,
      fontFace: FONT.body, fontSize: 11, italic: true,
      color: COLOR.gold, margin: 0,
    });
    s.addText(st.body, {
      x: x + 0.25, y: 3.95, w: w - 0.3, h: 0.95,
      fontFace: FONT.body, fontSize: 11.5,
      color: COLOR.mutedDark, margin: 0,
    });
  });

  addFooter(s, 4);
}

// ============================================================================
// 5 — THE CUSTOMER (Mr. Mawere persona)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE CUSTOMER");

  addTitle(s, "Meet \"Mr. Mawere.\"", { size: 38 });

  s.addText("A composite drawn from field-research conversations with real Zim auction-house owners. And the bookkeeper who has to approve every cent.", {
    x: 0.7, y: 1.85, w: 8.6, h: 0.5,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted,
  });

  // Left: persona facts
  s.addText("THE OWNER", {
    x: 0.7, y: 2.5, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.terracotta,
  });
  s.addText([
    { text: "50-something, third-generation auction-house owner outside Harare.", options: { breakLine: true } },
    { text: "Runs the floor every Saturday. Knows the regular buyers by name.", options: { breakLine: true } },
    { text: "Bought into EcoCash three years ago. Won't write a line of code.", options: { breakLine: true } },
    { text: "Decides on: keeps his brand? brings new buyers? when does the money land?", options: {} },
  ], {
    x: 0.7, y: 2.75, w: 4.3, h: 2.3,
    fontFace: FONT.body, fontSize: 12, color: COLOR.body, paraSpaceAfter: 6, margin: 0,
  });

  // Right: what he buys vs won't buy
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: 2.5, w: 3.9, h: 2.5,
    fill: { color: COLOR.cardBg }, line: { type: "none" },
    shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 5.4, y: 2.5, w: 0.08, h: 2.5,
    fill: { color: COLOR.gold }, line: { type: "none" },
  });
  s.addText("WHAT HE WILL BUY", {
    x: 5.6, y: 2.65, w: 3.55, h: 0.3,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.terracotta, margin: 0,
  });
  s.addText([
    { text: "✓  A branded tenant, onboarded in minutes — not a build", options: { breakLine: true } },
    { text: "✓  A subscription that keeps the platform running", options: { breakLine: true } },
    { text: "✓  A small 0.75% take — shared upside", options: { breakLine: true } },
    { text: "✓  A 12-month commitment, not a multi-year lock-in", options: {} },
  ], {
    x: 5.6, y: 3.0, w: 3.55, h: 1.95,
    fontFace: FONT.body, fontSize: 12, color: COLOR.body, paraSpaceAfter: 6, margin: 0,
  });

  addFooter(s, 5);
}

// ============================================================================
// 6 — COMPETITIVE POSITIONING
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE LANDSCAPE");

  addTitle(s, "We sit in the empty quadrant.");

  // 2x2 quadrant — axes: built-for-Zim × settlement-built-in
  const gridX = 1.7, gridY = 2.05, gridW = 7.0, gridH = 2.85;
  const midX = gridX + gridW / 2;
  const midY = gridY + gridH / 2;

  // Grid background
  s.addShape(pres.shapes.RECTANGLE, {
    x: gridX, y: gridY, w: gridW, h: gridH,
    fill: { color: COLOR.cardBg }, line: { color: COLOR.muted, width: 0.5 },
  });
  // Cross-hair
  s.addShape(pres.shapes.LINE, {
    x: midX, y: gridY, w: 0, h: gridH,
    line: { color: COLOR.muted, width: 0.5 },
  });
  s.addShape(pres.shapes.LINE, {
    x: gridX, y: midY, w: gridW, h: 0,
    line: { color: COLOR.muted, width: 0.5 },
  });

  // Axis labels
  s.addText("BUILT FOR ZIMBABWE →", {
    x: gridX, y: gridY + gridH + 0.05, w: gridW, h: 0.25,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.muted, align: "center",
  });
  s.addText("SETTLEMENT BUILT IN →", {
    x: gridX - 1.0, y: gridY, w: 0.9, h: gridH,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.muted, align: "right", valign: "middle",
  });

  // Top-left: foreign platforms (run-it but not Zim)
  s.addText("Foreign platforms\n(AuctionsPlus, LMA)", {
    x: gridX + 0.2, y: gridY + 0.35, w: gridW / 2 - 0.4, h: 0.7,
    fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.muted, margin: 0,
  });

  // Top-right: us
  s.addShape(pres.shapes.OVAL, {
    x: midX + 1.5, y: gridY + 0.4, w: 1.6, h: 0.65,
    fill: { color: COLOR.terracotta }, line: { type: "none" },
    shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.2 },
  });
  s.addText("ZimLivestock", {
    x: midX + 1.5, y: gridY + 0.4, w: 1.6, h: 0.65,
    fontFace: FONT.header, fontSize: 14, bold: true,
    color: COLOR.cream, align: "center", valign: "middle", margin: 0,
  });

  // Bottom-left: generic marketplaces
  s.addText("Generic marketplaces\n(Facebook, Classifieds)", {
    x: gridX + 0.2, y: midY + 0.4, w: gridW / 2 - 0.4, h: 0.7,
    fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.muted, margin: 0,
  });

  // Bottom-right: status quo + WhatsApp
  s.addText("Status quo:\nWhatsApp groups + physical floors", {
    x: midX + 0.2, y: midY + 0.4, w: gridW / 2 - 0.4, h: 0.85,
    fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.muted, margin: 0,
  });

  addFooter(s, 6);
}

// ============================================================================
// 7 — UNIT ECONOMICS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "THE NUMBERS");

  addTitle(s, "$1.03M revenue over five years, off ~20 houses.");

  s.addText("The 5-year model: 5 → 8 → 12 → 16 → 20 live houses (about a third of the ~40–60 house market). Subscription is the spine; transaction take and transport ride on top. All US$.", {
    x: 0.7, y: 1.7, w: 8.6, h: 0.7,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted,
  });

  // Table — manually rendered with shapes for control. Representative Y1/Y3/Y5 + 5yr-total columns.
  const rows = [
    { label: "Houses live",  y1: "5",       y3: "12",      y5: "20",      total: "20" },
    { label: "Onboarding",   y1: "$14,500", y3: "$10,000", y5: "$10,000", total: "$52,000" },
    { label: "Subscription", y1: "$39,600", y3: "$151,200", y5: "$266,400", total: "$766,800" },
    { label: "Tx take",      y1: "$6,710",  y3: "$27,625", y5: "$53,618", total: "$146,258" },
    { label: "Transport",    y1: "$826",    y3: "$9,521",  y5: "$31,677", total: "$64,745" },
    { label: "Revenue",      y1: "$61,636", y3: "$198,346", y5: "$361,695", total: "$1,029,803" },
  ];
  const headers = ["",          "Year 1",    "Year 3",       "Year 5",       "5-yr total"];

  const tableY = 2.45, rowH = 0.33, tableX = 0.7, tableW = 8.6;
  const colWs = [1.8, 1.7, 1.7, 1.7, 1.7];

  // Header row
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, {
      x: cx, y: tableY, w: colWs[i], h: rowH,
      fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 2,
      color: COLOR.terracotta, align: i === 0 ? "left" : "right", valign: "middle",
      margin: 0,
    });
    cx += colWs[i];
  });
  // Header underline
  s.addShape(pres.shapes.LINE, {
    x: tableX, y: tableY + rowH, w: tableW, h: 0,
    line: { color: COLOR.terracotta, width: 1.5 },
  });

  // Data rows
  rows.forEach((r, idx) => {
    const y = tableY + rowH + 0.1 + idx * rowH;
    cx = tableX;
    const cells = [r.label, r.y1, r.y3, r.y5, r.total];
    const isRevenue = r.label === "Revenue";
    cells.forEach((c, i) => {
      const isTotalCol = i === cells.length - 1;
      const emphasize = isRevenue || isTotalCol;
      s.addText(c, {
        x: cx, y, w: colWs[i], h: rowH,
        fontFace: i === 0 ? FONT.body : FONT.header,
        fontSize: i === 0 ? 12 : 14,
        bold: i === 0 || emphasize,
        color: emphasize ? COLOR.terracotta : COLOR.body,
        align: i === 0 ? "left" : "right", valign: "middle",
        margin: 0,
      });
      cx += colWs[i];
    });
    if (isRevenue) {
      s.addShape(pres.shapes.LINE, {
        x: tableX, y, w: tableW, h: 0,
        line: { color: COLOR.terracotta, width: 1 },
      });
    }
  });

  // Footnote
  s.addText([
    { text: "Surplus & funding:  ", options: { bold: true, color: COLOR.body } },
    { text: "+$12,795 Y1 surplus (a thin ~3.5-week opex cushion) building to a 5-yr cumulative surplus of $346,583 — self-funded with a 2–3 month working-capital buffer, no external equity.", options: { color: COLOR.muted } },
  ], {
    x: 0.7, y: 4.95, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0,
  });

  addFooter(s, 7);
}

// ============================================================================
// 8 — GO-TO-MARKET
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "GO-TO-MARKET");

  addTitle(s, "Anchors first, then a self-serve onboarding wizard.");

  s.addText("Five houses live by end of Year 1, ramping to 20 by Year 5 — about a third of the market. The wizard turns each new house into a ~6-minute, admin-approved tenant, so growth rides on house count + transport, not bespoke labor.", {
    x: 0.7, y: 1.7, w: 8.6, h: 0.7,
    fontFace: FONT.body, fontSize: 13, color: COLOR.muted,
  });

  // 3-phase row
  const phases = [
    { tag: "Year 1", title: "Anchors signed", body: "5 houses live — incl. 3 of ~8 Tier A anchors. Wizard live: /operators → admin approval → RLS-isolated tenant." },
    { tag: "Years 2–3", title: "The category", body: "8 → 12 houses live. Case studies compound. Paynow formalises us as their vertical livestock solution." },
    { tag: "Years 4–5", title: "20 houses, +transport", body: "16 → 20 live. $1.03M 5-yr revenue, $346,583 cumulative surplus. Consumer transport line ramps the B2B2C upside." },
  ];

  const w = 2.85, startX = 0.7;
  phases.forEach((p, i) => {
    const x = startX + i * (w + 0.15);
    s.addText(p.tag, {
      x, y: 2.55, w, h: 0.3,
      fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 3,
      color: COLOR.gold, margin: 0,
    });
    s.addText(p.title, {
      x, y: 2.85, w, h: 0.6,
      fontFace: FONT.header, fontSize: 20, bold: true,
      color: COLOR.body, margin: 0,
    });
    s.addText(p.body, {
      x, y: 3.6, w, h: 1.4,
      fontFace: FONT.body, fontSize: 12, color: COLOR.muted, margin: 0,
    });
  });

  // Paynow partnership pull-quote
  s.addText([
    { text: "“", options: { color: COLOR.terracotta, fontSize: 20, bold: true } },
    { text: "Position ZimLivestock as Paynow's vertical solution for livestock — reciprocal: we grow their GMV, they grow our pipeline.", options: { color: COLOR.body, italic: true } },
    { text: "”", options: { color: COLOR.terracotta, fontSize: 20, bold: true } },
  ], {
    x: 0.7, y: 4.85, w: 8.6, h: 0.3,
    fontFace: FONT.header, fontSize: 12, margin: 0, valign: "middle",
  });

  addFooter(s, 8);
}

// ============================================================================
// 9 — WHAT WE'VE BUILT
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "WHAT WE'VE BUILT");

  addTitle(s, "We're not asking you to fund development.");
  s.addText("We're asking you to deploy what's running.", {
    x: 0.7, y: 1.65, w: 8.6, h: 0.6,
    fontFace: FONT.header, fontSize: 24, italic: true,
    color: COLOR.terracotta, margin: 0,
  });

  const proof = [
    { check: true,  label: "Live React + Supabase PWA",      sub: "production, mobile-first, USSD-friendly" },
    { check: true,  label: "Paynow Core Express Checkout",   sub: "demoed end-to-end with real USSD prompts" },
    { check: true,  label: "BillPay biller-inbound API",     sub: "coded this week, awaiting Paynow IPs" },
    { check: true,  label: "TXT.co.zw SMS notifications",    sub: "live in production" },
    { check: true,  label: "Agentic auto-buy demo",          sub: "demoed to Paynow leadership 2026-05-08" },
    { check: false, label: "Bisafe escrow integration",      sub: "designed, awaiting Paynow Bisafe spec" },
    { check: false, label: "Paab cash-collection integration", sub: "designed, awaiting Paynow Paab spec" },
  ];

  proof.forEach((it, i) => {
    const y = 2.6 + i * 0.36;
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: y + 0.07, w: 0.22, h: 0.22,
      fill: { color: it.check ? COLOR.gold : COLOR.cardBg },
      line: { color: it.check ? COLOR.gold : COLOR.muted, width: 1.5 },
    });
    if (it.check) {
      s.addText("✓", {
        x: 0.7, y: y + 0.04, w: 0.22, h: 0.22,
        fontFace: FONT.body, fontSize: 11, bold: true,
        color: COLOR.dark, align: "center", valign: "middle", margin: 0,
      });
    }
    s.addText([
      { text: it.label, options: { bold: true, color: COLOR.body } },
      { text: "    " + it.sub, options: { color: COLOR.muted, italic: true, fontSize: 11 } },
    ], {
      x: 1.05, y, w: 8.3, h: 0.36,
      fontFace: FONT.body, fontSize: 13, margin: 0, valign: "middle",
    });
  });

  addFooter(s, 9);
}

// ============================================================================
// 10 — THE ASK
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: COLOR.gold }, line: { type: "none" } });

  s.addText("THE ASK", {
    x: 0.7, y: 0.5, w: 6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.gold,
  });

  s.addText("One paid 90-day pilot.", {
    x: 0.7, y: 1.0, w: 8.6, h: 0.9,
    fontFace: FONT.header, fontSize: 46, bold: true,
    color: COLOR.cream, margin: 0,
  });
  s.addText("Harare-area auction house. Paynow listed as payment partner.", {
    x: 0.7, y: 1.95, w: 8.6, h: 0.6,
    fontFace: FONT.header, fontSize: 20, italic: true,
    color: COLOR.gold, margin: 0,
  });

  // Terms — three boxes
  const terms = [
    { label: "Onboarding", value: "$1,000",  sub: "credited toward tier on conversion" },
    { label: "Subscription", value: "$1,000", sub: "/month for the 90-day pilot" },
    { label: "Tx take",    value: "0.75%",   sub: "of settled GMV" },
  ];
  const w = 2.85, startX = 0.7;
  terms.forEach((t, i) => {
    const x = startX + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.85, w, h: 1.3,
      fill: { color: COLOR.cream, transparency: 90 },
      line: { color: COLOR.gold, width: 1 },
    });
    s.addText(t.label.toUpperCase(), {
      x: x + 0.2, y: 2.95, w: w - 0.25, h: 0.3,
      fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
      color: COLOR.gold, margin: 0,
    });
    s.addText(t.value, {
      x: x + 0.2, y: 3.25, w: w - 0.25, h: 0.55,
      fontFace: FONT.header, fontSize: 28, bold: true,
      color: COLOR.cream, margin: 0,
    });
    s.addText(t.sub, {
      x: x + 0.2, y: 3.78, w: w - 0.25, h: 0.3,
      fontFace: FONT.body, fontSize: 10, italic: true,
      color: COLOR.mutedDark, margin: 0,
    });
  });

  // Success criteria
  s.addText("Success at day 90:", {
    x: 0.7, y: 4.4, w: 3, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 3,
    color: COLOR.gold,
  });
  s.addText([
    { text: "  1. ≥30% of a sale-day's GMV through the platform.    " , options: { color: COLOR.cream } },
    { text: "2. 12-month commitment signed.    ", options: { color: COLOR.cream } },
    { text: "3. Reference customer.", options: { color: COLOR.cream } },
  ], {
    x: 0.7, y: 4.7, w: 8.6, h: 0.4,
    fontFace: FONT.body, fontSize: 12, margin: 0,
  });
}

// ============================================================================
// 11 — RISKS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);
  addEyebrow(s, "WHAT COULD KILL THIS");

  addTitle(s, "Five real risks, each with a mitigation we've already chosen.");

  const risks = [
    { risk: "Landing 3 of ~8 Tier A anchors in Year 1",          mit: "The most aggressive assumption. Anchors-first GTM + a thin Y1 surplus and a 2–3 month buffer absorb a slow start." },
    { risk: "Onboarding stays bespoke labor, capping scale",     mit: "Self-serve wizard: /operators → admin approval → ~6-min RLS tenant. The 10th house costs roughly what the 2nd did." },
    { risk: "Paynow channel goes cold",                          mit: "Multi-rail product — EcoCash USSD direct + Stripe diaspora as fallback." },
    { risk: "Adoption runs hotter than we forecast",             mit: "We hold it field-honest (10.5–13.7%, below the ~15% ceiling). Growth rides on house count + transport, not an adoption bet." },
    { risk: "Currency volatility wipes out unit economics",      mit: "All pricing in USD. Tx take invoiced in USD equiv of ZIG/ZWL settled." },
  ];

  const tableY = 2.05, rowH = 0.56, tableX = 0.7;
  s.addShape(pres.shapes.LINE, {
    x: tableX, y: tableY + 0.4, w: 8.6, h: 0,
    line: { color: COLOR.terracotta, width: 1 },
  });
  s.addText("RISK", {
    x: tableX, y: tableY, w: 4, h: 0.35,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.terracotta, valign: "middle", margin: 0,
  });
  s.addText("HOW WE'VE ALREADY DE-RISKED IT", {
    x: tableX + 4.2, y: tableY, w: 4.4, h: 0.35,
    fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
    color: COLOR.terracotta, valign: "middle", margin: 0,
  });

  risks.forEach((r, i) => {
    const y = tableY + 0.5 + i * rowH;
    s.addText(r.risk, {
      x: tableX, y, w: 4.0, h: rowH,
      fontFace: FONT.header, fontSize: 13, bold: true,
      color: COLOR.body, valign: "middle", margin: 0,
    });
    s.addText(r.mit, {
      x: tableX + 4.2, y, w: 4.4, h: rowH,
      fontFace: FONT.body, fontSize: 12,
      color: COLOR.muted, valign: "middle", margin: 0,
    });
    if (i < risks.length - 1) {
      s.addShape(pres.shapes.LINE, {
        x: tableX, y: y + rowH, w: 8.6, h: 0,
        line: { color: COLOR.muted, width: 0.3 },
      });
    }
  });

  addFooter(s, 11);
}

// ============================================================================
// 12 — CLOSE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color: COLOR.gold }, line: { type: "none" } });

  s.addText("ONE PARAGRAPH SUMMARY", {
    x: 0.7, y: 0.55, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.gold,
  });

  s.addText([
    { text: "There are roughly 40–60 livestock auction houses in Zimbabwe, and 3 of 4 national livestock-digitization initiatives have no settlement layer.  ", options: { color: COLOR.cream } },
    { text: "We are that layer: a branded digital floor with Paynow settlement built in, onboarded house-by-house through a self-serve wizard.  ", options: { color: COLOR.cream } },
    { text: "It's already shipping. The 5-year plan reaches 20 houses — about a third of the market — for $1.03M revenue and a $346,583 cumulative surplus, self-funded.  ", options: { color: COLOR.cream } },
    { text: "We are looking for ", options: { color: COLOR.cream } },
    { text: "one 90-day pilot, $1,000 onboarding (credited on conversion) plus a $1,000 monthly subscription, ", options: { color: COLOR.gold, bold: true } },
    { text: "to land the first anchor and prove the playbook.", options: { color: COLOR.cream } },
  ], {
    x: 0.7, y: 1.15, w: 8.6, h: 2.5,
    fontFace: FONT.header, fontSize: 17, margin: 0, paraSpaceAfter: 4,
  });

  s.addText("Don't build a thesis. Build software you can sell.", {
    x: 0.7, y: 3.95, w: 8.6, h: 0.5,
    fontFace: FONT.header, fontSize: 22, italic: true, bold: true,
    color: COLOR.gold, margin: 0,
  });
  s.addText("— you, on my second week at Paynow.", {
    x: 0.7, y: 4.45, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 12,
    color: COLOR.mutedDark,
  });

  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw", options: { color: COLOR.mutedDark } },
  ], {
    x: 0.7, y: 5.0, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 12,
  });
}

pres.writeFile({ fileName: "zimlivestock-md-pitch.pptx" })
  .then((f) => console.log("Wrote:", f));

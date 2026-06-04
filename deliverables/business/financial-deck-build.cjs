// ZimLivestock — Financial Deck (for the Paynow internship-return demo)
// ZIMBABWE BOOTSTRAP frame: owner-operated, no external capital, no founder
// salary (founder income = operating surplus), no hire-ahead, no "runway".
// Conservative by necessity — there is no VC to raise from and USD is scarce.
// Numbers computed from financial-model-build.py (3 houses, 15% adoption ceiling).
//
// Reuses the terracotta/cream/gold palette from md-pitch-build.js.
// Build:  cd deliverables/business && NODE_PATH=$(npm root -g) node financial-deck-build.cjs

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042", cream: "F5E6D3", dark: "2D1B1A", gold: "D4A843",
  body: "2D1B1A", muted: "7A4F47", mutedDark: "BFAA98", cardBg: "FFFFFF",
  green: "5A7D5A", red: "B85042",
};
const FONT = { header: "Georgia", body: "Calibri" };

// ----------------------------------------------------------------------------
// Canonical numbers — Zimbabwe bootstrap base case (see financial-model-build.py)
// ----------------------------------------------------------------------------
const FLOOR = {
  years: ["Year 1", "Year 2", "Year 3"],
  houses: [1, 2, 3],
  revenue: [12321, 28071, 48987],
  cost: [6240, 10480, 16720],
  surplus: [6081, 17591, 32267], // = founder income (no salary drawn)
  gmvPaynow: [43200, 223200, 545400],
  threeYr: { rev: 89379, cost: 33440, surplus: 55939 },
  mixY3: { retainer: 36900, engagement: 8000, tx: 4087 },
  maxOutOfPocket: 2250,
};
const usd = (n) => (n < 0 ? "−US$" : "US$") + Math.abs(n).toLocaleString("en-US");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "ZimLivestock — Financial Overview (Zimbabwe bootstrap)";
let TOTAL = 11;

function accentBar(s, color = COLOR.gold) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color }, line: { type: "none" } });
}
function footer(s, n, dark = false) {
  s.addText("ZIMLIVESTOCK  ·  FINANCIAL OVERVIEW  ·  JUNE 2026", {
    x: 0.5, y: 5.28, w: 8, h: 0.22, fontFace: FONT.body, fontSize: 8, charSpacing: 3,
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

// ============================================================================
// 1 — TITLE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("ZIMLIVESTOCK  ·  PAYNOW INTERNSHIP  ·  JUNE 2026", { x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true, color: COLOR.gold });
  s.addText("The honest numbers.", { x: 0.7, y: 1.4, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 54, bold: true, color: COLOR.cream, margin: 0 });
  s.addText("A financial overview for a bootstrapped business prying open a legacy,\nmanual, cash-based livestock-auction market — built on the Paynow rails.", { x: 0.7, y: 2.6, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 19, italic: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Owner-operated. No funding round. No founder salary. Cash-financed from day one.  ", options: { color: COLOR.cream } },
    { text: "This is Zimbabwe — conservative by necessity, not by choice.", options: { color: COLOR.mutedDark, italic: true } },
  ], { x: 0.7, y: 4.0, w: 8.6, h: 0.5, fontFace: FONT.body, fontSize: 13, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.9, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 12 });
}

// ============================================================================
// 2 — REVENUE MODEL
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE REVENUE MODEL");
  title(s, "Three revenue lines. The retainer is the spine.");
  subhead(s, "Software-as-a-professional-service, not SaaS. Pricing set to realistic Zimbabwean willingness-to-pay in USD.");
  const streams = [
    { tag: "ENGAGEMENT", v: "US$5–8k", sub: "one-off, at signing", body: "Discovery, branded skin, data migration, Paynow integration, on-floor training day." },
    { tag: "RETAINER", v: "US$1.0–1.5k", sub: "per month · recurring", body: "We operate the platform on their behalf. The reliable, contractual spine." },
    { tag: "TX SURCHARGE", v: "0.75%", sub: "of settled GMV", body: "Small but compounds with adoption. Sits on top of Paynow's own fee." },
  ];
  const w = 2.85, x0 = 0.7;
  streams.forEach((st, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.45, w, h: 2.35, fill: { color: COLOR.dark }, line: { type: "none" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.45, w: 0.08, h: 2.35, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(st.tag, { x: x + 0.25, y: 2.6, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
    s.addText(st.v, { x: x + 0.25, y: 2.95, w: w - 0.3, h: 0.55, fontFace: FONT.header, fontSize: 25, bold: true, color: COLOR.cream, margin: 0 });
    s.addText(st.sub, { x: x + 0.25, y: 3.5, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.gold, margin: 0 });
    s.addText(st.body, { x: x + 0.25, y: 3.85, w: w - 0.3, h: 0.85, fontFace: FONT.body, fontSize: 11, color: COLOR.mutedDark, margin: 0 });
  });
  s.addText([
    { text: "Tiered pricing:  ", options: { bold: true, color: COLOR.body } },
    { text: "Pilot US$5k + US$1,000/mo  ·  Tier B US$6k + US$1,200/mo  ·  Tier A US$8k + US$1,500/mo  ·  all + 0.75% surcharge", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.95, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 2);
}

// ============================================================================
// 3 — PER-HOUSE UNIT ECONOMICS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "UNIT ECONOMICS");
  title(s, "The per-house unit works — even at 15% adoption.");
  subhead(s, "A single mature auction house, at just 15% of its physical GMV settling digitally. Contribution comfortably exceeds the marginal cost to serve it.");
  const rows = [
    { label: "Tier A (anchor)", eng: "US$8,000", ret: "US$18,000", tx: "US$4,860", rec: "US$22,860", contrib: "US$21,420" },
    { label: "Tier B (mid)", eng: "US$6,000", ret: "US$14,400", tx: "US$2,430", rec: "US$16,830", contrib: "US$15,390" },
  ];
  const headers = ["", "Engagement\n(Y1 one-off)", "Retainer\n(×12)", "Tx @15%", "Recurring / yr", "Contribution / yr"];
  const colWs = [1.85, 1.4, 1.25, 1.1, 1.45, 1.55];
  const tableX = 0.7, tableY = 2.6, rowH = 0.66;
  let cx = tableX;
  headers.forEach((h, i) => {
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: rowH, fontFace: FONT.body, fontSize: 10, bold: true, color: COLOR.terracotta, align: i === 0 ? "left" : "right", valign: "bottom", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + rowH + 0.02, w: 8.6, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + rowH + 0.18 + idx * (rowH + 0.06); cx = tableX;
    [r.label, r.eng, r.ret, r.tx, r.rec, r.contrib].forEach((c, i) => {
      const strong = i === 4 || i === 5;
      s.addText(c, { x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.body : FONT.header, fontSize: i === 0 ? 13 : (strong ? 17 : 14), bold: i === 0 || strong, color: i === 5 ? COLOR.green : (i === 4 ? COLOR.terracotta : COLOR.body), align: i === 0 ? "left" : "right", valign: "middle", margin: 0 });
      cx += colWs[i];
    });
  });
  s.addText([
    { text: "Why this matters:  ", options: { bold: true, color: COLOR.body } },
    { text: "the business is sound per-unit. There is no big fixed cost to amortize — the founder draws no salary — so each house's contribution is real income from the day it matures.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.7, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11.5, italic: true, margin: 0 });
  footer(s, 3);
}

// ============================================================================
// 4 — CASH-POSITIVE FROM THE FIRST HOUSE (bootstrap P&L)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE BASE CASE — A BOOTSTRAP");
  title(s, "Cash-positive from the first live house.");
  subhead(s, "No external capital, no founder salary, no hire-ahead. The founder's income is the operating surplus. Three houses (1 → 2 → 3) over three years.");

  const data = [
    { name: "Revenue", labels: FLOOR.years, values: FLOOR.revenue },
    { name: "Operating cost", labels: FLOOR.years, values: FLOOR.cost },
    { name: "Founder income (surplus)", labels: FLOOR.years, values: FLOOR.surplus },
  ];
  s.addChart(pres.charts.BAR, data, {
    x: 0.7, y: 2.5, w: 5.7, h: 2.55, barDir: "col", barGrouping: "clustered",
    chartColors: [COLOR.gold, COLOR.muted, COLOR.green],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body, showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 10,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  FLOOR.years.forEach((yr, i) => {
    const y = 2.55 + i * 0.82;
    s.addText(yr.toUpperCase(), { x: 6.7, y, w: 2.7, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 2, color: COLOR.muted, margin: 0 });
    s.addText([
      { text: "+" + usd(FLOOR.surplus[i]), options: { bold: true, color: COLOR.green, fontFace: FONT.header, fontSize: 20 } },
      { text: "  income", options: { color: COLOR.muted, fontSize: 11 } },
    ], { x: 6.7, y: y + 0.22, w: 2.7, h: 0.4, margin: 0 });
    s.addText(`${FLOOR.houses[i]} house${FLOOR.houses[i] > 1 ? "s" : ""} · rev ${usd(FLOOR.revenue[i])}`, { x: 6.7, y: y + 0.58, w: 2.7, h: 0.22, fontFace: FONT.body, fontSize: 9.5, italic: true, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "External capital required: US$0.  ", options: { bold: true, color: COLOR.terracotta } },
    { text: `The deepest the founder is ever out of pocket is ${usd(FLOOR.maxOutOfPocket)} (pre-launch months) — self-financed. Founder earns ${usd(FLOOR.threeYr.surplus)} over 3 years.`, options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 4);
}

// ============================================================================
// 5 — OPERATOR CAPACITY, NOT ADOPTION (the insight)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "WHAT ACTUALLY MOVES IT");
  title(s, "It's an operator-capacity problem, not an adoption one.");
  subhead(s, "Chasing higher digital adoption barely moves income — the transaction surcharge is tiny. What grows the business is running more houses well.");

  s.addText("PUSHING ADOPTION HARDER (3-house book, Y3 avg monthly surplus)", { x: 0.7, y: 2.45, w: 4.3, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, color: COLOR.terracotta, margin: 0 });
  const sens = [["15% adoption", "+US$2,522/mo"], ["20% adoption", "+US$2,590/mo"], ["25% adoption", "+US$2,658/mo"], ["30% adoption", "+US$2,724/mo"]];
  sens.forEach((r, i) => {
    const y = 2.85 + i * 0.42;
    s.addText(r[0], { x: 0.7, y, w: 2.2, h: 0.35, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(r[1], { x: 2.9, y, w: 2.1, h: 0.35, fontFace: FONT.header, fontSize: 14, bold: true, color: COLOR.green, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("Doubling adoption recovers only ~US$200/mo. It is not the lever.", { x: 0.7, y: 4.65, w: 4.3, h: 0.5, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 3.95, h: 2.55, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 0.08, h: 2.55, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("THE REAL LEVER", { x: 5.65, y: 2.6, w: 3.5, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "~US$15–21k", options: { bold: true, color: COLOR.cream, fontFace: FONT.header, fontSize: 22 } },
    { text: "  income per mature house / yr", options: { color: COLOR.mutedDark, fontSize: 12 } },
  ], { x: 5.65, y: 2.95, w: 3.5, h: 0.55, margin: 0 });
  s.addText("→  Grow by adding houses, each funded from the surplus of the last. No salary to cover, so every new house is income — until the ceiling, which is how many one owner + cheap part-time help can run well.", { x: 5.65, y: 3.65, w: 3.5, h: 1.25, fontFace: FONT.body, fontSize: 11.5, color: COLOR.gold, margin: 0 });
  footer(s, 5);
}

// ============================================================================
// 6 — REVENUE IS RETAINER-LED
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "REVENUE QUALITY");
  title(s, "75% of revenue is contractual, not volume-dependent.");
  subhead(s, "Because the retainer carries the model, slow digital adoption hurts the upside — not the survival. The transaction surcharge is the part that compounds as trust builds.");
  const mixData = [
    { name: "Retainer", labels: ["Year 3"], values: [FLOOR.mixY3.retainer] },
    { name: "Engagement", labels: ["Year 3"], values: [FLOOR.mixY3.engagement] },
    { name: "Tx surcharge", labels: ["Year 3"], values: [FLOOR.mixY3.tx] },
  ];
  s.addChart(pres.charts.BAR, mixData, {
    x: 0.7, y: 2.55, w: 4.6, h: 2.4, barDir: "bar", barGrouping: "stacked",
    chartColors: [COLOR.terracotta, COLOR.gold, COLOR.dark],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisHidden: true,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  [["Retainer (recurring spine)", usd(FLOOR.mixY3.retainer)], ["Engagement (one-off)", usd(FLOOR.mixY3.engagement)], ["Tx surcharge (compounds)", usd(FLOOR.mixY3.tx)]].forEach((f, i) => {
    const y = 2.7 + i * 0.62;
    s.addText(f[0], { x: 5.6, y, w: 2.6, h: 0.35, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(f[1], { x: 8.0, y, w: 1.35, h: 0.35, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.terracotta, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("The same shape that makes Paynow's own model durable: recurring relationships first, transaction upside second.", { x: 5.6, y: 4.6, w: 3.75, h: 0.6, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });
  footer(s, 6);
}

// ============================================================================
// 7 — WHAT PAYNOW GETS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE PAYNOW UPSIDE");
  title(s, "Every dollar we move, moves on Paynow rails.");
  subhead(s, "Our surcharge revenue is small. The GMV we route onto Paynow — and the products it activates — is the number that matters to you, and it grows fastest.");
  const w = 2.85, x0 = 0.7;
  FLOOR.years.forEach((yr, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w, h: 1.5, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.5, w: 0.06, h: 1.5, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(yr.toUpperCase(), { x: x + 0.2, y: 2.62, w: w - 0.25, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 2, color: COLOR.muted, margin: 0 });
    s.addText(usd(FLOOR.gmvPaynow[i]), { x: x + 0.2, y: 2.95, w: w - 0.25, h: 0.6, fontFace: FONT.header, fontSize: 28, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText("settled through Paynow", { x: x + 0.2, y: 3.55, w: w - 0.25, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, color: COLOR.muted, margin: 0 });
  });
  s.addText("PRODUCTS THIS PUTS TO WORK", { x: 0.7, y: 4.2, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.terracotta, margin: 0 });
  s.addText([
    { text: "Core Express Checkout  ·  Bisafe escrow  ·  BillPay-as-biller  ·  EcoCash USSD  ·  merchant transfers  ·  ", options: { color: COLOR.body } },
    { text: "Paab cash (once unblocked)", options: { color: COLOR.muted, italic: true } },
  ], { x: 0.7, y: 4.5, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 12.5, margin: 0 });
  footer(s, 7);
}

// ============================================================================
// 8 — SELF-FUNDED SCALING (no raise)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "HOW IT GROWS — WITHOUT A RAISE");
  title(s, "Each house's surplus funds the next.");
  subhead(s, "There is no funding round because there is nowhere to raise one. Growth is paid for out of operating surplus — slow, self-funded, and durable.");

  const data = [{ name: "Founder income", labels: FLOOR.years, values: FLOOR.surplus }];
  s.addChart(pres.charts.BAR, data, {
    x: 0.7, y: 2.55, w: 5.5, h: 2.45, barDir: "col",
    chartColors: [COLOR.green], showLegend: false, showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 11,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  const steps = [
    ["Reinvest, don't raise", "Surplus from house #1 pays the part-time help that lets the founder take on house #2."],
    ["Compounds slowly", "Income roughly quintuples Y1→Y3 (US$6k → US$18k → US$32k) — on no outside money."],
    ["Ceiling is people, not cash", "Growth caps at how many houses an owner + helpers can run well — then you hire from surplus, never from a raise."],
  ];
  steps.forEach((p, i) => {
    const y = 2.5 + i * 0.85;
    s.addText(p[0], { x: 6.45, y, w: 2.95, h: 0.3, fontFace: FONT.header, fontSize: 13.5, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText(p[1], { x: 6.45, y: y + 0.28, w: 2.95, h: 0.55, fontFace: FONT.body, fontSize: 10, color: COLOR.muted, margin: 0 });
  });
  s.addText("Conservative by necessity: a Zimbabwean startup that cannot raise must be cash-positive — so we built one that is.", { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });
  footer(s, 8);
}

// ============================================================================
// 9 — ZIMBABWE RISKS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "WHAT WE'RE WATCHING");
  title(s, "Four risks specific to building this here.");
  subhead(s, "Honest about the things that don't show up in a first-world model.");
  const risks = [
    { n: "1", t: "USD scarcity & cash habits", b: "Buyers and houses transact in cash; USD is tight. Mitigation: meet them on every rail (USSD, BillPay, Paab) so digital is easier than cash." },
    { n: "2", t: "Currency volatility", b: "ZWL/ZiG swings wipe out local-currency margins. Mitigation: all pricing in USD; surcharge invoiced on USD-equivalent settled." },
    { n: "3", t: "No capital cushion", b: "No raise means no buffer for a bad quarter. Mitigation: stay cash-positive from house #1; never spend ahead of surplus." },
    { n: "4", t: "Operator-capacity ceiling", b: "One owner can only run so many houses. Mitigation: reinvest surplus into part-time help before signing the house that would overload us." },
  ];
  const w = 4.25, gx = 0.7, gy = 2.5, gap = 0.2;
  risks.forEach((l, i) => {
    const x = gx + (i % 2) * (w + gap);
    const y = gy + Math.floor(i / 2) * 1.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.2, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(l.n, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(l.t, { x: x + 0.75, y: y + 0.14, w: w - 0.9, h: 0.32, fontFace: FONT.header, fontSize: 14.5, bold: true, color: COLOR.body, margin: 0 });
    s.addText(l.b, { x: x + 0.75, y: y + 0.46, w: w - 0.9, h: 0.7, fontFace: FONT.body, fontSize: 10, color: COLOR.muted, margin: 0 });
  });
  footer(s, 9);
}

// ============================================================================
// 10 — THE ASK
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ASK", { x: 0.7, y: 0.55, w: 6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText("We're not asking for money. We're asking for doors and rails.", { x: 0.7, y: 1.05, w: 8.6, h: 1.4, fontFace: FONT.header, fontSize: 31, bold: true, color: COLOR.cream, margin: 0 });
  const asks = [
    { t: "Unblock the rails", b: "Paab sandbox + docs (the only red on the board) and the BillPay PAY round-trip (vendor-portal registration; AUTH is already live). These widen the buyer base and lift adoption." },
    { t: "Formalize the partnership", b: "Name ZimLivestock as Paynow's livestock vertical solution; Paynow BD refers livestock-industry prospects. We grow your GMV; you grow our pipeline." },
    { t: "Open one door", b: "A warm introduction to one Harare-area auction house. The pilot is paid by the customer, not by Paynow — we just need the room." },
  ];
  asks.forEach((a, i) => {
    const y = 2.6 + i * 0.85;
    s.addText(`${i + 1}`, { x: 0.7, y, w: 0.5, h: 0.7, fontFace: FONT.header, fontSize: 30, bold: true, color: COLOR.gold, margin: 0 });
    s.addText([
      { text: a.t + "   ", options: { bold: true, color: COLOR.cream, fontSize: 16 } },
      { text: a.b, options: { color: COLOR.mutedDark, fontSize: 12 } },
    ], { x: 1.3, y: y + 0.02, w: 8.0, h: 0.8, fontFace: FONT.body, valign: "top", margin: 0 });
  });
}

// ============================================================================
// 11 — CLOSE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("THE ONE-PARAGRAPH VERSION", { x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.gold });
  s.addText([
    { text: "This is a bootstrap, not a startup with a runway.  ", options: { color: COLOR.cream } },
    { text: "There is no capital to raise in this market, so the business is built to be cash-positive from the first house — ", options: { color: COLOR.cream } },
    { text: "founder income of " + usd(FLOOR.surplus[0]) + " → " + usd(FLOOR.surplus[2]) + " across three years, on US$0 of outside money, ", options: { color: COLOR.gold, bold: true } },
    { text: "and never more than " + usd(FLOOR.maxOutOfPocket) + " out of pocket.  The per-house economics work; growth is paid for from surplus; the ceiling is people, not cash.  ", options: { color: COLOR.cream } },
    { text: "And along the way it routes over US$800k onto Paynow's rails.", options: { color: COLOR.gold, bold: true } },
  ], { x: 0.7, y: 1.2, w: 8.6, h: 2.6, fontFace: FONT.header, fontSize: 17, margin: 0, paraSpaceAfter: 4, lineSpacingMultiple: 1.15 });
  s.addText("Build software you can sell — and a business this market can actually carry.", { x: 0.7, y: 4.05, w: 8.6, h: 0.5, fontFace: FONT.header, fontSize: 20, italic: true, bold: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw    ·    companion: financial-model.xlsx, gtm-strategy.md", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.95, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11 });
}

pres.writeFile({ fileName: "financial-deck.pptx" }).then((f) => console.log("Wrote:", f));

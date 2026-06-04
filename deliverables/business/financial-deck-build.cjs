// ZimLivestock — Financial Deck (for the Paynow internship-return demo)
// SCALING B2B-SaaS PLATFORM frame: auction houses onboard as isolated (RLS)
// tenants and pay an onboarding fee + monthly subscription + a thin 0.75% take
// on settled GMV; a self-serve onboarding wizard makes growth low-touch.
// Largely self-funded with a prudent 2–3 month working-capital buffer (no raise);
// the founder draws a salary inside payroll. B2B today, B2B2C (transport) tomorrow.
// Numbers computed from financial-model-build.py (5-year model, ~20 houses).
//
// Reuses the terracotta/cream/gold palette from md-pitch-build.cjs.
// Build:  cd deliverables/business && NODE_PATH=$(npm root -g) node financial-deck-build.cjs

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042", cream: "F5E6D3", dark: "2D1B1A", gold: "D4A843",
  body: "2D1B1A", muted: "7A4F47", mutedDark: "BFAA98", cardBg: "FFFFFF",
  green: "5A7D5A", red: "B85042",
};
const FONT = { header: "Georgia", body: "Calibri" };

// ----------------------------------------------------------------------------
// Canonical numbers — v3.0 5-year scaling platform (see financial-model-build.py)
// ----------------------------------------------------------------------------
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
  // Year-5 revenue mix (annual, US$)
  mixY5: { subscription: 266400, tx: 53618, transport: 31677, onboarding: 10000 },
};
const usd = (n) => (n < 0 ? "−US$" : "US$") + Math.abs(n).toLocaleString("en-US");
const usdK = (n) => (n < 0 ? "−US$" : "US$") + Math.round(Math.abs(n) / 1000).toLocaleString("en-US") + "k";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "ZimLivestock — Financial Overview (5-year scaling platform)";
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
  s.addText("A financial overview for a scaling B2B-SaaS platform prying open a legacy,\nmanual, cash-based livestock-auction market — built on the Paynow rails.", { x: 0.7, y: 2.6, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 19, italic: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Auction houses onboard as tenants. Largely self-funded, with a working-capital buffer — not a raise.  ", options: { color: COLOR.cream } },
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
  title(s, "Four revenue lines. The subscription is the spine.");
  subhead(s, "A B2B SaaS platform — auction houses onboard as isolated tenants. Pricing set to realistic Zimbabwean willingness-to-pay in USD.");
  const streams = [
    { tag: "ONBOARDING", v: "US$1.5–3.5k", sub: "one-off, at signing", body: "Branded tenant, data migration, Paynow integration, on-floor training. Self-serve wizard keeps it low-touch." },
    { tag: "SUBSCRIPTION", v: "US$0.9–1.5k", sub: "per month · recurring", body: "The platform, run for them across five channels. The reliable, contractual spine." },
    { tag: "TAKE + TRANSPORT", v: "0.75% + US$15", sub: "GMV take · delivery booking", body: "A thin take on settled GMV (atop Paynow's fee) plus the B2B2C transport booking leg — both compound." },
  ];
  const w = 2.85, x0 = 0.7;
  streams.forEach((st, i) => {
    const x = x0 + i * (w + 0.15);
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.45, w, h: 2.35, fill: { color: COLOR.dark }, line: { type: "none" } });
    s.addShape(pres.shapes.RECTANGLE, { x, y: 2.45, w: 0.08, h: 2.35, fill: { color: COLOR.gold }, line: { type: "none" } });
    s.addText(st.tag, { x: x + 0.25, y: 2.6, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
    s.addText(st.v, { x: x + 0.25, y: 2.95, w: w - 0.3, h: 0.55, fontFace: FONT.header, fontSize: 22, bold: true, color: COLOR.cream, margin: 0 });
    s.addText(st.sub, { x: x + 0.25, y: 3.5, w: w - 0.3, h: 0.3, fontFace: FONT.body, fontSize: 11, italic: true, color: COLOR.gold, margin: 0 });
    s.addText(st.body, { x: x + 0.25, y: 3.85, w: w - 0.3, h: 0.85, fontFace: FONT.body, fontSize: 11, color: COLOR.mutedDark, margin: 0 });
  });
  s.addText([
    { text: "Tiered pricing:  ", options: { bold: true, color: COLOR.body } },
    { text: "Pilot US$1k + US$1,000/mo  ·  Tier C US$1.5k + US$900/mo  ·  Tier B US$2.5k + US$1,200/mo  ·  Tier A US$3.5k + US$1,500/mo  ·  all + 0.75% take", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.95, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10, italic: true, margin: 0 });
  footer(s, 2);
}

// ============================================================================
// 3 — PER-HOUSE UNIT ECONOMICS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "UNIT ECONOMICS");
  title(s, "The per-house unit works — at field-honest adoption.");
  subhead(s, "A single mature auction house, at field-honest digital adoption (~13%) of its physical GMV. Recurring revenue comfortably exceeds the marginal cost to serve it.");
  const rows = [
    { label: "Tier A (anchor)", eng: "US$3,500", ret: "US$18,000", tx: "US$4,228", rec: "US$22,228", contrib: "US$21,420" },
    { label: "Tier B (mid)", eng: "US$2,500", ret: "US$14,400", tx: "US$2,114", rec: "US$16,514", contrib: "US$15,390" },
  ];
  const headers = ["", "Onboarding\n(Y1 one-off)", "Subscription\n(×12)", "Take @13%", "Recurring / yr", "Contribution / yr"];
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
    { text: "the business is sound per-unit. The onboarding wizard makes each new tenant low-touch, so a house's recurring revenue clears its cost to serve from the day it goes live.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.7, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11.5, italic: true, margin: 0 });
  footer(s, 3);
}

// ============================================================================
// 4 — SURPLUS FROM YEAR ONE (5-year P&L)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "THE BASE CASE — A SCALING PLATFORM");
  title(s, "Surplus-positive from the first year.");
  subhead(s, "Largely self-funded with a 2–3 month working-capital buffer — not a raise. Twenty houses live (5 → 8 → 12 → 16 → 20) over five years; the founder draws a salary inside payroll.");

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
  // Right-hand callouts: representative Y1 / Y3 / Y5 to keep the panel readable.
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
    { text: `Self-funded with a prudent 2–3 month opex buffer; the Year-1 cushion is thin (~3.5 weeks of opex). Cumulative surplus reaches ${usd(MODEL.fiveYr.surplus)} over 5 years.`, options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 4);
}

// ============================================================================
// 5 — HOUSE COUNT + TRANSPORT, NOT ADOPTION (the insight)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "WHAT ACTUALLY MOVES IT");
  title(s, "Growth rides on house count and transport, not adoption.");
  subhead(s, "Chasing higher digital adoption barely moves revenue — the GMV take is thin. What scales the platform is more houses onboarded and the consumer transport line ramping.");

  s.addText("PUSHING ADOPTION HARDER (20-house book, Y5 GMV take)", { x: 0.7, y: 2.45, w: 4.3, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, color: COLOR.terracotta, margin: 0 });
  const sens = [["13.7% (base)", "US$53,618/yr"], ["18% adoption", "US$70,000/yr"], ["22% adoption", "US$85,500/yr"], ["26% adoption", "US$101,000/yr"]];
  sens.forEach((r, i) => {
    const y = 2.85 + i * 0.42;
    s.addText(r[0], { x: 0.7, y, w: 2.2, h: 0.35, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(r[1], { x: 2.9, y, w: 2.1, h: 0.35, fontFace: FONT.header, fontSize: 13, bold: true, color: COLOR.green, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("We hold adoption field-honest (~13.7%, below the ~15% mature ceiling) — it is not the lever.", { x: 0.7, y: 4.65, w: 4.3, h: 0.5, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });

  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 3.95, h: 2.55, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 0.08, h: 2.55, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("THE REAL LEVERS", { x: 5.65, y: 2.6, w: 3.5, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "5 → 20 houses", options: { bold: true, color: COLOR.cream, fontFace: FONT.header, fontSize: 22 } },
    { text: "  + transport attach 5% → 24%", options: { color: COLOR.mutedDark, fontSize: 12 } },
  ], { x: 5.65, y: 2.95, w: 3.5, h: 0.55, margin: 0 });
  s.addText("→  A self-serve onboarding wizard makes adding tenants low-touch, so the platform scales on house count. The consumer transport line grows from US$826 to US$31,677/yr as the buyer base widens — diversifying B2B into B2B2C.", { x: 5.65, y: 3.65, w: 3.5, h: 1.25, fontFace: FONT.body, fontSize: 11, color: COLOR.gold, margin: 0 });
  footer(s, 5);
}

// ============================================================================
// 6 — REVENUE IS SUBSCRIPTION-LED
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "REVENUE QUALITY");
  title(s, "The bulk of revenue is contractual subscription.");
  subhead(s, "Because the subscription carries the model, slow digital adoption hurts the upside — not the survival. The GMV take and transport line are the parts that compound as trust builds and the consumer base widens.");
  const mixData = [
    { name: "Subscription", labels: ["Year 5"], values: [MODEL.mixY5.subscription] },
    { name: "GMV take", labels: ["Year 5"], values: [MODEL.mixY5.tx] },
    { name: "Transport", labels: ["Year 5"], values: [MODEL.mixY5.transport] },
    { name: "Onboarding", labels: ["Year 5"], values: [MODEL.mixY5.onboarding] },
  ];
  s.addChart(pres.charts.BAR, mixData, {
    x: 0.7, y: 2.55, w: 4.6, h: 2.4, barDir: "bar", barGrouping: "stacked",
    chartColors: [COLOR.terracotta, COLOR.gold, COLOR.green, COLOR.dark],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisHidden: true,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  [["Subscription (recurring spine)", usd(MODEL.mixY5.subscription)], ["GMV take (compounds)", usd(MODEL.mixY5.tx)], ["Transport (B2B2C upside)", usd(MODEL.mixY5.transport)], ["Onboarding (one-off)", usd(MODEL.mixY5.onboarding)]].forEach((f, i) => {
    const y = 2.62 + i * 0.56;
    s.addText(f[0], { x: 5.6, y, w: 2.6, h: 0.35, fontFace: FONT.body, fontSize: 11.5, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(f[1], { x: 8.0, y, w: 1.35, h: 0.35, fontFace: FONT.header, fontSize: 14, bold: true, color: COLOR.terracotta, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("The same shape that makes Paynow's own model durable: recurring relationships first, transaction upside second.", { x: 5.6, y: 4.7, w: 3.75, h: 0.6, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });
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
  subhead(s, "Our take revenue is thin. The GMV we route onto Paynow — and the products it activates — is the number that matters to you, and it grows fastest.");
  // Five GMV cards across the slide: generalize width to N years so the layout fits.
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
    { text: "Core Express Checkout  ·  Bisafe escrow  ·  BillPay-as-biller  ·  EcoCash USSD  ·  merchant transfers  ·  ", options: { color: COLOR.body } },
    { text: "Paab cash (once unblocked)", options: { color: COLOR.muted, italic: true } },
  ], { x: 0.7, y: 4.8, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11.5, margin: 0 });
  footer(s, 7);
}

// ============================================================================
// 8 — SELF-FUNDED SCALING (no raise)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s); eyebrow(s, "HOW IT GROWS — WITHOUT A RAISE");
  title(s, "Operating surplus funds the next cohort of houses.");
  subhead(s, "There is no funding round because there is nowhere to raise one. Growth is paid for out of operating surplus, behind a 2–3 month working-capital buffer — self-funded and durable.");

  const data = [{ name: "Operating surplus", labels: MODEL.years, values: MODEL.surplus }];
  s.addChart(pres.charts.BAR, data, {
    x: 0.7, y: 2.55, w: 5.5, h: 2.45, barDir: "col",
    chartColors: [COLOR.green], showLegend: false, showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 10,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  const steps = [
    ["Reinvest, don't raise", "Surplus from the live book funds the next onboarding cohort and the team that runs it — no outside equity."],
    ["Compounds with scale", "Surplus grows roughly tenfold Y1→Y5 (US$13k → US$126k) as houses ramp 5 → 20 and transport attaches."],
    ["Buffer, not runway", "A prudent 2–3 month opex working-capital buffer absorbs a bad quarter — Y1's cushion is thin, so the buffer matters."],
  ];
  steps.forEach((p, i) => {
    const y = 2.5 + i * 0.85;
    s.addText(p[0], { x: 6.45, y, w: 2.95, h: 0.3, fontFace: FONT.header, fontSize: 13.5, bold: true, color: COLOR.terracotta, margin: 0 });
    s.addText(p[1], { x: 6.45, y: y + 0.28, w: 2.95, h: 0.55, fontFace: FONT.body, fontSize: 10, color: COLOR.muted, margin: 0 });
  });
  s.addText("Conservative by necessity: a Zimbabwean platform that cannot raise must be surplus-positive early — so we built one that is.", { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0 });
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
    { n: "1", t: "USD scarcity & cash habits", b: "Buyers and houses transact in cash; USD is tight. Mitigation: meet them on five rails (web/PWA, WhatsApp, USSD, BillPay, Messenger) so digital is easier than cash." },
    { n: "2", t: "Currency volatility", b: "ZWL/ZiG swings wipe out local-currency margins. Mitigation: all pricing in USD; the take invoiced on USD-equivalent settled GMV." },
    { n: "3", t: "Thin Year-1 cushion", b: "No raise means a slim buffer for a bad quarter. Mitigation: hold a 2–3 month opex working-capital buffer; never spend ahead of surplus." },
    { n: "4", t: "Anchor concentration", b: "The plan leans on landing 3 of ~8 Tier A anchors in Year 1. Mitigation: anchors-first GTM, paid pilots that credit toward onboarding, and the self-serve wizard to keep the funnel moving." },
  ];
  const w = 4.25, gx = 0.7, gy = 2.5, gap = 0.2;
  risks.forEach((l, i) => {
    const x = gx + (i % 2) * (w + gap);
    const y = gy + Math.floor(i / 2) * 1.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.2, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(l.n, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(l.t, { x: x + 0.75, y: y + 0.14, w: w - 0.9, h: 0.32, fontFace: FONT.header, fontSize: 14.5, bold: true, color: COLOR.body, margin: 0 });
    s.addText(l.b, { x: x + 0.75, y: y + 0.46, w: w - 0.9, h: 0.7, fontFace: FONT.body, fontSize: 9.5, color: COLOR.muted, margin: 0 });
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
    { text: "This is a scaling B2B-SaaS platform, self-funded behind a working-capital buffer — not a startup with a raised runway.  ", options: { color: COLOR.cream } },
    { text: "There is no capital to raise in this market, so the platform is built to be surplus-positive early as houses onboard as tenants — ", options: { color: COLOR.cream } },
    { text: "operating surplus of " + usd(MODEL.surplus[0]) + " → " + usd(MODEL.surplus[4]) + " across five years (cumulative " + usd(MODEL.fiveYr.surplus) + "), on US$0 of outside equity.  ", options: { color: COLOR.gold, bold: true } },
    { text: "The per-house economics work; growth rides on house count and transport, paid for from surplus; B2B today, B2B2C tomorrow.  ", options: { color: COLOR.cream } },
    { text: "And along the way it routes over US$19.5M onto Paynow's rails.", options: { color: COLOR.gold, bold: true } },
  ], { x: 0.7, y: 1.2, w: 8.6, h: 2.6, fontFace: FONT.header, fontSize: 16, margin: 0, paraSpaceAfter: 4, lineSpacingMultiple: 1.12 });
  s.addText("Build software you can sell — and a business this market can actually carry.", { x: 0.7, y: 4.05, w: 8.6, h: 0.5, fontFace: FONT.header, fontSize: 20, italic: true, bold: true, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw    ·    companion: financial-model.xlsx, gtm-strategy.md", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.95, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11 });
}

pres.writeFile({ fileName: "financial-deck.pptx" }).then((f) => console.log("Wrote:", f));

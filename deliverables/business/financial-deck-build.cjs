// ZimLivestock — Financial Deck (for the Paynow internship-return demo)
// A dedicated, HONEST financial story for an early-stage startup prying open a
// legacy, manual, cash-based livestock-auction system. Conservative base case
// ("floor") + clearly-labeled path-to-viability. Numbers computed from the
// leanest model (3 houses, 15% adoption ceiling, founder-lean costs).
//
// Reuses the terracotta/cream/gold palette from md-pitch-build.js.
// Build:  cd deliverables/business && NODE_PATH=$(npm root -g) node financial-deck-build.js

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042",
  cream: "F5E6D3",
  dark: "2D1B1A",
  gold: "D4A843",
  body: "2D1B1A",
  muted: "7A4F47",
  mutedDark: "BFAA98",
  cardBg: "FFFFFF",
  green: "5A7D5A",
  red: "B85042",
};
const FONT = { header: "Georgia", body: "Calibri" };

// ----------------------------------------------------------------------------
// Canonical numbers (leanest base case — see financial-model-build.py)
// ----------------------------------------------------------------------------
const FLOOR = {
  years: ["Year 1", "Year 2", "Year 3"],
  houses: [1, 2, 3],
  revenue: [12321, 28071, 48987],
  cost: [31440, 41280, 55720],
  net: [-19119, -13209, -6733],
  gmvPaynow: [43200, 223200, 545400],
  threeYr: { rev: 89379, cost: 128440, net: -39061 },
  mixY3: { retainer: 36900, engagement: 8000, tx: 4087 },
};
const PATH = {
  years: ["Y1", "Y2", "Y3", "Y4", "Y5"],
  net: [-13199, -6509, 23204, 44438, 55411],
  cum: [-13199, -19708, 3496, 47934, 103345], // cumulative; crosses 0 in Y3 (month 36)
};
const usd = (n) => (n < 0 ? "−US$" : "US$") + Math.abs(n).toLocaleString("en-US");
const usdK = (n) => (n < 0 ? "−US$" : "US$") + Math.abs(Math.round(n / 100) / 10) + "k";

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "Tatenda Nyemudzo";
pres.title = "ZimLivestock — Financial Overview";

let TOTAL = 11;

// ----------------------------------------------------------------------------
// Shared chrome
// ----------------------------------------------------------------------------
function accentBar(s, color = COLOR.gold) {
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 5.625, fill: { color }, line: { type: "none" } });
}
function footer(s, n, dark = false) {
  s.addText("ZIMLIVESTOCK  ·  FINANCIAL OVERVIEW  ·  JUNE 2026", {
    x: 0.5, y: 5.28, w: 8, h: 0.22, fontFace: FONT.body, fontSize: 8, charSpacing: 3,
    color: dark ? COLOR.mutedDark : COLOR.muted,
  });
  s.addText(`${n} / ${TOTAL}`, {
    x: 9.0, y: 5.28, w: 0.6, h: 0.22, fontFace: FONT.body, fontSize: 8, align: "right",
    color: dark ? COLOR.mutedDark : COLOR.muted,
  });
}
function eyebrow(s, text) {
  s.addText(text, { x: 0.7, y: 0.5, w: 7, h: 0.3, fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4, color: COLOR.terracotta });
}
function title(s, text, opts = {}) {
  s.addText(text, { x: 0.7, y: 0.92, w: 8.7, h: opts.h || 0.85, fontFace: FONT.header, fontSize: opts.size || 31, bold: true, color: COLOR.body, margin: 0 });
}
function subhead(s, text, y = 1.78) {
  s.addText(text, { x: 0.7, y, w: 8.7, h: 0.6, fontFace: FONT.body, fontSize: 13, color: COLOR.muted });
}

// ============================================================================
// 1 — TITLE
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  accentBar(s);
  s.addText("ZIMLIVESTOCK  ·  PAYNOW INTERNSHIP  ·  JUNE 2026", {
    x: 0.7, y: 0.55, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11, charSpacing: 4, bold: true, color: COLOR.gold,
  });
  s.addText("The honest numbers.", {
    x: 0.7, y: 1.45, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 54, bold: true, color: COLOR.cream, margin: 0,
  });
  s.addText("A financial overview for an early-stage startup prying open a legacy,\nmanual, cash-based livestock-auction market — built on the Paynow rails.", {
    x: 0.7, y: 2.65, w: 8.6, h: 1.0, fontFace: FONT.header, fontSize: 19, italic: true, color: COLOR.gold, margin: 0,
  });
  s.addText([
    { text: "Conservative base case + a clearly-labeled path to viability.  ", options: { color: COLOR.cream } },
    { text: "No hockey sticks.", options: { color: COLOR.mutedDark, italic: true } },
  ], { x: 0.7, y: 4.05, w: 8.6, h: 0.4, fontFace: FONT.body, fontSize: 13, margin: 0 });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.9, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 12 });
}

// ============================================================================
// 2 — HOW WE MAKE MONEY (revenue model + revised pricing)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE REVENUE MODEL");
  title(s, "Three revenue lines. The retainer is the spine.");
  subhead(s, "Software-as-a-professional-service, not SaaS. Pricing revised down to realistic Zimbabwean willingness-to-pay in USD.");

  const streams = [
    { tag: "ENGAGEMENT", v: "US$5–8k", sub: "one-off, at signing", body: "Discovery, branded skin, data migration, Paynow integration, on-floor training day." },
    { tag: "RETAINER", v: "US$1.0–1.5k", sub: "per month · recurring", body: "We operate the platform on their behalf. The reliable, contractual spine — not adoption-dependent." },
    { tag: "TX SURCHARGE", v: "0.75%", sub: "of settled GMV", body: "Small but compounds with digital adoption. Sits on top of Paynow's own fee." },
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
// 3 — PER-HOUSE UNIT ECONOMICS (the unit works)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "UNIT ECONOMICS");
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
    s.addText(h, { x: cx, y: tableY, w: colWs[i], h: rowH, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 1, color: COLOR.terracotta, align: i === 0 ? "left" : "right", valign: "bottom", margin: 0 });
    cx += colWs[i];
  });
  s.addShape(pres.shapes.LINE, { x: tableX, y: tableY + rowH + 0.02, w: 8.6, h: 0, line: { color: COLOR.terracotta, width: 1.5 } });
  rows.forEach((r, idx) => {
    const y = tableY + rowH + 0.18 + idx * (rowH + 0.06);
    cx = tableX;
    const cells = [r.label, r.eng, r.ret, r.tx, r.rec, r.contrib];
    cells.forEach((c, i) => {
      const strong = i === 4 || i === 5;
      s.addText(c, {
        x: cx, y, w: colWs[i], h: rowH, fontFace: i === 0 ? FONT.body : FONT.header, fontSize: i === 0 ? 13 : (strong ? 17 : 14),
        bold: i === 0 || strong, color: i === 5 ? COLOR.green : (i === 4 ? COLOR.terracotta : COLOR.body),
        align: i === 0 ? "left" : "right", valign: "middle", margin: 0,
      });
      cx += colWs[i];
    });
  });
  s.addText([
    { text: "Why this matters:  ", options: { bold: true, color: COLOR.body } },
    { text: "the business is sound per-unit. What's hard is amortizing the founder + support cost across enough houses — that's the real question, and it's the next slide.", options: { color: COLOR.muted } },
  ], { x: 0.7, y: 4.7, w: 8.7, h: 0.5, fontFace: FONT.body, fontSize: 11.5, italic: true, margin: 0 });
  footer(s, 3);
}

// ============================================================================
// 4 — THE HONEST BASE CASE (floor) — P&L chart
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE BASE CASE — “FLOOR”");
  title(s, "Three houses, 15% adoption. Investment-stage by design.");
  subhead(s, "Deliberately conservative: one pilot lands ~month 6, a second by year 2, a third by year 3. This is the floor — what we earn if every percent of adoption is hard-won.");

  const data = [
    { name: "Revenue", labels: FLOOR.years, values: FLOOR.revenue },
    { name: "Costs", labels: FLOOR.years, values: FLOOR.cost },
    { name: "Net", labels: FLOOR.years, values: FLOOR.net },
  ];
  s.addChart(pres.charts.BAR, data, {
    x: 0.7, y: 2.5, w: 5.7, h: 2.55,
    barDir: "col", barGrouping: "clustered",
    chartColors: [COLOR.gold, COLOR.muted, COLOR.terracotta],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body,
    showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" },
    catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 10,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  // Net callouts at right
  const callX = 6.7, callW = 2.7;
  FLOOR.years.forEach((yr, i) => {
    const y = 2.55 + i * 0.82;
    s.addText(yr.toUpperCase(), { x: callX, y, w: callW, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 2, color: COLOR.muted, margin: 0 });
    s.addText([
      { text: usd(FLOOR.net[i]), options: { bold: true, color: FLOOR.net[i] < 0 ? COLOR.red : COLOR.green, fontFace: FONT.header, fontSize: 20 } },
      { text: "  net", options: { color: COLOR.muted, fontSize: 11 } },
    ], { x: callX, y: y + 0.22, w: callW, h: 0.4, margin: 0 });
    s.addText(`${FLOOR.houses[i]} house${FLOOR.houses[i] > 1 ? "s" : ""} live · rev ${usd(FLOOR.revenue[i])}`, { x: callX, y: y + 0.58, w: callW, h: 0.22, fontFace: FONT.body, fontSize: 9.5, italic: true, color: COLOR.muted, margin: 0 });
  });
  s.addText([
    { text: "3-year totals:  ", options: { bold: true, color: COLOR.body } },
    { text: `revenue ${usd(FLOOR.threeYr.rev)} · costs ${usd(FLOOR.threeYr.cost)} · net ${usd(FLOOR.threeYr.net)}.  Standalone break-even sits beyond the 3-year window.`, options: { color: COLOR.muted } },
  ], { x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, margin: 0 });
  footer(s, 4);
}

// ============================================================================
// 5 — WHY: SCALE, NOT ADOPTION (the key insight)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE BINDING CONSTRAINT");
  title(s, "It's a scale problem, not an adoption problem.");
  subhead(s, "Chasing higher digital adoption barely moves the floor. The transaction surcharge is tiny next to a paid founder + support base — what we need is more houses, not more clicks per house.");

  // Left: sensitivity — adoption ceiling vs Y3 monthly net
  s.addText("PUSHING ADOPTION HARDER (3-house book, Y3 avg monthly net)", {
    x: 0.7, y: 2.45, w: 4.3, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 1, color: COLOR.terracotta, margin: 0,
  });
  const sens = [["15% adoption", "−US$978/mo"], ["20% adoption", "−US$910/mo"], ["25% adoption", "−US$842/mo"], ["30% adoption", "−US$776/mo"]];
  sens.forEach((r, i) => {
    const y = 2.85 + i * 0.42;
    s.addText(r[0], { x: 0.7, y, w: 2.2, h: 0.35, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(r[1], { x: 2.9, y, w: 2.1, h: 0.35, fontFace: FONT.header, fontSize: 14, bold: true, color: COLOR.red, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("Doubling adoption recovers ~US$200/mo. It does not get us to profit.", {
    x: 0.7, y: 4.65, w: 4.3, h: 0.5, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0,
  });

  // Right: the real lever — house economics
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 3.95, h: 2.55, fill: { color: COLOR.dark }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 5.4, y: 2.45, w: 0.08, h: 2.55, fill: { color: COLOR.gold }, line: { type: "none" } });
  s.addText("THE REAL LEVER", { x: 5.65, y: 2.6, w: 3.5, h: 0.3, fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3, color: COLOR.gold, margin: 0 });
  s.addText([
    { text: "~US$15–21k", options: { bold: true, color: COLOR.cream, fontFace: FONT.header, fontSize: 22 } },
    { text: "  contribution / mature house / yr", options: { color: COLOR.mutedDark, fontSize: 12 } },
  ], { x: 5.65, y: 2.95, w: 3.5, h: 0.55, margin: 0 });
  s.addText([
    { text: "~US$48–55k", options: { bold: true, color: COLOR.cream, fontFace: FONT.header, fontSize: 22 } },
    { text: "  annual fixed cost (founder + support)", options: { color: COLOR.mutedDark, fontSize: 12 } },
  ], { x: 5.65, y: 3.6, w: 3.5, h: 0.55, margin: 0 });
  s.addText("→  Break-even needs ~5–6 houses in the book with the early ones matured — or a leaner founder cost, or the upside rails on the next slides.", {
    x: 5.65, y: 4.25, w: 3.5, h: 0.65, fontFace: FONT.body, fontSize: 11, color: COLOR.gold, margin: 0,
  });
  footer(s, 5);
}

// ============================================================================
// 6 — REVENUE IS RETAINER-LED (de-risks slow adoption)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "REVENUE QUALITY");
  title(s, "75% of revenue is contractual, not volume-dependent.");
  subhead(s, "Because the retainer carries the model, slow digital adoption hurts the upside — not the survival. The transaction surcharge is the part that compounds as trust builds.");

  const mixData = [
    { name: "Retainer", labels: ["Year 3"], values: [FLOOR.mixY3.retainer] },
    { name: "Engagement", labels: ["Year 3"], values: [FLOOR.mixY3.engagement] },
    { name: "Tx surcharge", labels: ["Year 3"], values: [FLOOR.mixY3.tx] },
  ];
  s.addChart(pres.charts.BAR, mixData, {
    x: 0.7, y: 2.55, w: 4.6, h: 2.4,
    barDir: "bar", barGrouping: "stacked",
    chartColors: [COLOR.terracotta, COLOR.gold, COLOR.dark],
    showLegend: true, legendPos: "b", legendFontSize: 9, legendColor: COLOR.body,
    valAxisHidden: true, valGridLine: { style: "none" }, catAxisHidden: true,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  const facts = [
    ["Retainer (recurring spine)", usd(FLOOR.mixY3.retainer), "75%"],
    ["Engagement (one-off)", usd(FLOOR.mixY3.engagement), "16%"],
    ["Tx surcharge (compounds)", usd(FLOOR.mixY3.tx), "8%"],
  ];
  facts.forEach((f, i) => {
    const y = 2.7 + i * 0.62;
    s.addText(f[0], { x: 5.6, y, w: 2.6, h: 0.35, fontFace: FONT.body, fontSize: 12, color: COLOR.body, valign: "middle", margin: 0 });
    s.addText(f[1], { x: 8.0, y, w: 1.35, h: 0.35, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.terracotta, align: "right", valign: "middle", margin: 0 });
  });
  s.addText("The same shape that makes Paynow's own model durable: recurring relationships first, transaction upside second.", {
    x: 5.6, y: 4.6, w: 3.75, h: 0.6, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0,
  });
  footer(s, 6);
}

// ============================================================================
// 7 — WHAT PAYNOW GETS
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE PAYNOW UPSIDE");
  title(s, "Every dollar we move, moves on Paynow rails.");
  subhead(s, "Our surcharge revenue is small. The GMV we route onto Paynow — and the products it activates — is the number that matters to you, and it grows fastest.");

  // GMV onto rails — big numbers
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
// 8 — PATH TO VIABILITY (clearly labeled upside)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "THE PATH TO VIABILITY — UPSIDE, NOT BASE CASE");
  title(s, "With scale, it crosses break-even in year 3.");
  subhead(s, "Same product, executed faster: 6 houses by month 44, 20% adoption, and the transport margin layered in. Cumulative net turns positive in year 3 and compounds.");

  const data = [{ name: "Cumulative net", labels: PATH.years, values: PATH.cum }];
  s.addChart(pres.charts.LINE, data, {
    x: 0.7, y: 2.5, w: 5.8, h: 2.5,
    chartColors: [COLOR.terracotta], lineSize: 3, lineSmooth: true,
    showLegend: false, showValue: false,
    valAxisHidden: true, valGridLine: { style: "none" },
    catAxisLabelColor: COLOR.body, catAxisLabelFontSize: 11,
    plotArea: { fill: { color: COLOR.cream } }, chartArea: { fill: { color: COLOR.cream } },
  });
  // markers / callouts
  s.addText("BREAK-EVEN", { x: 3.4, y: 3.35, w: 1.4, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 2, color: COLOR.green, margin: 0 });
  s.addText("month 36", { x: 3.4, y: 3.58, w: 1.4, h: 0.25, fontFace: FONT.body, fontSize: 10, italic: true, color: COLOR.muted, margin: 0 });

  const pts = [
    ["Year 3 net", "+US$23,204", COLOR.green],
    ["Year 5 net", "+US$55,411", COLOR.green],
    ["Cumulative @ month 60", "+US$103,345", COLOR.terracotta],
  ];
  pts.forEach((p, i) => {
    const y = 2.6 + i * 0.78;
    s.addText(p[0].toUpperCase(), { x: 6.75, y, w: 2.6, h: 0.25, fontFace: FONT.body, fontSize: 9, bold: true, charSpacing: 1, color: COLOR.muted, margin: 0 });
    s.addText(p[1], { x: 6.75, y: y + 0.22, w: 2.6, h: 0.4, fontFace: FONT.header, fontSize: 19, bold: true, color: p[2], margin: 0 });
  });
  s.addText("Labeled as upside on purpose. We do not assume it in planning — we earn our way to it.", {
    x: 0.7, y: 5.0, w: 8.7, h: 0.3, fontFace: FONT.body, fontSize: 10.5, italic: true, color: COLOR.muted, margin: 0,
  });
  footer(s, 8);
}

// ============================================================================
// 9 — WHAT MOVES THE NEEDLE (levers)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  accentBar(s);
  eyebrow(s, "WHAT MOVES THE NEEDLE");
  title(s, "Four levers between the floor and the path.");
  subhead(s, "Ranked by impact. The first is ours to execute; the last three are largely unblocked by Paynow.");

  const levers = [
    { n: "1", t: "More houses, sooner", b: "The dominant lever. Each mature house adds ~US$15–21k contribution. 2 signings/yr instead of 1 is the difference between floor and path." },
    { n: "2", t: "Transport margin", b: "Already shipped: US$15 base + US$0.35/km, capped US$250. A per-delivery margin that scales with volume, excluded from the base case." },
    { n: "3", t: "Paab + BillPay rails", b: "Unblock cash-in (Paab) and BillPay-PAY and the addressable buyer base widens past smartphone users — lifting adoption above 15%." },
    { n: "4", t: "Lean founder cost", b: "Founder draw is the largest fixed line. Equity-over-salary in the early years pulls break-even forward by quarters." },
  ];
  const w = 4.25, gx = 0.7, gy = 2.5, gap = 0.2;
  levers.forEach((l, i) => {
    const x = gx + (i % 2) * (w + gap);
    const y = gy + Math.floor(i / 2) * 1.35;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: 1.2, fill: { color: COLOR.cardBg }, line: { type: "none" }, shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 90, opacity: 0.07 } });
    s.addShape(pres.shapes.OVAL, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fill: { color: COLOR.terracotta }, line: { type: "none" } });
    s.addText(l.n, { x: x + 0.18, y: y + 0.2, w: 0.42, h: 0.42, fontFace: FONT.header, fontSize: 18, bold: true, color: COLOR.cream, align: "center", valign: "middle", margin: 0 });
    s.addText(l.t, { x: x + 0.75, y: y + 0.14, w: w - 0.9, h: 0.32, fontFace: FONT.header, fontSize: 15, bold: true, color: COLOR.body, margin: 0 });
    s.addText(l.b, { x: x + 0.75, y: y + 0.46, w: w - 0.9, h: 0.7, fontFace: FONT.body, fontSize: 10.5, color: COLOR.muted, margin: 0 });
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
  s.addText("Three things from Paynow turn the floor into the path.", {
    x: 0.7, y: 1.05, w: 8.6, h: 1.4, fontFace: FONT.header, fontSize: 33, bold: true, color: COLOR.cream, margin: 0,
  });
  const asks = [
    { t: "Unblock the rails", b: "Paab sandbox + docs, and BillPay-PAY vendor-portal registration. These widen the buyer base and lift adoption above the floor." },
    { t: "Formalize the partnership", b: "Name ZimLivestock as Paynow's vertical solution for livestock. Co-marketing, a case study, a warm intro to one Harare auction house." },
    { t: "Back a paid pilot", b: "One 90-day pilot, US$5k + US$1,000/mo. It proves the per-house economics and produces the reference number the whole model rests on." },
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
    { text: "The per-house economics work even at 15% adoption.  ", options: { color: COLOR.cream } },
    { text: "The honest base case is investment-stage — ", options: { color: COLOR.cream } },
    { text: "three houses, three years, " + usd(FLOOR.threeYr.net) + " net, ", options: { color: COLOR.gold, bold: true } },
    { text: "because breaking a manual, cash-based market is slow and we refuse to pretend otherwise.  ", options: { color: COLOR.cream } },
    { text: "The constraint is scale, not adoption.  ", options: { color: COLOR.cream } },
    { text: "With Paynow unblocking the rails and backing one pilot, the same product crosses break-even in year 3 — ", options: { color: COLOR.cream } },
    { text: "and routes over US$800k onto Paynow rails along the way.", options: { color: COLOR.gold, bold: true } },
  ], { x: 0.7, y: 1.2, w: 8.6, h: 2.6, fontFace: FONT.header, fontSize: 17, margin: 0, paraSpaceAfter: 4, lineSpacingMultiple: 1.15 });
  s.addText("Build software you can sell — and price it for the market it's actually in.", {
    x: 0.7, y: 4.05, w: 8.6, h: 0.5, fontFace: FONT.header, fontSize: 20, italic: true, bold: true, color: COLOR.gold, margin: 0,
  });
  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "    dev@paynow.co.zw    ·    companion: financial-model.xlsx, gtm-strategy.md", options: { color: COLOR.mutedDark } },
  ], { x: 0.7, y: 4.95, w: 8.6, h: 0.3, fontFace: FONT.body, fontSize: 11 });
}

pres.writeFile({ fileName: "financial-deck.pptx" }).then((f) => console.log("Wrote:", f));

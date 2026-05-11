// Internship Return Day — peer presentation
// Tatenda Nyemudzo · NHL Stenden CMD · May 2026

const pptxgen = require("pptxgenjs");

const COLOR = {
  terracotta: "B85042",      // primary
  cream: "F5E6D3",            // surface (light slides)
  dark: "2D1B1A",             // dark slides
  gold: "D4A843",             // accent (matches ZimLivestock product)
  body: "2D1B1A",             // text on cream
  bodyDark: "F5E6D3",         // text on dark
  muted: "7A4F47",             // captions on cream
  mutedDark: "BFAA98",        // captions on dark
};

const FONT = { header: "Georgia", body: "Calibri" };

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";        // 10" × 5.625"
pres.author = "Tatenda Nyemudzo";
pres.title  = "Internship Return Day — Paynow Zimbabwe";

// ---- helpers --------------------------------------------------------------
function addAccentBar(slide, color = COLOR.gold) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color }, line: { type: "none" },
  });
}

function addFooter(slide, pageNum, total, dark = false) {
  slide.addText(
    [
      { text: "Tatenda Nyemudzo", options: { color: dark ? COLOR.mutedDark : COLOR.muted } },
      { text: "  ·  ", options: { color: dark ? COLOR.mutedDark : COLOR.muted } },
      { text: "NHL Stenden CMD · Internship Return Day", options: { color: dark ? COLOR.mutedDark : COLOR.muted } },
    ],
    { x: 0.5, y: 5.25, w: 8, h: 0.25, fontFace: FONT.body, fontSize: 9 }
  );
  slide.addText(`${pageNum} / ${total}`, {
    x: 9.0, y: 5.25, w: 0.6, h: 0.25,
    fontFace: FONT.body, fontSize: 9,
    color: dark ? COLOR.mutedDark : COLOR.muted,
    align: "right",
  });
}

const TOTAL = 10;

// ============================================================================
// SLIDE 1 — TITLE (dark)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };

  // Vertical gold accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: COLOR.gold }, line: { type: "none" },
  });

  // Small label up top
  s.addText("INTERNSHIP RETURN DAY · MAY 2026", {
    x: 0.7, y: 0.55, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, charSpacing: 4,
    color: COLOR.gold, bold: true,
  });

  // Main headline
  s.addText("I left Leeuwarden", {
    x: 0.7, y: 1.4, w: 8.6, h: 0.9,
    fontFace: FONT.header, fontSize: 48, bold: true,
    color: COLOR.cream, margin: 0,
  });
  s.addText("to build a cattle marketplace.", {
    x: 0.7, y: 2.25, w: 8.6, h: 0.9,
    fontFace: FONT.header, fontSize: 48, italic: true,
    color: COLOR.gold, margin: 0,
  });

  // Sub
  s.addText("Nine weeks at Paynow Zimbabwe — what worked, what hurt, and what I wish someone had told me before I started looking.", {
    x: 0.7, y: 3.5, w: 8.6, h: 0.8,
    fontFace: FONT.body, fontSize: 16,
    color: COLOR.mutedDark,
  });

  // Name strip
  s.addText("Tatenda Nyemudzo  ·  CMD, Year 3", {
    x: 0.7, y: 4.85, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 12,
    color: COLOR.cream, bold: true,
  });
}

// ============================================================================
// SLIDE 2 — WHO I AM
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);

  // Eyebrow
  s.addText("WHO", {
    x: 0.7, y: 0.5, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });

  // Big name
  s.addText("Tatenda Nyemudzo", {
    x: 0.7, y: 0.95, w: 8.6, h: 0.8,
    fontFace: FONT.header, fontSize: 38, bold: true,
    color: COLOR.body, margin: 0,
  });

  // One-line bio
  s.addText("Zimbabwean. CMD Year 3 at NHL Stenden. Spent the last nine weeks back home interning at Paynow.", {
    x: 0.7, y: 1.85, w: 8.6, h: 0.6,
    fontFace: FONT.body, fontSize: 16, color: COLOR.body,
  });

  // Three columns
  const cols = [
    { label: "Where", value: "Harare, Zimbabwe" },
    { label: "What", value: "Building ZimLivestock\non Paynow's stack" },
    { label: "Why this talk", value: "Most of you start\nlooking in June.\nHere's the short cut." },
  ];
  const colW = 2.85;
  const startX = 0.7;
  cols.forEach((c, i) => {
    const x = startX + i * (colW + 0.15);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.0, w: colW, h: 1.85,
      fill: { color: "FFFFFF" }, line: { type: "none" },
      shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 90, opacity: 0.08 },
    });
    // Terracotta side accent
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.0, w: 0.08, h: 1.85,
      fill: { color: COLOR.terracotta }, line: { type: "none" },
    });
    s.addText(c.label.toUpperCase(), {
      x: x + 0.25, y: 3.15, w: colW - 0.3, h: 0.3,
      fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
      color: COLOR.muted, margin: 0,
    });
    s.addText(c.value, {
      x: x + 0.25, y: 3.5, w: colW - 0.3, h: 1.3,
      fontFace: FONT.header, fontSize: 16, color: COLOR.body, margin: 0,
    });
  });

  addFooter(s, 2, TOTAL);
}

// ============================================================================
// SLIDE 3 — WHAT PAYNOW DOES
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);

  s.addText("THE COMPANY", {
    x: 0.7, y: 0.5, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });

  s.addText("Paynow is Zimbabwe's Stripe.", {
    x: 0.7, y: 0.95, w: 8.6, h: 0.7,
    fontFace: FONT.header, fontSize: 32, bold: true, color: COLOR.body, margin: 0,
  });

  s.addText("Except most of the country doesn't have a credit card. So they built around mobile money — and around USSD prompts on feature phones.", {
    x: 0.7, y: 1.7, w: 8.6, h: 0.8,
    fontFace: FONT.body, fontSize: 15, color: COLOR.muted,
  });

  // Three stats
  const stats = [
    { num: "17", unit: "years",  caption: "operating Zimbabwe's primary payment rail" },
    { num: "100+", unit: "billers", caption: "in the BillPay catalog (ZESA, schools, councils)" },
    { num: "5", unit: "products", caption: "across Core, BillPay, TXT, Bisafe, Paab" },
  ];
  const w = 2.85, startX = 0.7;
  stats.forEach((st, i) => {
    const x = startX + i * (w + 0.15);
    s.addText(st.num, {
      x, y: 2.95, w, h: 1.0,
      fontFace: FONT.header, fontSize: 60, bold: true,
      color: COLOR.terracotta, align: "left", margin: 0,
    });
    s.addText(st.unit, {
      x, y: 3.95, w, h: 0.3,
      fontFace: FONT.body, fontSize: 13, bold: true,
      color: COLOR.body, margin: 0,
    });
    s.addText(st.caption, {
      x, y: 4.25, w, h: 0.7,
      fontFace: FONT.body, fontSize: 12, color: COLOR.muted, margin: 0,
    });
  });

  addFooter(s, 3, TOTAL);
}

// ============================================================================
// SLIDE 4 — WHAT I'M DOING
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);

  s.addText("THE WORK", {
    x: 0.7, y: 0.5, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });

  s.addText("I built ZimLivestock —", {
    x: 0.7, y: 0.95, w: 8.6, h: 0.65,
    fontFace: FONT.header, fontSize: 32, bold: true, color: COLOR.body, margin: 0,
  });
  s.addText("software built to be sold to Zimbabwean auction houses, running on every product in Paynow's ecosystem.", {
    x: 0.7, y: 1.5, w: 8.6, h: 0.75,
    fontFace: FONT.body, fontSize: 16, color: COLOR.muted,
  });

  // Two outputs (parallel work) — cards slightly shorter to make room for MD quote
  const outputs = [
    {
      tag: "OUTPUT 1",
      title: "A production app",
      body: "React + Supabase, mobile-first PWA, live USSD payments. Real auctions, real money, real users.",
    },
    {
      tag: "OUTPUT 2",
      title: "A 42-page DX benchmark",
      body: "Paynow Core vs. Stripe, Paystack, Flutterwave, Pesepay, DPOpay across 7 categories. First-attempt evidence, no workarounds.",
    },
  ];
  const w = 4.3, startX = 0.7;
  outputs.forEach((o, i) => {
    const x = startX + i * (w + 0.25);
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.7, w, h: 1.75,
      fill: { color: COLOR.dark }, line: { type: "none" },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 2.7, w: 0.08, h: 1.75,
      fill: { color: COLOR.gold }, line: { type: "none" },
    });
    s.addText(o.tag, {
      x: x + 0.25, y: 2.82, w: w - 0.3, h: 0.3,
      fontFace: FONT.body, fontSize: 10, bold: true, charSpacing: 3,
      color: COLOR.gold, margin: 0,
    });
    s.addText(o.title, {
      x: x + 0.25, y: 3.15, w: w - 0.3, h: 0.45,
      fontFace: FONT.header, fontSize: 22, bold: true,
      color: COLOR.cream, margin: 0,
    });
    s.addText(o.body, {
      x: x + 0.25, y: 3.65, w: w - 0.3, h: 0.78,
      fontFace: FONT.body, fontSize: 13,
      color: COLOR.mutedDark, margin: 0,
    });
  });

  // MD quote — pulls the commercial framing forward as the WHY of the project
  s.addText([
    { text: "“", options: { color: COLOR.terracotta, fontSize: 22, bold: true } },
    { text: "Don't build a thesis. Build software you can sell.", options: { color: COLOR.body, italic: true } },
    { text: "”", options: { color: COLOR.terracotta, fontSize: 22, bold: true } },
    { text: "   — my Paynow MD, on why this project exists.", options: { color: COLOR.muted, fontSize: 13 } },
  ], {
    x: 0.7, y: 4.7, w: 8.6, h: 0.4,
    fontFace: FONT.header, fontSize: 14, margin: 0, valign: "middle",
  });

  addFooter(s, 4, TOTAL);
}

// ============================================================================
// SLIDE 5 — HOW I APPLIED
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);

  s.addText("THE APPLICATION", {
    x: 0.7, y: 0.5, w: 4, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });

  s.addText("I didn't get this through a job board.", {
    x: 0.7, y: 0.95, w: 8.6, h: 0.7,
    fontFace: FONT.header, fontSize: 30, bold: true, color: COLOR.body, margin: 0,
  });

  s.addText("Paynow wasn't on stagecmd@nhlstenden.com. They weren't recruiting interns at all. Here's what I did instead:", {
    x: 0.7, y: 1.65, w: 8.6, h: 0.6,
    fontFace: FONT.body, fontSize: 14, color: COLOR.muted,
  });

  // 3 numbered steps
  const steps = [
    { n: "01", t: "Picked the company first, the role second.", b: "I wanted to work on Zimbabwean fintech specifically. The company list flowed from that — not the other way around." },
    { n: "02", t: "Cold-reached the right person, not 'careers@'.", b: "Found an engineer on LinkedIn, sent one sharp email pitching a specific project I'd build for them. Not 'I want to learn'." },
    { n: "03", t: "Followed up. Twice.", b: "Most students stop after the first email. Most companies miss the first email. The follow-up is where the conversation actually starts." },
  ];

  steps.forEach((st, i) => {
    const y = 2.65 + i * 0.85;
    s.addText(st.n, {
      x: 0.7, y, w: 0.9, h: 0.7,
      fontFace: FONT.header, fontSize: 36, bold: true,
      color: COLOR.terracotta, margin: 0,
    });
    s.addText(st.t, {
      x: 1.7, y, w: 7.7, h: 0.35,
      fontFace: FONT.header, fontSize: 17, bold: true,
      color: COLOR.body, margin: 0,
    });
    s.addText(st.b, {
      x: 1.7, y: y + 0.35, w: 7.7, h: 0.45,
      fontFace: FONT.body, fontSize: 12,
      color: COLOR.muted, margin: 0,
    });
  });

  addFooter(s, 5, TOTAL);
}

// ============================================================================
// SLIDES 6–9 — "WHAT I WISH I'D KNOWN"
// ============================================================================
function wishSlide(num, eyebrow, headline, body, pageNum) {
  const s = pres.addSlide();
  s.background = { color: COLOR.cream };
  addAccentBar(s);

  s.addText(eyebrow, {
    x: 0.7, y: 0.5, w: 6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.terracotta,
  });

  // Giant number on left — wider box + smaller font so 2-digit numerals fit
  s.addText(num, {
    x: 0.55, y: 1.1, w: 4.3, h: 3.7,
    fontFace: FONT.header, fontSize: 180, bold: true,
    color: COLOR.gold, margin: 0,
    valign: "top", align: "left",
  });

  // Headline + body on right — shifted right to leave room for numerals
  s.addText(headline, {
    x: 5.0, y: 1.7, w: 4.5, h: 1.5,
    fontFace: FONT.header, fontSize: 26, bold: true,
    color: COLOR.body, margin: 0,
  });

  s.addText(body, {
    x: 5.0, y: 3.2, w: 4.5, h: 1.7,
    fontFace: FONT.body, fontSize: 14,
    color: COLOR.muted, margin: 0,
  });

  addFooter(s, pageNum, TOTAL);
  return s;
}

wishSlide(
  "01",
  "WHAT I WISH I'D KNOWN",
  "Pick where you can ship, not where you can observe.",
  "A small or distant company will hand you the keys on week one. A big-brand agency will ask you to assist. For your CMD portfolio, ownership beats prestige. The work you do is the only thing the report can be about — pick a place that lets you actually do some.",
  6
);

wishSlide(
  "02",
  "WHAT I WISH I'D KNOWN",
  "If the brief is ambiguous, that's the gift.",
  "My brief on day one was three lines. It scared me at first. By week three I realised the open-endedness was the most valuable thing my supervisor could have given me — every scoping decision was mine to make, every piece of work was mine to own. Don't try to get the brief locked down before you start. Get good at scoping.",
  7
);

wishSlide(
  "03",
  "WHAT I WISH I'D KNOWN",
  "Your competences are broader than \"design\".",
  "I shipped UX flows. I also shipped system architecture, a 42-page research report, four payment integrations, and a live demo to company leadership. Every one of those mapped to an HBO-i competence. CMD's framework is broader than visual design — let the work be too.",
  8
);

wishSlide(
  "04",
  "WHAT I WISH I'D KNOWN",
  "Start writing the report in week one.",
  "Everyone tells you this. Everyone ignores it. Don't. Half my deliverables exist *because* I wrote them down weekly — not because I sat down at week 18 and tried to remember what happened. Treat the report as a journal you write towards, not a deliverable you write at the end.",
  9
);

// ============================================================================
// SLIDE 10 — CLOSE (dark)
// ============================================================================
{
  const s = pres.addSlide();
  s.background = { color: COLOR.dark };
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: 5.625,
    fill: { color: COLOR.gold }, line: { type: "none" },
  });

  s.addText("ONE LAST THING", {
    x: 0.7, y: 0.6, w: 6, h: 0.3,
    fontFace: FONT.body, fontSize: 11, bold: true, charSpacing: 4,
    color: COLOR.gold,
  });

  s.addText("Internships are leverage.", {
    x: 0.7, y: 1.3, w: 8.6, h: 1.0,
    fontFace: FONT.header, fontSize: 46, bold: true,
    color: COLOR.cream, margin: 0,
  });
  s.addText("Pick where you can actually pull on the lever.", {
    x: 0.7, y: 2.3, w: 8.6, h: 1.0,
    fontFace: FONT.header, fontSize: 32, italic: true,
    color: COLOR.gold, margin: 0,
  });

  s.addText("Find me afterwards — happy to talk about cold-emailing payment companies, what an internship in Zimbabwe actually costs, how the CMD framework holds up when the work is mostly code, or anything else.", {
    x: 0.7, y: 3.85, w: 8.6, h: 1.0,
    fontFace: FONT.body, fontSize: 14, color: COLOR.mutedDark,
  });

  s.addText([
    { text: "Tatenda Nyemudzo", options: { bold: true, color: COLOR.cream } },
    { text: "   ·   ", options: { color: COLOR.mutedDark } },
    { text: "github.com/tatenda-source", options: { color: COLOR.mutedDark } },
  ], {
    x: 0.7, y: 5.1, w: 8.6, h: 0.3,
    fontFace: FONT.body, fontSize: 12,
  });
}

// ============================================================================
// Write file
// ============================================================================
pres.writeFile({ fileName: "internship-return-day.pptx" })
  .then((f) => console.log("Wrote:", f));

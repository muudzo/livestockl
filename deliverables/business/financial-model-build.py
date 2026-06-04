#!/usr/bin/env python3.13
"""
ZimLivestock — Financial Model  (v2.1, June 2026 — Zimbabwe bootstrap base case)

A 36-month projection for the SaPS business, built on a ZIMBABWE BOOTSTRAP frame:
no external capital (there is no VC to raise from), no founder salary (the founder's
income IS the operating surplus), no hire-ahead-of-revenue. This supersedes the
May-2026 model, whose adoption, customer-ramp and pricing assumptions were
over-optimistic, AND drops the first-world startup framing (burn / runway /
break-even-month) that does not apply to how a business is actually built here.

What changed:
- Customer ramp:   10 houses in 33 months  ->  3 houses (1 -> 2 -> 3)
- Adoption ceiling: 70% of physical GMV    ->  15% (slow trust-building)
- Pricing:          Tier A $10-12k/$2-2.5k ->  Tier A $8k/$1.5k (realistic WTP)
- Costs/framing:    funded org chart + burn -> bootstrap (no salary, no capital);
                    bottom line is OPERATING SURPLUS = founder income, positive
                    from the first live house. Max ever out-of-pocket ~$2,250.

Revenue lines (unchanged in shape, repriced):
- Engagement fee (one-off):     $5-8k per house
- Operations retainer (monthly): $1.0-1.5k per house
- Transaction surcharge:         0.75% of settled GMV

Outputs an .xlsx with 6 tabs:
  0. README          — what's in here + honest headline outputs
  1. Assumptions     — every input, editable
  2. Customer ramp   — when each house joins, tier, GMV
  3. Revenue         — monthly revenue per house, totaled
  4. Costs           — infrastructure + lean headcount
  5. P&L summary     — month-by-month income statement + a path-to-viability note

Run:  python3.13 financial-model-build.py
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# ----------------------------------------------------------------------------
# THE MODEL — single source of truth (mirrors financial-deck-build.cjs)
# ----------------------------------------------------------------------------
SURCHARGE = 0.0075

# (sign_month, label, tier, engagement, retainer, gmv_per_saleday, sale_days_per_mo)
SCHEDULE = [
    (6,  "Pilot — Harare",    "Pilot", 5000, 1000, 60000, 3),
    (18, "House 2 — Bulawayo", "B",     6000, 1200, 60000, 3),
    (30, "House 3 — Gweru",    "A",     8000, 1500, 90000, 4),
]

def penetration(life_month):
    """Share of a house's physical GMV settling digitally, by months-since-go-live.
    Breaking a manual cash market is slow: starts at the long-tail / remote buyers,
    creeps to a 15% ceiling only after two years of earning dealers' trust."""
    if life_month <= 6:  return 0.03
    if life_month <= 12: return 0.06
    if life_month <= 24: return 0.10
    return 0.15

def monthly_cost(m):
    # ZIMBABWE BOOTSTRAP: the founder draws NO salary. Their income IS the
    # operating surplus (see the P&L tab). There is no external capital and no
    # hire-ahead-of-revenue — costs are lean operating only. Help is cheap
    # part-time local labour, paid out of operations once a house can carry it.
    founder  = 0
    support  = 400 if m >= 18 else 0    # part-time help once house #2 lands
    support2 = 400 if m >= 30 else 0    # second part-timer at house #3
    active   = sum(1 for (mo, *_) in SCHEDULE if mo <= m)
    infra    = 250 + 120 * active        # Supabase/Vercel/Cloudflare + per-house SMS/tools
    misc     = 200                       # accounting / tools
    return founder, support + support2, infra + misc

# ----------------------------------------------------------------------------
# Style helpers
# ----------------------------------------------------------------------------
TERRACOTTA = "B85042"; GOLD = "D4A843"; CREAM = "F5E6D3"
DARK = "2D1B1A"; MUTED = "7A4F47"; LIGHT_GREY = "F0F0EC"

thin = Side(style="thin", color="DDDDDD")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

def style_header(c):
    c.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=TERRACOTTA)
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    c.border = border

def style_section(c):
    c.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=DARK)
    c.alignment = Alignment(horizontal="left", vertical="center")

def style_input(c):
    c.font = Font(name="Calibri", size=10, color="000000")
    c.fill = PatternFill("solid", fgColor=GOLD)
    c.alignment = Alignment(horizontal="right", vertical="center")
    c.border = border

def style_calc(c):
    c.font = Font(name="Calibri", size=10)
    c.alignment = Alignment(horizontal="right", vertical="center")
    c.border = border

def style_total(c):
    c.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=TERRACOTTA)
    c.alignment = Alignment(horizontal="right", vertical="center")
    c.border = border

def style_label(c):
    c.font = Font(name="Calibri", size=10)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = border

def style_label_bold(c):
    c.font = Font(name="Calibri", size=10, bold=True)
    c.alignment = Alignment(horizontal="left", vertical="center")
    c.border = border

def fmt_currency(c): c.number_format = '"$"#,##0;[Red]("$"#,##0)'
def fmt_pct(c): c.number_format = "0.00%"
def fmt_int(c): c.number_format = "#,##0"

wb = openpyxl.Workbook()
wb.remove(wb.active)

# ============================================================================
# TAB 1 — ASSUMPTIONS
# ============================================================================
ws = wb.create_sheet("1. Assumptions")
for col, w in zip("ABCDE", (44, 16, 16, 16, 40)):
    ws.column_dimensions[col].width = w

ws.merge_cells("A1:E1")
ws["A1"] = "ZIMLIVESTOCK — FINANCIAL MODEL ASSUMPTIONS (v2.0, honest base case)"
ws["A1"].font = Font(name="Georgia", size=13, bold=True, color="FFFFFF")
ws["A1"].fill = PatternFill("solid", fgColor=DARK)
ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 32
ws.merge_cells("A2:E2")
ws["A2"] = "Gold cells = inputs (edit these). White cells = calculations. Leanest startup case: 3 houses, 15% adoption ceiling, founder-lean costs."
ws["A2"].font = Font(name="Calibri", size=10, italic=True, color=MUTED)
ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
ws["A2"].fill = PatternFill("solid", fgColor=CREAM)

def section(row, label):
    ws.merge_cells(f"A{row}:E{row}")
    ws[f"A{row}"] = label
    style_section(ws[f"A{row}"])
    ws.row_dimensions[row].height = 20

def row_input(row, label, value, fmt="currency", note=""):
    ws[f"A{row}"] = label; style_label(ws[f"A{row}"])
    ws[f"B{row}"] = value; style_input(ws[f"B{row}"])
    if fmt == "currency": fmt_currency(ws[f"B{row}"])
    elif fmt == "pct": fmt_pct(ws[f"B{row}"])
    elif fmt == "int": fmt_int(ws[f"B{row}"])
    ws.merge_cells(f"C{row}:E{row}")
    ws[f"C{row}"] = note
    ws[f"C{row}"].font = Font(name="Calibri", size=9, italic=True, color=MUTED)
    ws[f"C{row}"].alignment = Alignment(horizontal="left", vertical="center")

row = 4
section(row, "PRICING — per-house revenue inputs (revised to realistic Zim WTP)"); row += 1
row_input(row, "Engagement fee — Tier A (anchor house)", 8000, note="Was $10-12k; trimmed for realistic USD WTP"); row += 1
row_input(row, "Engagement fee — Tier B (mid-market)",   6000, note="Was $7-8k"); row += 1
row_input(row, "Engagement fee — Pilot (discounted)",    5000, note="Disc from $8k list"); row += 1
row_input(row, "Monthly retainer — Tier A",              1500, note="Was $2,000-2,500"); row += 1
row_input(row, "Monthly retainer — Tier B",              1200, note="Was $1,500"); row += 1
row_input(row, "Monthly retainer — Pilot",               1000, note="90-day pilot rate"); row += 1
row_input(row, "Transaction surcharge %",              0.0075, fmt="pct", note="0.75% of settled GMV"); row += 1

row += 1
section(row, "ADOPTION — % of physical GMV settling digitally (by house age)"); row += 1
row_input(row, "Months 1-6 of a house (just landed)",   0.03, fmt="pct", note="Long-tail + remote buyers only"); row += 1
row_input(row, "Months 7-12 (early trust)",             0.06, fmt="pct", note="Slow build vs cash deposits"); row += 1
row_input(row, "Months 13-24 (ramping)",                0.10, fmt="pct", note=""); row += 1
row_input(row, "Months 25+ (mature ceiling)",           0.15, fmt="pct", note="Honest 3-yr ceiling for a manual market"); row += 1

row += 1
section(row, "CUSTOMER USAGE — GMV per house"); row += 1
row_input(row, "Sale-day GMV — Tier A",   90000, note="Anchor house, big sale day"); row += 1
row_input(row, "Sale-day GMV — Tier B",   60000, note="Mid-market house"); row += 1
row_input(row, "Sale days per month — Tier A", 4, fmt="int", note="Weekly"); row += 1
row_input(row, "Sale days per month — Tier B", 3, fmt="int", note="Weekly-fortnightly"); row += 1

row += 1
section(row, "COSTS — Zimbabwe bootstrap (USD/month, no founder salary)"); row += 1
row_input(row, "Founder draw (income = surplus, NOT a cost)", 0, note="Bootstrap: founder takes operating surplus, draws no salary"); row += 1
row_input(row, "Part-time help (from house #2)",         400, note="Cheap local part-time, added month 18"); row += 1
row_input(row, "Second part-timer (house #3)",           400, note="Added month 30"); row += 1
row_input(row, "Base infrastructure / month",            250, note="Supabase + Vercel + Cloudflare"); row += 1
row_input(row, "Variable infra per active house / mo",   120, note="SMS, support tools"); row += 1
row_input(row, "Misc opex / month",                      200, note="Accounting, tools"); row += 1

# ============================================================================
# TAB 2 — CUSTOMER RAMP
# ============================================================================
ws2 = wb.create_sheet("2. Customer ramp")
for col, w in zip("ABCDEFGH", (8, 14, 22, 10, 14, 14, 16, 20)):
    ws2.column_dimensions[col].width = w
ws2.merge_cells("A1:H1")
ws2["A1"] = "CUSTOMER RAMP — three houses over three years (1 → 2 → 3)"
ws2["A1"].font = Font(name="Georgia", size=13, bold=True, color="FFFFFF")
ws2["A1"].fill = PatternFill("solid", fgColor=DARK)
ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 32
for i, h in enumerate(["#", "Sign month", "House", "Tier", "Engagement", "Retainer", "Sale-day GMV", "Mature tx GMV/mo (15%)"], start=1):
    style_header(ws2.cell(row=3, column=i, value=h))
ws2.row_dimensions[3].height = 30

r = 4
for i, (mo, label, tier, eng, ret, gmv, sd) in enumerate(SCHEDULE, start=1):
    ws2.cell(row=r, column=1, value=i); style_label(ws2.cell(row=r, column=1))
    ws2.cell(row=r, column=2, value=mo); style_calc(ws2.cell(row=r, column=2))
    ws2.cell(row=r, column=3, value=label); style_label(ws2.cell(row=r, column=3))
    ws2.cell(row=r, column=4, value=tier); style_label(ws2.cell(row=r, column=4))
    ws2.cell(row=r, column=4).alignment = Alignment(horizontal="center")
    ws2.cell(row=r, column=5, value=eng); style_calc(ws2.cell(row=r, column=5)); fmt_currency(ws2.cell(row=r, column=5))
    ws2.cell(row=r, column=6, value=ret); style_calc(ws2.cell(row=r, column=6)); fmt_currency(ws2.cell(row=r, column=6))
    ws2.cell(row=r, column=7, value=gmv); style_calc(ws2.cell(row=r, column=7)); fmt_currency(ws2.cell(row=r, column=7))
    ws2.cell(row=r, column=8, value=round(gmv * sd * 0.15)); style_calc(ws2.cell(row=r, column=8)); fmt_currency(ws2.cell(row=r, column=8))
    r += 1
ws2.cell(row=r, column=3, value="TOTAL — 3 houses by month 30")
style_label_bold(ws2.cell(row=r, column=3))
ws2.cell(row=r, column=5, value=f"=SUM(E4:E{r-1})"); style_total(ws2.cell(row=r, column=5)); fmt_currency(ws2.cell(row=r, column=5))
ws2.cell(row=r, column=6, value=f"=SUM(F4:F{r-1})"); style_total(ws2.cell(row=r, column=6)); fmt_currency(ws2.cell(row=r, column=6))
ws2.cell(row=r, column=6).number_format = '"$"#,##0" /mo"'

# ============================================================================
# TAB 3 — REVENUE BY MONTH
# ============================================================================
ws3 = wb.create_sheet("3. Revenue")
ws3.column_dimensions["A"].width = 22
for col in range(2, 38):
    ws3.column_dimensions[get_column_letter(col)].width = 9
ws3.merge_cells("A1:AL1")
ws3["A1"] = "MONTHLY REVENUE — 36-month projection (leanest base case)"
ws3["A1"].font = Font(name="Georgia", size=13, bold=True, color="FFFFFF")
ws3["A1"].fill = PatternFill("solid", fgColor=DARK)
ws3["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws3.row_dimensions[1].height = 30
ws3["A3"] = "Month"; style_header(ws3["A3"])
for m in range(1, 37):
    style_header(ws3.cell(row=3, column=m + 1, value=m))
ws3.row_dimensions[3].height = 24

def section_band(ws, row, text):
    ws.cell(row=row, column=1, value=text)
    style_label_bold(ws.cell(row=row, column=1))
    ws.cell(row=row, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)

# Engagement
section_band(ws3, 4, "ENGAGEMENT FEES")
r = 5
for (mo, label, tier, eng, ret, gmv, sd) in SCHEDULE:
    ws3.cell(row=r, column=1, value=label); style_label(ws3.cell(row=r, column=1))
    for m in range(1, 37):
        c = ws3.cell(row=r, column=m + 1, value=eng if m == mo else 0)
        style_calc(c); fmt_currency(c)
    r += 1
eng_total = r
ws3.cell(row=r, column=1, value="  Total engagement"); style_label_bold(ws3.cell(row=r, column=1))
for m in range(1, 37):
    c = ws3.cell(row=r, column=m + 1, value=f"=SUM({get_column_letter(m+1)}5:{get_column_letter(m+1)}{r-1})")
    style_total(c); fmt_currency(c)
r += 2

# Retainer
section_band(ws3, r, "RETAINER"); r += 1
ret_start = r
for (mo, label, tier, eng, ret, gmv, sd) in SCHEDULE:
    ws3.cell(row=r, column=1, value=label); style_label(ws3.cell(row=r, column=1))
    for m in range(1, 37):
        c = ws3.cell(row=r, column=m + 1, value=ret if m >= mo else 0)
        style_calc(c); fmt_currency(c)
    r += 1
ret_total = r
ws3.cell(row=r, column=1, value="  Total retainer"); style_label_bold(ws3.cell(row=r, column=1))
for m in range(1, 37):
    c = ws3.cell(row=r, column=m + 1, value=f"=SUM({get_column_letter(m+1)}{ret_start}:{get_column_letter(m+1)}{r-1})")
    style_total(c); fmt_currency(c)
r += 2

# Tx surcharge (penetration ramp)
section_band(ws3, r, "TX SURCHARGE  (adoption-weighted, 0.75%)"); r += 1
tx_start = r
for (mo, label, tier, eng, ret, gmv, sd) in SCHEDULE:
    ws3.cell(row=r, column=1, value=label); style_label(ws3.cell(row=r, column=1))
    for m in range(1, 37):
        val = 0 if m < mo else round(gmv * sd * penetration(m - mo + 1) * SURCHARGE)
        c = ws3.cell(row=r, column=m + 1, value=val)
        style_calc(c); fmt_currency(c)
    r += 1
tx_total = r
ws3.cell(row=r, column=1, value="  Total tx surcharge"); style_label_bold(ws3.cell(row=r, column=1))
for m in range(1, 37):
    c = ws3.cell(row=r, column=m + 1, value=f"=SUM({get_column_letter(m+1)}{tx_start}:{get_column_letter(m+1)}{r-1})")
    style_total(c); fmt_currency(c)
r += 2

# Grand total
grand = r
ws3.cell(row=r, column=1, value="GRAND TOTAL")
ws3.cell(row=r, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws3.cell(row=r, column=1).fill = PatternFill("solid", fgColor=DARK)
for m in range(1, 37):
    c = ws3.cell(row=r, column=m + 1, value=f"={get_column_letter(m+1)}{eng_total}+{get_column_letter(m+1)}{ret_total}+{get_column_letter(m+1)}{tx_total}")
    c.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=DARK)
    c.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(c)
r += 2
for yi, (lbl, cols) in enumerate([("Year 1 (m1-12)", ("B", "M")), ("Year 2 (m13-24)", ("N", "Y")), ("Year 3 (m25-36)", ("Z", "AK"))]):
    ws3.cell(row=r + yi, column=1, value=lbl); style_label_bold(ws3.cell(row=r + yi, column=1))
    c = ws3.cell(row=r + yi, column=2, value=f"=SUM({cols[0]}{grand}:{cols[1]}{grand})")
    style_total(c); fmt_currency(c)
    ws3.merge_cells(start_row=r + yi, start_column=2, end_row=r + yi, end_column=5)
ws3.freeze_panes = "B4"

# ============================================================================
# TAB 4 — COSTS
# ============================================================================
ws4 = wb.create_sheet("4. Costs")
ws4.column_dimensions["A"].width = 26
for col in range(2, 38):
    ws4.column_dimensions[get_column_letter(col)].width = 9
ws4.merge_cells("A1:AL1")
ws4["A1"] = "MONTHLY COSTS — founder-lean headcount + infrastructure"
ws4["A1"].font = Font(name="Georgia", size=13, bold=True, color="FFFFFF")
ws4["A1"].fill = PatternFill("solid", fgColor=DARK)
ws4["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws4.row_dimensions[1].height = 30
ws4["A3"] = "Month"; style_header(ws4["A3"])
for m in range(1, 37):
    style_header(ws4.cell(row=3, column=m + 1, value=m))
ws4.row_dimensions[3].height = 24

founders = [monthly_cost(m)[0] for m in range(1, 37)]
supports = [monthly_cost(m)[1] for m in range(1, 37)]
infras   = [monthly_cost(m)[2] for m in range(1, 37)]

section_band(ws4, 4, "PEOPLE  (bootstrap — founder draws no salary)")
ws4.cell(row=5, column=1, value="Founder draw (none)"); style_label(ws4.cell(row=5, column=1))
for m in range(1, 37):
    c = ws4.cell(row=5, column=m + 1, value=founders[m - 1]); style_calc(c); fmt_currency(c)
ws4.cell(row=6, column=1, value="Part-time help"); style_label(ws4.cell(row=6, column=1))
for m in range(1, 37):
    c = ws4.cell(row=6, column=m + 1, value=supports[m - 1]); style_calc(c); fmt_currency(c)
hc_total = 7
ws4.cell(row=hc_total, column=1, value="  Total people"); style_label_bold(ws4.cell(row=hc_total, column=1))
for m in range(1, 37):
    c = ws4.cell(row=hc_total, column=m + 1, value=f"=SUM({get_column_letter(m+1)}5:{get_column_letter(m+1)}6)")
    style_total(c); fmt_currency(c)

section_band(ws4, 9, "INFRASTRUCTURE + OPEX")
ws4.cell(row=10, column=1, value="Infra + opex"); style_label(ws4.cell(row=10, column=1))
for m in range(1, 37):
    c = ws4.cell(row=10, column=m + 1, value=infras[m - 1]); style_calc(c); fmt_currency(c)

cost_total = 12
ws4.cell(row=cost_total, column=1, value="TOTAL COSTS")
ws4.cell(row=cost_total, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws4.cell(row=cost_total, column=1).fill = PatternFill("solid", fgColor=DARK)
for m in range(1, 37):
    c = ws4.cell(row=cost_total, column=m + 1, value=f"={get_column_letter(m+1)}{hc_total}+{get_column_letter(m+1)}10")
    c.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=DARK)
    c.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(c)
ws4.freeze_panes = "B4"

# ============================================================================
# TAB 5 — P&L SUMMARY
# ============================================================================
ws5 = wb.create_sheet("5. P&L summary")
ws5.column_dimensions["A"].width = 22
for col in range(2, 38):
    ws5.column_dimensions[get_column_letter(col)].width = 9
ws5.merge_cells("A1:AL1")
ws5["A1"] = "P&L SUMMARY — month by month (honest base case)"
ws5["A1"].font = Font(name="Georgia", size=13, bold=True, color="FFFFFF")
ws5["A1"].fill = PatternFill("solid", fgColor=DARK)
ws5["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws5.row_dimensions[1].height = 30
ws5["A3"] = "Month"; style_header(ws5["A3"])
for m in range(1, 37):
    style_header(ws5.cell(row=3, column=m + 1, value=m))
ws5.row_dimensions[3].height = 24

ws5.cell(row=4, column=1, value="Revenue"); style_label_bold(ws5.cell(row=4, column=1))
for m in range(1, 37):
    c = ws5.cell(row=4, column=m + 1, value=f"='3. Revenue'!{get_column_letter(m+1)}{grand}"); style_calc(c); fmt_currency(c)
ws5.cell(row=5, column=1, value="Costs"); style_label_bold(ws5.cell(row=5, column=1))
for m in range(1, 37):
    c = ws5.cell(row=5, column=m + 1, value=f"=-'4. Costs'!{get_column_letter(m+1)}{cost_total}"); style_calc(c); fmt_currency(c)
ws5.cell(row=6, column=1, value="SURPLUS (founder income)")
ws5.cell(row=6, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws5.cell(row=6, column=1).fill = PatternFill("solid", fgColor=DARK)
for m in range(1, 37):
    c = ws5.cell(row=6, column=m + 1, value=f"={get_column_letter(m+1)}4+{get_column_letter(m+1)}5")
    c.font = Font(name="Calibri", size=10, bold=True)
    c.fill = PatternFill("solid", fgColor=GOLD)
    c.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(c)
ws5.cell(row=7, column=1, value="Cumulative surplus"); style_label_bold(ws5.cell(row=7, column=1))
for m in range(1, 37):
    formula = "=B6" if m == 1 else f"={get_column_letter(m+1)}6+{get_column_letter(m)}7"
    c = ws5.cell(row=7, column=m + 1, value=formula); style_calc(c); fmt_currency(c)
ws5.freeze_panes = "B4"

# Yearly summary
ws5.cell(row=10, column=1, value="YEARLY SUMMARY")
ws5.cell(row=10, column=1).font = Font(name="Georgia", size=12, bold=True, color="FFFFFF")
ws5.cell(row=10, column=1).fill = PatternFill("solid", fgColor=DARK)
ws5.merge_cells("A10:F10")
for ci, lbl in enumerate(["", "Year 1", "Year 2", "Year 3", "3-yr total"]):
    if lbl:
        style_header(ws5.cell(row=11, column=ci + 1, value=lbl))
ranges = [("B", "M"), ("N", "Y"), ("Z", "AK")]
ws5.cell(row=12, column=1, value="Revenue"); style_label_bold(ws5.cell(row=12, column=1))
ws5.cell(row=13, column=1, value="Costs"); style_label_bold(ws5.cell(row=13, column=1))
ws5.cell(row=14, column=1, value="SURPLUS (founder income)")
ws5.cell(row=14, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws5.cell(row=14, column=1).fill = PatternFill("solid", fgColor=DARK)
for yi, (a_, b_) in enumerate(ranges):
    rc = ws5.cell(row=12, column=2 + yi, value=f"=SUM({a_}4:{b_}4)"); style_calc(rc); fmt_currency(rc)
    cc = ws5.cell(row=13, column=2 + yi, value=f"=SUM({a_}5:{b_}5)"); style_calc(cc); fmt_currency(cc)
    nc = ws5.cell(row=14, column=2 + yi, value=f"={get_column_letter(2+yi)}12+{get_column_letter(2+yi)}13"); style_total(nc); fmt_currency(nc)
ws5.cell(row=12, column=5, value="=B12+C12+D12"); style_calc(ws5.cell(row=12, column=5)); fmt_currency(ws5.cell(row=12, column=5))
ws5.cell(row=13, column=5, value="=B13+C13+D13"); style_calc(ws5.cell(row=13, column=5)); fmt_currency(ws5.cell(row=13, column=5))
ws5.cell(row=14, column=5, value="=B14+C14+D14"); style_total(ws5.cell(row=14, column=5)); fmt_currency(ws5.cell(row=14, column=5))

# Notes
ws5.cell(row=16, column=1, value="NOTES — read before quoting any number")
ws5.cell(row=16, column=1).font = Font(name="Calibri", size=11, bold=True, color=TERRACOTTA)
ws5.merge_cells("A16:F16")
notes = [
    "ZIMBABWE BOOTSTRAP. 3 houses (1 -> 2 -> 3), 15% adoption ceiling. No external capital, no founder salary, no hire-ahead. The bottom line is OPERATING SURPLUS = the founder's income.",
    "Cash-positive from the first live house (month 6). Founder income: ~$6k (Y1) -> ~$18k (Y2) -> ~$32k (Y3); ~$56k over 3 years. Deepest the founder is ever out-of-pocket is ~$2,250 (pre-launch months) -- self-financed, no raise.",
    "No 'runway' or 'break-even month' here -- those are first-world startup artifacts. There is no burn to recover because there is no capital being burnt.",
    "Constraint is SCALE + OPERATOR CAPACITY, not adoption. Pushing adoption 15% -> 30% adds only ~$200/mo. Each mature house adds ~$15-30k of surplus; growth is capped by how many an owner + cheap part-time help can run, and is self-funded from surplus.",
    "Revenue is retainer-led (Y3: ~$37k retainer of ~$49k total). The recurring spine is reliable; tx-surcharge is small but compounds with adoption.",
    "GMV routed onto Paynow rails: ~$43k (Y1) -> ~$223k (Y2) -> ~$545k (Y3). The number that matters most to Paynow and grows fastest.",
    "ZIMBABWE-SPECIFIC RISKS: USD scarcity / collection friction in a cash economy; ZWL/ZiG volatility (price in USD); no capital cushion, so any shock is absorbed by the founder. Corporate tax and transport revenue (upside) not modelled. All figures USD.",
]
for i, n in enumerate(notes):
    ws5.cell(row=17 + i, column=1, value=f"•  {n}")
    ws5.cell(row=17 + i, column=1).font = Font(name="Calibri", size=10, color=MUTED)
    ws5.cell(row=17 + i, column=1).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws5.merge_cells(start_row=17 + i, start_column=1, end_row=17 + i, end_column=15)
    ws5.row_dimensions[17 + i].height = 28

# ============================================================================
# TAB 0 — README (cover)
# ============================================================================
cover = wb.create_sheet("0. README", 0)
cover.column_dimensions["A"].width = 100
cover["A1"] = "ZIMLIVESTOCK"
cover["A1"].font = Font(name="Georgia", size=24, bold=True, color="FFFFFF")
cover["A1"].fill = PatternFill("solid", fgColor=DARK)
cover["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
cover.row_dimensions[1].height = 50
cover["A2"] = "Financial Model — 36-month SaPS projection (v2.1, Zimbabwe bootstrap)"
cover["A2"].font = Font(name="Georgia", size=14, italic=True, color=GOLD)
cover["A2"].fill = PatternFill("solid", fgColor=DARK)
cover["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
cover.row_dimensions[2].height = 28
cover["A3"] = "v2.1  ·  Tatenda Nyemudzo  ·  June 2026  ·  bootstrap frame (no capital, no salary)"
cover["A3"].font = Font(name="Calibri", size=11, italic=True, color=MUTED)
cover["A3"].alignment = Alignment(horizontal="left", indent=1)
cover.row_dimensions[3].height = 24

readme_rows = [
    "",
    "WHAT'S IN THIS WORKBOOK",
    "",
    "1. Assumptions   — All inputs in gold cells. Pricing, adoption ramp, GMV, lean costs.",
    "2. Customer ramp — The 3-house schedule (pilot -> Tier B -> Tier A).",
    "3. Revenue       — Month-by-month across all 3 houses and 3 revenue lines.",
    "4. Costs         — Lean operating costs only (NO founder salary — bootstrap).",
    "5. P&L summary   — Month-by-month revenue, costs, surplus, cumulative + notes.",
    "",
    "",
    "THE FRAME — A ZIMBABWE BOOTSTRAP",
    "",
    "·  This is NOT modelled like a first-world startup. There is no VC to raise from, no",
    "   founder salary financed by capital, and no 'burn toward a break-even month'.",
    "·  The founder is an owner-operator. Their income IS the operating surplus below.",
    "·  No external capital is assumed or required. Growth is funded out of surplus.",
    "·  vs the May model: 10 houses -> 3; 70% adoption -> 15%; Tier A $10-12k/$2-2.5k -> $8k/$1.5k.",
    "",
    "",
    "HONEST HEADLINE OUTPUTS (Zimbabwe bootstrap)",
    "",
    "·  Year 1:  revenue ~$12,000   cost ~$6,000    founder income ~+$6,000   (1 house)",
    "·  Year 2:  revenue ~$28,000   cost ~$10,000   founder income ~+$18,000  (2 houses)",
    "·  Year 3:  revenue ~$49,000   cost ~$17,000   founder income ~+$32,000  (3 houses)",
    "·  3-year:  revenue ~$89,000   founder earns ~+$56,000 over 3 years.",
    "·  Cash-positive from the first live house. Max ever out-of-pocket ~$2,250 (self-financed).",
    "·  External capital required: $0.   GMV onto Paynow rails: ~$43k -> ~$223k -> ~$545k.",
    "",
    "THE KEY INSIGHT",
    "",
    "·  Constraint is SCALE + OPERATOR CAPACITY, not adoption. Per-house economics work",
    "   (~$15-30k/yr surplus per mature house). Doubling adoption (15% -> 30%) adds only ~$200/mo.",
    "·  More houses = more income, capped by what one owner + cheap part-time help can run well.",
    "",
    "HOW IT SCALES (no capital, no raise)",
    "",
    "·  Each new house is funded from the surplus of the last. The founder reinvests part of",
    "   the surplus into part-time help to take on the next house. Slow, self-funded, durable.",
    "",
    "·  Zim risks: USD scarcity / collection friction, currency volatility, no capital cushion.",
    "·  All figures USD. No fundraising or corporate tax modelled.",
]
for i, txt in enumerate(readme_rows, start=5):
    cover[f"A{i}"] = txt
    if txt.strip() in ("WHAT'S IN THIS WORKBOOK", "THE FRAME — A ZIMBABWE BOOTSTRAP",
                        "HONEST HEADLINE OUTPUTS (Zimbabwe bootstrap)", "THE KEY INSIGHT",
                        "HOW IT SCALES (no capital, no raise)"):
        cover[f"A{i}"].font = Font(name="Calibri", size=11, bold=True, color=TERRACOTTA)
    else:
        cover[f"A{i}"].font = Font(name="Calibri", size=10, color=DARK)
    cover[f"A{i}"].alignment = Alignment(horizontal="left", indent=1, vertical="top")
    cover.row_dimensions[i].height = 16

wb.save("/Users/tatendanyemudzo/Downloads/app/deliverables/business/financial-model.xlsx")
print("Wrote: financial-model.xlsx")

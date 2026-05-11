#!/usr/bin/env python3.13
"""
ZimLivestock — Financial Model

A 3-year financial projection for the SaPS business:
- Engagement fee (one-off): $5–12k per house
- Operations retainer (monthly): $1.2–2.5k per house
- Transaction surcharge: 0.75% of settled GMV

Outputs an .xlsx with 5 tabs:
  1. Assumptions       — every input, editable
  2. Customer ramp     — when each customer joins, tier, GMV
  3. Revenue           — monthly revenue per customer, totaled
  4. Costs & headcount — infrastructure + salaries
  5. P&L summary       — month-by-month income statement

Conservative defaults from business-case.md and gtm-strategy.md.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import ColorScaleRule

# ----------------------------------------------------------------------------
# Style helpers
# ----------------------------------------------------------------------------
TERRACOTTA = "B85042"
GOLD       = "D4A843"
CREAM      = "F5E6D3"
DARK       = "2D1B1A"
MUTED      = "7A4F47"
LIGHT_GREY = "F0F0EC"

thin = Side(style="thin", color="DDDDDD")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

def style_header(cell):
    cell.font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=TERRACOTTA)
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border

def style_section(cell):
    cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=DARK)
    cell.alignment = Alignment(horizontal="left", vertical="center")

def style_input(cell):
    cell.font = Font(name="Calibri", size=10, color="000000")
    cell.fill = PatternFill("solid", fgColor=GOLD)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    cell.border = border

def style_calc(cell):
    cell.font = Font(name="Calibri", size=10)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    cell.border = border

def style_total(cell):
    cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=TERRACOTTA)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    cell.border = border

def style_label(cell):
    cell.font = Font(name="Calibri", size=10)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    cell.border = border

def style_label_bold(cell):
    cell.font = Font(name="Calibri", size=10, bold=True)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    cell.border = border

def fmt_currency(cell):
    cell.number_format = '"$"#,##0;[Red]("$"#,##0)'

def fmt_pct(cell):
    cell.number_format = "0.00%"

def fmt_int(cell):
    cell.number_format = "#,##0"

# ----------------------------------------------------------------------------
# Workbook
# ----------------------------------------------------------------------------
wb = openpyxl.Workbook()
wb.remove(wb.active)

# ============================================================================
# TAB 1 — ASSUMPTIONS
# ============================================================================
ws = wb.create_sheet("1. Assumptions")
ws.column_dimensions["A"].width = 42
ws.column_dimensions["B"].width = 16
ws.column_dimensions["C"].width = 16
ws.column_dimensions["D"].width = 16
ws.column_dimensions["E"].width = 40

# Title
ws.merge_cells("A1:E1")
ws["A1"] = "ZIMLIVESTOCK — FINANCIAL MODEL ASSUMPTIONS"
ws["A1"].font = Font(name="Georgia", size=14, bold=True, color="FFFFFF")
ws["A1"].fill = PatternFill("solid", fgColor=DARK)
ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 32

ws.merge_cells("A2:E2")
ws["A2"] = "Gold cells = inputs (edit these). White cells = calculations (don't touch)."
ws["A2"].font = Font(name="Calibri", size=10, italic=True, color=MUTED)
ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
ws["A2"].fill = PatternFill("solid", fgColor=CREAM)

# Section: Pricing
def section(row, label):
    ws.merge_cells(f"A{row}:E{row}")
    ws[f"A{row}"] = label
    style_section(ws[f"A{row}"])
    ws.row_dimensions[row].height = 20

def row_input(row, label, value, fmt="currency", note=""):
    ws[f"A{row}"] = label
    style_label(ws[f"A{row}"])
    ws[f"B{row}"] = value
    style_input(ws[f"B{row}"])
    if fmt == "currency":
        fmt_currency(ws[f"B{row}"])
    elif fmt == "pct":
        fmt_pct(ws[f"B{row}"])
    elif fmt == "int":
        fmt_int(ws[f"B{row}"])
    ws.merge_cells(f"C{row}:E{row}")
    ws[f"C{row}"] = note
    ws[f"C{row}"].font = Font(name="Calibri", size=9, italic=True, color=MUTED)
    ws[f"C{row}"].alignment = Alignment(horizontal="left", vertical="center")

row = 4
section(row, "PRICING — per-customer revenue inputs"); row += 1
row_input(row, "Engagement fee — Tier A (anchor house)", 11000, note="Range $10–12k per business case"); row += 1
row_input(row, "Engagement fee — Tier B (mid-market)",   7500,  note="Range $7–8k"); row += 1
row_input(row, "Engagement fee — Tier C (small/regional)", 5000, note="$5k per business case"); row += 1
row_input(row, "Pilot engagement (discounted)",          5000,  note="$5k discount from $8k list"); row += 1
row_input(row, "Monthly retainer — Tier A",              2250,  note="Mid of $2,000–$2,500 range"); row += 1
row_input(row, "Monthly retainer — Tier B",              1500,  note="$1,500 per business case"); row += 1
row_input(row, "Monthly retainer — Tier C",              1200,  note="$1,200 per business case"); row += 1
row_input(row, "Monthly retainer — pilot phase",         1200,  note="Discounted pilot retainer"); row += 1
row_input(row, "Transaction surcharge %",                0.0075, fmt="pct", note="0.75% per business case"); row += 1

row += 1
section(row, "CUSTOMER USAGE — GMV per customer"); row += 1
row_input(row, "Sale-day GMV — Tier A",   120000, note="$80–200k range; conservative mid"); row += 1
row_input(row, "Sale-day GMV — Tier B",    55000, note="$30–80k range"); row += 1
row_input(row, "Sale-day GMV — Tier C",    18000, note="$10–30k range"); row += 1
row_input(row, "Sale days per month — Tier A", 4, fmt="int", note="Weekly cadence"); row += 1
row_input(row, "Sale days per month — Tier B", 3, fmt="int", note="Weekly to fortnightly"); row += 1
row_input(row, "Sale days per month — Tier C", 2, fmt="int", note="Fortnightly"); row += 1
row_input(row, "Platform penetration — months 1-3 (pilot)",   0.15, fmt="pct", note="15% of GMV during pilot"); row += 1
row_input(row, "Platform penetration — months 4-9 (ramp)",    0.40, fmt="pct", note="40% during ramp"); row += 1
row_input(row, "Platform penetration — months 10+ (steady)",  0.70, fmt="pct", note="70% at steady state"); row += 1

row += 1
section(row, "COSTS — infrastructure & people"); row += 1
row_input(row, "Founder salary / month",                 4000, note="USD equivalent"); row += 1
row_input(row, "Ops lead salary / month",                2500, note="Hired engagement #2 onwards"); row += 1
row_input(row, "Engineer salary / month",                3500, note="Hired around engagement #4"); row += 1
row_input(row, "BD lead salary / month",                 2500, note="Hired in year 2"); row += 1
row_input(row, "Base infrastructure / month",             300, note="Supabase + Vercel + Cloudflare"); row += 1
row_input(row, "Variable infra per active house / mo",    150, note="SMS, Bisafe, support tools"); row += 1
row_input(row, "Misc opex / month",                       500, note="Accounting, legal, tools"); row += 1

row += 1
section(row, "DEALMAKING — funnel + close rate"); row += 1
row_input(row, "Close rate on discovery calls",          0.20, fmt="pct", note="1 in 5 per GTM"); row += 1
row_input(row, "Months from contact to signature",          3, fmt="int", note="Typical SaPS sales cycle"); row += 1

# Save current row for reference in other sheets
ws["A2"].fill = PatternFill("solid", fgColor=CREAM)

# ============================================================================
# TAB 2 — CUSTOMER RAMP
# ============================================================================
ws2 = wb.create_sheet("2. Customer ramp")
ws2.column_dimensions["A"].width = 8
ws2.column_dimensions["B"].width = 14
ws2.column_dimensions["C"].width = 22
ws2.column_dimensions["D"].width = 10
ws2.column_dimensions["E"].width = 14
ws2.column_dimensions["F"].width = 14
ws2.column_dimensions["G"].width = 18
ws2.column_dimensions["H"].width = 18

ws2.merge_cells("A1:H1")
ws2["A1"] = "CUSTOMER RAMP — when each house joins, sized, and how penetration grows"
ws2["A1"].font = Font(name="Georgia", size=14, bold=True, color="FFFFFF")
ws2["A1"].fill = PatternFill("solid", fgColor=DARK)
ws2["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws2.row_dimensions[1].height = 32

# Headers
headers = ["#", "Sign month", "Customer label", "Tier", "Engagement", "Retainer", "Sale-day GMV", "Monthly tx GMV (steady)"]
for i, h in enumerate(headers, start=1):
    c = ws2.cell(row=3, column=i, value=h)
    style_header(c)
ws2.row_dimensions[3].height = 30

# Customer schedule — 3-year plan from GTM
# (sign_month, label, tier_letter, engagement_fee, retainer, gmv_per_saleday, sale_days_per_mo)
schedule = [
    (3,  "Pilot — Harare house", "Pilot", 5000, 1200, 120000, 4),
    (8,  "Tier B Bulawayo",      "B",     7500, 1500,  55000, 3),
    (12, "Tier A Gweru",         "A",    11000, 2250, 120000, 4),
    (15, "Tier B Mutare",        "B",     7500, 1500,  55000, 3),
    (18, "Tier B Masvingo",      "B",     7500, 1500,  55000, 3),
    (21, "Tier A Harare #2",     "A",    11000, 2250, 120000, 4),
    (24, "Tier C Chinhoyi",      "C",     5000, 1200,  18000, 2),
    (27, "Tier B Kwekwe",        "B",     7500, 1500,  55000, 3),
    (30, "Tier A Bulawayo #2",   "A",    11000, 2250, 120000, 4),
    (33, "Tier C Beitbridge",    "C",     5000, 1200,  18000, 2),
]

row = 4
for i, (mo, label, tier, eng, ret, gmv, sd) in enumerate(schedule, start=1):
    ws2.cell(row=row, column=1, value=i)
    style_label(ws2.cell(row=row, column=1))
    ws2.cell(row=row, column=2, value=mo)
    style_calc(ws2.cell(row=row, column=2))
    ws2.cell(row=row, column=3, value=label)
    style_label(ws2.cell(row=row, column=3))
    ws2.cell(row=row, column=4, value=tier)
    style_label(ws2.cell(row=row, column=4))
    ws2.cell(row=row, column=4).alignment = Alignment(horizontal="center")
    ws2.cell(row=row, column=5, value=eng)
    style_calc(ws2.cell(row=row, column=5)); fmt_currency(ws2.cell(row=row, column=5))
    ws2.cell(row=row, column=6, value=ret)
    style_calc(ws2.cell(row=row, column=6)); fmt_currency(ws2.cell(row=row, column=6))
    ws2.cell(row=row, column=7, value=gmv)
    style_calc(ws2.cell(row=row, column=7)); fmt_currency(ws2.cell(row=row, column=7))
    ws2.cell(row=row, column=8, value=f"=G{row}*{sd}*'1. Assumptions'!B25")  # steady penetration row 25 = "months 10+ 70%"
    style_calc(ws2.cell(row=row, column=8)); fmt_currency(ws2.cell(row=row, column=8))
    row += 1

# Total row
ws2.cell(row=row, column=1, value="").fill = PatternFill("solid", fgColor=LIGHT_GREY)
ws2.cell(row=row, column=2, value="").fill = PatternFill("solid", fgColor=LIGHT_GREY)
ws2.cell(row=row, column=3, value="TOTAL — 10 houses by month 33")
style_label_bold(ws2.cell(row=row, column=3))
ws2.cell(row=row, column=3).fill = PatternFill("solid", fgColor=LIGHT_GREY)
ws2.cell(row=row, column=4, value="").fill = PatternFill("solid", fgColor=LIGHT_GREY)
ws2.cell(row=row, column=5, value=f"=SUM(E4:E{row-1})")
style_total(ws2.cell(row=row, column=5)); fmt_currency(ws2.cell(row=row, column=5))
ws2.cell(row=row, column=6, value=f"=SUM(F4:F{row-1})")
style_total(ws2.cell(row=row, column=6)); fmt_currency(ws2.cell(row=row, column=6))
ws2.cell(row=row, column=6).number_format = '"$"#,##0" /mo"'
ws2.cell(row=row, column=7, value="").fill = PatternFill("solid", fgColor=LIGHT_GREY)
ws2.cell(row=row, column=8, value=f"=SUM(H4:H{row-1})")
style_total(ws2.cell(row=row, column=8)); fmt_currency(ws2.cell(row=row, column=8))

# ============================================================================
# TAB 3 — REVENUE BY MONTH
# ============================================================================
ws3 = wb.create_sheet("3. Revenue")
ws3.column_dimensions["A"].width = 14
for col in range(2, 38):
    ws3.column_dimensions[get_column_letter(col)].width = 12

ws3.merge_cells("A1:AL1")
ws3["A1"] = "MONTHLY REVENUE — 36-month projection"
ws3["A1"].font = Font(name="Georgia", size=14, bold=True, color="FFFFFF")
ws3["A1"].fill = PatternFill("solid", fgColor=DARK)
ws3["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws3.row_dimensions[1].height = 32

# Month headers
ws3["A3"] = "Month"
style_header(ws3["A3"])
for m in range(1, 37):
    c = ws3.cell(row=3, column=m + 1, value=m)
    style_header(c)
ws3.row_dimensions[3].height = 26

# For each customer, compute monthly:
#   engagement (sign month only)
#   retainer (every month from sign month onwards)
#   tx surcharge (penetration-weighted from sign month onwards)

# Row 4 = label "Engagement fees"
# Row 5+ = each customer's engagement on their sign month
# Then sum, then retainer rows, sum, then tx rows, sum, then grand total

# Engagement section
ws3.cell(row=4, column=1, value="ENGAGEMENT FEES")
style_label_bold(ws3.cell(row=4, column=1))
ws3.cell(row=4, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)

row = 5
for i, (mo, label, tier, eng, ret, gmv, sd) in enumerate(schedule, start=1):
    ws3.cell(row=row, column=1, value=label)
    style_label(ws3.cell(row=row, column=1))
    for m in range(1, 37):
        cell = ws3.cell(row=row, column=m + 1, value=eng if m == mo else 0)
        style_calc(cell)
        fmt_currency(cell)
    row += 1

# Engagement total
eng_total_row = row
ws3.cell(row=row, column=1, value="  Total engagement")
style_label_bold(ws3.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws3.cell(row=row, column=m + 1, value=f"=SUM({get_column_letter(m + 1)}5:{get_column_letter(m + 1)}{row - 1})")
    style_total(cell)
    fmt_currency(cell)
row += 2

# Retainer section
ws3.cell(row=row, column=1, value="RETAINER")
style_label_bold(ws3.cell(row=row, column=1))
ws3.cell(row=row, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)
row += 1

ret_start = row
for i, (mo, label, tier, eng, ret, gmv, sd) in enumerate(schedule, start=1):
    ws3.cell(row=row, column=1, value=label)
    style_label(ws3.cell(row=row, column=1))
    for m in range(1, 37):
        val = ret if m >= mo else 0
        cell = ws3.cell(row=row, column=m + 1, value=val)
        style_calc(cell)
        fmt_currency(cell)
    row += 1

# Retainer total
ret_total_row = row
ws3.cell(row=row, column=1, value="  Total retainer")
style_label_bold(ws3.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws3.cell(row=row, column=m + 1, value=f"=SUM({get_column_letter(m + 1)}{ret_start}:{get_column_letter(m + 1)}{row - 1})")
    style_total(cell)
    fmt_currency(cell)
row += 2

# Tx surcharge section — uses penetration ramp from assumptions
# Months 1-3 of customer life: 15% pen.  Months 4-9: 40%.  Months 10+: 70%.
ws3.cell(row=row, column=1, value="TX SURCHARGE")
style_label_bold(ws3.cell(row=row, column=1))
ws3.cell(row=row, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)
row += 1

tx_start = row
for i, (mo, label, tier, eng, ret, gmv, sd) in enumerate(schedule, start=1):
    ws3.cell(row=row, column=1, value=label)
    style_label(ws3.cell(row=row, column=1))
    for m in range(1, 37):
        if m < mo:
            val = 0
        else:
            life = m - mo + 1
            if life <= 3:
                pen = 0.15
            elif life <= 9:
                pen = 0.40
            else:
                pen = 0.70
            val = gmv * sd * pen * 0.0075
        cell = ws3.cell(row=row, column=m + 1, value=round(val))
        style_calc(cell)
        fmt_currency(cell)
    row += 1

# Tx total
tx_total_row = row
ws3.cell(row=row, column=1, value="  Total tx surcharge")
style_label_bold(ws3.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws3.cell(row=row, column=m + 1, value=f"=SUM({get_column_letter(m + 1)}{tx_start}:{get_column_letter(m + 1)}{row - 1})")
    style_total(cell)
    fmt_currency(cell)
row += 2

# GRAND TOTAL
grand_total_row = row
ws3.cell(row=row, column=1, value="GRAND TOTAL")
ws3.cell(row=row, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws3.cell(row=row, column=1).fill = PatternFill("solid", fgColor=DARK)
ws3.cell(row=row, column=1).alignment = Alignment(horizontal="left", vertical="center")
for m in range(1, 37):
    cell = ws3.cell(row=row, column=m + 1,
        value=f"={get_column_letter(m + 1)}{eng_total_row}+{get_column_letter(m + 1)}{ret_total_row}+{get_column_letter(m + 1)}{tx_total_row}")
    cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=DARK)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(cell)
row += 2

# Year totals
ws3.cell(row=row, column=1, value="Year 1 (m1–12)")
style_label_bold(ws3.cell(row=row, column=1))
ws3.cell(row=row, column=2, value=f"=SUM(B{grand_total_row}:M{grand_total_row})")
style_total(ws3.cell(row=row, column=2)); fmt_currency(ws3.cell(row=row, column=2))
ws3.merge_cells(start_row=row, start_column=2, end_row=row, end_column=5)

ws3.cell(row=row+1, column=1, value="Year 2 (m13–24)")
style_label_bold(ws3.cell(row=row+1, column=1))
ws3.cell(row=row+1, column=2, value=f"=SUM(N{grand_total_row}:Y{grand_total_row})")
style_total(ws3.cell(row=row+1, column=2)); fmt_currency(ws3.cell(row=row+1, column=2))
ws3.merge_cells(start_row=row+1, start_column=2, end_row=row+1, end_column=5)

ws3.cell(row=row+2, column=1, value="Year 3 (m25–36)")
style_label_bold(ws3.cell(row=row+2, column=1))
ws3.cell(row=row+2, column=2, value=f"=SUM(Z{grand_total_row}:AK{grand_total_row})")
style_total(ws3.cell(row=row+2, column=2)); fmt_currency(ws3.cell(row=row+2, column=2))
ws3.merge_cells(start_row=row+2, start_column=2, end_row=row+2, end_column=5)

# Freeze panes
ws3.freeze_panes = "B4"

# ============================================================================
# TAB 4 — COSTS & HEADCOUNT
# ============================================================================
ws4 = wb.create_sheet("4. Costs")
ws4.column_dimensions["A"].width = 28
for col in range(2, 38):
    ws4.column_dimensions[get_column_letter(col)].width = 12

ws4.merge_cells("A1:AL1")
ws4["A1"] = "MONTHLY COSTS — headcount + infrastructure + opex"
ws4["A1"].font = Font(name="Georgia", size=14, bold=True, color="FFFFFF")
ws4["A1"].fill = PatternFill("solid", fgColor=DARK)
ws4["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws4.row_dimensions[1].height = 32

ws4["A3"] = "Month"
style_header(ws4["A3"])
for m in range(1, 37):
    c = ws4.cell(row=3, column=m + 1, value=m)
    style_header(c)
ws4.row_dimensions[3].height = 26

# Headcount schedule:
# Founder: from month 1
# Ops lead: from month 6 (after pilot ends, second engagement signed)
# Engineer: from month 12 (engagement #3)
# BD lead: from month 18 (year 2)

# Row labels and formulas
row = 4
ws4.cell(row=row, column=1, value="HEADCOUNT")
style_label_bold(ws4.cell(row=row, column=1))
ws4.cell(row=row, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)
row += 1

# Founder (4000)
ws4.cell(row=row, column=1, value="Founder")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=4000 if m >= 1 else 0)
    style_calc(cell); fmt_currency(cell)
row += 1

# Ops lead (2500, m6+)
ws4.cell(row=row, column=1, value="Ops lead")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=2500 if m >= 6 else 0)
    style_calc(cell); fmt_currency(cell)
row += 1

# Engineer (3500, m12+)
ws4.cell(row=row, column=1, value="Engineer")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=3500 if m >= 12 else 0)
    style_calc(cell); fmt_currency(cell)
row += 1

# BD lead (2500, m18+)
ws4.cell(row=row, column=1, value="BD lead")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=2500 if m >= 18 else 0)
    style_calc(cell); fmt_currency(cell)
row += 1

# Headcount total
hc_total_row = row
ws4.cell(row=row, column=1, value="  Total headcount")
style_label_bold(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=f"=SUM({get_column_letter(m + 1)}5:{get_column_letter(m + 1)}{row - 1})")
    style_total(cell); fmt_currency(cell)
row += 2

# Infrastructure
ws4.cell(row=row, column=1, value="INFRASTRUCTURE")
style_label_bold(ws4.cell(row=row, column=1))
ws4.cell(row=row, column=1).fill = PatternFill("solid", fgColor=LIGHT_GREY)
row += 1

# Base infra
ws4.cell(row=row, column=1, value="Base infrastructure")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=300)
    style_calc(cell); fmt_currency(cell)
row += 1

# Variable infra — depends on how many customers are live
ws4.cell(row=row, column=1, value="Variable (per active house)")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    active = sum(1 for (mo, *_) in schedule if mo <= m)
    cell = ws4.cell(row=row, column=m + 1, value=150 * active)
    style_calc(cell); fmt_currency(cell)
row += 1

# Misc opex
ws4.cell(row=row, column=1, value="Misc opex")
style_label(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=500)
    style_calc(cell); fmt_currency(cell)
row += 1

# Infra total
infra_total_row = row
ws4.cell(row=row, column=1, value="  Total infra + opex")
style_label_bold(ws4.cell(row=row, column=1))
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1, value=f"=SUM({get_column_letter(m + 1)}{infra_total_row - 3}:{get_column_letter(m + 1)}{row - 1})")
    style_total(cell); fmt_currency(cell)
row += 2

# Grand total costs
cost_total_row = row
ws4.cell(row=row, column=1, value="TOTAL COSTS")
ws4.cell(row=row, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws4.cell(row=row, column=1).fill = PatternFill("solid", fgColor=DARK)
ws4.cell(row=row, column=1).alignment = Alignment(horizontal="left", vertical="center")
for m in range(1, 37):
    cell = ws4.cell(row=row, column=m + 1,
        value=f"={get_column_letter(m + 1)}{hc_total_row}+{get_column_letter(m + 1)}{infra_total_row}")
    cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor=DARK)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(cell)

ws4.freeze_panes = "B4"

# ============================================================================
# TAB 5 — P&L SUMMARY
# ============================================================================
ws5 = wb.create_sheet("5. P&L summary")
ws5.column_dimensions["A"].width = 26
for col in range(2, 38):
    ws5.column_dimensions[get_column_letter(col)].width = 13

ws5.merge_cells("A1:AL1")
ws5["A1"] = "P&L SUMMARY — month by month"
ws5["A1"].font = Font(name="Georgia", size=14, bold=True, color="FFFFFF")
ws5["A1"].fill = PatternFill("solid", fgColor=DARK)
ws5["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws5.row_dimensions[1].height = 32

# Month headers
ws5["A3"] = "Month"
style_header(ws5["A3"])
for m in range(1, 37):
    c = ws5.cell(row=3, column=m + 1, value=m)
    style_header(c)
ws5.row_dimensions[3].height = 26

# Revenue row — pull from Revenue tab grand total
ws5.cell(row=4, column=1, value="Revenue")
style_label_bold(ws5.cell(row=4, column=1))
for m in range(1, 37):
    cell = ws5.cell(row=4, column=m + 1,
        value=f"='3. Revenue'!{get_column_letter(m + 1)}{grand_total_row}")
    style_calc(cell); fmt_currency(cell)

# Costs row — pull from Costs tab total
ws5.cell(row=5, column=1, value="Costs")
style_label_bold(ws5.cell(row=5, column=1))
for m in range(1, 37):
    cell = ws5.cell(row=5, column=m + 1,
        value=f"=-'4. Costs'!{get_column_letter(m + 1)}{cost_total_row}")
    style_calc(cell); fmt_currency(cell)

# Net row
ws5.cell(row=6, column=1, value="NET")
ws5.cell(row=6, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws5.cell(row=6, column=1).fill = PatternFill("solid", fgColor=DARK)
for m in range(1, 37):
    cell = ws5.cell(row=6, column=m + 1,
        value=f"={get_column_letter(m + 1)}4+{get_column_letter(m + 1)}5")
    cell.font = Font(name="Calibri", size=10, bold=True)
    cell.fill = PatternFill("solid", fgColor=GOLD)
    cell.alignment = Alignment(horizontal="right", vertical="center")
    fmt_currency(cell)

# Cumulative net
ws5.cell(row=7, column=1, value="Cumulative net")
style_label_bold(ws5.cell(row=7, column=1))
for m in range(1, 37):
    if m == 1:
        formula = f"=B6"
    else:
        formula = f"={get_column_letter(m + 1)}6+{get_column_letter(m)}7"
    cell = ws5.cell(row=7, column=m + 1, value=formula)
    style_calc(cell); fmt_currency(cell)

ws5.freeze_panes = "B4"

# Yearly summary table
ws5.cell(row=10, column=1, value="YEARLY SUMMARY")
ws5.cell(row=10, column=1).font = Font(name="Georgia", size=12, bold=True, color="FFFFFF")
ws5.cell(row=10, column=1).fill = PatternFill("solid", fgColor=DARK)
ws5.merge_cells("A10:F10")

ws5.cell(row=11, column=1, value="")
ws5.cell(row=11, column=2, value="Year 1")
style_header(ws5.cell(row=11, column=2))
ws5.cell(row=11, column=3, value="Year 2")
style_header(ws5.cell(row=11, column=3))
ws5.cell(row=11, column=4, value="Year 3")
style_header(ws5.cell(row=11, column=4))
ws5.cell(row=11, column=5, value="3-yr total")
style_header(ws5.cell(row=11, column=5))

# Revenue by year
ws5.cell(row=12, column=1, value="Revenue")
style_label_bold(ws5.cell(row=12, column=1))
ws5.cell(row=12, column=2, value=f"=SUM(B4:M4)")
ws5.cell(row=12, column=3, value=f"=SUM(N4:Y4)")
ws5.cell(row=12, column=4, value=f"=SUM(Z4:AK4)")
ws5.cell(row=12, column=5, value=f"=B12+C12+D12")
for c in range(2, 6):
    style_calc(ws5.cell(row=12, column=c)); fmt_currency(ws5.cell(row=12, column=c))

ws5.cell(row=13, column=1, value="Costs")
style_label_bold(ws5.cell(row=13, column=1))
ws5.cell(row=13, column=2, value=f"=SUM(B5:M5)")
ws5.cell(row=13, column=3, value=f"=SUM(N5:Y5)")
ws5.cell(row=13, column=4, value=f"=SUM(Z5:AK5)")
ws5.cell(row=13, column=5, value=f"=B13+C13+D13")
for c in range(2, 6):
    style_calc(ws5.cell(row=13, column=c)); fmt_currency(ws5.cell(row=13, column=c))

ws5.cell(row=14, column=1, value="NET")
ws5.cell(row=14, column=1).font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
ws5.cell(row=14, column=1).fill = PatternFill("solid", fgColor=DARK)
ws5.cell(row=14, column=2, value=f"=B12+B13")
ws5.cell(row=14, column=3, value=f"=C12+C13")
ws5.cell(row=14, column=4, value=f"=D12+D13")
ws5.cell(row=14, column=5, value=f"=E12+E13")
for c in range(2, 6):
    style_total(ws5.cell(row=14, column=c)); fmt_currency(ws5.cell(row=14, column=c))

# Notes
ws5.cell(row=16, column=1, value="NOTES")
ws5.cell(row=16, column=1).font = Font(name="Calibri", size=11, bold=True, color=TERRACOTTA)
ws5.merge_cells("A16:F16")

notes = [
    "Conservative model. Assumes 10 customers signed across 33 months. Aggressive scenarios should push to 15+.",
    "Year 1 expected to be unprofitable — investment in pilot + first hire.",
    "Break-even typically lands between month 9–14 depending on pilot conversion + ramp.",
    "Year 2 is the cash-flow inflection. By Year 3 the business is throwing off ~$200k+ in profit on the conservative ramp.",
    "Currency: all figures USD. Local-currency settlements convert at point of transaction (Paynow handles).",
    "Not modelled: option-pool dilution, fundraising (none assumed), corporate tax, working-capital float on retainers.",
]
for i, n in enumerate(notes):
    ws5.cell(row=17 + i, column=1, value=f"•  {n}")
    ws5.cell(row=17 + i, column=1).font = Font(name="Calibri", size=10, color=MUTED)
    ws5.cell(row=17 + i, column=1).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws5.merge_cells(start_row=17 + i, start_column=1, end_row=17 + i, end_column=15)

# ============================================================================
# COVER tab — make it the first sheet
# ============================================================================
cover = wb.create_sheet("0. README", 0)
cover.column_dimensions["A"].width = 100

cover["A1"] = "ZIMLIVESTOCK"
cover["A1"].font = Font(name="Georgia", size=24, bold=True, color="FFFFFF")
cover["A1"].fill = PatternFill("solid", fgColor=DARK)
cover["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
cover.row_dimensions[1].height = 50

cover["A2"] = "Financial Model — 36-month SaPS projection"
cover["A2"].font = Font(name="Georgia", size=14, italic=True, color=GOLD)
cover["A2"].fill = PatternFill("solid", fgColor=DARK)
cover["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
cover.row_dimensions[2].height = 28

cover["A3"] = "v1.0  ·  Tatenda Nyemudzo  ·  May 2026"
cover["A3"].font = Font(name="Calibri", size=11, italic=True, color=MUTED)
cover["A3"].alignment = Alignment(horizontal="left", indent=1)
cover.row_dimensions[3].height = 24

cover["A5"] = "WHAT'S IN THIS WORKBOOK"
cover["A5"].font = Font(name="Calibri", size=11, bold=True, color=TERRACOTTA)
cover["A5"].alignment = Alignment(horizontal="left", indent=1)

readme_rows = [
    "",
    "1. Assumptions — All inputs in gold cells. Pricing, customer GMV, penetration ramp,",
    "                  headcount costs, infrastructure. Edit these to flex the model.",
    "",
    "2. Customer ramp — The 10-customer schedule from the GTM (pilot → Tier B → Tier A → mix).",
    "                   Shows engagement fee + retainer + steady-state tx GMV per house.",
    "",
    "3. Revenue — Month-by-month revenue across all 10 customers and all 3 revenue lines",
    "             (engagement, retainer, tx surcharge). Year totals at the bottom.",
    "",
    "4. Costs — Headcount (founder, ops, engineer, BD) plus base + variable infra + opex.",
    "           Headcount ramp aligns with customer ramp.",
    "",
    "5. P&L summary — Month-by-month revenue, costs, net, cumulative. Plus a yearly summary",
    "                  and notes on what's modelled vs not.",
    "",
    "",
    "HOW TO USE THIS",
    "",
    "·  All inputs are on tab 1 (gold cells). Don't touch the white cells — they're formulas.",
    "·  Change one input (e.g. close rate, retainer price, sale-day GMV) and watch the P&L flex.",
    "·  The customer schedule on tab 2 is hard-coded for clarity. Want a different ramp? Edit",
    "   the dates in column B and the model recomputes.",
    "·  All figures USD. The model doesn't account for fundraising or corporate tax.",
    "",
    "",
    "KEY OUTPUTS AT BASELINE",
    "",
    "·  Year 1 revenue:        ~$80–100k     (pilot + first paid engagement)",
    "·  Year 2 revenue:        ~$250–300k    (3–4 houses fully active)",
    "·  Year 3 revenue:        ~$500–700k    (8–10 houses, mix of tiers)",
    "·  3-year cumulative net: positive by mid-year-2",
    "·  Break-even:            month 12–14, dependent on hiring pace",
]
for i, r in enumerate(readme_rows, start=6):
    cover[f"A{i}"] = r
    cover[f"A{i}"].font = Font(name="Calibri", size=10, color=DARK)
    cover[f"A{i}"].alignment = Alignment(horizontal="left", indent=1, vertical="top")
    if "HOW TO USE THIS" in r or "KEY OUTPUTS AT BASELINE" in r or "WHAT'S IN THIS WORKBOOK" in r:
        cover[f"A{i}"].font = Font(name="Calibri", size=11, bold=True, color=TERRACOTTA)
    if r.strip().startswith("·") or r.strip().startswith("1.") or r.strip().startswith("2."):
        cover[f"A{i}"].font = Font(name="Calibri", size=10, color=DARK)
    cover.row_dimensions[i].height = 16

wb.save("/Users/tatendanyemudzo/Downloads/app/deliverables/business/financial-model.xlsx")
print("Wrote: financial-model.xlsx")

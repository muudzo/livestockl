# BillPay Use Cases for ZimLivestock

> How ZimLivestock can integrate Paynow's BillPay (106+ billers) to become the financial hub for livestock farmers.
> URL: https://billpay.paynow.co.zw
> Vendor API contact: developers@paynow.co.zw

---

## BillPay Overview

BillPay is a **bill payment API gateway** by Softwarehouse / Webdev Group (same company as Paynow). It connects **vendors** (apps like us) to **billers** (institutions that accept payments) through a single API.

**How it works for us:**
1. We register as a BillPay **vendor**
2. Integrate once with the BillPay API
3. Our app can now accept payments for any of 106+ billers
4. We earn **commission** on every bill paid through us
5. Auto-configuration endpoint gives us biller logos, field definitions, descriptions — no manual setup per biller

---

## Complete Biller Directory (106+ Billers)

### Universities & Colleges (26 billers)

| Biller | Code | Relevance to farmers |
|--------|------|---------------------|
| University of Zimbabwe | UZ | Farmers paying children's tuition |
| Midlands State University | MSU | Major agricultural university |
| Great Zimbabwe University | GZU | Near Masvingo (livestock hub) |
| Bindura University of Science Education | BUSE | Agricultural science programs |
| Chinhoyi University of Technology | CUT | Ag-tech programs |
| National University of Science & Technology | NUST | Bulawayo — cattle country |
| Lupane State University | LSU | Matabeleland — cattle heartland |
| Gwanda State University | GSU | Matabeleland South |
| Marondera University | MUAST | Agricultural sciences |
| Harare Institute of Technology | HIT | |
| Reformed Church University | RCU | |
| Zimbabwe Open University | ZOU | Distance learning — accessible for farmers |
| Solusi University | SOLU | |
| Catholic University of Zimbabwe | CUZ | |
| Africa University | AU | |
| Manicaland State University | MSUAS | |
| Esigodini Agricultural College | EAC | **Directly agricultural** |
| Zimbabwe School of Mines | ZSM | |
| Bulawayo Polytechnic | BYOP | |
| Kwekwe Polytechnic | KP | |
| Masvingo Polytechnic College | MP | |
| Claremont Business School | CBS | |
| Mkoba Teacher's College | MTC | |
| Arundel School | | |
| Kriste Mambo High School | KM | |
| Mount St. Mary's High School | MSM | |

### Municipal Councils (17 billers)

| Biller | Code | Location |
|--------|------|----------|
| City of Harare | COH | Capital — largest market |
| Bulawayo City Council | BCC | 2nd largest city, cattle heartland |
| City of Mutare | MUT | Eastern Highlands |
| City of Masvingo | MAS | Near Great Zimbabwe, major auction area |
| Gweru City Council | GWE | Midlands — central livestock region |
| Bindura Municipality | BIN | Mashonaland Central |
| Municipality of Chinhoyi | CHI | Mashonaland West |
| Victoria Falls Municipality | VFM | Tourism + farming area |
| Municipality of Beitbridge | BMC | Border town, cattle trading |
| Norton Town Council | NTC | Near Harare |
| Chegutu City Council | CHE | Mashonaland West |
| Chipinge Town Council | CTC | Eastern border |
| Chiredzi Town Council | CHTC | Lowveld — ranching area |
| Kariba Municipality | KAR | |
| Rusape Town Council | RUS | |
| Ruwa Local Board/Council | RTC/RLB | Near Harare |

### Medical Aid & Healthcare (7 billers)

| Biller | Code |
|--------|------|
| CIMAS | CIMAS |
| First Mutual Health | FMH |
| CellMed | CELMED |
| Eternal Peace Medical Aid | EPMA |
| Ultra-Med Health Care | ULT |
| Budget Health | BUD |
| CIMAS Group Payments | CIMAS_GRP |

### Insurance & Funeral (3 billers)

| Biller | Code |
|--------|------|
| Nyaradzo Life Assurance | NLAC |
| Doves Funeral & Life Assurance | DOVES |
| Old Mutual Funeral & Life Assurance | OMLAC |

### Utilities & Telecoms (8 billers)

| Biller | Code |
|--------|------|
| ZESA Pre-paid Electricity | ZETDC |
| TelOne ADSL/FTTH | TOAD |
| TelOne Blaze LTE | TOBL |
| Liquid/ZOL Bill Payment | ZOL_BILL |
| Liquid/ZOL Pay As You Go | ZOL_PAYG |
| Liquid/ZOL VOIP | ZOL_VOIP |
| Liquid/ZOL WiFi | ZOL_WIFI |
| DSTV | DSTV |

### Fuel

| Biller | Code |
|--------|------|
| TotalEnergies Fuel Card | TOTAL |

### Media

| Biller | Code |
|--------|------|
| Associated Newspapers of Zimbabwe | ANZ |
| Zimpapers E-Paper | EPAPER |

### Professional Bodies (5 billers)

| Biller | Code |
|--------|------|
| Institute of Chartered Accountants | ICAZ |
| Institute of People Management | IPMZ |
| Nurses Council of Zimbabwe | NCZ |
| Medical Lab & Clinical Sci Council | MLCSC |
| Management Training Bureau | MTB |

### Other Services

| Biller | Code |
|--------|------|
| Paynow Airtime | AIRTIME |
| Paynow Vouchers | EVD |
| Pink Lotto | PINKLOTTO |
| Premier Cash | PRC |
| Econet SmartSuite Data | SMARTBIZ |
| Procurement Regulatory Authority | PRAZ |
| Marketers Association of Zimbabwe | MAZ |
| Zimconserve | ZIMC |

### Charities & Churches

| Biller | Code |
|--------|------|
| Celebration Church International | CCI |
| Amen Kids | AMK |
| Living in Love Charity Trust | LCT |
| Matifadza Hydrocephalus Care Trust | MHCT |
| Emergency Help Group | EHG |
| Kidzcan | KIDZ |

---

## Use Cases for ZimLivestock

### Use Case 1: "Sell Cattle, Pay School Fees" — The Emotional Hook

**The reality:** Most livestock sales in Zimbabwe fund education. A farmer sells a bull specifically to pay university tuition for their child. Today, they sell at auction → cash → drive to bank → queue → transfer to university. We collapse this into one flow.

**Implementation:**
```
Farmer sells bull for US$1,200
  → Disbursement API pays US$1,140 to farmer's EcoCash
  → App shows: "Pay a bill with your earnings?"
  → Farmer selects: "University of Zimbabwe (UZ)"
  → Enters student registration number
  → BillPay API verifies student account
  → Farmer confirms: "Pay US$800 to UZ for Tendai Moyo"
  → Payment processed instantly
  → Farmer keeps US$340 in EcoCash
  → Receipt SMS sent via txt.co.zw
```

**SEED pitch:** *"On ZimLivestock, a farmer can sell a bull and pay their child's university fees in the same transaction — without leaving the app, without queuing at a bank, without driving to campus."*

**Billers this serves:** UZ, MSU, GZU, NUST, BUSE, CUT, and all 26 education institutions.

---

### Use Case 2: "Pay Your Council Rates from Auction Earnings"

**The pain:** Farmers owe municipal rates (water, refuse, property) to their local council. They often default because paying means a trip to town + queuing. After selling livestock, the money goes to immediate needs and council bills get forgotten.

**Implementation:**
```
After sale completes:
  → App notification: "You have outstanding council rates?"
  → Farmer selects city: "Masvingo" (MAS)
  → Enters account number
  → BillPay verifies balance owed
  → Farmer pays US$45 council rates
  → Done. No queue. No trip to town.
```

**Billers this serves:** All 17 municipal councils — Harare (COH), Bulawayo (BCC), Mutare (MUT), Masvingo (MAS), Gweru (GWE), etc.

**Strategic angle:** If we help councils collect rates digitally from farmers, councils become allies in promoting ZimLivestock. Potential partnership: "Pay council rates through ZimLivestock" posters in council offices.

---

### Use Case 3: "Buy ZESA Before You Get Home"

**The reality:** Rural electrification in Zimbabwe uses prepaid ZESA tokens. Farmers often sell livestock and need to buy electricity on the way home. Currently: sell at auction → stop at ZESA agent → queue → buy token.

**Implementation:**
```
After sale completes (or anytime):
  → "Buy ZESA" button in app
  → Enter meter number
  → Select amount: US$10 / US$20 / US$50 / Custom
  → Pay via EcoCash balance
  → ZESA token delivered via SMS
  → Farmer enters token at home meter
```

**Biller:** ZESA Pre-paid Electricity (ZETDC)

**Why this matters:** It's a daily need. If farmers can buy ZESA through our app, they open it every week — not just when selling livestock. **Daily engagement from a monthly-transaction business.**

---

### Use Case 4: Medical Aid Payments

**The pain:** Livestock farmers need medical aid but payments lapse because of access friction. A farmer sells animals 2-3 times per year but medical aid requires monthly payments.

**Implementation:**
```
After sale:
  → "Set up recurring bill payment?"
  → Farmer selects: CIMAS / First Mutual / CellMed
  → Enters membership number
  → Sets up: "Pay US$35/month from my EcoCash"
  → Tokenized card charges monthly (via Gateway tokenization)
  → OR: Reminder SMS each month: "Your CIMAS payment of US$35 is due. Reply PAY to confirm."
```

**Billers:** CIMAS, First Mutual Health (FMH), CellMed, Ultra-Med, Budget Health, Eternal Peace

**Strategic angle:** We become the financial planner for livestock farmers — not just a marketplace.

---

### Use Case 5: Funeral Cover / Life Insurance

**The cultural context:** In Zimbabwe, funeral insurance is nearly universal — it's a deep cultural priority. Nyaradzo and Doves are household names. Farmers pay monthly premiums but often lapse.

**Implementation:**
```
After sale:
  → "Keep your Nyaradzo policy active?"
  → Enter policy number
  → Pay US$15 premium
  → Done.
```

**Billers:** Nyaradzo (NLAC), Doves (DOVES), Old Mutual (OMLAC)

**Marketing hook:** *"Sell your cattle. Protect your family."*

---

### Use Case 6: DSTV / Internet Top-Up

**Why:** After a good sale, farmers spend on entertainment and connectivity. DSTV is huge in rural Zimbabwe.

**Implementation:**
```
"Top up your DSTV?" → Enter smartcard number → Pay
"Buy TelOne data?" → Enter account → Pay
"Buy ZOL WiFi?" → Enter account → Pay
```

**Billers:** DSTV, TelOne ADSL/FTTH (TOAD), TelOne Blaze LTE (TOBL), ZOL Bill/PayG/WiFi

---

### Use Case 7: Fuel Card Top-Up for Transport

**The connection:** After buying livestock, the buyer needs fuel for transport. TotalEnergies fuel cards are common for truckers.

**Implementation:**
```
Buyer arranges transport → Driver needs fuel
  → "Top up driver's fuel card?"
  → TotalEnergies card number
  → US$50 fuel top-up
  → Driver fuels up, picks up cattle
```

**Biller:** TotalEnergies Fuel Card (TOTAL)

**Strategic angle:** Closes the transport loop. Buyer pays for animal + pays transport + pays fuel — all in ZimLivestock.

---

### Use Case 8: Livestock Insurance Premium

**The gap:** Livestock insurance exists in Zimbabwe but uptake is low because payment friction is high. If we surface insurance payments after a purchase, we can increase uptake.

**Implementation:**
```
Buyer purchases bull for US$1,200
  → "Insure your purchase?"
  → Links to insurance biller
  → Pay premium via BillPay
  → Insurance confirmation sent via SMS
```

**Note:** We'd need to confirm which insurance billers in the list cover livestock. If none do, this is a partnership opportunity.

---

### Use Case 9: Professional Fees for Livestock Agents

**Context:** Auction agents and livestock dealers may need to pay professional body fees (ICAZ for accountants who manage farm finances, IPMZ for farm managers).

**Billers:** ICAZ, IPMZ, PRAZ, MTB

---

### Use Case 10: Charitable Donations After a Good Sale

**The opportunity:** After a profitable sale, show: "Support a cause?"

**Billers:** Kidzcan (children's cancer), Amen Kids, Emergency Help Group, Matifadza Trust

**Marketing:** *"Your Hereford Bull sold for US$1,500. Make a difference — US$5 to Kidzcan helps a child with cancer."*

---

## The "Financial Hub" Dashboard

```
┌─────────────────────────────────────────────┐
│  MY MONEY                    Balance: US$340 │
├─────────────────────────────────────────────┤
│                                              │
│  💰 Recent Sale                              │
│  Hereford Bull — US$1,200                   │
│  Payout: US$1,140 → EcoCash ✅              │
│                                              │
├─────────────────────────────────────────────┤
│  PAY BILLS                                   │
│                                              │
│  ⚡ ZESA Electricity          [Pay →]        │
│  🏫 School Fees               [Pay →]        │
│  🏥 Medical Aid (CIMAS)       [Pay →]        │
│  🏛️ Council Rates             [Pay →]        │
│  📺 DSTV                      [Pay →]        │
│  ⛽ Fuel Card                  [Pay →]        │
│  🛡️ Insurance                 [Pay →]        │
│  ➕ More (106 billers)         [Browse →]    │
│                                              │
├─────────────────────────────────────────────┤
│  QUICK ACTIONS                               │
│                                              │
│  📱 Buy Airtime     💵 Send Money            │
│  📊 Market Prices   🐄 List Animal           │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Revenue Model from BillPay

| Revenue stream | How | Estimated per transaction |
|---------------|-----|--------------------------|
| BillPay vendor commission | Paynow pays us % on each bill payment | TBD (ask Paynow) |
| Increased engagement | Farmers open app for bills, not just livestock | Indirect — higher DAU |
| Cross-sell livestock services | Bill payers see active auctions | Indirect — more bids |
| Data insights | Know which farmers need school fees → offer livestock loans | Future revenue |
| Partnership referrals | Councils promote us for rate collection → new sellers | Growth channel |

---

## Implementation Plan

| Phase | What | Effort |
|-------|------|--------|
| **Phase 1:** Register as BillPay vendor | Email developers@paynow.co.zw | 1 day (wait for approval) |
| **Phase 2:** Integrate BillPay API | Auto-config endpoint pulls biller logos/fields | 2-3 days |
| **Phase 3:** Add "Pay Bills" tab to seller dashboard | UI for top 5 billers (ZESA, school, council, medical, DSTV) | 1-2 days |
| **Phase 4:** Post-sale bill payment prompt | "Pay a bill with your earnings?" after disbursement | 1 day |
| **Phase 5:** Full biller directory (106+) | Searchable list with auto-config artwork | 1 day |

**Total: ~1 week from API access to full integration.**

---

## Open Questions

1. **Vendor commission rate** — What % do vendors earn per bill payment?
2. **API documentation** — Is there a Swagger/OpenAPI spec like the Disbursement API?
3. **Auto-config endpoint** — What data does it return? (logos, field definitions, validation rules?)
4. **Sandbox** — Is there a test environment?
5. **Livestock insurance** — Are any insurance billers on BillPay relevant to livestock coverage?

---

*Research compiled: March 23, 2026*
*Contact: developers@paynow.co.zw (vendor integration) / support@paynow.co.zw (biller onboarding)*

Sources:
- [BillPay Home](https://billpay.paynow.co.zw/)
- [BillPay Biller Directory](https://billpay.paynow.co.zw/Home/Billers)
- [BillPay Vendor App](https://play.google.com/store/apps/details?id=zw.co.paynow.billpay.bpv)
- [Paynow Business](https://www.paynow.co.zw/home/businesshome)

# Competitive Positioning — One-Pager

> **Status:** v1.0  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026
> **Audience:** auction-house owner in a sales meeting (founder uses this to walk through the landscape — but the doc is tight enough that the owner can read it cold)
> **Companions:** [`business-case.md`](business-case.md) · [`gtm-strategy.md`](gtm-strategy.md) · [`pilot-proposal.md`](pilot-proposal.md)

---

## 1. The one line

> **"The only digital floor built for *your* floor — with the settlement layer the others forgot."**

Sub-line for the bookkeeper: *Branded under your auction house's name, settled through Paynow, live on five channels (web/PWA, WhatsApp, USSD, BillPay, Facebook Messenger) — your isolated tenant, onboarded in minutes, not built bespoke.*

---

## 2. Where we sit in the landscape

The two axes that matter to an auction-house owner are **"built for Zim"** and **"settles the money"**. Every alternative on the board either wasn't built for the rails his buyers actually use, or it surfaces listings but leaves the payout to manual transfer and trust. We are the only option in the top-right quadrant — the one with the money layer wired in.

```
                          BUILT FOR ZIM  (USSD, Shona,
                                          constable workflow, Paynow)
                                  ▲
                                  │
                                  │
      ┌──────────────────────┐    │
      │ Physical-only        │    │           ┌──────────────────┐
      │ auction house        │    │           │                  │
      │ (status quo)         │    │           │   ZimLivestock   │
      └──────────────────────┘    │           │  (B2B platform)  │
                                  │           │                  │
         ┌──────────────────┐     │           └──────────────────┘
         │  WhatsApp groups │     │
         └──────────────────┘     │
                                  │
        ◄─────────────────────────┼─────────────────────────────►
        NO SETTLEMENT LAYER                   SETTLEMENT WIRED IN
                                  │
         ┌──────────────────┐     │
         │ Facebook /       │     │
         │ Classifieds      │     │
         └──────────────────┘     │
                                  │
      ┌──────────────────┐        │
      │ Auctions Plus AU │        │
      │ LMA NZ           │        │
      │ (foreign SaaS)   │        │
      └──────────────────┘        │
                                  ▼
                       NOT BUILT FOR ZIM
                       (card rails, AUD/NZD,
                        English-only, no constable)
```

**Read it like this.** The status-quo cluster sits *left of the axis* — listings without settlement. The owner watches sub-US$500 trades leak to WhatsApp groups (top-left) and Facebook (bottom-left), where the money still moves by hand and trust. The foreign SaaS platforms have a settlement layer, but it clears AUD/NZD cards, not the rails his buyers use (bottom-left). The one piece of the map that doesn't yet exist for him is *digital-and-Zimbabwean-and-actually-settles-the-money*. That's the quadrant we occupy alone — and the wizard that onboards his house as an isolated tenant in minutes is what lets us occupy it at scale across the ~40–60-house market, not one bespoke build at a time.

---

## 3. Detailed comparison

| Dimension | **ZimLivestock (B2B platform)** | WhatsApp groups | Physical-only (status quo) | Facebook / Classifieds | Auctions Plus AU / LMA NZ |
|---|---|---|---|---|---|
| Settlement built in | Yes — Paynow spine (USSD + card) | No — manual transfer | Cash on the day | No | Yes (AUD / NZD cards) |
| Escrow for buyer trust | Yes — Bisafe | No | US$1,000 cash deposit gate | No | Limited |
| Police-clearance / constable workflow | Yes — digital chain of custody | No | Yes — on-site, paper | No | N/A (different jurisdiction) |
| Branded under house's name | Yes — house's colours, logo, domain | N/A | Yes (their floor) | No — Facebook brand | No — Auctions Plus brand |
| Channels the buyer can reach you on | Five — web/PWA, WhatsApp, USSD, BillPay, Messenger | One — the chat group | One — the floor | One — the timeline | Web only |
| What it costs the house to use | Onboarding fee + monthly subscription + 0.75% take on settled GMV *(our fees)* | Free | n/a — the house *charges* 12% combined (5% seller / 7% buyer) | Free / listing fees | Subscription + per-tx |
| Reach beyond physical floor | Yes — 24/7 listings, remote bidders, diaspora | Group members only | Saturday attendees only | Wide but undifferentiated | Wide — but wrong audience for Zim |
| USSD payment rail | Yes — via Paynow spine | No | N/A | No | No |
| Shona / local language | Roadmap — UI strings Q3 2026; copy-deck workflow already supports both | Yes (it's just chat) | Yes (it's a person) | Partial | No |
| Audit trail for inspectors | Yes — per-animal, timestamped | None | Paper | None | Yes (foreign jurisdiction) |
| Time to go live | ~6-min self-serve wizard → admin approval | Minutes | Already running | Hours | Weeks + payment-rail blocker |
| Real cost to owner | Layered, transparent | Zero direct cost, large indirect cost | Status-quo opex | Zero direct, large indirect | Multi-currency, FX exposure |

Read row-by-row, no alternative is in front on more than two dimensions. The honest concessions are on the **time-to-go-live** row (WhatsApp is instant; even our self-serve wizard waits on an admin approval) and the **direct cost** row (WhatsApp and Facebook are free at point of use). Own those — see § 4 and § 6.

---

## 4. Why this position is defensible

Four reasons we don't get out-positioned, with the receipt for each.

**1. We sat in the shed.**
Foreign platforms were built for paddock-side cattle sales in NSW. They don't know that the constable stamps each animal's brand, that the deposit gate is US$1,000 cash, that the auctioneer calls in Shona-English code-switch. We do — because we sat through a full sale day in March 2026 and documented it.
*Evidence: 8 findings in the field-research deliverable, 4 of which became load-bearing product decisions.*

**2. We are the money layer the others forgot.**
Three of the four national livestock-digitization initiatives have *no settlement layer* — they catalogue animals and stop at the handshake. Paynow is wired into ours, not promised. Four Paynow products are integrated and demoed end-to-end: Core Express Checkout, BillPay biller-inbound (coded this week), TXT.co.zw SMS, and the planned Bisafe escrow hook. Competitors talking about "EcoCash support" mean a roadmap line. We mean a webhook receipt.
*Evidence: 8 May 2026 live demo to Paynow leadership; biller-inbound API merged on the same day.*

**3. The wizard makes scale cheap — five channels make us hard to route around.**
Every alternative reaches the buyer on one surface: a chat group, a timeline, the Saturday floor. We meet him on five — web/PWA, WhatsApp, USSD, BillPay-as-biller, Facebook Messenger — all settling through the same Paynow spine. And onboarding the next house isn't a bespoke engineering build: a self-serve wizard (/operators → admin approval) stands up an RLS-isolated tenant in about six minutes, no SQL. That's what lets one small team take roughly a third of the ~40–60-house market without a per-house human deployment behind each contract.
*Evidence: business case § 6 — platform economics; gtm-strategy.md § onboarding wizard.*

**4. The relationship moat compounds faster than the code moat.**
An auction-house owner trusts the founder he can call on a Saturday. A foreign competitor would need 18 months to build the introductions we already have — and an anchors-first land means the early Tier-A houses are referencing us to their peers before anyone else has a Zimbabwean settlement rail to point to. Software is copyable; the Saturday visits aren't.
*Evidence: GTM strategy § 4 — founder-led BD, Saturday floor visits, ZLPA conference, Paynow channel partnership.*

---

## 5. If you don't pick us

Here's what the status quo costs you, written so your bookkeeper can underline it:

- **12% in combined house fees across buyer and seller** (5% from the seller, 7% from the buyer) are *already* steep — and the marginal trade under US$500 is leaving the floor for WhatsApp because of it. You can't cut the fee without bleeding the operation; you can only widen the funnel.
- **Capped to weekend attendance.** The constable can clear what the constable can clear in one day. No amount of marketing changes that ceiling if there's no digital surface.
- **Cash float and security risk every Saturday.** Bisafe and Paynow settlement aren't just convenient — they're an order-of-magnitude reduction in the risk you carry between the floor and the bank.
- **No remarketing list.** Today, every buyer who walks out of your floor is anonymous to you next Saturday. WhatsApp groups capture them — but they're *the group admin's* customers, not yours.
- **No defensible answer when a younger auction house digitises.** The first auction house in your region to go digital under their own brand becomes the destination for the diaspora and salaried buyers. Being the second one to digitise is a cheaper price you don't want to pay.

The status quo isn't free. It's just *invisible*.

---

## 6. How to use this doc in a sales meeting

For the founder / BD in the room:

1. **Don't pull this out first.** Lead with the pilot proposal and the field research. Pull this out only after the customer asks "what about WhatsApp" or "what about [foreign platform]" — competitive questions earn the competitive doc, not the other way around.

2. **Point, don't read.** Slide it across the table, point at the 2×2, and let them read. Owners read faster than you can recite. Talking over them while they're reading is the easiest way to lose the room.

3. **Concede where they're right.** WhatsApp *is* faster to start using. Facebook *does* have more reach. Foreign platforms *are* more mature products. The doc concedes those in print — back it up out loud. Conceding the small thing is what makes the owner believe you on the big one.

4. **What not to do.** Don't disparage WhatsApp — half the owner's biggest buyers are in three groups he won't leave. Don't claim parity with Auctions Plus — we don't compete with them and pretending we do invites scrutiny we don't need. Don't dwell. This is a one-pager because the conversation is one minute. Move to the pilot proposal as soon as the question is answered.

---

*One page in spirit. Print it on one sheet. Fold it into the pilot proposal. Walk into the floor on Saturday.*

# Competitive Positioning — One-Pager

> **Status:** v1.0  ·  **Author:** Tatenda Nyemudzo  ·  **Date:** May 2026
> **Audience:** auction-house owner in a sales meeting (founder uses this to walk through the landscape — but the doc is tight enough that the owner can read it cold)
> **Companions:** [`business-case.md`](business-case.md) · [`gtm-strategy.md`](gtm-strategy.md) · [`pilot-proposal.md`](pilot-proposal.md)

---

## 1. The one line

> **"The only digital floor built for *your* floor — and run by people, not a login screen."**

Sub-line for the bookkeeper: *Branded under your auction house's name, integrated with Paynow, operated on your behalf as a professional service.*

---

## 2. Where we sit in the landscape

The two axes that matter to an auction-house owner are **"who runs it"** and **"built for Zim"**. Every alternative on the board either makes the owner do the work, or wasn't built for the rails his buyers actually use. We are the only option in the top-right quadrant.

```
                          BUILT FOR ZIM  (EcoCash USSD, Shona,
                                          constable workflow, Paynow)
                                  ▲
                                  │
                                  │
      ┌──────────────────────┐    │
      │ Physical-only        │    │           ┌──────────────────┐
      │ auction house        │    │           │                  │
      │ (status quo)         │    │           │   ZimLivestock   │
      └──────────────────────┘    │           │    (SaPS)        │
                                  │           │                  │
         ┌──────────────────┐     │           └──────────────────┘
         │  WhatsApp groups │     │
         └──────────────────┘     │
                                  │
        ◄─────────────────────────┼─────────────────────────────►
        OWNER OPERATES IT                       WE OPERATE IT
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

**Read it like this.** The status-quo cluster sits *left of the axis* — the owner runs the physical floor himself, watches sub-US$500 trades leak to WhatsApp groups (top-left) and Facebook (bottom-left), and the foreign SaaS platforms ask him to self-serve on a system not built for his rails (bottom-left). Every option to his left requires him to operate it. The only piece of the map that doesn't yet exist for him is *digital-and-Zimbabwean-and-run-by-someone-else*. That's the quadrant we occupy alone.

---

## 3. Detailed comparison

| Dimension | **ZimLivestock (SaPS)** | WhatsApp groups | Physical-only (status quo) | Facebook / Classifieds | Auctions Plus AU / LMA NZ |
|---|---|---|---|---|---|
| Settlement built in | Yes — Paynow + EcoCash USSD | No — manual transfer | Cash on the day | No | Yes (AUD / NZD cards) |
| Escrow for buyer trust | Yes — Bisafe | No | US$1,000 cash deposit gate | No | Limited |
| Police-clearance / constable workflow | Yes — digital chain of custody | No | Yes — on-site, paper | No | N/A (different jurisdiction) |
| Branded under house's name | Yes — house's colours, logo, domain | N/A | Yes (their floor) | No — Facebook brand | No — Auctions Plus brand |
| Who operates it | We do — managed service | Owner / admin | Owner | Owner | Owner self-serves on their platform |
| What it costs the house to use | Engagement + retainer + 0.75% surcharge *(our fees)* | Free | n/a — the house *charges* 12% combined (5% seller / 7% buyer) | Free / listing fees | Subscription + per-tx |
| Reach beyond physical floor | Yes — 24/7 listings, remote bidders, diaspora | Group members only | Saturday attendees only | Wide but undifferentiated | Wide — but wrong audience for Zim |
| EcoCash USSD integration | Yes — primary rail | No | N/A | No | No |
| Shona / local language | Roadmap — UI strings Q3 2026; copy-deck workflow already supports both | Yes (it's just chat) | Yes (it's a person) | Partial | No |
| Audit trail for inspectors | Yes — per-animal, timestamped | None | Paper | None | Yes (foreign jurisdiction) |
| Time to start using | 4–6 weeks deployment | Minutes | Already running | Hours | Weeks + payment-rail blocker |
| Real cost to owner | Layered, transparent | Zero direct cost, large indirect cost | Status-quo opex | Zero direct, large indirect | Multi-currency, FX exposure |

Read row-by-row, no alternative is in front on more than two dimensions. The honest concessions are on the **time-to-start** row (WhatsApp wins) and **direct cost** row (WhatsApp and Facebook are free at point of use). Own those — see § 4 and § 6.

---

## 4. Why this position is defensible

Four reasons we don't get out-positioned, with the receipt for each.

**1. We sat in the shed.**
Foreign platforms were built for paddock-side cattle sales in NSW. They don't know that the constable stamps each animal's brand, that the deposit gate is US$1,000 cash, that the auctioneer calls in Shona-English code-switch. We do — because we sat through a full sale day in March 2026 and documented it.
*Evidence: 8 findings in the field-research deliverable, 4 of which became load-bearing product decisions.*

**2. Paynow is wired in, not promised.**
Four Paynow products are already integrated and demoed end-to-end: Core Express Checkout, BillPay biller-inbound (coded this week), TXT.co.zw SMS, and the planned Bisafe escrow hook. Competitors talking about "EcoCash support" mean a roadmap line. We mean a webhook receipt.
*Evidence: 8 May 2026 live demo to Paynow leadership; biller-inbound API merged on the same day.*

**3. We run it. Nobody else offers to.**
Every alternative — WhatsApp, Facebook, foreign SaaS — hands the owner a tool and walks away. We hand the owner a *team*. That moat exists because nobody else in this segment thinks the unit economics work for a managed service. We think they do, because our research shows a single Tier-A house yields ~$35k/year recurring, and a managed service is the only way to land that contract.
*Evidence: business case § 6 — SaPS unit economics. Pilot proposal includes named operations lead.*

**4. The relationship moat compounds faster than the code moat.**
An auction-house owner trusts the founder he can call on a Saturday. He doesn't trust a SaaS dashboard. A foreign competitor would need 18 months to build the introductions we already have — and by then the first three Tier-A houses are referencing us to their peers. Software is copyable; the Saturday visits aren't.
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

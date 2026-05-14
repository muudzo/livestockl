# ZimLivestock WhatsApp bot

Demo-grade WhatsApp bot that lets a seller list an animal from inside WhatsApp.
Built on [`whatsapp-web.js`](https://wwebjs.dev/) — free, no Meta business
verification needed, but technically violates WhatsApp's ToS. **Do not bind
to a phone number you care about.** Use a sacrificial SIM.

Currently bound to **0773819300** (the same number that receives auction-sold
SMS in our demo seed).

## What it does

A seller sends `list` to the bot phone. The bot walks them through 5 steps:

| Step | Bot asks | Seller sends |
|------|----------|--------------|
| 1 | Photo of the animal | Photo (any image) |
| 2 | Breed? | e.g. "Brahman" |
| 3 | Weight in kg? | e.g. "480" |
| 4 | Starting price (USD)? | e.g. "250" |
| 5 | Confirm draft | YES / NO |

On YES → the bot inserts into `livestock_items` (default tenant), uploads the
photo to Supabase Storage, and replies with the live listing URL.

At any step, the seller can send `cancel` to reset.

## Architecture

```
WhatsApp seller  ─▶  Bot phone (0773819300, WhatsApp installed)
                          │
                          │ whatsapp-web.js (Puppeteer + Chromium)
                          ▼
                   Node service on Mac mini
                          │
                          │ service-role key
                          ▼
                       Supabase
                          ├──  livestock_items  (the listing)
                          ├──  livestock-images storage  (the photo)
                          ├──  wa_sessions  (conversation state)
                          └──  wa_message_log  (audit)
```

No Edge Function, no relay. The bot talks straight to Supabase. Simpler to
debug, fewer moving parts. If we ever productionise this, the right move is
to flip to Meta Cloud API + a `whatsapp-inbound` Edge Function (see panel ask
#6 plan).

## Setup on the Mac mini

```bash
cd ~/zimlivestock/whatsapp-bot
cp .env.example .env
# fill in SUPABASE_SERVICE_ROLE_KEY at minimum
npm install
node bot.js
```

First run prints a QR code in the terminal. On the bot phone (0773819300):

1. Open WhatsApp
2. Settings → Linked Devices → Link a Device
3. Scan the QR code shown in the terminal

Session is saved to `./.wwebjs_auth/` — subsequent restarts skip the QR.

Once you see `✓ bot ready`, the bot is listening. Test from any WhatsApp
account by sending "list" to 0773819300.

## Running it as a service

For demo day, the simplest path is to leave it running in a `tmux` session:

```bash
tmux new -s wabot
cd ~/zimlivestock/whatsapp-bot
node bot.js
# Ctrl-b d to detach
# tmux attach -t wabot to come back
```

For long-running uptime, use `pm2` or `launchd` — the bot calls `process.exit(1)`
on disconnect so a supervisor can restart it cleanly.

```bash
npm install -g pm2
pm2 start bot.js --name zimlivestock-wabot
pm2 logs zimlivestock-wabot
pm2 save && pm2 startup
```

## Prerequisites in Supabase

Before the bot can do anything useful, the database needs:

1. **Migration applied**: `supabase/migrations/20260514120000_wa_sessions.sql`
   (creates `wa_sessions` and `wa_message_log`)
2. **Storage bucket exists**: `livestock-images` public bucket (already exists
   in the project, since the web app uploads photos to it)
3. **A default tenant**: `tenants.slug = 'zimlivestock-demo'` (from the SaPS
   pivot migration)
4. **A registered seller**: at least one row in `profiles` with the phone
   number you'll send "list" from

## Failure modes worth knowing about

- **WhatsApp bans the bot number** — possible, rare for low-volume demo use.
  Mitigation: don't blast messages, don't add it to groups, don't use it as a
  marketing channel.
- **Mac mini reboots** — session persists in `.wwebjs_auth/` but the Node
  process needs to restart. Use `pm2 startup` or a `launchd` plist.
- **Chromium crashes** — happens. The bot exits and `pm2` restarts it.
- **Photo upload fails (storage quota / RLS)** — the bot replies "Couldn't
  save that photo" and stays in `awaiting_photo` state so the seller can
  retry without restarting the flow.

## What this does NOT do (deliberately)

- Receive bids — only listings. Bidding stays on the web app for now.
- Notify on auction events — the existing TXT.co.zw SMS path covers that.
- Send unsolicited messages — bot only replies to inbound messages.
- Handle group chats — explicitly ignored.

## Production path (after demo)

If this gets greenlit beyond the demo, the migration plan is:

1. Move from `whatsapp-web.js` (ToS-violating, single-number) → **Meta Cloud
   API** (official, free tier, multi-conversation).
2. Flip the inbound flow from a local Node process → a Supabase Edge
   Function `whatsapp-inbound` that Meta hits as a webhook.
3. Same state machine, same `wa_sessions` table — only the transport changes.
4. Add the 3 capabilities the v1 plan held back: notifications, bidding, payment.

The state machine code in `bot.js` would port to a Deno Edge Function with
minimal changes.

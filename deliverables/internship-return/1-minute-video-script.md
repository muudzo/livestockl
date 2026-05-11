# 1-Minute Internship Video — Script & Shot List

**Brief:** 60-second video summarising the internship. Submit alongside the final report at https://bit.ly/handinCMDinterns.

**Format:** MP4, 1080p, vertical or 16:9 — vertical recommended (judges watch on phones).

**Aesthetic note:** lean into the *product*, not headshot-to-camera. Most CMD intern videos are talking heads — yours can stand out by being mostly **screen recordings of the live product** with voice-over on top.

---

## Two-second-pitch one-liner

> *"I spent nine weeks at Paynow Zimbabwe building Africa's first agentic livestock marketplace — and using it to write the first external benchmark of their developer experience."*

That's the single line you can deliver if anyone (including your tutor) asks "so what did you actually do?" The video unpacks it.

---

## Script — 60 seconds, ~150 words

```
[0:00 – 0:08]  HOOK
─────────────────────────────────────────
SHOT:  Close-up of a phone receiving a Paynow Express USSD prompt.
       "Pay US$0.02 to ZimLivestock?  *131*..."
VO:    "Last Thursday at 8:04 AM, an AI agent won a cattle auction in
        Zimbabwe — and immediately pushed a real payment prompt to a
        real phone. That's where this internship ended up."


[0:08 – 0:20]  WHO + WHAT
─────────────────────────────────────────
SHOT:  Cut to your face, 2 seconds.  Then screen recording of the
       ZimLivestock home feed scrolling on a phone.
VO:    "I'm Tatenda.  For nine weeks I interned at Paynow Zimbabwe —
        the country's biggest payment processor — and built
        ZimLivestock: a marketplace for cattle, goats, and sheep,
        running on every product in Paynow's ecosystem."


[0:20 – 0:35]  THE TWO HALVES
─────────────────────────────────────────
SHOT:  Split screen.  Left:  GitHub commit history scrolling.
                     Right: PDF cover of the DX benchmark.
VO:    "Two outputs ran in parallel.  A production app — real users,
        real auctions, real money.  And a 42-page benchmark of
        Paynow's developer experience against Stripe, Paystack, and
        three more.  The product proved the integration was possible.
        The benchmark proved where it was painful."


[0:35 – 0:50]  THE WIN
─────────────────────────────────────────
SHOT:  Screen recording of the live demo — agent wins, SMS arrives,
       USSD prompt pops on phone.  Cut between all three in fast cuts.
VO:    "By the demo day, three AI agents could win three auctions in
        a row, fan out SMS to both buyer and seller, and push the
        Paynow USSD prompt for payment — end to end, no human in the
        loop.  And the panel asked for what came next.  I shipped
        that on the same day."


[0:50 – 1:00]  WHAT IT TAUGHT ME
─────────────────────────────────────────
SHOT:  Back to your face.  Steady, calm.
VO:    "What I learned wasn't really about payments.  It was about
        designing for an economy I had to unlearn my Western
        assumptions about — and that the best DX feedback you can
        give a company is the one nobody asked them for."

[FADE OUT — logo + GitHub URL]
```

**Word count:** 158 words spoken → roughly 60 seconds at a relaxed pace (~155 wpm). If you naturally talk faster, you have slack.

---

## Shot list (in order of recording)

| # | Type | Duration | Source |
|---|---|---|---|
| 1 | Phone close-up: Paynow USSD prompt arriving | 8s | Record your phone with another phone, OR screen-record an iOS Mirroring session. Use a *real* test prompt from the live integration (Test ID 23997, phone 0771111111). |
| 2 | Your face, talking-head | 2s | Decent natural light, plain background. Frame from chest up. |
| 3 | Phone screen scrolling ZimLivestock home feed | 6s | iOS screen recorder. Show the DEMO 7AM listings to demonstrate the auction grid. |
| 4 | Split-screen: commits + benchmark PDF | 8s | Record each side separately, edit in post. `git log --oneline | head -30` for commits; benchmark PDF scrolling slowly. |
| 5 | Final demo composite (agent → SMS → USSD) | 15s | Mix of: screen recording of the agent activity log, photo of SMS notification, photo of USSD prompt on a real phone. Quick cuts, ~2s each. |
| 6 | Your face, closing | 10s | Same setup as shot #2. Slower delivery, eye contact. |
| 7 | End card | 3s | Static slide: ZimLivestock logo + GitHub URL + your name. |

**Total raw footage needed:** ~52s + 8s of B-roll buffer for edits = aim to record ~70s of material per shot.

---

## Recording checklist

- [ ] **Test the USSD prompt arrives** before you record shot #1. Use phone `0771111111` (Paynow success test number) so the prompt is guaranteed.
- [ ] **Charge both phones** if you're filming one phone screen with another.
- [ ] **Quiet room** — Zimbabwean office background noise will kill the VO. Record VO separately and lay it under the shots in post.
- [ ] **Wear something solid** — avoid stripes or busy patterns; they pixelate on phone screens.
- [ ] **One take of VO, multiple takes of camera.** VO is the spine; you can re-shoot visuals to fit. Don't try to lip-sync.

---

## Editing notes

- **Cut on the beat**, not on the breath. Most CMD intern videos drag because the edit follows the speaker's natural pace; pull every cut forward by ~0.3s.
- **No text-on-screen** for what the VO is already saying. Text-on-screen is for proper nouns and numbers: *"42-page benchmark"*, *"3 agents"*, *"US$0.02"*.
- **No background music for the first 4 seconds.** Let the USSD prompt sound effect carry the hook.
- **End on the GitHub URL on screen for the full final 3 seconds** so anyone interested can pause and screenshot.

---

## Tools (any of these work)

- **Final Cut Pro / iMovie** — if you're on macOS, free with Mac.
- **CapCut** — free, vertical-video friendly, fastest if you've used TikTok-style editing.
- **DaVinci Resolve** — free, professional. Overkill for 60s but worth it if you want the practice.

Record vertical (1080×1920) and export H.264 MP4 at ~10 Mbps. File size should be under 50 MB — well within the hand-in form's limits.

# Internship Return Day — Submission Checklist

> Hand-in form: https://bit.ly/handinCMDinterns
> Source: NHL Stenden CMD Internship Return Day deck, STKD MAY 2025.

## Required PDFs (each needs 3 signatures: intern + supervisor + tutor)

| # | Deliverable | Status | Where it lives |
|---|---|---|---|
| 1 | **Internship agreement PDF** | [ ] gather signed copy | This should already exist from start of internship. Search email/Teams for the signed copy. |
| 2 | **Final internship report PDF** | [ ] export from `final-internship-report.md`, fill `[FILL]` placeholders, get signatures | [`final-internship-report.md`](final-internship-report.md) |
| 3 | **Final assessment PDF** | [ ] hand template to Paynow supervisor; collect signed copy | NHL Stenden CMD template — request from tutor if you don't have it |

## Required video

| # | Deliverable | Status | Where it lives |
|---|---|---|---|
| 4 | **1-minute video .mp4** | [ ] record + edit per script | [`1-minute-video-script.md`](1-minute-video-script.md) |

---

## Pre-submission TODO (in order)

### 1. Fill all `[FILL]` placeholders in the final report
The report at [`final-internship-report.md`](final-internship-report.md) has explicit `[FILL]` markers for:

- Cover page: tutor name, supervisor name, exact submission date
- Section 9 (Reflection): all five subsections — only you can write these authentically
- Appendix D: stakeholder contacts (supervisor email, technical contact, interviewees)
- Appendix C: confirm live URL is still pointing at the right Vercel alias before submission
- Section 8: confirm proposed competence levels with your supervisor at the final interview

### 2. Convert the report to PDF
From the repo root:
```bash
# If you have pandoc:
pandoc deliverables/internship-return/final-internship-report.md \
  -o deliverables/internship-return/final-internship-report.pdf \
  --pdf-engine=xelatex \
  --metadata title="Final Internship Report — Tatenda Nyemudzo" \
  -V geometry:margin=1in -V fontsize=11pt

# Or simpler — open in a markdown editor (Typora, Obsidian, MarkText)
# and print-to-PDF.
```

### 3. Collect signatures
Three signatures on each of the three PDFs:

- **You** — sign first
- **Paynow supervisor** — Mascha will need this physically or via DocuSign. Make sure their job title is on the signature line.
- **NHL Stenden tutor** — likely Alice ter Veld or your assigned tutor. Submit the report to them at least **one week before the final interview** so they have time to read it.

### 4. Schedule the final interview
Per the deck:
- Discuss the assessment with your **Paynow supervisor first** (preliminary discussion).
- Send your near-final report to **both supervisor and tutor**.
- **Record the final interview** so the summary can be included in the assessment per competency.
- Plan the interview *after* the preliminary discussion with the supervisor.

### 5. Record + edit the video
Per [`1-minute-video-script.md`](1-minute-video-script.md). Aim to have a finished MP4 24 hours before submission so there's buffer if the editor crashes.

### 6. Submit
At https://bit.ly/handinCMDinterns — upload all 4 files.

---

## Final-interview prep notes

Per the deck, the final interview goes well when the report is already close to final and the supervisor's assessment has already been discussed. Things to have on hand for the call:

- **The signed assessment** from your supervisor (you'll walk through it competency-by-competency).
- **One concrete example per competency** — your tutor will probe each one. Section 8 of the report has nine entries; have a 30-second story for each.
- **One thing you'd do differently** — the deck pre-flighted "Which of you committed a silly mistake during internship?" as a discussion question. Pick one honestly. (Suggestion: the day the auto-pay USSD was misconfigured and tried to live-fire on the demo phone with empty env vars — caught by debug counters showing `id=false key=false`.)
- **The "did AI help?" answer.** This will come up. You've already thought hard about it — see the relevant slide in the demo deck.

---

## Files in this folder

```
deliverables/internship-return/
├── final-internship-report.md     ← Main deliverable
├── 1-minute-video-script.md       ← Video script + shot list
└── submission-checklist.md        ← This file
```

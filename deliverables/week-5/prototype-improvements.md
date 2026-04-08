# Prototype Improvements — Week 5

**Project:** Mimoo (formerly ZimLivestock)
**Date:** April 9, 2026
**Sprint Focus:** Usability, payment clarity, error handling

---

## Changes Made

### 1. Rebrand: ZimLivestock -> Mimoo

- New logo: kawaii cow mascot with Chinese text (米牧智慧農務) for growing Chinese user base in Zimbabwe
- PWA manifest updated: name, short_name, theme_color, icons
- Page title, auth screen, and all user-facing copy updated
- Auth screen now shows actual Mimoo logo instead of plain "ZL" text
- localStorage keys preserved to avoid breaking existing user sessions

### 2. Error State: HomeFeed Retry Button

**Problem:** When listings failed to load (common on slow Zimbabwe connections), users saw "Something went wrong" with no way to retry — a dead end requiring full page reload.

**Fix:** Added "Try Again" button that calls `refetch()` from React Query. Users can now recover from transient network failures with one tap.

**File:** `src/app/components/HomeFeed.tsx`

### 3. Invisible Spinner on Checkout Button

**Problem:** The loading spinner during payment processing used `text-emerald-600` on a `bg-emerald-600` button — green on green = invisible. Users saw "Processing..." text but no visual activity indicator.

**Fix:** Changed spinner to `text-white` for clear visibility on the green button.

**File:** `src/app/components/CheckoutScreen.tsx`

### 4. Misleading Phone Number Input

**Problem:** The phone input showed a "+263" prefix label, but validation expected `07XXXXXXXX` format (10 digits starting with 07). Users seeing "+263" naturally typed without the leading 0, causing silent validation failures.

**Fix:** Removed the +263 visual prefix. Placeholder "0771 234 567" now clearly shows the expected format.

**File:** `src/app/components/CheckoutScreen.tsx`

### 5. Touch Target Accessibility (WCAG 2.5.5)

**Problem:** Several interactive elements were below the 44px minimum touch target:
- Favorite heart button: 40px (w-10)
- ZESA token copy button: ~24px (p-1)
- Navigation text: 12px at 40% opacity

**Fixes:**
- Favorite button: increased to 44px (w-11 h-11)
- Token copy button: increased padding to p-2.5 with larger icon (w-5 h-5)
- Nav text: increased to 13-14px with 60% opacity for better outdoor readability

**Files:** `HomeFeed.tsx`, `BillPayFlow.tsx`, `Root.tsx`

### 6. BillPay Empty State

**Problem:** If the billers list was empty or failed to load, users saw a blank white screen with just the subtitle text — no error, no guidance, no retry.

**Fix:** Added empty state with "No billers available" message and retry button.

**File:** `src/app/components/BillPayFlow.tsx`

---

## Remaining Known Issues (Lower Priority)

| Issue | Severity | Notes |
|---|---|---|
| Payment method icons load from GitHub CDN | Low | May be slow/broken on poor connections; could bundle locally |
| Auth phone pattern rejects 08X numbers | Low | NetOne data lines start with 08; edge case |
| "More" drawer has no animation | Low | Pops in abruptly; could add slide-up transition |
| Client-side search only | Low | Works for current data volume; needs server-side for scale |
| Back button text overflows on ItemDetail | Low | "Back" text + icon exceeds 40px fixed width |

---

## Testing Verification

- Full Vite build passes with no errors
- PWA service worker generates correctly (51 precached entries)
- All 5 payment provider test pages functional
- BillPay test harness: 8/8 test cases passing in simulation mode

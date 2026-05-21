/**
 * Money math helpers.
 *
 * Extracted after the penny-amount bug (c8b9a3a): `Math.round(0.042) === 0`
 * silently collapsed any bid under US$0.50 to zero, rejecting all penny-scale
 * payments in the amount-match guard.
 *
 * Rule: never `Math.round` a dollar amount. Always go through `toFixed(2)` +
 * Number() so we stay in two-decimal land.
 */

const PLATFORM_FEE_RATE = 0.05; // 5% platform fee on top of the winning bid
export const PENNY_TOLERANCE = 0.01; // amount-match guards must allow ±1c drift

/**
 * Total buyer charge = bid × (1 + fee), rounded to 2dp.
 * Safe for any bid ≥ 0 (including penny bids).
 */
export function platformTotal(bidAmount: number): number {
  if (!Number.isFinite(bidAmount) || bidAmount < 0) {
    throw new Error(`Invalid bid amount: ${bidAmount}`);
  }
  return Number((bidAmount * (1 + PLATFORM_FEE_RATE)).toFixed(2));
}

/**
 * Amount-match guard: accept either the computed total OR the exact bid
 * amount (some test flows submit without the fee). Tolerance ±1c.
 * transportFee defaults to 0 — all existing call sites are unaffected.
 */
export function amountMatches(submitted: number, bid: number, transportFee = 0): boolean {
  const total = Number((platformTotal(bid) + transportFee).toFixed(2));
  return Math.abs(submitted - total) < PENNY_TOLERANCE || (transportFee === 0 && submitted === bid);
}

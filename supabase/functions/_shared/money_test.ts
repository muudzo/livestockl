import { assertEquals, assertThrows } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { amountMatches, platformTotal } from "./money.ts";

Deno.test("platformTotal handles penny bids without collapsing to zero", () => {
  // Regression: pre-c8b9a3a, Math.round(0.042) === 0 rejected every bid < 50c.
  assertEquals(platformTotal(0.01), 0.01);
  assertEquals(platformTotal(0.04), 0.04);
  assertEquals(platformTotal(0.05), 0.05);
});

Deno.test("platformTotal applies 5% fee for normal amounts", () => {
  assertEquals(platformTotal(100), 105);
  assertEquals(platformTotal(650), 682.5);
  assertEquals(platformTotal(1), 1.05);
});

Deno.test("platformTotal rejects negative / NaN / Infinity", () => {
  assertThrows(() => platformTotal(-1));
  assertThrows(() => platformTotal(NaN));
  assertThrows(() => platformTotal(Infinity));
});

Deno.test("amountMatches accepts computed total or raw bid", () => {
  assertEquals(amountMatches(0.04, 0.04), true);      // raw bid
  assertEquals(amountMatches(105, 100), true);        // computed total
  assertEquals(amountMatches(104.999, 100), true);    // within penny tolerance
  assertEquals(amountMatches(200, 100), false);       // way off
  assertEquals(amountMatches(100.02, 100), false);    // 2c off — outside tolerance
});

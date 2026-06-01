// Unit tests for the WhatsApp Cloud bot's pure layer: phone matching and the
// interactive payload builders (where Meta's hard limits bite). Run with:
//   SUPABASE_URL=http://localhost SUPABASE_SERVICE_ROLE_KEY=x \
//   deno test -A supabase/functions/whatsapp-cloud/index_test.ts
// No WHATSAPP_ACCESS_TOKEN ⇒ send() runs in SIM mode and logs the payload,
// which we capture and assert against.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { phoneVariants, sendButtons, sendList } from "./index.ts";

// Capture the JSON payload the SIM-mode send() logs as its second console.log arg.
async function capture(fn: () => Promise<void>): Promise<Record<string, any>> {
  const original = console.log;
  let captured: string | undefined;
  console.log = (...args: unknown[]) => { captured = args[1] as string; };
  try { await fn(); } finally { console.log = original; }
  return JSON.parse(captured!);
}

Deno.test("phoneVariants covers the formats profiles.phone is stored in", () => {
  const v = phoneVariants("263771234567");
  assert(v.includes("0771234567"), "local 0-prefixed");
  assert(v.includes("+263771234567"), "E.164");
  assert(v.includes("263771234567"), "raw international");
});

Deno.test("sendList caps at 10 rows and truncates titles/labels to Meta limits", async () => {
  const rows = Array.from({ length: 14 }, (_, i) => ({
    id: `CAT:item-${i}`,
    title: "A very long category name that exceeds twenty-four characters",
  }));
  const p = await capture(() => sendList("263771234567", "Pick one", "Choose a really long button label", rows));

  assertEquals(p.messaging_product, "whatsapp");
  assertEquals(p.interactive.type, "list");
  assertEquals(p.interactive.action.sections[0].rows.length, 10, "max 10 rows");
  assert(p.interactive.action.button.length <= 20, "button label <= 20");
  for (const r of p.interactive.action.sections[0].rows) {
    assert(r.title.length <= 24, `row title <= 24 (got ${r.title.length})`);
    assert(r.id.length <= 200, "row id <= 200");
  }
});

Deno.test("sendButtons caps at 3 buttons, truncates titles, and adds an image header", async () => {
  const buttons = [
    { id: "ACCEPT:x", title: "Accept the top bid right now please" },
    { id: "VIEWBIDS:x", title: "View bids" },
    { id: "MENU", title: "Menu" },
    { id: "EXTRA", title: "Should be dropped" },
  ];
  const p = await capture(() => sendButtons("263771234567", "body", buttons, "https://cdn.example/x.jpg"));

  assertEquals(p.interactive.type, "button");
  assertEquals(p.interactive.action.buttons.length, 3, "max 3 buttons");
  assertEquals(p.interactive.header.type, "image");
  assertEquals(p.interactive.header.image.link, "https://cdn.example/x.jpg");
  for (const b of p.interactive.action.buttons) {
    assert(b.reply.title.length <= 20, `button title <= 20 (got ${b.reply.title.length})`);
  }
});

Deno.test("sendButtons without an image omits the header", async () => {
  const p = await capture(() => sendButtons("263771234567", "body", [{ id: "MENU", title: "Menu" }]));
  assertEquals(p.interactive.header, undefined);
});
